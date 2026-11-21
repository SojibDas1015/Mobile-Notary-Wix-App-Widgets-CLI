import type { APIRoute } from '@wix/custom-extensions/types';
import { readOwnerSettingsStrict, resolveGoogleApiKeys } from '../server/notary-service';

interface RouteBody {
  origin?: string;
  destination?: string;
}

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = (await request.json()) as RouteBody;
    const destination = String(body.destination ?? '').trim();
    if (destination.length < 4) {
      return new Response(
        JSON.stringify({ success: false, error: 'A valid destination address is required.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } },
      );
    }

    const settings = await readOwnerSettingsStrict();
    const origin = settings.defaultOriginAddress;
    const { routesApiKey: apiKey, secretError } = await resolveGoogleApiKeys(settings);

    if (!apiKey) {
      const detail = secretError
        ? ` (${secretError})`
        : '';
      return new Response(
        JSON.stringify({
          success: false,
          error:
            `Google Routes API key could not be read from Wix Secrets Manager${detail}. Enable the "Manage Secrets" permission scope in Wix Dev Center -> Permissions and update the app.`,
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } },
      );
    }

    const response = await fetch('https://routes.googleapis.com/directions/v2:computeRoutes', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': 'routes.distanceMeters,routes.duration,routes.polyline.encodedPolyline',
      },
      body: JSON.stringify({
        origin: { address: origin },
        destination: { address: destination },
        travelMode: 'DRIVE',
        routingPreference: 'TRAFFIC_UNAWARE',
        units: 'IMPERIAL',
      }),
    });

    const data = (await response.json()) as {
      error?: { message?: string };
      routes?: Array<{
        distanceMeters?: number;
        duration?: string;
        polyline?: { encodedPolyline?: string };
      }>;
    };

    if (!response.ok || !data.routes?.length) {
      return new Response(
        JSON.stringify({
          success: false,
          error: data.error?.message || 'No driving route found for this address.',
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } },
      );
    }

    const route = data.routes[0];
    const oneWayMeters = Number(route.distanceMeters ?? 0);
    const oneWaySeconds = parseInt(String(route.duration ?? '0').replace('s', ''), 10) || 0;
    const multiplier = settings.tripCalculationMode === 'round-trip' ? 2 : 1;

    const oneWayMiles = Number((oneWayMeters / 1609.344).toFixed(1));
    const oneWayMinutes = Math.max(1, Math.round(oneWaySeconds / 60));
    const miles = Number((oneWayMiles * multiplier).toFixed(1));
    const minutes = oneWayMinutes * multiplier;

    const includedMiles = Math.max(0, settings.baseTravelMiles);
    const billableExtraMiles = Math.max(0, miles - includedMiles);
    const travelFee = Number(
      (settings.baseTravelFee + billableExtraMiles * settings.perMileRate).toFixed(2),
    );

    return new Response(
      JSON.stringify({
        success: true,
        originUsed: settings.defaultOriginLabel || 'Private Dispatch Hub',
        originShort: settings.defaultOriginLabel,
        originZip: settings.defaultOriginZip,
        destinationUsed: destination,
        tripCalculationMode: settings.tripCalculationMode,
        oneWayMiles,
        oneWayMinutes,
        miles,
        minutes,
        distanceMiles: miles,
        durationMinutes: minutes,
        encodedPolyline: route.polyline?.encodedPolyline || '',
        travelFee,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to calculate driving route.';
    return new Response(
      JSON.stringify({ success: false, error: message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }
};
