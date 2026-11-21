import type { BadgeProps } from '@wix/design-system';
import type { FeeType, PricingModel, QuestionInputType } from '../cms/types';

export const CONFIRM_DELETE_MODAL_ID = '2164c0c3-22c7-4007-a2cb-7c4b8862460c';

export const BOOKING_STATUS_OPTIONS = [
  { id: 'Confirmed', value: 'Confirmed' },
  { id: 'Pending Quote Approval', value: 'Pending Quote Approval' },
  { id: 'Quote Sent', value: 'Quote Sent' },
  { id: 'Completed', value: 'Completed' },
  { id: 'Cancelled', value: 'Cancelled' },
] as const;

export const BOOKING_STATUS_SKIN: Record<string, BadgeProps['skin']> = {
  Confirmed: 'success',
  'Pending Quote Approval': 'warning',
  'Quote Sent': 'standard',
  Completed: 'neutralSuccess',
  Cancelled: 'danger',
};

export const BOOKING_TYPE_OPTIONS = [
  { id: 'instant', value: 'Instant Booking' },
  { id: 'quote', value: 'Custom Quote' },
] as const;

export const PRICING_MODEL_OPTIONS: Array<{ id: PricingModel; value: string }> = [
  { id: 'per_signature', value: 'Per Signature (+ Travel)' },
  { id: 'flat', value: 'Flat Base Fee (+ Travel)' },
  { id: 'quote_only', value: 'Custom Quote Only' },
];

export const PRICING_MODEL_LABELS: Record<PricingModel, string> = {
  per_signature: 'Per Signature',
  flat: 'Flat Fee',
  quote_only: 'Quote Only',
};

export const FEE_TYPE_OPTIONS: Array<{ id: FeeType; value: string }> = [
  { id: 'flat', value: 'Flat Fee ($)' },
  { id: 'per_signature', value: 'Per Signature ($)' },
  { id: 'per_signer', value: 'Per Signer ($)' },
];

export const FEE_TYPE_LABELS: Record<FeeType, string> = {
  flat: 'Flat',
  per_signature: 'Per Signature',
  per_signer: 'Per Signer',
};

export const QUESTION_INPUT_OPTIONS: Array<{ id: QuestionInputType; value: string }> = [
  { id: 'text', value: 'Single-Line Text' },
  { id: 'textarea', value: 'Multi-Line Notes' },
  { id: 'number', value: 'Number Input' },
  { id: 'select', value: 'Dropdown Select' },
  { id: 'radio', value: 'Radio Choices' },
  { id: 'checkbox', value: 'Checkbox Agreement' },
  { id: 'date', value: 'Date Picker' },
];

export const INPUT_TYPE_LABELS: Record<QuestionInputType, string> = {
  text: 'Text',
  textarea: 'Textarea',
  number: 'Number',
  select: 'Dropdown',
  radio: 'Radio',
  checkbox: 'Checkbox',
  date: 'Date',
};

export function formatCurrency(amount: number | undefined): string {
  const num = Number(amount ?? 0);
  return `$${(Number.isFinite(num) ? num : 0).toFixed(2)}`;
}
