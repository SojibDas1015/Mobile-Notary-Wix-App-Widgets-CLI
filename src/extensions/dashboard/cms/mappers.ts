import type {
  AddonRecord,
  BookingRecord,
  BookingType,
  BusinessHourRecord,
  DayKey,
  FeeType,
  OwnerSettingsRecord,
  PaymentPolicy,
  PricingModel,
  QuestionInputType,
  QuestionRecord,
  ReviewRecord,
  ReviewSource,
  ServiceAreaRecord,
  ServiceRecord,
  TripCalculationMode,
  UploadedFileItem,
} from './types';

type RawItem = Record<string, unknown>;

export const DAY_DEFAULTS: ReadonlyArray<{
  dayKey: DayKey;
  dayLabel: string;
  sortOrder: number;
  enabled: boolean;
  startTime: string;
  endTime: string;
  slotInterval: number;
}> = [
  { dayKey: 'mon', dayLabel: 'Monday', sortOrder: 1, enabled: true, startTime: '07:00', endTime: '19:00', slotInterval: 60 },
  { dayKey: 'tue', dayLabel: 'Tuesday', sortOrder: 2, enabled: true, startTime: '07:00', endTime: '19:00', slotInterval: 60 },
  { dayKey: 'wed', dayLabel: 'Wednesday', sortOrder: 3, enabled: true, startTime: '07:00', endTime: '19:00', slotInterval: 60 },
  { dayKey: 'thu', dayLabel: 'Thursday', sortOrder: 4, enabled: true, startTime: '07:00', endTime: '19:00', slotInterval: 60 },
  { dayKey: 'fri', dayLabel: 'Friday', sortOrder: 5, enabled: true, startTime: '07:00', endTime: '19:00', slotInterval: 60 },
  { dayKey: 'sat', dayLabel: 'Saturday', sortOrder: 6, enabled: true, startTime: '07:00', endTime: '19:00', slotInterval: 60 },
  { dayKey: 'sun', dayLabel: 'Sunday', sortOrder: 7, enabled: false, startTime: '07:00', endTime: '19:00', slotInterval: 60 },
];

export function asString(val: unknown, fallback = ''): string {
  if (typeof val === 'string') return val.trim();
  if (typeof val === 'number' && !Number.isNaN(val)) return String(val);
  return fallback;
}

