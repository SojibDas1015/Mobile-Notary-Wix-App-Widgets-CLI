import type { APIRoute } from '@wix/custom-extensions/types';
import {
  completeStripeCheckoutBooking,
  createStripeCheckoutSession,
} from '../server/stripe-service';

interface StripeCheckoutRequest {
  action?: 'create' | 'complete';
  sessionId?: string;
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
  bookingData?: Record<string, unknown>;
}

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = (await request.json()) as StripeCheckoutRequest;

    if (body.action === 'complete') {
      const result = await completeStripeCheckoutBooking({
        sessionId: String(body.sessionId ?? ''),
        bookingData: body.bookingData ?? {},
      });
      return Response.json(result);
    }

    const result = await createStripeCheckoutSession(body);
    return Response.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Stripe payment processing failed.';
    return Response.json({ success: false, error: message }, { status: 400 });
  }
};
