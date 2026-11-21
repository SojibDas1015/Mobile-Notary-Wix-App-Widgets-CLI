import type { APIRoute } from '@wix/custom-extensions/types';
import { items } from '@wix/data';
import { auth } from '@wix/essentials';
import {
  backfillMissingAppointmentReminders,
  resolveGoogleApiKeys,
  withAppointmentReminders,
} from '../server/notary-service';
import {
  ensureCustomerReviewsCollection,
  getReviewsConfig,
  lookupGooglePlaceId,
  saveReviewsConfig,
  syncGoogleReviews,
} from '../server/reviews-service';
import { mapOwnerSettings } from '../extensions/dashboard/cms/mappers';

type RawItem = Record<string, unknown>;

const ALLOWED_COLLECTIONS = new Set([
  'AppointmentsAndQuotes',
  'ServicesCatalog',
  'BookingQuestions',
  'BookingAddons',
  'BusinessHours',
  'OwnerSettings',
  'ServiceAreas',
  'CustomerReviews',
]);

async function requireDashboardUser(): Promise<Response | null> {
  try {
    const tokenInfo = await auth.getTokenInfo();
    if (!tokenInfo?.active) {
      return Response.json({ success: false, error: 'Inactive session.' }, { status: 401 });
    }
    if (tokenInfo.subjectType !== 'USER' && tokenInfo.subjectType !== 'APP') {
      return Response.json(
        { success: false, error: 'Dashboard collaborator authorization required.' },
        { status: 403 },
      );
    }
    return null;
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Authorization check failed.';
    return Response.json({ success: false, error: msg }, { status: 401 });
  }
}

async function queryAllElevated(collectionId: string, sortField?: string): Promise<RawItem[]> {
  const all: RawItem[] = [];
  let skip = 0;
  const pageSize = 100;
  const elevatedQuery = auth.elevate(items.query);

  while (true) {
    let q = elevatedQuery(collectionId).limit(pageSize).skip(skip);
    if (sortField) {
      q = sortField === '_createdDate' ? q.descending('_createdDate') : q.ascending(sortField);
    }
    const res = await q.find();
    const batch = (res.items ?? []) as RawItem[];
    all.push(...batch);
    if (batch.length < pageSize) break;
    skip += pageSize;
  }

  return all;
}

interface DashboardCmsRequest {
  op:
    | 'queryAll'
    | 'get'
    | 'save'
    | 'remove'
    | 'secretStatus'
    | 'overview'
    | 'reviewsConfig'
    | 'saveReviewsConfig'
    | 'lookupPlaceId'
    | 'syncGoogleReviews';
  collectionId?: string;
  sortField?: string;
  id?: string;
  item?: RawItem;
  googlePlaceId?: string;
  googleReviewLink?: string;
  query?: string;
}

