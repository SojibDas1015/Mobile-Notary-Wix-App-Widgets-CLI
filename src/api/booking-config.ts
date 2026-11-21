import type { APIRoute } from '@wix/custom-extensions/types';
import { getLiveBookingConfig } from '../server/notary-service';

export const GET: APIRoute = async () => {
  try {
    const config = await getLiveBookingConfig();
    return new Response(JSON.stringify(config), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unable to load booking configuration from CMS.';
    return new Response(
      JSON.stringify({ success: false, error: message }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      },
    );
  }
};
