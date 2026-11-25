export const COLLECTION_IDS = {
  APPOINTMENTS: 'AppointmentsAndQuotes',
  SERVICES: 'ServicesCatalog',
  QUESTIONS: 'BookingQuestions',
  ADDONS: 'BookingAddons',
  HOURS: 'BusinessHours',
  SETTINGS: 'OwnerSettings',
  SERVICE_AREAS: 'ServiceAreas',
  REVIEWS: 'CustomerReviews',
} as const;

export type BookingType = 'instant' | 'quote';

export type BookingStatus =
  | 'Pending Approval'
  | 'Confirmed'
  | 'Pending Quote Approval'
  | 'Quote Sent'
  | 'Completed'
  | 'Cancelled';

export type TripCalculationMode = 'one-way' | 'round-trip';

export type PricingModel = 'per_signature' | 'flat' | 'quote_only';

export type PaymentPolicy =
  | 'optional_online'
  | 'full_advance'
  | 'deposit_fixed'
  | 'deposit_percent'
  | 'pay_at_appointment';

export type QuestionInputType =
  | 'text'
  | 'number'
  | 'select'
  | 'textarea'
  | 'date'
  | 'checkbox'
  | 'radio';

export type FeeType = 'flat' | 'per_signature' | 'per_signer';

export type DayKey = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';

export interface UploadedFileItem {
  name?: string;
  fileName?: string;
  title?: string;
  url?: string;
  fileUrl?: string;
  wixUrl?: string;
  src?: string;
  type?: string;
}

export interface BookingRecord {
  _id: string;
  _createdDate?: string | Date;
  _updatedDate?: string | Date;
  title?: string;
  bookingRef: string;
  serviceName: string;
  serviceId: string;
  bookingType: BookingType;
  status: BookingStatus | string;
  clientName: string;
  clientPhone: string;
  clientEmail: string;
  fullServiceAddress: string;
  destinationAddress?: string;
  city?: string;
  state?: string;
  zip?: string;
  locationType?: string;
  originAddressUsed?: string;
  originShort?: string;
  originZip?: string | number;
  tripCalculationMode?: TripCalculationMode;
  drivingMiles?: number;
  drivingMinutes?: number;
  appointmentDate?: string;
  appointmentTime?: string;
  appointmentTimeDate?: string | Date;
  reminder24HDate?: string | Date;
  reminder2HDate?: string | Date;
  appointment24Hoursago?: string;
  appointment2Hoursago?: string;
  signersCount?: number;
  notarizedSignatures?: number;
  pageCount?: number;
  printingOption?: string;
  witnessOption?: string;
  uploadedFilesSummary?: string;
  uploadedFiles?: UploadedFileItem[] | unknown[];
  Uploadedfiles?: UploadedFileItem[] | unknown[];
  serviceFee?: number;
  travelFee?: number;
  addonsFee?: number;
  addonsSummary?: string;
  grandTotal?: number;
  selectedAddons?: string;
  paymentPreference?: string;
  paymentStatus?: string;
  amountPaid?: number;
  balanceDue?: number;
  stripeSessionId?: string;
  stripePaymentIntentId?: string;
  specialInstructions?: string;
  serviceSpecificDetails?: string;
  idVerifiedConfirmed?: boolean;
  submittedAt?: string | Date;
}

export interface ServiceRecord {
  _id: string;
  title: string;
  serviceId: string;
  description: string;
  basePrice: number;
  pricingModel: PricingModel;
  isQuoteOnly: boolean;
  paymentPolicy?: PaymentPolicy;
  depositAmount?: number;
  popularLabel?: string;
  imageUrl?: string;
  hiddenByDefault: boolean;
  sortOrder: number;
  active: boolean;
}

export interface QuestionRecord {
  _id: string;
  title: string;
  questionId: string;
  serviceId: string;
  fieldKey: string;
  label: string;
  description?: string;
  helpText?: string;
  inputType: QuestionInputType;
  placeholder?: string;
  required: boolean;
  active: boolean;
  protected: boolean;
  sortOrder: number;
  section?: string;
  feeAmount?: number;
  feeType?: FeeType | string;
  options?: string;
}

export interface AddonRecord {
  _id: string;
  title: string;
  addonId: string;
  serviceId: string;
  label: string;
  description?: string;
  feeAmount: number;
  feeType: FeeType;
  active: boolean;
  sortOrder: number;
  selectionKey?: string;
}

export interface BusinessHourRecord {
  _id?: string;
  title: string;
  dayKey: DayKey;
  dayLabel: string;
  enabled: boolean;
  startTime: string;
  endTime: string;
  slotInterval: number;
  sortOrder: number;
}

export interface OwnerSettingsRecord {
  _id?: string;
  title: string;
  ID?: string;
  defaultOriginAddress: string;
  defaultOriginLabel: string;
  defaultOriginZip: string;
  originLat: number;
  originLng: number;
  baseTravelFee: number;
  baseTravelMiles: number;
  perMileRate: number;
  tripCalculationMode: TripCalculationMode;
  enableRonService: boolean;
  enableIpenService?: boolean;
  defaultDepositPercent?: number;
  depositPolicyText?: string;
  businessName: string;
  businessPhone: string;
  receiptDisclaimer: string;
  googlePlacesApiKey: string;
  googleRoutesApiKey: string;
  googlePlaceId?: string;
  googleReviewLink?: string;
}

export type ReviewSource = 'Google' | 'Direct';

export interface ReviewRecord {
  _id: string;
  title: string;
  reviewKey: string;
  reviewerName: string;
  rating: number;
  reviewText: string;
  relativeTime: string;
  reviewDate?: string | Date;
  source: ReviewSource;
  profilePhotoUrl?: string;
  approved: boolean;
  sortOrder: number;
}

export interface ServiceAreaRecord {
  _id?: string;
  title: string;
  city: string;
  state: string;
  zipCode: string;
  active: boolean;
  sortOrder: number;
}

export interface PageQueryParams {
  limit: number;
  cursor?: string;
  search?: string;
}

export interface PageResult<T> {
  items: T[];
  cursor: string | undefined;
}