export function asNumber(val: unknown, fallback = 0): number {
  if (typeof val === 'number' && Number.isFinite(val)) return val;
  if (typeof val === 'string') {
    const cleaned = val.trim().replace(/^'+/, '').replace(/[$,]/g, '');
    const parsed = Number(cleaned);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

export function asBool(val: unknown, fallback = false): boolean {
  if (typeof val === 'boolean') return val;
  if (typeof val === 'string') {
    const lower = val.trim().toLowerCase();
    if (lower === 'true' || lower === '1' || lower === 'yes') return true;
    if (lower === 'false' || lower === '0' || lower === 'no') return false;
  }
  if (typeof val === 'number') return val !== 0;
  return fallback;
}

export function normalizePricingModel(val: unknown, isQuoteOnly: boolean): PricingModel {
  const s = asString(val);
  if (s === 'per_signature' || s === 'flat' || s === 'quote_only') return s;
  return isQuoteOnly ? 'quote_only' : 'flat';
}

export const DEFAULT_DEPOSIT_PERCENT = 50;

export const DEFAULT_DEPOSIT_POLICY_TEXT =
  'A 50% non-refundable deposit is required to secure and officially confirm your appointment (subject to North Carolina notary fee regulations) and is applied directly toward your total service cost. The remaining 50% balance is due at the time of service. Deposits are non-refundable for customer cancellations or no-shows where legally permitted. If Direct Mobile Notary & Verification Services cancels the appointment, your deposit will be refunded in full.';

export function normalizePaymentPolicy(val: unknown): PaymentPolicy {
  const s = asString(val);
  if (
    s === 'optional_online' ||
    s === 'full_advance' ||
    s === 'deposit_fixed' ||
    s === 'deposit_percent' ||
    s === 'pay_at_appointment'
  ) {
    return s;
  }
  return 'deposit_percent';
}

export function normalizeFeeType(val: unknown): FeeType {
  const s = asString(val);
  if (s === 'per_signature' || s === 'per_signer' || s === 'flat') return s;
  return 'flat';
}

export function normalizeInputType(val: unknown): QuestionInputType {
  const s = asString(val);
  if (
    s === 'text' ||
    s === 'number' ||
    s === 'select' ||
    s === 'textarea' ||
    s === 'date' ||
    s === 'checkbox' ||
    s === 'radio'
  ) {
    return s;
  }
  return 'text';
}

export function normalizeBookingType(val: unknown): BookingType {
  return asString(val) === 'quote' ? 'quote' : 'instant';
}

export function normalizeTripMode(val: unknown): TripCalculationMode {
  return asString(val) === 'round-trip' ? 'round-trip' : 'one-way';
}

export function formatMinutesTo12Hour(totalMinutes: number): string {
  const hours24 = Math.floor(totalMinutes / 60) % 24;
  const minutes = totalMinutes % 60;
  const suffix = hours24 >= 12 ? 'PM' : 'AM';
  const hours12 = hours24 % 12 === 0 ? 12 : hours24 % 12;
  const mm = minutes < 10 ? `0${minutes}` : String(minutes);
  return `${hours12}:${mm} ${suffix}`;
}

export function parseTimeToMinutes(hhmm: string): number | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(hhmm.trim());
  if (!match) return null;
  const h = Number(match[1]);
  const m = Number(match[2]);
  if (h < 0 || h > 23 || m < 0 || m > 59) return null;
  return h * 60 + m;
}

/** Generates display time slots (e.g., "9:00 AM") from a 24h start/end window and interval in minutes. */
export function generateTimeSlotsForDay(hour: Pick<BusinessHourRecord, 'enabled' | 'startTime' | 'endTime' | 'slotInterval'>): string[] {
  if (!hour.enabled) return [];
  const start = parseTimeToMinutes(hour.startTime);
  const end = parseTimeToMinutes(hour.endTime);
  const step = Math.max(15, Math.min(240, Number(hour.slotInterval) || 60));
  if (start === null || end === null || end < start) return [];

  const slots: string[] = [];
  for (let current = start; current <= end; current += step) {
    slots.push(formatMinutesTo12Hour(current));
  }
  return slots;
}

export function extractUploadedFiles(raw: RawItem): UploadedFileItem[] {
  const candidate = raw.uploadedFiles ?? raw.Uploadedfiles;
  if (!Array.isArray(candidate)) return [];
  const result: UploadedFileItem[] = [];
  for (const entry of candidate) {
    if (entry && typeof entry === 'object') {
      const rec = entry as RawItem;
      result.push({
        name: asString(rec.name || rec.fileName || rec.title, 'Uploaded Document'),
        url: asString(rec.url || rec.fileUrl || rec.publicUrl || rec.src),
        wixUrl: asString(rec.wixUrl || rec.fileUrl || rec.src),
        type: asString(rec.type),
      });
    }
  }
  return result;
}

export function mapBooking(raw: RawItem): BookingRecord {
  const files = extractUploadedFiles(raw);
  const bookingType = normalizeBookingType(raw.bookingType);
  return {
    _id: asString(raw._id),
    _createdDate: raw._createdDate as string | Date | undefined,
    _updatedDate: raw._updatedDate as string | Date | undefined,
    title: asString(raw.title ?? raw.Title),
    bookingRef: asString(raw.bookingRef),
    serviceName: asString(raw.serviceName),
    serviceId: asString(raw.serviceId),
    bookingType,
    status: asString(raw.status, bookingType === 'quote' ? 'Pending Quote Approval' : 'Pending Approval'),
    clientName: asString(raw.clientName),
    clientPhone: asString(raw.clientPhone),
    clientEmail: asString(raw.clientEmail),
    fullServiceAddress: asString(raw.fullServiceAddress || raw.destinationAddress),
    destinationAddress: asString(raw.destinationAddress || raw.fullServiceAddress),
    city: asString(raw.city),
    state: asString(raw.state),
    zip: asString(raw.zip),
    locationType: asString(raw.locationType),
    originAddressUsed: asString(raw.originAddressUsed),
    originShort: asString(raw.originShort),
    originZip: asString(raw.originZip),
    tripCalculationMode: normalizeTripMode(raw.tripCalculationMode),
    drivingMiles: asNumber(raw.drivingMiles, 0),
    drivingMinutes: asNumber(raw.drivingMinutes, 0),
    appointmentDate: asString(raw.appointmentDate),
    appointmentTime: asString(raw.appointmentTime),
    appointmentTimeDate: raw.appointmentTimeDate as string | Date | undefined,
    reminder24HDate: (raw.reminder24HDate ?? raw.reminder24hDate) as string | Date | undefined,
    reminder2HDate: (raw.reminder2HDate ?? raw.reminder2hDate) as string | Date | undefined,
    appointment24Hoursago: asString(raw.appointment24Hoursago ?? raw.appointment24hoursago),
    appointment2Hoursago: asString(raw.appointment2Hoursago ?? raw.appointment2hoursago),
    signersCount: asNumber(raw.signersCount, 1),
    notarizedSignatures: asNumber(raw.notarizedSignatures, 0),
    pageCount: asNumber(raw.pageCount, 0),
    printingOption: asString(raw.printingOption, 'no'),
    witnessOption: asString(raw.witnessOption, 'no'),
    uploadedFilesSummary: asString(raw.uploadedFilesSummary),
    uploadedFiles: files,
    Uploadedfiles: files,
    serviceFee: asNumber(raw.serviceFee, 0),
    travelFee: asNumber(raw.travelFee, 0),
    addonsFee: asNumber(raw.addonsFee, 0),
    addonsSummary: asString(raw.addonsSummary),
    grandTotal: asNumber(raw.grandTotal, 0),
    selectedAddons: asString(raw.selectedAddons),
    paymentPreference: asString(raw.paymentPreference),
    paymentStatus: asString(raw.paymentStatus),
    amountPaid: raw.amountPaid != null ? asNumber(raw.amountPaid, 0) : undefined,
    balanceDue: raw.balanceDue != null ? asNumber(raw.balanceDue, 0) : undefined,
    stripeSessionId: asString(raw.stripeSessionId),
    stripePaymentIntentId: asString(raw.stripePaymentIntentId),
    specialInstructions: asString(raw.specialInstructions),
    serviceSpecificDetails: asString(raw.serviceSpecificDetails),
    idVerifiedConfirmed: asBool(raw.idVerifiedConfirmed, false),
    submittedAt: raw.submittedAt as string | Date | undefined,
  };
}

export function mapService(raw: RawItem): ServiceRecord {
  const isQuoteOnly = asBool(raw.isQuoteOnly, false);
  const rawPolicy = asString(raw.paymentPolicy);
  const paymentPolicy: PaymentPolicy = isQuoteOnly
    ? 'pay_at_appointment'
    : rawPolicy === 'deposit_fixed' || rawPolicy === 'pay_at_appointment' || rawPolicy === 'full_advance' || rawPolicy === 'optional_online'
      ? (rawPolicy as PaymentPolicy)
      : 'deposit_percent';
  const rawDeposit = asNumber(raw.depositAmount, 0);
  const depositAmount =
    isQuoteOnly
      ? 0
      : paymentPolicy === 'deposit_percent'
        ? rawDeposit > 0
          ? rawDeposit
          : DEFAULT_DEPOSIT_PERCENT
        : rawDeposit;
  return {
    _id: asString(raw._id),
    title: asString(raw.title ?? raw.Title),
    serviceId: asString(raw.serviceId),
    description: asString(raw.description),
    basePrice: asNumber(raw.basePrice, 0),
    pricingModel: normalizePricingModel(raw.pricingModel, isQuoteOnly),
    isQuoteOnly,
    paymentPolicy,
    depositAmount,
    popularLabel: asString(raw.popularLabel),
    imageUrl: asString(raw.imageUrl),
    hiddenByDefault: asBool(raw.hiddenByDefault, false),
    sortOrder: asNumber(raw.sortOrder, 100),
    active: asBool(raw.active, true),
  };
}

export function mapQuestion(raw: RawItem): QuestionRecord {
  return {
    _id: asString(raw._id),
    title: asString(raw.title ?? raw.Title),
    questionId: asString(raw.questionId),
    serviceId: asString(raw.serviceId, 'all'),
    fieldKey: asString(raw.fieldKey),
    label: asString(raw.label),
    description: asString(raw.description),
    helpText: asString(raw.helpText),
    inputType: normalizeInputType(raw.inputType),
    placeholder: asString(raw.placeholder),
    required: asBool(raw.required, false),
    active: asBool(raw.active, true),
    protected: asBool(raw.protected, false),
    sortOrder: asNumber(raw.sortOrder, 10),
    section: asString(raw.section),
    feeAmount: asNumber(raw.feeAmount, 0),
    feeType: asString(raw.feeType),
    options: asString(raw.options),
  };
}

export function mapAddon(raw: RawItem): AddonRecord {
  return {
    _id: asString(raw._id),
    title: asString(raw.title ?? raw.Title),
    addonId: asString(raw.addonId),
    serviceId: asString(raw.serviceId, 'all'),
    label: asString(raw.label),
    description: asString(raw.description),
    feeAmount: asNumber(raw.feeAmount, 0),
    feeType: normalizeFeeType(raw.feeType),
    active: asBool(raw.active, true),
    sortOrder: asNumber(raw.sortOrder, 10),
    selectionKey: asString(raw.selectionKey),
  };
}

export function mapBusinessHour(raw: RawItem): BusinessHourRecord {
  const dayKeyRaw = asString(raw.dayKey, 'mon').toLowerCase();
  const validDay: DayKey =
    dayKeyRaw === 'mon' ||
      dayKeyRaw === 'tue' ||
      dayKeyRaw === 'wed' ||
      dayKeyRaw === 'thu' ||
      dayKeyRaw === 'fri' ||
      dayKeyRaw === 'sat' ||
      dayKeyRaw === 'sun'
      ? dayKeyRaw
      : 'mon';
  const def = DAY_DEFAULTS.find((d) => d.dayKey === validDay) ?? DAY_DEFAULTS[0];
  return {
    _id: asString(raw._id) || undefined,
    title: asString(raw.title ?? raw.Title, def.dayLabel),
    dayKey: validDay,
    dayLabel: asString(raw.dayLabel, def.dayLabel),
    enabled: asBool(raw.enabled, def.enabled),
    startTime: asString(raw.startTime, def.startTime),
    endTime: asString(raw.endTime, def.endTime),
    slotInterval: Math.max(15, asNumber(raw.slotInterval, def.slotInterval)),
    sortOrder: asNumber(raw.sortOrder, def.sortOrder),
  };
}

export function mapOwnerSettings(raw: RawItem): OwnerSettingsRecord {
  return {
    _id: asString(raw._id) || undefined,
    title: asString(raw.title ?? raw.Title, 'Direct Mobile Notary Dispatch Settings'),
    ID: asString(raw.ID ?? raw.settingsId, 'dmn-settings-01'),
    defaultOriginAddress: asString(raw.defaultOriginAddress),
    defaultOriginLabel: asString(raw.defaultOriginLabel),
    defaultOriginZip: asString(raw.defaultOriginZip),
    originLat: asNumber(raw.originLat, 0),
    originLng: asNumber(raw.originLng, 0),
    baseTravelFee: asNumber(raw.baseTravelFee, 0),
    baseTravelMiles: asNumber(raw.baseTravelMiles, 0),
    perMileRate: asNumber(raw.perMileRate, 0),
    tripCalculationMode: normalizeTripMode(raw.tripCalculationMode),
    enableRonService: asBool(raw.enableRonService, false),
    enableIpenService: asBool(raw.enableIpenService, false),
    defaultDepositPercent: Math.max(
      0,
      Math.min(100, asNumber(raw.defaultDepositPercent, DEFAULT_DEPOSIT_PERCENT)),
    ),
    depositPolicyText: asString(raw.depositPolicyText, DEFAULT_DEPOSIT_POLICY_TEXT),
    businessName: asString(raw.businessName),
    businessPhone: asString(raw.businessPhone),
    receiptDisclaimer: asString(raw.receiptDisclaimer),
    googlePlacesApiKey: asString(raw.googlePlacesApiKey),
    googleRoutesApiKey: asString(raw.googleRoutesApiKey),
    googlePlaceId: asString(raw.googlePlaceId),
    googleReviewLink: asString(raw.googleReviewLink),
  };
}

export function normalizeReviewSource(val: unknown): ReviewSource {
  return asString(val).toLowerCase() === 'google' ? 'Google' : 'Direct';
}

export function mapReview(raw: RawItem): ReviewRecord {
  const rawRating = asNumber(raw.rating, 5);
  const clampedRating = Math.max(1, Math.min(5, Math.round(rawRating)));
  return {
    _id: asString(raw._id),
    title: asString(raw.title ?? raw.Title ?? raw.reviewerName, 'Client Review'),
    reviewKey: asString(raw.reviewKey),
    reviewerName: asString(raw.reviewerName ?? raw.title, 'Verified Client'),
    rating: clampedRating,
    reviewText: asString(raw.reviewText),
    relativeTime: asString(raw.relativeTime),
    reviewDate: raw.reviewDate as string | Date | undefined,
    source: normalizeReviewSource(raw.source),
    profilePhotoUrl: asString(raw.profilePhotoUrl),
    approved: asBool(raw.approved, false),
    sortOrder: asNumber(raw.sortOrder, 10),
  };
}

export function mapServiceArea(raw: RawItem): ServiceAreaRecord {
  return {
    _id: asString(raw._id) || undefined,
    title: asString(raw.title ?? raw.Title ?? raw.areaName),
    city: asString(raw.city),
    state: asString(raw.state),
    zipCode: asString(raw.zipCode ?? raw.zip),
    active: asBool(raw.active, true),
    sortOrder: asNumber(raw.sortOrder, 10),
  };
}
