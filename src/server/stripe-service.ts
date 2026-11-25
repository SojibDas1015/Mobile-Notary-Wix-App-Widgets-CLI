import { items } from '@wix/data';
import { auth } from '@wix/essentials';
import { mapService } from '../extensions/dashboard/cms/mappers';
import { COLLECTION_IDS, type PaymentPolicy } from '../extensions/dashboard/cms/types';
import {
  insertElevatedBooking,
  readOwnerSettingsStrict,
  resolveStripeSecretKey,
} from './notary-service';

type RawItem = Record<string, unknown>;

const STRIPE_API_BASE = 'https://api.stripe.com/v1';

export function computeStripeDueAmounts(params: {
  paymentPolicy: PaymentPolicy;
  depositAmount: number;
  grandTotal: number;
  paymentChoice?: string;
}): { amountDueNow: number; balanceDue: number; isDeposit: boolean } {
  const total = Math.max(0, Number(params.grandTotal || 0));
  const depVal = Math.max(0, Number(params.depositAmount || 0));
  const choice = String(params.paymentChoice || '').toLowerCase();

  if (params.paymentPolicy === 'pay_at_appointment') {
    return { amountDueNow: 0, balanceDue: Number(total.toFixed(2)), isDeposit: false };
  }
  if (params.paymentPolicy === 'optional_online' && choice === 'pay_at_appointment') {
    return { amountDueNow: 0, balanceDue: Number(total.toFixed(2)), isDeposit: false };
  }
  if (params.paymentPolicy === 'deposit_fixed') {
    const due = Math.min(total, depVal);
    return {
      amountDueNow: Number(due.toFixed(2)),
      balanceDue: Number(Math.max(0, total - due).toFixed(2)),
      isDeposit: due < total,
    };
  }
  if (params.paymentPolicy === 'deposit_percent') {
    const pct = Math.min(100, depVal);
    const due = (total * pct) / 100;
    return {
      amountDueNow: Number(due.toFixed(2)),
      balanceDue: Number(Math.max(0, total - due).toFixed(2)),
      isDeposit: due < total,
    };
  }

  return { amountDueNow: Number(total.toFixed(2)), balanceDue: 0, isDeposit: false };
}

function buildReturnUrls(
  rawReturnUrl: string,
  bookingRef: string,
): { successUrl: string; cancelUrl: string } {
  const parsed = new URL(rawReturnUrl);
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error('Return URL must use http or https.');
  }
  parsed.searchParams.delete('dmn_stripe_session');
  parsed.searchParams.delete('dmn_stripe_cancel');
  parsed.searchParams.delete('dmn_ref');

  const cancelObj = new URL(parsed.toString());
  cancelObj.searchParams.set('dmn_stripe_cancel', '1');
  cancelObj.searchParams.set('dmn_ref', bookingRef);

  const successObj = new URL(parsed.toString());
  successObj.searchParams.set('dmn_ref', bookingRef);
  const sep = successObj.search ? '&' : '?';
  const successUrl = `${successObj.toString()}${sep}dmn_stripe_session={CHECKOUT_SESSION_ID}`;

  return { successUrl, cancelUrl: cancelObj.toString() };
}

async function resolveStripeKeyStrict(): Promise<string> {
  const { stripeSecretKey, secretError } = await resolveStripeSecretKey();
  if (!stripeSecretKey) {
    if (secretError && secretError.includes('403')) {
      throw new Error(
        'Wix Secrets Manager denied access to STRIPE_SECRET_KEY (403). Enable "Manage Secrets" in Wix Dev Center permissions.',
      );
    }
    throw new Error(
      'STRIPE_SECRET_KEY was not found in Wix Secrets Manager. Add it under Secrets Manager in your Wix Dashboard.',
    );
  }
  return stripeSecretKey;
}