export const POST: APIRoute = async ({ request }) => {
  const authError = await requireDashboardUser();
  if (authError) return authError;

  try {
    const body = (await request.json()) as DashboardCmsRequest;
    const { op, collectionId = '', sortField, id, item } = body;

    if (op === 'reviewsConfig') {
      const config = await getReviewsConfig();
      return Response.json({ success: true, ...config });
    }

    if (op === 'saveReviewsConfig') {
      const saved = await saveReviewsConfig({
        googlePlaceId: body.googlePlaceId,
        googleReviewLink: body.googleReviewLink,
      });
      return Response.json({ success: true, ...saved });
    }

    if (op === 'lookupPlaceId') {
      const found = await lookupGooglePlaceId(body.query || '');
      return Response.json({ success: true, ...found });
    }

    if (op === 'syncGoogleReviews') {
      const synced = await syncGoogleReviews(body.googlePlaceId);
      return Response.json(synced);
    }

    if (op === 'secretStatus') {
      const settingsRows = await queryAllElevated('OwnerSettings');
      const preferred =
        settingsRows.find((r) => r.ID === 'dmn-settings-01' || r.settingsId === 'dmn-settings-01') ??
        settingsRows[0] ??
        {};
      const keys = await resolveGoogleApiKeys(mapOwnerSettings(preferred));
      return Response.json({
        success: true,
        hasPlacesKey: Boolean(keys.placesApiKey),
        hasRoutesKey: Boolean(keys.routesApiKey),
        secretError: keys.secretError || '',
      });
    }

    if (op === 'overview') {
      const [bookings, services, settingsRows] = await Promise.all([
        queryAllElevated('AppointmentsAndQuotes'),
        queryAllElevated('ServicesCatalog'),
        queryAllElevated('OwnerSettings'),
      ]);
      const preferred =
        settingsRows.find((r) => r.ID === 'dmn-settings-01' || r.settingsId === 'dmn-settings-01') ??
        settingsRows[0] ??
        {};
      const owner = mapOwnerSettings(preferred);
      const keys = await resolveGoogleApiKeys(owner);
      const pendingQuotes = bookings.filter(
        (b) => String(b.status ?? '') === 'Pending Quote Approval',
      ).length;
      const activeServices = services.filter((s) => s.active !== false).length;

      return Response.json({
        success: true,
        totalBookings: bookings.length,
        pendingQuotes,
        activeServices,
        originLabel: owner.defaultOriginLabel || owner.defaultOriginAddress || 'Not configured',
        tripMode: owner.tripCalculationMode,
        hasPlacesKey: Boolean(keys.placesApiKey),
        hasRoutesKey: Boolean(keys.routesApiKey),
        secretError: keys.secretError || '',
      });
    }

    if (!collectionId || !ALLOWED_COLLECTIONS.has(collectionId)) {
      return Response.json(
        { success: false, error: `Unsupported collection: ${collectionId}` },
        { status: 400 },
      );
    }

    if (collectionId === 'CustomerReviews') {
      await ensureCustomerReviewsCollection();
    }

    if (op === 'queryAll') {
      const list = await queryAllElevated(collectionId, sortField);
      const result =
        collectionId === 'AppointmentsAndQuotes'
          ? await backfillMissingAppointmentReminders(list)
          : list;
      return Response.json({ success: true, items: result });
    }

    if (op === 'get') {
      if (!id) {
        return Response.json({ success: false, error: 'Item id is required.' }, { status: 400 });
      }
      const elevatedGet = auth.elevate(items.get);
      const found = await elevatedGet(collectionId, id);
      return Response.json({ success: true, item: found ?? null });
    }

    if (op === 'save') {
      if (!item || typeof item !== 'object') {
        return Response.json({ success: false, error: 'Item payload is required.' }, { status: 400 });
      }
      const itemId = typeof item._id === 'string' && item._id.trim() ? item._id.trim() : '';

      if (itemId) {
        const elevatedGet = auth.elevate(items.get);
        const existing = (await elevatedGet(collectionId, itemId).catch(() => undefined)) as
          | RawItem
          | undefined;
        const merged = {
          ...existing,
          ...item,
          _id: itemId,
        };
        const toUpdate =
          collectionId === 'AppointmentsAndQuotes'
            ? withAppointmentReminders(merged)
            : merged;
        const elevatedUpdate = auth.elevate(items.update);
        const updated = await elevatedUpdate(collectionId, {
          ...toUpdate,
          _id: itemId,
        });
        return Response.json({ success: true, item: updated });
      }

      const toInsertRaw: RawItem = { ...item };
      delete toInsertRaw._id;
      const toInsert =
        collectionId === 'AppointmentsAndQuotes'
          ? withAppointmentReminders(toInsertRaw)
          : toInsertRaw;
      const elevatedInsert = auth.elevate(items.insert);
      const inserted = await elevatedInsert(collectionId, toInsert);
      return Response.json({ success: true, item: inserted });
    }

    if (op === 'remove') {
      if (!id) {
        return Response.json({ success: false, error: 'Item id is required.' }, { status: 400 });
      }
      const elevatedRemove = auth.elevate(items.remove);
      await elevatedRemove(collectionId, id);
      return Response.json({ success: true });
    }

    return Response.json({ success: false, error: `Unknown op: ${String(op)}` }, { status: 400 });
  } catch (error: unknown) {
    let message = 'CMS operation failed.';
    if (error instanceof Error && error.message) {
      message = error.message;
    } else if (error && typeof error === 'object') {
      const errObj = error as {
        message?: string;
        details?: { applicationError?: { description?: string; code?: number | string } };
      };
      message =
        errObj.details?.applicationError?.description ||
        errObj.message ||
        JSON.stringify(error);
    }
    return Response.json({ success: false, error: message }, { status: 500 });
  }
};
