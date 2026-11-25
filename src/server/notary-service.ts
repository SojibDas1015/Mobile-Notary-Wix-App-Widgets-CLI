import { items } from '@wix/data';
import { auth } from '@wix/essentials';
import { secrets } from '@wix/secrets';
import {
  generateTimeSlotsForDay,
  mapAddon,
  mapBusinessHour,
  mapOwnerSettings,
  mapQuestion,
  mapService,
  mapServiceArea,
} from '../extensions/dashboard/cms/mappers';
import {
  COLLECTION_IDS,
  type OwnerSettingsRecord,
} from '../extensions/dashboard/cms/types';

type RawItem = Record<string, unknown>;

async function elevatedQueryAll(collectionId: string, sortField?: string): Promise<RawItem[]> {
  const all: RawItem[] = [];
  let skip = 0;
  const limit = 100;
  const elevatedQuery = auth.elevate(items.query);

  while (true) {
    let q = elevatedQuery(collectionId).limit(limit).skip(skip);
    if (sortField) {
      q = q.ascending(sortField);
    }
    const res = await q.find();
    const batch = (res.items ?? []) as RawItem[];
    all.push(...batch);
    if (batch.length < limit) break;
    skip += limit;
  }

  return all;
}

async function readOptionalSecret(
  name: string,
): Promise<{ value: string; error?: string }> {
  try {
    const elevatedGetSecret = auth.elevate(secrets.getSecretValue);
    const res = await elevatedGetSecret(name);
    return {
      value: typeof res?.value === 'string' ? res.value.trim() : '',
    };
  } catch (err) {
    return {
      value: '',
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

export async function resolveGoogleApiKeys(settings?: OwnerSettingsRecord): Promise<{
  placesApiKey: string;
  routesApiKey: string;
  secretError?: string;
}> {
  const [routesSecret, placesSecret, mapsSecret] = await Promise.all([
    readOptionalSecret('GOOGLE_ROUTES_API_KEY'),
    readOptionalSecret('GOOGLE_PLACES_API_KEY'),
    readOptionalSecret('GOOGLE_MAPS_API_KEY'),
  ]);

  const placesApiKey =
    placesSecret.value || mapsSecret.value || settings?.googlePlacesApiKey || '';
  const routesApiKey =
    routesSecret.value ||
    settings?.googleRoutesApiKey ||
    placesSecret.value ||
    mapsSecret.value ||
    settings?.googlePlacesApiKey ||
    '';

  return {
    placesApiKey,
    routesApiKey,
    secretError: routesSecret.error || placesSecret.error,
  };
}

export async function resolveStripeSecretKey(): Promise<{
  stripeSecretKey: string;
  secretError?: string;
}> {
  const res = await readOptionalSecret('STRIPE_SECRET_KEY');
  return {
    stripeSecretKey: res.value,
    secretError: res.error,
  };
}

export async function readOwnerSettingsStrict(): Promise<OwnerSettingsRecord> {
  const rows = await elevatedQueryAll(COLLECTION_IDS.SETTINGS);
  const preferred =
    rows.find((r) => r.ID === 'dmn-settings-01' || r.settingsId === 'dmn-settings-01') ??
    rows[0];

  if (!preferred || !String(preferred.defaultOriginAddress ?? '').trim()) {
    throw new Error('OwnerSettings record with defaultOriginAddress was not found in CMS.');
  }

  return mapOwnerSettings(preferred);
}

export async function geocodeOriginAddress(
  address: string,
  apiKey: string,
): Promise<{ lat: number; lng: number } | null> {
  if (!address || !apiKey) return null;
  try {
    const res = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${encodeURIComponent(apiKey)}`,
    );
    if (!res.ok) return null;
    const data = (await res.json()) as {
      results?: Array<{ geometry?: { location?: { lat?: number; lng?: number } } }>;
    };
    const loc = data.results?.[0]?.geometry?.location;
    if (typeof loc?.lat === 'number' && typeof loc?.lng === 'number') {
      return { lat: loc.lat, lng: loc.lng };
    }
  } catch {
    // Geocoding is supplemental for initial map centering.
  }
  return null;
}

export async function getLiveBookingConfig() {
  const settings = await readOwnerSettingsStrict();

  const [rawServices, rawQuestions, rawAddons, rawHours] = await Promise.all([
    elevatedQueryAll(COLLECTION_IDS.SERVICES, 'sortOrder'),
    elevatedQueryAll(COLLECTION_IDS.QUESTIONS, 'sortOrder'),
    elevatedQueryAll(COLLECTION_IDS.ADDONS, 'sortOrder'),
    elevatedQueryAll(COLLECTION_IDS.HOURS, 'sortOrder'),
  ]);

  let serviceAreas: ReturnType<typeof mapServiceArea>[] = [];
  try {
    const rawAreas = await elevatedQueryAll(COLLECTION_IDS.SERVICE_AREAS, 'sortOrder');
    serviceAreas = rawAreas
      .map(mapServiceArea)
      .filter((a) => a.active)
      .sort((a, b) => a.sortOrder - b.sortOrder);
  } catch {
    serviceAreas = [];
  }

  const defaultDepositPct = Math.max(
    0,
    Math.min(100, Number(settings.defaultDepositPercent ?? 50)),
  );
  const mappedAllServices = rawServices.map(mapService);

  // Ensure Virtual Hearing Support is present in the catalog
  if (!mappedAllServices.some((s) => s.serviceId === 'virtual_hearing')) {
    mappedAllServices.push({
      _id: 'srv-virtual-hearing',
      title: 'Virtual Hearing Support',
      serviceId: 'virtual_hearing',
      description:
        'In-person oath administration, witness swearing-in, identity verification, and attestation for virtual court trials, depositions, and administrative hearings.',
      basePrice: 35,
      pricingModel: 'flat',
      isQuoteOnly: false,
      paymentPolicy: 'deposit_percent',
      depositAmount: defaultDepositPct,
      popularLabel: 'Court & Virtual',
      imageUrl:
        'https://images.pexels.com/photos/5668473/pexels-photo-5668473.jpeg?auto=compress&cs=tinysrgb&w=600',
      hiddenByDefault: false,
      sortOrder: 9,
      active: true,
    });
  }

  // Allow future activation of RON and IPEN via OwnerSettings toggles without rebuilding
  if (settings.enableRonService && !mappedAllServices.some((s) => s.serviceId === 'ron')) {
    mappedAllServices.push({
      _id: 'srv-ron',
      title: 'Remote Online Notarization (RON)',
      serviceId: 'ron',
      description:
        'Audio-video remote online notarization on an approved North Carolina platform.',
      basePrice: 25,
      pricingModel: 'flat',
      isQuoteOnly: false,
      paymentPolicy: 'deposit_percent',
      depositAmount: defaultDepositPct,
      popularLabel: 'Online Session',
      imageUrl:
        'https://images.pexels.com/photos/7820383/pexels-photo-7820383.jpeg?auto=compress&cs=tinysrgb&w=600',
      hiddenByDefault: false,
      sortOrder: 10,
      active: true,
    });
  }

  if (settings.enableIpenService && !mappedAllServices.some((s) => s.serviceId === 'ipen')) {
    mappedAllServices.push({
      _id: 'srv-ipen',
      title: 'In-Person Electronic Notarization (IPEN)',
      serviceId: 'ipen',
      description:
        'In-person electronic notarization on an approved digital platform with both signer and notary physically present.',
      basePrice: 15,
      pricingModel: 'per_signature',
      isQuoteOnly: false,
      paymentPolicy: 'deposit_percent',
      depositAmount: defaultDepositPct,
      popularLabel: 'Digital In-Person',
      imageUrl:
        'https://images.pexels.com/photos/7688336/pexels-photo-7688336.jpeg?auto=compress&cs=tinysrgb&w=600',
      hiddenByDefault: false,
      sortOrder: 10,
      active: true,
    });
  }

  const services = mappedAllServices
    .filter((s) => {
      if (s.serviceId === 'ron') return Boolean(settings.enableRonService);
      if (s.serviceId === 'ipen') return Boolean(settings.enableIpenService);
      return s.active;
    })
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((s) => {
      const isQuote = s.isQuoteOnly || s.pricingModel === 'quote_only';
      const policy = isQuote
        ? 'pay_at_appointment'
        : s.paymentPolicy === 'deposit_fixed' || s.paymentPolicy === 'pay_at_appointment'
          ? s.paymentPolicy
          : 'deposit_percent';
      const depAmt = isQuote
        ? 0
        : policy === 'deposit_percent'
          ? s.depositAmount && s.depositAmount > 0 && s.paymentPolicy === 'deposit_percent'
            ? s.depositAmount
            : defaultDepositPct
          : Number(s.depositAmount ?? 0);
      return {
        ...s,
        paymentPolicy: policy,
        depositAmount: depAmt,
        id: s.serviceId || s._id,
        desc: s.description,
        mode: isQuote ? 'quote' : 'instant',
        img: s.imageUrl,
      };
    });

  const bookingQuestions = rawQuestions
    .map(mapQuestion)
    .filter((q) => q.active)
    .sort((a, b) => a.sortOrder - b.sortOrder);

  if (!bookingQuestions.some((q) => q.serviceId === 'virtual_hearing')) {
    bookingQuestions.push(
      {
        _id: 'vh-hearing-type',
        title: 'Hearing Type',
        questionId: 'virtual_hearing-hearingType',
        serviceId: 'virtual_hearing',
        fieldKey: 'hearingType',
        label: 'Hearing Type',
        inputType: 'select',
        placeholder: 'Select an option',
        required: true,
        active: true,
        protected: false,
        sortOrder: 1,
        section: 'Service Details',
        feeAmount: 0,
        feeType: 'flat',
        options:
          'Virtual Court Trial, Deposition, Administrative Hearing, Arbitration / Mediation, Other',
      },
      {
        _id: 'vh-duty',
        title: 'Requested Service',
        questionId: 'virtual_hearing-duty',
        serviceId: 'virtual_hearing',
        fieldKey: 'duty',
        label: 'Requested Service',
        inputType: 'select',
        placeholder: 'Select an option',
        required: true,
        active: true,
        protected: false,
        sortOrder: 2,
        section: 'Service Details',
        feeAmount: 0,
        feeType: 'flat',
        options: 'Identity Verification & Oath, Witness Swearing-in, Attestation, Other',
      },
      {
        _id: 'vh-platform',
        title: 'Hearing Platform',
        questionId: 'virtual_hearing-platform',
        serviceId: 'virtual_hearing',
        fieldKey: 'platform',
        label: 'Hearing Platform',
        inputType: 'text',
        placeholder: 'e.g. Zoom, WebEx, Microsoft Teams',
        required: true,
        active: true,
        protected: false,
        sortOrder: 3,
        section: 'Service Details',
        feeAmount: 0,
        feeType: 'flat',
        options: '',
      },
      {
        _id: 'vh-duration',
        title: 'Expected Duration',
        questionId: 'virtual_hearing-duration',
        serviceId: 'virtual_hearing',
        fieldKey: 'duration',
        label: 'Expected Duration',
        inputType: 'select',
        placeholder: 'Select an option',
        required: true,
        active: true,
        protected: false,
        sortOrder: 4,
        section: 'Service Details',
        feeAmount: 0,
        feeType: 'flat',
        options:
          'Under 30 Minutes, 30–60 Minutes, 1–2 Hours, Half Day (2–4 Hours), Full Day (4+ Hours)',
      },
    );
  }

  const bookingAddons = rawAddons
    .map(mapAddon)
    .filter((a) => a.active)
    .sort((a, b) => a.sortOrder - b.sortOrder);

  const businessHours = rawHours
    .map(mapBusinessHour)
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((h) => ({
      ...h,
      slotTimes: generateTimeSlotsForDay(h),
    }));

  if (services.length === 0) {
    throw new Error('No active services found in ServicesCatalog CMS collection.');
  }

  const [{ placesApiKey }, { stripeSecretKey }] = await Promise.all([
    resolveGoogleApiKeys(settings),
    resolveStripeSecretKey(),
  ]);

  const {
    defaultOriginAddress: _privateOriginAddress,
    originLat: _privateOriginLat,
    originLng: _privateOriginLng,
    googlePlacesApiKey: _privatePlacesKey,
    googleRoutesApiKey: _privateRoutesKey,
    ...publicSettings
  } = settings;

  return {
    success: true,
    settings: publicSettings,
    services,
    bookingQuestions,
    bookingAddons,
    businessHours,
    serviceAreas,
    placesApiKey,
    stripeEnabled: Boolean(stripeSecretKey),
  };
}

function normalizeTime24(rawTime: unknown): string {
  const input = String(rawTime ?? '').trim();
  const tm = /(\d{1,2})(?::(\d{2}))?\s*(AM|PM)?/i.exec(input);
  if (tm) {
    let h24 = parseInt(tm[1], 10);
    const m24 = tm[2] ? tm[2].padStart(2, '0') : '00';
    const mer = (tm[3] || '').toUpperCase();
    if (mer === 'PM' && h24 < 12) h24 += 12;
    if (mer === 'AM' && h24 === 12) h24 = 0;
    return `${String(h24).padStart(2, '0')}:${m24}`;
  }
  if (/afternoon/i.test(input)) return '12:00';
  if (/evening/i.test(input)) return '16:00';
  if (/morning/i.test(input)) return '09:00';
  return '09:00';
}

function normalizePrintingLabel(rawPrinting: unknown, serviceId: string): string {
  const clean = String(rawPrinting ?? '').trim();
  if (!clean || clean === 'none') {
    return ['finger', 'i9', 'apostille', 'virtual_hearing', 'ron'].includes(serviceId)
      ? 'Not applicable for this service'
      : 'Documents already printed by client';
  }
  if (clean === 'letter' || /letter/i.test(clean)) return 'Standard Letter B&W (+$10.00)';
  if (clean === 'legal' || /legal|dual-tray/i.test(clean)) {
    return 'Dual-Tray Mixed Legal & Letter (+$20.00)';
  }
  if (clean === 'color' || /color/i.test(clean)) return 'Color Document Printing (+$25.00)';
  return clean;
}

const DEFAULT_BUSINESS_TIME_ZONE = 'America/New_York';

function buildZonedDate(
  yr: number,
  mo: number,
  da: number,
  hh: number,
  mm: number,
  timeZone = DEFAULT_BUSINESS_TIME_ZONE,
): Date {
  const utcGuess = Date.UTC(yr, mo, da, hh, mm, 0, 0);
  try {
    const fmt = new Intl.DateTimeFormat('en-US', {
      timeZone: timeZone || DEFAULT_BUSINESS_TIME_ZONE,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
    const parts = Object.fromEntries(
      fmt.formatToParts(new Date(utcGuess)).map((p) => [p.type, p.value]),
    );
    const renderedHour = Number(parts.hour === '24' ? '0' : parts.hour);
    const renderedUtc = Date.UTC(
      Number(parts.year),
      Number(parts.month) - 1,
      Number(parts.day),
      renderedHour,
      Number(parts.minute),
      Number(parts.second),
      0,
    );
    return new Date(utcGuess + (utcGuess - renderedUtc));
  } catch {
    return new Date(yr, mo, da, hh, mm, 0, 0);
  }
}

function buildAppointmentDateTime(
  appointmentTimeDate: unknown,
  cleanDateStr: string,
  time24: string,
  timeZone?: string,
): Date | undefined {
  if (appointmentTimeDate) {
    const parsed = new Date(String(appointmentTimeDate));
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }
  const dp = cleanDateStr.split('-');
  if (dp.length === 3) {
    const yr = parseInt(dp[0], 10);
    const mo = parseInt(dp[1], 10) - 1;
    const da = parseInt(dp[2], 10);
    const [hh, mm] = time24.split(':').map((n) => parseInt(n, 10) || 0);
    const candidate = buildZonedDate(yr, mo, da, hh, mm, timeZone || DEFAULT_BUSINESS_TIME_ZONE);
    if (!Number.isNaN(candidate.getTime())) return candidate;
  }
  return undefined;
}

const ONE_MIN_MS = 60 * 1000;
const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;
const TWO_HOURS_MS = 2 * 60 * 60 * 1000;

export function buildReminderSchedule(params: {
  appointmentTimeDate?: unknown;
  appointmentDate?: unknown;
  appointmentTime?: unknown;
  bookingType?: unknown;
  status?: unknown;
  clientTimeZone?: unknown;
  referenceTimeMs?: number;
}): {
  appointmentTimeDate?: Date;
  reminder24HDate?: Date;
  reminder2HDate?: Date;
  appointment24Hoursago: 'Yes' | 'No';
  appointment2Hoursago: 'Yes' | 'No';
} {
  const cleanDateStr = String(params.appointmentDate ?? '').split('T')[0];
  const time24 = normalizeTime24(params.appointmentTime);
  // Always calculate appointment and reminder timestamps using Eastern Time (America/New_York)
  const tz = DEFAULT_BUSINESS_TIME_ZONE;
  const apptDateObj = buildAppointmentDateTime(
    undefined,
    cleanDateStr,
    time24,
    tz,
  );
  const isQuote = String(params.bookingType ?? '').toLowerCase().trim() === 'quote';
  const statusNorm = String(params.status ?? '').toLowerCase().trim();
  // Reminders fire only when confirmed (cancelled, completed, or pending quotes stay 'No').
  const isReminderEligible = statusNorm ? statusNorm === 'confirmed' : !isQuote;
  const nowMs =
    typeof params.referenceTimeMs === 'number' && Number.isFinite(params.referenceTimeMs)
      ? params.referenceTimeMs
      : Date.now();

  let reminder24HDate: Date | undefined;
  let reminder2HDate: Date | undefined;
  let appointment24Hoursago: 'Yes' | 'No' = 'No';
  let appointment2Hoursago: 'Yes' | 'No' = 'No';

  if (apptDateObj && !Number.isNaN(apptDateObj.getTime())) {
    const apptMs = apptDateObj.getTime();
    const r24Ms = apptMs - TWENTY_FOUR_HOURS_MS;
    const r2Ms = apptMs - TWO_HOURS_MS;
    reminder24HDate = new Date(r24Ms);
    reminder2HDate = new Date(r2Ms);

    if (isReminderEligible && r24Ms - nowMs >= ONE_MIN_MS) {
      appointment24Hoursago = 'Yes';
    }
    if (isReminderEligible && r2Ms - nowMs >= ONE_MIN_MS) {
      appointment2Hoursago = 'Yes';
    }
  }

  return {
    appointmentTimeDate: apptDateObj,
    reminder24HDate,
    reminder2HDate,
    appointment24Hoursago,
    appointment2Hoursago,
  };
}

export async function insertElevatedBooking(payload: RawItem) {
  const clientName = String(payload.clientName ?? '').trim();
  const clientEmail = String(payload.clientEmail ?? '').trim();
  if (!clientName || !clientEmail) {
    throw new Error('Client name and email are required.');
  }

  let settings: OwnerSettingsRecord | undefined;
  try {
    settings = await readOwnerSettingsStrict();
  } catch {
    settings = undefined;
  }

  const bookingType = payload.bookingType === 'quote' ? 'quote' : 'instant';
  const bookingRef =
    String(payload.bookingRef ?? '').trim() || `DMN-${Date.now().toString().slice(-6)}`;
  const serviceName = String(payload.serviceName ?? '').trim();
  const serviceId = String(payload.serviceId ?? '').toLowerCase().trim();
  const isRon = serviceId === 'ron';

  const serviceFee = Number(payload.serviceFee ?? 0);
  const travelFee = isRon ? 0 : Number(payload.travelFee ?? 0);
  const addonsFee = Number(payload.addonsFee ?? 0);
  const grandTotal = isRon
    ? Number((serviceFee + addonsFee).toFixed(2))
    : Number(payload.grandTotal ?? serviceFee + travelFee + addonsFee);

  const cleanDateStr = String(payload.appointmentDate ?? '').split('T')[0];
  const time24 = normalizeTime24(payload.appointmentTime24 || payload.appointmentTime);
  const amountPaidNum = Number(payload.amountPaid ?? 0);
  const resolvedStatus =
    String(payload.status ?? '').trim() ||
    (bookingType === 'quote'
      ? 'Pending Quote Approval'
      : amountPaidNum > 0
        ? 'Confirmed'
        : 'Pending Approval');
  const submittedDateObj = payload.submittedAt
    ? new Date(String(payload.submittedAt))
    : new Date();
  const submittedIso = !Number.isNaN(submittedDateObj.getTime())
    ? submittedDateObj.toISOString()
    : new Date().toISOString();
  const referenceTimeMs = !Number.isNaN(submittedDateObj.getTime())
    ? submittedDateObj.getTime()
    : Date.now();
  const schedule = buildReminderSchedule({
    appointmentTimeDate: payload.appointmentTimeDate,
    appointmentDate: cleanDateStr,
    appointmentTime: time24,
    bookingType,
    status: resolvedStatus,
    clientTimeZone: payload.clientTimeZone,
    referenceTimeMs,
  });
  const apptDateObj = schedule.appointmentTimeDate;

  const rawFiles = Array.isArray(payload.uploadedFiles)
    ? payload.uploadedFiles
    : Array.isArray(payload.uploadedFilesList)
      ? payload.uploadedFilesList
      : [];

  const mediaGallery = rawFiles
    .filter((f): f is RawItem => Boolean(f && typeof f === 'object'))
    .filter((f) => Boolean(f.wixUrl || f.fileUrl || f.url))
    .map((f) => ({
      type: String(f.type ?? '').startsWith('image/') ? 'image' : 'document',
      src: String(f.wixUrl || f.fileUrl || f.url),
      title: String(f.name || 'Uploaded Document'),
      name: String(f.name || 'Uploaded Document'),
      url: String(f.url || f.fileUrl || f.wixUrl),
    }));

  const uploadedFilesSummary =
    String(payload.uploadedFilesSummary ?? '').trim() ||
    (mediaGallery.length > 0 ? mediaGallery.map((m) => m.name).join(', ') : 'None');

  const titleStr = serviceName
    ? `${bookingRef} - ${clientName} - ${serviceName}`
    : `${bookingRef} - ${clientName}`;
  const idConfirmed =
    payload.idVerifiedConfirmed === true ||
    String(payload.idVerifiedConfirmed ?? '').toLowerCase() === 'yes'
      ? 'Yes'
      : 'No';

  const record: RawItem = {
    title: titleStr,
    Title: titleStr,
    bookingRef,
    serviceName,
    serviceId,
    bookingType,
    status: resolvedStatus,
    clientName,
    clientPhone: String(payload.clientPhone ?? ''),
    clientEmail,
    fullServiceAddress: String(payload.fullServiceAddress ?? ''),
    destinationAddress: String(payload.destinationAddress || payload.fullServiceAddress || ''),
    city: String(payload.city ?? ''),
    state: String(payload.state ?? 'NC'),
    zip: String(payload.zip ?? ''),
    locationType: String(payload.locationType ?? ''),
    originAddressUsed: settings?.defaultOriginAddress || String(payload.originAddressUsed ?? ''),
    originShort: settings?.defaultOriginLabel || String(payload.originShort ?? ''),
    originZip: settings?.defaultOriginZip || String(payload.originZip ?? ''),
    tripCalculationMode: payload.tripCalculationMode === 'round-trip' ? 'round-trip' : 'one-way',
    drivingMiles: isRon ? 0 : Number(payload.drivingMiles ?? 0),
    drivingMinutes: isRon ? 0 : Number(payload.drivingMinutes ?? 0),
    appointmentDate: cleanDateStr,
    appointmentTime: time24,
    appointmentTimeDate: apptDateObj,
    ...(schedule.reminder24HDate
      ? { reminder24HDate: schedule.reminder24HDate, reminder24hDate: schedule.reminder24HDate }
      : {}),
    ...(schedule.reminder2HDate
      ? { reminder2HDate: schedule.reminder2HDate, reminder2hDate: schedule.reminder2HDate }
      : {}),
    appointment24Hoursago: schedule.appointment24Hoursago,
    appointment24hoursago: schedule.appointment24Hoursago,
    appointment2Hoursago: schedule.appointment2Hoursago,
    appointment2hoursago: schedule.appointment2Hoursago,
    cancelEmailTrigger: 'No',
    rescheduleEmailTrigger: 'No',
    quoteApprovedEmailTrigger: 'No',
    signersCount: Number(payload.signersCount ?? 1),
    notarizedSignatures: Number(payload.notarizedSignatures ?? 0),
    pageCount: String(payload.pageCount ?? '1–25 pages'),
    printingOption: normalizePrintingLabel(payload.printingOption, serviceId),
    witnessOption: String(payload.witnessOption ?? 'No witness needed'),
    uploadedFilesSummary,
    uploadedFiles: mediaGallery,
    Uploadedfiles: mediaGallery,
    serviceFee,
    travelFee,
    addonsFee,
    addonsSummary: String(payload.addonsSummary ?? ''),
    grandTotal,
    selectedAddons:
      typeof payload.selectedAddons === 'string'
        ? payload.selectedAddons
        : JSON.stringify(payload.selectedAddons ?? []),
    paymentPreference: String(payload.paymentPreference ?? ''),
    paymentStatus:
      String(payload.paymentStatus ?? '').trim() ||
      (bookingType === 'quote' ? 'Quote Review' : 'Pay at Appointment'),
    amountPaid: Number(payload.amountPaid ?? 0),
    balanceDue:
      payload.balanceDue != null ? Number(payload.balanceDue) : Math.max(0, grandTotal),
    stripeSessionId: String(payload.stripeSessionId ?? ''),
    stripePaymentIntentId: String(payload.stripePaymentIntentId ?? ''),
    specialInstructions: String(payload.specialInstructions ?? ''),
    serviceSpecificDetails:
      typeof payload.serviceSpecificDetails === 'string'
        ? payload.serviceSpecificDetails
        : JSON.stringify(payload.serviceSpecificDetails ?? {}),
    idVerifiedConfirmed: idConfirmed,
    submittedAt: submittedIso,
  };

  const elevatedInsert = auth.elevate(items.insert);
  const inserted = await elevatedInsert(COLLECTION_IDS.APPOINTMENTS, record);
  const insertedId = String(inserted?._id ?? '');

  // When an Instant Booking is confirmed upon receiving the required 50% deposit,
  // pulse an Item Updated event so the 24-hour and 2-hour reminder automations schedule immediately,
  // then reset all trigger fields back to 'No' after 4 seconds.
  if (
    insertedId &&
    resolvedStatus === 'Confirmed' &&
    (schedule.appointment24Hoursago === 'Yes' || schedule.appointment2Hoursago === 'Yes')
  ) {
    const elevatedUpdate = auth.elevate(items.update);
    try {
      await elevatedUpdate(COLLECTION_IDS.APPOINTMENTS, {
        ...inserted,
        ...record,
        _id: insertedId,
        quoteApprovedEmailTrigger: 'Yes',
      });
      setTimeout(() => {
        void elevatedUpdate(COLLECTION_IDS.APPOINTMENTS, {
          ...inserted,
          ...record,
          _id: insertedId,
          cancelEmailTrigger: 'No',
          rescheduleEmailTrigger: 'No',
          quoteApprovedEmailTrigger: 'No',
        }).catch(() => undefined);
      }, 4000);
    } catch {
      // Non-blocking if post-insert reminder trigger update fails.
    }
  }

  return {
    success: true,
    bookingRef,
    recordId: insertedId,
  };
}

function haveAppointmentDateOrTimeChanged(nextRow: RawItem, existingRow?: RawItem): boolean {
  if (!existingRow) return false;
  const prevDate = String(existingRow.appointmentDate ?? '').split('T')[0].trim();
  const nextDate = String(nextRow.appointmentDate ?? existingRow.appointmentDate ?? '')
    .split('T')[0]
    .trim();
  const prevTime = normalizeTime24(existingRow.appointmentTime24 || existingRow.appointmentTime);
  const nextTime = normalizeTime24(
    nextRow.appointmentTime24 ||
      nextRow.appointmentTime ||
      existingRow.appointmentTime24 ||
      existingRow.appointmentTime,
  );
  return prevDate !== nextDate || prevTime !== nextTime;
}

export function buildLifecycleEmailTriggers(
  nextRow: RawItem,
  existingRow?: RawItem,
): {
  cancelEmailTrigger: 'Yes' | 'No';
  rescheduleEmailTrigger: 'Yes' | 'No';
  quoteApprovedEmailTrigger: 'Yes' | 'No';
} {
  const nextStatus = String(nextRow.status ?? '').toLowerCase().trim();
  if (!existingRow) {
    return {
      cancelEmailTrigger: nextStatus === 'cancelled' ? 'Yes' : 'No',
      rescheduleEmailTrigger: 'No',
      quoteApprovedEmailTrigger: 'No',
    };
  }

  const prevStatus = String(existingRow.status ?? '').toLowerCase().trim();
  const dateChanged = haveAppointmentDateOrTimeChanged(nextRow, existingRow);

  const cancelEmailTrigger: 'Yes' | 'No' =
    prevStatus !== 'cancelled' && nextStatus === 'cancelled' ? 'Yes' : 'No';
  const quoteApprovedEmailTrigger: 'Yes' | 'No' =
    prevStatus !== 'confirmed' && nextStatus === 'confirmed'
      ? 'Yes'
      : 'No';
  const rescheduleEmailTrigger: 'Yes' | 'No' =
    dateChanged && nextStatus === 'confirmed' && quoteApprovedEmailTrigger === 'No' ? 'Yes' : 'No';

  return {
    cancelEmailTrigger,
    rescheduleEmailTrigger,
    quoteApprovedEmailTrigger,
  };
}

export function withAppointmentReminders<T extends RawItem>(
  raw: T,
  referenceTimeMs = Date.now(),
  options?: { recomputeDateTime?: boolean; existing?: RawItem },
): T {
  const dateChanged =
    Boolean(options?.recomputeDateTime) || haveAppointmentDateOrTimeChanged(raw, options?.existing);
  const schedule = buildReminderSchedule({
    appointmentTimeDate: dateChanged ? undefined : raw.appointmentTimeDate,
    appointmentDate: raw.appointmentDate,
    appointmentTime: raw.appointmentTime24 || raw.appointmentTime,
    bookingType: raw.bookingType,
    status: raw.status,
    clientTimeZone: raw.clientTimeZone,
    referenceTimeMs,
  });
  const triggers = buildLifecycleEmailTriggers(raw, options?.existing);
  const statusNorm = String(raw.status ?? '').toLowerCase().trim();
  const grandTotalNum = Math.max(0, Number(raw.grandTotal ?? 0));
  let amountPaidNum = Number(raw.amountPaid ?? 0);
  let balanceDueNum =
    raw.balanceDue != null ? Number(raw.balanceDue) : Math.max(0, grandTotalNum - amountPaidNum);

  if (statusNorm === 'confirmed' && grandTotalNum > 0 && amountPaidNum <= 0) {
    amountPaidNum = Number((grandTotalNum * 0.5).toFixed(2));
    balanceDueNum = Number(Math.max(0, grandTotalNum - amountPaidNum).toFixed(2));
  }

  return {
    ...raw,
    amountPaid: amountPaidNum,
    balanceDue: balanceDueNum,
    ...(schedule.appointmentTimeDate ? { appointmentTimeDate: schedule.appointmentTimeDate } : {}),
    ...(schedule.reminder24HDate
      ? { reminder24HDate: schedule.reminder24HDate, reminder24hDate: schedule.reminder24HDate }
      : {}),
    ...(schedule.reminder2HDate
      ? { reminder2HDate: schedule.reminder2HDate, reminder2hDate: schedule.reminder2HDate }
      : {}),
    appointment24Hoursago: schedule.appointment24Hoursago,
    appointment24hoursago: schedule.appointment24Hoursago,
    appointment2Hoursago: schedule.appointment2Hoursago,
    appointment2hoursago: schedule.appointment2Hoursago,
    cancelEmailTrigger: triggers.cancelEmailTrigger,
    rescheduleEmailTrigger: triggers.rescheduleEmailTrigger,
    quoteApprovedEmailTrigger:
      triggers.quoteApprovedEmailTrigger === 'Yes' || triggers.rescheduleEmailTrigger === 'Yes'
        ? 'Yes'
        : 'No',
  };
}

function hasValidDateValue(val: unknown): boolean {
  if (!val) return false;
  if (val instanceof Date) return !Number.isNaN(val.getTime());
  if (typeof val === 'string' || typeof val === 'number') {
    return !Number.isNaN(new Date(val).getTime());
  }
  return false;
}

export async function backfillMissingAppointmentReminders(rows: RawItem[]): Promise<RawItem[]> {
  const nowMs = Date.now();
  const elevatedUpdate = auth.elevate(items.update);

  return Promise.all(
    rows.map(async (row) => {
      const flag24Val = row.appointment24Hoursago ?? row.appointment24hoursago;
      const flag2Val = row.appointment2Hoursago ?? row.appointment2hoursago;
      const date24Val = row.reminder24HDate ?? row.reminder24hDate;
      const date2Val = row.reminder2HDate ?? row.reminder2hDate;
      const hasFlag24 = flag24Val === 'Yes' || flag24Val === 'No';
      const hasFlag2 = flag2Val === 'Yes' || flag2Val === 'No';
      const schedule = buildReminderSchedule({
        appointmentTimeDate: row.appointmentTimeDate,
        appointmentDate: row.appointmentDate,
        appointmentTime: row.appointmentTime24 || row.appointmentTime,
        bookingType: row.bookingType,
        status: row.status,
        clientTimeZone: row.clientTimeZone,
        referenceTimeMs: nowMs,
      });

      const statusNorm = String(row.status ?? '').toLowerCase().trim();
      const nonConfirmed = Boolean(statusNorm) && statusNorm !== 'confirmed';
      const clearStale24 = nonConfirmed && flag24Val === 'Yes';
      const clearStale2 = nonConfirmed && flag2Val === 'Yes';
      const needsDate24 = Boolean(schedule.reminder24HDate) && !hasValidDateValue(date24Val);
      const needsDate2 = Boolean(schedule.reminder2HDate) && !hasValidDateValue(date2Val);

      if (hasFlag24 && hasFlag2 && !clearStale24 && !clearStale2 && !needsDate24 && !needsDate2) {
        return row;
      }

      const nextFlag24 = clearStale24
        ? 'No'
        : hasFlag24
          ? flag24Val
          : schedule.appointment24Hoursago;
      const nextFlag2 = clearStale2
        ? 'No'
        : hasFlag2
          ? flag2Val
          : schedule.appointment2Hoursago;

      const patched: RawItem = {
        ...row,
        ...(schedule.reminder24HDate
          ? { reminder24HDate: schedule.reminder24HDate, reminder24hDate: schedule.reminder24HDate }
          : {}),
        ...(schedule.reminder2HDate
          ? { reminder2HDate: schedule.reminder2HDate, reminder2hDate: schedule.reminder2HDate }
          : {}),
        appointment24Hoursago: nextFlag24,
        appointment24hoursago: nextFlag24,
        appointment2Hoursago: nextFlag2,
        appointment2hoursago: nextFlag2,
        cancelEmailTrigger: 'No',
        rescheduleEmailTrigger: 'No',
        quoteApprovedEmailTrigger: 'No',
      };

      if (typeof row._id === 'string' && row._id.trim()) {
        try {
          await elevatedUpdate(COLLECTION_IDS.APPOINTMENTS, {
            ...patched,
            _id: row._id,
          });
        } catch {
          // Keep dashboard read resilient if a legacy row update fails validation.
        }
      }

      return patched;
    }),
  );
}
