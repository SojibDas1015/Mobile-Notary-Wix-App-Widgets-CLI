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

  const services = rawServices
    .map(mapService)
    .filter((s) => s.active && (settings.enableRonService || s.serviceId !== 'ron'))
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((s) => ({
      ...s,
      id: s.serviceId || s._id,
      desc: s.description,
      mode: s.isQuoteOnly || s.pricingModel === 'quote_only' ? 'quote' : 'instant',
      img: s.imageUrl,
    }));

  const bookingQuestions = rawQuestions
    .map(mapQuestion)
    .filter((q) => q.active)
    .sort((a, b) => a.sortOrder - b.sortOrder);

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

  const { placesApiKey, routesApiKey } = await resolveGoogleApiKeys(settings);

  if ((!settings.originLat || !settings.originLng) && settings.defaultOriginAddress) {
    const geo = await geocodeOriginAddress(
      settings.defaultOriginAddress,
      placesApiKey || routesApiKey,
    );
    if (geo) {
      settings.originLat = geo.lat;
      settings.originLng = geo.lng;
    }
  }

  const {
    defaultOriginAddress: _privateOriginAddress,
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

function buildAppointmentDateTime(
  appointmentTimeDate: unknown,
  cleanDateStr: string,
  time24: string,
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
    const candidate = new Date(yr, mo, da, hh, mm, 0, 0);
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
  const apptDateObj = buildAppointmentDateTime(
    params.appointmentTimeDate,
    cleanDateStr,
    time24,
  );
  const isQuote = String(params.bookingType ?? '').toLowerCase().trim() === 'quote';
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

    if (!isQuote && r24Ms - nowMs >= ONE_MIN_MS) {
      appointment24Hoursago = 'Yes';
    }
    if (!isQuote && r2Ms - nowMs >= ONE_MIN_MS) {
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
    status:
      String(payload.status ?? '').trim() ||
      (bookingType === 'quote' ? 'Pending Quote Approval' : 'Confirmed'),
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
    ...(schedule.reminder24HDate ? { reminder24HDate: schedule.reminder24HDate } : {}),
    ...(schedule.reminder2HDate ? { reminder2HDate: schedule.reminder2HDate } : {}),
    appointment24Hoursago: schedule.appointment24Hoursago,
    appointment2Hoursago: schedule.appointment2Hoursago,
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

  return {
    success: true,
    bookingRef,
    recordId: String(inserted?._id ?? ''),
  };
}

export function withAppointmentReminders<T extends RawItem>(
  raw: T,
  referenceTimeMs = Date.now(),
): T {
  const schedule = buildReminderSchedule({
    appointmentTimeDate: raw.appointmentTimeDate,
    appointmentDate: raw.appointmentDate,
    appointmentTime: raw.appointmentTime24 || raw.appointmentTime,
    bookingType: raw.bookingType,
    referenceTimeMs,
  });
  return {
    ...raw,
    ...(schedule.reminder24HDate ? { reminder24HDate: schedule.reminder24HDate } : {}),
    ...(schedule.reminder2HDate ? { reminder2HDate: schedule.reminder2HDate } : {}),
    appointment24Hoursago: schedule.appointment24Hoursago,
    appointment2Hoursago: schedule.appointment2Hoursago,
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
      const hasFlag24 = row.appointment24Hoursago === 'Yes' || row.appointment24Hoursago === 'No';
      const hasFlag2 = row.appointment2Hoursago === 'Yes' || row.appointment2Hoursago === 'No';
      const schedule = buildReminderSchedule({
        appointmentTimeDate: row.appointmentTimeDate,
        appointmentDate: row.appointmentDate,
        appointmentTime: row.appointmentTime24 || row.appointmentTime,
        bookingType: row.bookingType,
        referenceTimeMs: nowMs,
      });

      const needsDate24 = Boolean(schedule.reminder24HDate) && !hasValidDateValue(row.reminder24HDate);
      const needsDate2 = Boolean(schedule.reminder2HDate) && !hasValidDateValue(row.reminder2HDate);

      if (hasFlag24 && hasFlag2 && !needsDate24 && !needsDate2) {
        return row;
      }

      const patched: RawItem = {
        ...row,
        ...(schedule.reminder24HDate ? { reminder24HDate: schedule.reminder24HDate } : {}),
        ...(schedule.reminder2HDate ? { reminder2HDate: schedule.reminder2HDate } : {}),
        appointment24Hoursago: hasFlag24 ? row.appointment24Hoursago : schedule.appointment24Hoursago,
        appointment2Hoursago: hasFlag2 ? row.appointment2Hoursago : schedule.appointment2Hoursago,
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