async function getServicePaymentRule(serviceId: string): Promise<{
  paymentPolicy: PaymentPolicy;
  depositAmount: number;
  title: string;
}> {
  let defaultDepositPct = 50;
  try {
    const settings = await readOwnerSettingsStrict();
    if (settings.defaultDepositPercent != null && settings.defaultDepositPercent > 0) {
      defaultDepositPct = settings.defaultDepositPercent;
    }
  } catch {
    // Use 50% default deposit if settings read fails.
  }

  try {
    const elevatedQuery = auth.elevate(items.query);
    const res = await elevatedQuery(COLLECTION_IDS.SERVICES).limit(100).find();
    const match = (res.items ?? [])
      .map((r) => mapService(r as RawItem))
      .find((s) => s.serviceId === serviceId || s._id === serviceId);
    if (match) {
      const isQuote = match.isQuoteOnly || match.pricingModel === 'quote_only';
      const policy: PaymentPolicy = isQuote
        ? 'pay_at_appointment'
        : match.paymentPolicy === 'deposit_fixed' || match.paymentPolicy === 'pay_at_appointment'
          ? match.paymentPolicy
          : 'deposit_percent';
      const depAmt = isQuote
        ? 0
        : policy === 'deposit_percent'
          ? match.depositAmount && match.depositAmount > 0 && match.paymentPolicy === 'deposit_percent'
            ? match.depositAmount
            : defaultDepositPct
          : Number(match.depositAmount ?? 0);
      return {
        paymentPolicy: policy,
        depositAmount: depAmt,
        title: match.title,
      };
    }
  } catch {
    // Fall back to default 50% deposit online payment if catalog query fails temporarily.
  }
  return {
    paymentPolicy: 'deposit_percent',
    depositAmount: defaultDepositPct,
    title:
      serviceId === 'virtual_hearing' ? 'Virtual Hearing Support' : 'Mobile Notary Service',
  };
}

interface StripeLineItemInput {
  name: string;
  description: string;
  amountCents: number;
}

