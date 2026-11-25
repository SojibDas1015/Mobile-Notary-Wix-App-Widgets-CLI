import { httpClient } from '@wix/essentials';
import {
  COLLECTION_IDS,
  type AddonRecord,
  type BookingRecord,
  type BusinessHourRecord,
  type OwnerSettingsRecord,
  type PageQueryParams,
  type PageResult,
  type QuestionRecord,
  type ReviewRecord,
  type ServiceAreaRecord,
  type ServiceRecord,
} from './types';
import {
  DAY_DEFAULTS,
  mapAddon,
  mapBooking,
  mapBusinessHour,
  mapOwnerSettings,
  mapQuestion,
  mapReview,
  mapService,
  mapServiceArea,
} from './mappers';

type RawItem = Record<string, unknown>;

function dashboardCmsUrl(): string {
  const origin = new URL(import.meta.url).origin;
  const basePath = import.meta.env.WIX_SERVER_BASE_PATH || '/';
  const normalizedBase = basePath.endsWith('/') ? basePath : `${basePath}/`;
  return `${origin}${normalizedBase}dashboard-cms`;
}

async function callDashboardCms<T extends { success?: boolean; error?: string }>(
  payload: Record<string, unknown>,
): Promise<T> {
  const response = await httpClient.fetchWithAuth(dashboardCmsUrl(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const text = await response.text();
  let parsed: T;
  try {
    parsed = JSON.parse(text) as T;
  } catch {
    throw new Error(`Dashboard API HTTP ${response.status}: ${text.slice(0, 140)}`);
  }
  if (!response.ok || parsed.success === false) {
    throw new Error(parsed.error || `Dashboard API error (${response.status})`);
  }
  return parsed;
}

async function queryAllRaw(collectionId: string, sortField?: string): Promise<RawItem[]> {
  const res = await callDashboardCms<{ success: boolean; items?: RawItem[] }>({
    op: 'queryAll',
    collectionId,
    sortField,
  });
  return res.items ?? [];
}

async function getRawById(collectionId: string, id: string): Promise<RawItem | undefined> {
  const res = await callDashboardCms<{ success: boolean; item?: RawItem | null }>({
    op: 'get',
    collectionId,
    id,
  });
  return res.item ?? undefined;
}

async function saveRaw(collectionId: string, item: RawItem): Promise<RawItem> {
  const res = await callDashboardCms<{ success: boolean; item?: RawItem }>({
    op: 'save',
    collectionId,
    item,
  });
  return res.item ?? item;
}

export interface SecretStatusResult {
  hasPlacesKey: boolean;
  hasRoutesKey: boolean;
  hasStripeKey: boolean;
  secretError: string;
}

export interface DashboardOverviewResult extends SecretStatusResult {
  totalBookings: number;
  pendingQuotes: number;
  activeServices: number;
  originLabel: string;
  tripMode: string;
}

export async function fetchSecretStatus(): Promise<SecretStatusResult> {
  return callDashboardCms<{ success: boolean } & SecretStatusResult>({
    op: 'secretStatus',
  });
}

export async function fetchDashboardOverview(): Promise<DashboardOverviewResult> {
  return callDashboardCms<{ success: boolean } & DashboardOverviewResult>({
    op: 'overview',
  });
}

export async function removeCmsRecord(collectionId: string, id: string): Promise<void> {
  await callDashboardCms<{ success: boolean }>({
    op: 'remove',
    collectionId,
    id,
  });
}

function paginateSlice<T>(all: T[], limit: number, cursor?: string): PageResult<T> {
  const offset = cursor ? Math.max(0, Number(cursor) || 0) : 0;
  const safeLimit = Math.max(1, limit || 20);
  const sliced = all.slice(offset, offset + safeLimit);
  const nextOffset = offset + sliced.length;
  return {
    items: sliced,
    cursor: nextOffset < all.length ? String(nextOffset) : undefined,
  };
}

function matchesSearch(search: string | undefined, values: Array<string | undefined>): boolean {
  const needle = (search ?? '').trim().toLowerCase();
  if (!needle) return true;
  return values.some((v) => (v ?? '').toLowerCase().includes(needle));
}

export interface BookingsFilterParams extends PageQueryParams {
  filters?: {
    status?: string[];
    bookingType?: string[];
    serviceId?: string[];
  };
}

export async function fetchBookingsPage(params: BookingsFilterParams): Promise<PageResult<BookingRecord>> {
  const raw = await queryAllRaw(COLLECTION_IDS.APPOINTMENTS, '_createdDate');
  const mapped = raw.map(mapBooking);

  const filtered = mapped.filter((b) => {
    if (params.filters?.status?.length && !params.filters.status.includes(b.status)) {
      return false;
    }
    if (params.filters?.bookingType?.length && !params.filters.bookingType.includes(b.bookingType)) {
      return false;
    }
    if (params.filters?.serviceId?.length && !params.filters.serviceId.includes(b.serviceId)) {
      return false;
    }
    return matchesSearch(params.search, [
      b.bookingRef,
      b.title,
      b.clientName,
      b.clientEmail,
      b.clientPhone,
      b.serviceName,
      b.fullServiceAddress,
      b.city,
      b.zip,
    ]);
  });

  return paginateSlice(filtered, params.limit, params.cursor);
}

export async function fetchBooking(id: string): Promise<BookingRecord | undefined> {
  const item = await getRawById(COLLECTION_IDS.APPOINTMENTS, id);
  return item ? mapBooking(item) : undefined;
}

export async function saveBooking(draft: Partial<BookingRecord> & { _id?: string }): Promise<BookingRecord> {
  const bookingType = draft.bookingType ?? 'instant';
  const ref = draft.bookingRef?.trim() || `DMN-${Date.now().toString().slice(-6)}`;
  const clientName = draft.clientName?.trim() || 'Client';

  const recordToSave: RawItem = {
    ...draft,
    bookingRef: ref,
    title: draft.title?.trim() || `${ref} - ${clientName}`,
    bookingType,
    status: draft.status || (bookingType === 'quote' ? 'Pending Quote Approval' : 'Confirmed'),
    serviceFee: Number(draft.serviceFee ?? 0),
    travelFee: Number(draft.travelFee ?? 0),
    addonsFee: Number(draft.addonsFee ?? 0),
    grandTotal: Number(draft.grandTotal ?? 0),
    signersCount: Number(draft.signersCount ?? 1),
    notarizedSignatures: Number(draft.notarizedSignatures ?? 0),
    pageCount: Number(draft.pageCount ?? 0),
    drivingMiles: Number(draft.drivingMiles ?? 0),
    drivingMinutes: Number(draft.drivingMinutes ?? 0),
  };

  if (!draft._id) {
    recordToSave.submittedAt = recordToSave.submittedAt ?? new Date().toISOString();
  }

  const saved = await saveRaw(COLLECTION_IDS.APPOINTMENTS, recordToSave);
  return mapBooking(saved);
}

export async function removeBooking(id: string): Promise<void> {
  await removeCmsRecord(COLLECTION_IDS.APPOINTMENTS, id);
}

export interface ServicesFilterParams extends PageQueryParams {
  filters?: {
    active?: string[];
    pricingModel?: string[];
  };
}

export async function fetchAllServicesList(): Promise<ServiceRecord[]> {
  const raw = await queryAllRaw(COLLECTION_IDS.SERVICES, 'sortOrder');
  return raw.map(mapService).sort((a, b) => a.sortOrder - b.sortOrder);
}

export async function fetchServicesPage(params: ServicesFilterParams): Promise<PageResult<ServiceRecord>> {
  const mapped = await fetchAllServicesList();
  const filtered = mapped.filter((s) => {
    if (params.filters?.active?.length) {
      const wantActive = params.filters.active.includes('active');
      const wantInactive = params.filters.active.includes('inactive');
      if (wantActive && !wantInactive && !s.active) return false;
      if (wantInactive && !wantActive && s.active) return false;
    }
    if (params.filters?.pricingModel?.length && !params.filters.pricingModel.includes(s.pricingModel)) {
      return false;
    }
    return matchesSearch(params.search, [s.title, s.serviceId, s.description, s.popularLabel]);
  });

  return paginateSlice(filtered, params.limit, params.cursor);
}

export async function fetchService(id: string): Promise<ServiceRecord | undefined> {
  const item = await getRawById(COLLECTION_IDS.SERVICES, id);
  return item ? mapService(item) : undefined;
}

export async function saveService(draft: Partial<ServiceRecord> & { _id?: string }): Promise<ServiceRecord> {
  const pricingModel = draft.pricingModel ?? 'flat';
  const isQuoteOnly = pricingModel === 'quote_only' || Boolean(draft.isQuoteOnly);
  const serviceId =
    draft.serviceId?.trim() ||
    (draft.title ?? 'service')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_|_$/g, '');

  const recordToSave: RawItem = {
    ...draft,
    serviceId,
    title: draft.title?.trim() || serviceId,
    basePrice: Number(draft.basePrice ?? 0),
    pricingModel,
    isQuoteOnly,
    paymentPolicy: isQuoteOnly ? 'pay_at_appointment' : draft.paymentPolicy ?? 'deposit_percent',
    depositAmount: Number(draft.depositAmount ?? (isQuoteOnly ? 0 : 50)),
    sortOrder: Number(draft.sortOrder ?? 100),
    active: draft.active !== false,
    hiddenByDefault: Boolean(draft.hiddenByDefault),
  };

  const saved = await saveRaw(COLLECTION_IDS.SERVICES, recordToSave);
  return mapService(saved);
}

export async function removeService(id: string): Promise<void> {
  await removeCmsRecord(COLLECTION_IDS.SERVICES, id);
}

export interface QuestionsFilterParams extends PageQueryParams {
  filters?: {
    serviceId?: string[];
    active?: string[];
    inputType?: string[];
  };
}

export async function fetchQuestionsPage(params: QuestionsFilterParams): Promise<PageResult<QuestionRecord>> {
  const raw = await queryAllRaw(COLLECTION_IDS.QUESTIONS, 'sortOrder');
  const mapped = raw.map(mapQuestion).sort((a, b) => a.sortOrder - b.sortOrder);

  const filtered = mapped.filter((q) => {
    if (params.filters?.serviceId?.length && !params.filters.serviceId.includes(q.serviceId)) {
      return false;
    }
    if (params.filters?.active?.length) {
      const wantActive = params.filters.active.includes('active');
      const wantInactive = params.filters.active.includes('inactive');
      if (wantActive && !wantInactive && !q.active) return false;
      if (wantInactive && !wantActive && q.active) return false;
    }
    if (params.filters?.inputType?.length && !params.filters.inputType.includes(q.inputType)) {
      return false;
    }
    return matchesSearch(params.search, [q.title, q.label, q.fieldKey, q.questionId, q.serviceId]);
  });

  return paginateSlice(filtered, params.limit, params.cursor);
}

export async function fetchQuestion(id: string): Promise<QuestionRecord | undefined> {
  const item = await getRawById(COLLECTION_IDS.QUESTIONS, id);
  return item ? mapQuestion(item) : undefined;
}

export async function saveQuestion(draft: Partial<QuestionRecord> & { _id?: string }): Promise<QuestionRecord> {
  const fieldKey =
    draft.fieldKey?.trim() ||
    (draft.label ?? 'field')
      .toLowerCase()
      .replace(/[^a-z0-9]+(.)/g, (_, c: string) => c.toUpperCase())
      .replace(/[^a-zA-Z0-9]/g, '');
  const questionId = draft.questionId?.trim() || `q_${fieldKey}`;

  const recordToSave: RawItem = {
    ...draft,
    questionId,
    fieldKey,
    title: draft.title?.trim() || draft.label?.trim() || questionId,
    serviceId: draft.serviceId?.trim() || 'all',
    sortOrder: Number(draft.sortOrder ?? 10),
    feeAmount: Number(draft.feeAmount ?? 0),
    required: Boolean(draft.required),
    active: draft.active !== false,
    protected: Boolean(draft.protected),
  };

  const saved = await saveRaw(COLLECTION_IDS.QUESTIONS, recordToSave);
  return mapQuestion(saved);
}

export async function removeQuestion(id: string): Promise<void> {
  await removeCmsRecord(COLLECTION_IDS.QUESTIONS, id);
}

export interface AddonsFilterParams extends PageQueryParams {
  filters?: {
    serviceId?: string[];
    active?: string[];
    feeType?: string[];
  };
}

export async function fetchAddonsPage(params: AddonsFilterParams): Promise<PageResult<AddonRecord>> {
  const raw = await queryAllRaw(COLLECTION_IDS.ADDONS, 'sortOrder');
  const mapped = raw.map(mapAddon).sort((a, b) => a.sortOrder - b.sortOrder);

  const filtered = mapped.filter((a) => {
    if (params.filters?.serviceId?.length && !params.filters.serviceId.includes(a.serviceId)) {
      return false;
    }
    if (params.filters?.active?.length) {
      const wantActive = params.filters.active.includes('active');
      const wantInactive = params.filters.active.includes('inactive');
      if (wantActive && !wantInactive && !a.active) return false;
      if (wantInactive && !wantActive && a.active) return false;
    }
    if (params.filters?.feeType?.length && !params.filters.feeType.includes(a.feeType)) {
      return false;
    }
    return matchesSearch(params.search, [a.title, a.label, a.addonId, a.description, a.serviceId]);
  });

  return paginateSlice(filtered, params.limit, params.cursor);
}

export async function fetchAddon(id: string): Promise<AddonRecord | undefined> {
  const item = await getRawById(COLLECTION_IDS.ADDONS, id);
  return item ? mapAddon(item) : undefined;
}

export async function saveAddon(draft: Partial<AddonRecord> & { _id?: string }): Promise<AddonRecord> {
  const addonId =
    draft.addonId?.trim() ||
    `addon_${(draft.label ?? 'extra').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '')}`;

  const recordToSave: RawItem = {
    ...draft,
    addonId,
    title: draft.title?.trim() || draft.label?.trim() || addonId,
    serviceId: draft.serviceId?.trim() || 'all',
    feeAmount: Number(draft.feeAmount ?? 0),
    feeType: draft.feeType ?? 'flat',
    sortOrder: Number(draft.sortOrder ?? 10),
    active: draft.active !== false,
  };

  const saved = await saveRaw(COLLECTION_IDS.ADDONS, recordToSave);
  return mapAddon(saved);
}

export async function removeAddon(id: string): Promise<void> {
  await removeCmsRecord(COLLECTION_IDS.ADDONS, id);
}

export async function fetchOwnerSettings(): Promise<OwnerSettingsRecord> {
  const rows = await queryAllRaw(COLLECTION_IDS.SETTINGS);
  const preferred =
    rows.find((r) => r.ID === 'dmn-settings-01' || r.settingsId === 'dmn-settings-01') ?? rows[0];

  if (!preferred) {
    return mapOwnerSettings({});
  }
  return mapOwnerSettings(preferred);
}

export async function saveOwnerSettings(settings: OwnerSettingsRecord): Promise<OwnerSettingsRecord> {
  const payload: RawItem = {
    ...settings,
    title: settings.title?.trim() || 'Direct Mobile Notary Dispatch Settings',
    ID: settings.ID?.trim() || 'dmn-settings-01',
    originLat: Number(settings.originLat ?? 0),
    originLng: Number(settings.originLng ?? 0),
    baseTravelFee: Number(settings.baseTravelFee ?? 0),
    baseTravelMiles: Number(settings.baseTravelMiles ?? 5),
    perMileRate: Number(settings.perMileRate ?? 0),
    tripCalculationMode: settings.tripCalculationMode === 'round-trip' ? 'round-trip' : 'one-way',
    enableRonService: Boolean(settings.enableRonService),
    enableIpenService: Boolean(settings.enableIpenService),
    defaultDepositPercent: Math.max(
      0,
      Math.min(100, Number(settings.defaultDepositPercent ?? 50)),
    ),
    depositPolicyText: (settings.depositPolicyText ?? '').trim(),
    googlePlacesApiKey: (settings.googlePlacesApiKey ?? '').trim(),
    googleRoutesApiKey: (settings.googleRoutesApiKey ?? '').trim(),
  };

  const saved = await saveRaw(COLLECTION_IDS.SETTINGS, payload);
  return mapOwnerSettings(saved);
}

export async function fetchBusinessHours(): Promise<BusinessHourRecord[]> {
  const raw = await queryAllRaw(COLLECTION_IDS.HOURS, 'sortOrder');
  const existing = raw.map(mapBusinessHour);

  return DAY_DEFAULTS.map((def) => {
    const match = existing.find((item) => item.dayKey === def.dayKey);
    return match ?? { ...def, title: def.dayLabel };
  });
}

export async function saveBusinessHours(hours: BusinessHourRecord[]): Promise<BusinessHourRecord[]> {
  const saved: BusinessHourRecord[] = [];
  for (const row of hours) {
    const payload: RawItem = {
      ...row,
      title: row.dayLabel || row.title,
      slotInterval: Math.max(15, Number(row.slotInterval || 60)),
      sortOrder: Number(row.sortOrder || 1),
      enabled: Boolean(row.enabled),
    };
    const result = await saveRaw(COLLECTION_IDS.HOURS, payload);
    saved.push(mapBusinessHour(result));
  }
  return saved.sort((a, b) => a.sortOrder - b.sortOrder);
}

export async function fetchServiceAreas(): Promise<{ available: boolean; items: ServiceAreaRecord[] }> {
  try {
    const raw = await queryAllRaw(COLLECTION_IDS.SERVICE_AREAS, 'sortOrder');
    return { available: true, items: raw.map(mapServiceArea) };
  } catch {
    return { available: false, items: [] };
  }
}

export async function saveServiceArea(area: ServiceAreaRecord): Promise<ServiceAreaRecord> {
  const payload: RawItem = {
    ...area,
    title: area.title?.trim() || `${area.city} ${area.zipCode}`.trim(),
    sortOrder: Number(area.sortOrder || 10),
    active: area.active !== false,
  };

  const saved = await saveRaw(COLLECTION_IDS.SERVICE_AREAS, payload);
  return mapServiceArea(saved);
}

export async function removeServiceArea(id: string): Promise<void> {
  await removeCmsRecord(COLLECTION_IDS.SERVICE_AREAS, id);
}

export interface ReviewsConfigResult {
  googlePlaceId: string;
  googleReviewLink: string;
  hasApiKey: boolean;
}

export interface PlaceCandidate {
  placeId: string;
  name: string;
  address: string;
  googleMapsUri: string;
  rating?: number;
  userRatingCount?: number;
}

export interface SyncReviewsResult {
  success: boolean;
  placeName: string;
  googleMapsUri: string;
  fetchedCount: number;
  addedCount: number;
  updatedCount: number;
}

export async function fetchReviewsList(): Promise<ReviewRecord[]> {
  const raw = await queryAllRaw(COLLECTION_IDS.REVIEWS);
  return raw.map(mapReview).sort((a, b) => {
    if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
    const ta = a.reviewDate ? new Date(a.reviewDate).getTime() : 0;
    const tb = b.reviewDate ? new Date(b.reviewDate).getTime() : 0;
    return tb - ta;
  });
}

export async function saveReviewRecord(
  draft: Partial<ReviewRecord> & { _id?: string },
): Promise<ReviewRecord> {
  const reviewerName = draft.reviewerName?.trim() || 'Verified Client';
  const payload: RawItem = {
    ...draft,
    title: draft.title?.trim() || reviewerName,
    reviewerName,
    reviewKey:
      draft.reviewKey?.trim() ||
      `direct_${reviewerName.toLowerCase().replace(/[^a-z0-9]+/g, '_')}_${Date.now()}`,
    rating: Math.max(1, Math.min(5, Math.round(Number(draft.rating ?? 5)))),
    reviewText: (draft.reviewText ?? '').trim(),
    relativeTime: (draft.relativeTime ?? '').trim() || 'Verified Client',
    source: draft.source === 'Google' ? 'Google' : 'Direct',
    approved: Boolean(draft.approved),
    sortOrder: Number(draft.sortOrder ?? 10),
    reviewDate: draft.reviewDate ?? new Date().toISOString(),
  };
  const saved = await saveRaw(COLLECTION_IDS.REVIEWS, payload);
  return mapReview(saved);
}

export async function removeReviewRecord(id: string): Promise<void> {
  await removeCmsRecord(COLLECTION_IDS.REVIEWS, id);
}

export async function fetchReviewsConfig(): Promise<ReviewsConfigResult> {
  return callDashboardCms<{ success: boolean } & ReviewsConfigResult>({
    op: 'reviewsConfig',
  });
}

export async function saveReviewsConfig(input: {
  googlePlaceId: string;
  googleReviewLink: string;
}): Promise<{ googlePlaceId: string; googleReviewLink: string }> {
  return callDashboardCms<{
    success: boolean;
    googlePlaceId: string;
    googleReviewLink: string;
  }>({
    op: 'saveReviewsConfig',
    googlePlaceId: input.googlePlaceId,
    googleReviewLink: input.googleReviewLink,
  });
}

export async function lookupGooglePlaceId(query: string): Promise<PlaceCandidate[]> {
  const res = await callDashboardCms<{ success: boolean; candidates?: PlaceCandidate[] }>({
    op: 'lookupPlaceId',
    query,
  });
  return res.candidates ?? [];
}

export async function syncGoogleReviewsFromApi(
  googlePlaceId?: string,
): Promise<SyncReviewsResult> {
  return callDashboardCms<SyncReviewsResult>({
    op: 'syncGoogleReviews',
    googlePlaceId,
  });
}

