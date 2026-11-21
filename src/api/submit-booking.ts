import type { APIRoute } from '@wix/custom-extensions/types';
import { insertElevatedBooking } from '../server/notary-service';

export const POST: APIRoute = async ({ request }) => {
  try {
    const payload = (await request.json()) as Record<string, unknown>;
    const result = await insertElevatedBooking(payload);
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to save booking.';
    return new Response(
      JSON.stringify({ success: false, error: message }),
      { status: 400, headers: { 'Content-Type': 'application/json' } },
    );
  }
};