function buildItemizedStripeLines(params: {
  isDeposit: boolean;
  amountCents: number;
  grandTotal: number;
  balanceDue: number;
  bookingRef: string;
  serviceName: string;
  serviceFee?: number;
  addonsFee?: number;
  addonsSummary?: string;
  addonItems?: Array<{ label?: string; amount?: number }>;
  travelFee?: number;
  drivingMiles?: number;
  tripCalculationMode?: string;
  signersCount?: number;
  notarizedSignatures?: number;
  appointmentDate?: string;
  appointmentTime?: string;
  city?: string;
}): StripeLineItemInput[] {
  const schedulePart =
    params.appointmentDate && params.appointmentTime
      ? `${params.appointmentDate} at ${params.appointmentTime}`
      : '';
  const cityPart = params.city ? `${params.city}, NC` : 'Mobile Dispatch';

  const fullServiceCents = Math.max(0, Math.round(Number(params.serviceFee ?? 0) * 100));
  const fullAddonsCents = Math.max(0, Math.round(Number(params.addonsFee ?? 0) * 100));
  const fullTravelCents = Math.max(0, Math.round(Number(params.travelFee ?? 0) * 100));
  const fullGrandTotalCents = Math.round(params.grandTotal * 100);

  // When multiple components exist (e.g. Service + Addons + Travel), itemize each onto its own separate line in Stripe
  const hasMultipleComponents =
    (Number(fullServiceCents > 0) + Number(fullAddonsCents > 0) + Number(fullTravelCents > 0)) > 1;

  if (hasMultipleComponents && fullGrandTotalCents > 0) {
    const lines: StripeLineItemInput[] = [];
    const ratio = params.isDeposit ? (params.amountCents / fullGrandTotalCents) : 1;
    const depositPctTag = params.isDeposit ? ' (50% Deposit)' : '';

    // 1. Base Service Line
    if (fullServiceCents > 0) {
      const lineCents = Math.round(fullServiceCents * ratio);
      const scope =
        params.signersCount || params.notarizedSignatures
          ? `${params.signersCount ?? 1} signer(s), ${params.notarizedSignatures ?? 1} signature(s)`
          : '';
      const descParts = [
        `Ref: ${params.bookingRef}`,
        schedulePart,
        params.isDeposit ? `Full Service Fee: $${(fullServiceCents / 100).toFixed(2)}` : '',
        scope,
      ].filter(Boolean);

      lines.push({
        name: `${params.serviceName}${depositPctTag}`,
        description: descParts.join(' • '),
        amountCents: lineCents,
      });
    }

    // 2. Add-on Lines (either individual or group)
    const rawAddonItems = Array.isArray(params.addonItems) ? params.addonItems : [];
    const validAddonItems = rawAddonItems
      .map((item) => ({
        label: String(item?.label ?? '').trim(),
        cents: Math.max(0, Math.round(Number(item?.amount ?? 0) * 100)),
      }))
      .filter((item) => item.label && item.cents > 0);

    if (validAddonItems.length > 0 && validAddonItems.reduce((s, a) => s + a.cents, 0) === fullAddonsCents) {
      for (const addon of validAddonItems) {
        const addonCents = Math.round(addon.cents * ratio);
        lines.push({
          name: `Add-on: ${addon.label}${depositPctTag}`,
          description: params.isDeposit
            ? `50% deposit • Full: $${(addon.cents / 100).toFixed(2)}`
            : `Optional service add-on (${params.bookingRef})`,
          amountCents: addonCents,
        });
      }
    } else if (fullAddonsCents > 0) {
      const addonsCents = Math.round(fullAddonsCents * ratio);
      lines.push({
        name: `Service Add-ons${depositPctTag}`,
        description: params.isDeposit
          ? `50% deposit • Full Add-ons: $${(fullAddonsCents / 100).toFixed(2)}${params.addonsSummary ? ` • ${params.addonsSummary}` : ''}`
          : (params.addonsSummary || `Selected add-ons (${params.bookingRef})`),
        amountCents: addonsCents,
      });
    }

    // 3. Travel Fee Line
    if (fullTravelCents > 0) {
      const travelCents = Math.round(fullTravelCents * ratio);
      const milesNum = Number(params.drivingMiles ?? 0);
      const modeTag = params.tripCalculationMode === 'round-trip' ? ' round-trip' : '';
      const milesLabel = milesNum > 0 ? ` (${milesNum} mi${modeTag})` : '';
      lines.push({
        name: `Separate Travel Fee — ${cityPart}${depositPctTag}`,
        description: params.isDeposit
          ? `Pursuant to NC Notary Standards • Full Travel: $${(fullTravelCents / 100).toFixed(2)}${milesLabel}`
          : `Itemized separately pursuant to NC Notary Standards • ${cityPart}${milesLabel}`,
        amountCents: travelCents,
      });
    }

    // Ensure the sum of itemized line amounts matches amountCents down to the exact penny
    const currentSum = lines.reduce((sum, l) => sum + l.amountCents, 0);
    const diff = params.amountCents - currentSum;
    if (diff !== 0 && lines.length > 0) {
      let maxIdx = 0;
      for (let i = 1; i < lines.length; i++) {
        if (lines[i].amountCents > lines[maxIdx].amountCents) {
          maxIdx = i;
        }
      }
      lines[maxIdx].amountCents += diff;
    }

    const finalSum = lines.reduce((sum, l) => sum + l.amountCents, 0);
    if (lines.length > 0 && finalSum === params.amountCents) {
      return lines;
    }
  }

  // Fallback single line item: format description with clean line breaks
  const fallbackDesc = [
    `Booking Ref: ${params.bookingRef}`,
    schedulePart ? `Appointment: ${schedulePart}` : '',
    params.city ? `Location: ${cityPart}` : '',
    params.serviceFee != null ? `Service Fee: $${Number(params.serviceFee).toFixed(2)}` : '',
    params.addonsFee && Number(params.addonsFee) > 0
      ? `Add-ons: $${Number(params.addonsFee).toFixed(2)}${params.addonsSummary ? ` (${params.addonsSummary})` : ''}`
      : '',
    params.travelFee != null ? `Travel Fee: $${Number(params.travelFee).toFixed(2)}` : '',
    `Total Service Cost: $${params.grandTotal.toFixed(2)}`,
    params.balanceDue > 0
      ? `Remaining Balance Due at Appointment: $${params.balanceDue.toFixed(2)}`
      : '',
  ]
    .filter(Boolean)
    .join('\n');

  return [
    {
      name: params.isDeposit
        ? `${params.serviceName} — 50% Non-Refundable Appointment Deposit`
        : params.serviceName,
      description: fallbackDesc,
      amountCents: params.amountCents,
    },
  ];
}

export async function createStripeCheckoutSession(payload: {
  bookingRef?: string;
  serviceId?: string;
  serviceName?: string;
  serviceFee?: number;
  addonsFee?: number;
  addonsSummary?: string;
  addonItems?: Array<{ label?: string; amount?: number }>;
  travelFee?: number;
  drivingMiles?: number;
  tripCalculationMode?: string;
  signersCount?: number;
  notarizedSignatures?: number;
  grandTotal?: number;
  paymentChoice?: string;
  clientEmail?: string;
  appointmentDate?: string;
  appointmentTime?: string;
  city?: string;
  returnUrl?: string;
}) {
  const stripeKey = await resolveStripeKeyStrict();
  const bookingRef = String(payload.bookingRef ?? '').trim() || `DMN-${Date.now().toString().slice(-6)}`;
  const serviceId = String(payload.serviceId ?? '').trim();
  const returnUrl = String(payload.returnUrl ?? '').trim();
  if (!returnUrl) {
    throw new Error('Missing returnUrl for Stripe Checkout redirect.');
  }

  const serviceRule = await getServicePaymentRule(serviceId);
  const grandTotal = Number(payload.grandTotal ?? 0);
  const { amountDueNow, balanceDue, isDeposit } = computeStripeDueAmounts({
    paymentPolicy: serviceRule.paymentPolicy,
    depositAmount: serviceRule.depositAmount,
    grandTotal,
    paymentChoice: payload.paymentChoice,
  });

  const amountCents = Math.round(amountDueNow * 100);
  if (amountCents < 50) {
    throw new Error('Stripe requires a minimum online payment of $0.50 USD.');
  }

  const { successUrl, cancelUrl } = buildReturnUrls(returnUrl, bookingRef);
  const serviceName = String(payload.serviceName || serviceRule.title || 'Mobile Notary Service').trim();
  const lineItems = buildItemizedStripeLines({
    isDeposit,
    amountCents,
    grandTotal,
    balanceDue,
    bookingRef,
    serviceName,
    serviceFee: payload.serviceFee,
    addonsFee: payload.addonsFee,
    addonsSummary: payload.addonsSummary,
    addonItems: payload.addonItems,
    travelFee: payload.travelFee,
    drivingMiles: payload.drivingMiles,
    tripCalculationMode: payload.tripCalculationMode,
    signersCount: payload.signersCount,
    notarizedSignatures: payload.notarizedSignatures,
    appointmentDate: payload.appointmentDate,
    appointmentTime: payload.appointmentTime,
    city: payload.city,
  });

  const form = new URLSearchParams();
  form.set('mode', 'payment');
  form.set('success_url', successUrl);
  form.set('cancel_url', cancelUrl);
  form.set('client_reference_id', bookingRef);
  if (payload.clientEmail && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.clientEmail.trim())) {
    form.set('customer_email', payload.clientEmail.trim());
  }
  lineItems.forEach((item, idx) => {
    form.set(`line_items[${idx}][price_data][currency]`, 'usd');
    form.set(`line_items[${idx}][price_data][unit_amount]`, String(item.amountCents));
    form.set(`line_items[${idx}][price_data][product_data][name]`, item.name);
    if (item.description) {
      form.set(`line_items[${idx}][price_data][product_data][description]`, item.description);
    }
    form.set(`line_items[${idx}][quantity]`, '1');
  });
  form.set('metadata[bookingRef]', bookingRef);
  form.set('metadata[serviceId]', serviceId);
  form.set('metadata[paymentMode]', isDeposit ? 'deposit' : 'full');
  form.set('metadata[grandTotal]', grandTotal.toFixed(2));
  form.set('metadata[balanceDue]', balanceDue.toFixed(2));

  const res = await fetch(`${STRIPE_API_BASE}/checkout/sessions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${stripeKey}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: form.toString(),
  });

  const data = (await res.json()) as {
    id?: string;
    url?: string;
    error?: { message?: string };
  };

  if (!res.ok || !data.url || !data.id) {
    throw new Error(data.error?.message || `Stripe Checkout error (HTTP ${res.status}).`);
  }

  return {
    success: true,
    sessionId: data.id,
    checkoutUrl: data.url,
    amountDueNow,
    balanceDue,
  };
}

export async function completeStripeCheckoutBooking(payload: {
  sessionId: string;
  bookingData: RawItem;
}) {
  const sessionId = String(payload.sessionId ?? '').trim();
  if (!sessionId) {
    throw new Error('Missing Stripe Checkout session ID.');
  }

  const stripeKey = await resolveStripeKeyStrict();

  // Idempotency guard: avoid duplicate CMS rows if the confirmation page is reloaded.
  try {
    const elevatedQuery = auth.elevate(items.query);
    const existing = await elevatedQuery(COLLECTION_IDS.APPOINTMENTS)
      .eq('stripeSessionId', sessionId)
      .limit(1)
      .find();
    const match = existing.items?.[0] as RawItem | undefined;
    if (match) {
      return {
        success: true,
        alreadySaved: true,
        bookingRef: String(match.bookingRef ?? ''),
        recordId: String(match._id ?? ''),
        paymentStatus: String(match.paymentStatus ?? 'Paid'),
        amountPaid: Number(match.amountPaid ?? 0),
        balanceDue: Number(match.balanceDue ?? 0),
        paymentPreference: String(match.paymentPreference ?? 'Paid Online via Stripe'),
      };
    }
  } catch {
    // Continue if query fails on missing optional index/field.
  }

  const res = await fetch(`${STRIPE_API_BASE}/checkout/sessions/${encodeURIComponent(sessionId)}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${stripeKey}`,
    },
  });

  const session = (await res.json()) as {
    id?: string;
    payment_status?: string;
    status?: string;
    amount_total?: number;
    payment_intent?: string;
    client_reference_id?: string;
    customer_email?: string;
    metadata?: Record<string, string>;
    error?: { message?: string };
  };

  if (!res.ok) {
    throw new Error(session.error?.message || `Unable to verify Stripe payment (HTTP ${res.status}).`);
  }

  if (session.payment_status !== 'paid') {
    throw new Error('Stripe payment has not been completed yet.');
  }

  const bookingData = (payload.bookingData && typeof payload.bookingData === 'object'
    ? payload.bookingData
    : {}) as RawItem;
  const amountPaid = Number((Number(session.amount_total ?? 0) / 100).toFixed(2));
  const grandTotal = Number(
    bookingData.grandTotal ?? session.metadata?.grandTotal ?? amountPaid,
  );
  const balanceDue = Math.max(0, Number((grandTotal - amountPaid).toFixed(2)));
  const paymentStatus = balanceDue > 0 ? '50% Deposit Paid' : 'Paid';
  const paymentPreference =
    balanceDue > 0
      ? `50% Non-Refundable Deposit Paid via Stripe ($${amountPaid.toFixed(2)} paid, $${balanceDue.toFixed(2)} due at time of service)`
      : `Paid Online via Stripe ($${amountPaid.toFixed(2)})`;

  const bookingRef =
    String(bookingData.bookingRef ?? '').trim() ||
    session.client_reference_id ||
    session.metadata?.bookingRef ||
    `DMN-${Date.now().toString().slice(-6)}`;

  const inserted = await insertElevatedBooking({
    ...bookingData,
    bookingRef,
    clientName: bookingData.clientName || 'Stripe Client',
    clientEmail: bookingData.clientEmail || session.customer_email || '',
    bookingType: 'instant',
    status: 'Confirmed',
    paymentStatus,
    amountPaid,
    balanceDue,
    stripeSessionId: session.id || sessionId,
    stripePaymentIntentId: typeof session.payment_intent === 'string' ? session.payment_intent : '',
    paymentPreference,
  });

  return {
    success: true,
    bookingRef: inserted.bookingRef,
    recordId: inserted.recordId,
    paymentStatus,
    amountPaid,
    balanceDue,
    paymentPreference,
  };
}
