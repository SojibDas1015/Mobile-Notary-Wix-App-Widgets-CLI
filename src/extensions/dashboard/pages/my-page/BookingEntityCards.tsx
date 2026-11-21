import React, { useMemo, useState } from 'react';
import {
  Badge,
  Box,
  Button,
  Card,
  Checkbox,
  Dropdown,
  FormField,
  Input,
  InputArea,
  Layout,
  Cell,
  NumberInput,
  Text,
  TextButton,
} from '@wix/design-system';
import { ExternalLinkSmall } from '@wix/wix-ui-icons-common/lazy';
import { useEntityPageContext, EntityPage } from '@wix/patterns';
import { useController } from '@wix/patterns/form';
import type { BookingRecord, ServiceRecord, UploadedFileItem } from '../../cms/types';
import {
  BOOKING_STATUS_OPTIONS,
  BOOKING_TYPE_OPTIONS,
  formatCurrency,
} from '../../shared/constants';

export type BookingFormFields = Omit<BookingRecord, '_id' | '_createdDate' | '_updatedDate'>;

interface CardProps {
  services: ServiceRecord[];
}

export const BookingSummaryCard = ({ services }: CardProps) => {
  const page = useEntityPageContext<BookingRecord, BookingFormFields>();
  const statusCtrl = useController({
    name: 'status',
    control: page.form.control,
    defaultValue: page.entity?.status ?? 'Confirmed',
  });
  const typeCtrl = useController({
    name: 'bookingType',
    control: page.form.control,
    defaultValue: page.entity?.bookingType ?? 'instant',
  });
  const serviceCtrl = useController({
    name: 'serviceId',
    control: page.form.control,
    defaultValue: page.entity?.serviceId ?? '',
  });
  const refCtrl = useController({
    name: 'bookingRef',
    control: page.form.control,
    defaultValue: page.entity?.bookingRef ?? '',
  });
  const paymentCtrl = useController({
    name: 'paymentPreference',
    control: page.form.control,
    defaultValue: page.entity?.paymentPreference ?? 'Cash / Zelle / Card on arrival',
  });
  const idVerifiedCtrl = useController({
    name: 'idVerifiedConfirmed',
    control: page.form.control,
    defaultValue: Boolean(page.entity?.idVerifiedConfirmed),
  });

  const serviceOptions = services.map((s) => ({ id: s.serviceId, value: s.title }));

  return (
    <EntityPage.Card>
      <Card.Header title="Status & Service" />
      <Card.Divider />
      <Card.Content>
        <Layout>
          <Cell span={6}>
            <FormField label="Booking Reference">
              <Input
                value={refCtrl.field.value}
                onChange={refCtrl.field.onChange}
                placeholder="Auto-generated if empty"
              />
            </FormField>
          </Cell>
          <Cell span={6}>
            <FormField label="Status">
              <Dropdown
                selectedId={statusCtrl.field.value}
                options={BOOKING_STATUS_OPTIONS.map((o) => ({ id: o.id, value: o.value }))}
                onSelect={(opt) => statusCtrl.field.onChange(String(opt.id))}
              />
            </FormField>
          </Cell>
          <Cell span={6}>
            <FormField label="Booking Type">
              <Dropdown
                selectedId={typeCtrl.field.value}
                options={BOOKING_TYPE_OPTIONS.map((o) => ({ id: o.id, value: o.value }))}
                onSelect={(opt) => typeCtrl.field.onChange(String(opt.id))}
              />
            </FormField>
          </Cell>
          <Cell span={6}>
            <FormField label="Service">
              {serviceOptions.length > 0 ? (
                <Dropdown
                  selectedId={serviceCtrl.field.value}
                  options={serviceOptions}
                  placeholder="Select service"
                  onSelect={(opt) => {
                    serviceCtrl.field.onChange(String(opt.id));
                    page.form.setValue('serviceName', String(opt.value), { shouldDirty: true });
                  }}
                />
              ) : (
                <Input
                  value={page.form.watch('serviceName') ?? ''}
                  onChange={(e) => page.form.setValue('serviceName', e.target.value, { shouldDirty: true })}
                  placeholder="Service name"
                />
              )}
            </FormField>
          </Cell>
          <Cell span={6}>
            <FormField label="Payment Preference">
              <Input
                value={paymentCtrl.field.value}
                onChange={paymentCtrl.field.onChange}
              />
            </FormField>
          </Cell>
          <Cell span={6}>
            <FormField label="Government ID">
              <Box paddingTop="SP1">
                <Checkbox
                  checked={Boolean(idVerifiedCtrl.field.value)}
                  onChange={(e) => idVerifiedCtrl.field.onChange(e.target.checked)}
                >
                  Signer confirmed valid photo ID
                </Checkbox>
              </Box>
            </FormField>
          </Cell>
        </Layout>
      </Card.Content>
    </EntityPage.Card>
  );
};

export const ClientLocationCard = () => {
  const page = useEntityPageContext<BookingRecord, BookingFormFields>();
  const nameCtrl = useController({
    name: 'clientName',
    control: page.form.control,
    defaultValue: page.entity?.clientName ?? '',
    rules: { required: { value: true, message: 'Client name is required' } },
  });
  const phoneCtrl = useController({
    name: 'clientPhone',
    control: page.form.control,
    defaultValue: page.entity?.clientPhone ?? '',
  });
  const emailCtrl = useController({
    name: 'clientEmail',
    control: page.form.control,
    defaultValue: page.entity?.clientEmail ?? '',
  });
  const addrCtrl = useController({
    name: 'fullServiceAddress',
    control: page.form.control,
    defaultValue: page.entity?.fullServiceAddress ?? '',
  });
  const cityCtrl = useController({
    name: 'city',
    control: page.form.control,
    defaultValue: page.entity?.city ?? '',
  });
  const stateCtrl = useController({
    name: 'state',
    control: page.form.control,
    defaultValue: page.entity?.state ?? '',
  });
  const zipCtrl = useController({
    name: 'zip',
    control: page.form.control,
    defaultValue: page.entity?.zip ?? '',
  });
  const locTypeCtrl = useController({
    name: 'locationType',
    control: page.form.control,
    defaultValue: page.entity?.locationType ?? '',
  });

  return (
    <>
      <Card.Header title="Client & Service Location" />
      <Card.Divider />
      <Card.Content>
        <Layout>
          <Cell span={4}>
            <FormField
              label="Client Name"
              required
              status={nameCtrl.fieldState.error ? 'error' : undefined}
              statusMessage={nameCtrl.fieldState.error?.message}
            >
              <Input value={nameCtrl.field.value} onChange={nameCtrl.field.onChange} />
            </FormField>
          </Cell>
          <Cell span={4}>
            <FormField label="Phone">
              <Input value={phoneCtrl.field.value} onChange={phoneCtrl.field.onChange} />
            </FormField>
          </Cell>
          <Cell span={4}>
            <FormField label="Email">
              <Input value={emailCtrl.field.value} onChange={emailCtrl.field.onChange} />
            </FormField>
          </Cell>
          <Cell span={8}>
            <FormField label="Full Service Address">
              <Input value={addrCtrl.field.value} onChange={addrCtrl.field.onChange} />
            </FormField>
          </Cell>
          <Cell span={4}>
            <FormField label="Location Type">
              <Input value={locTypeCtrl.field.value} onChange={locTypeCtrl.field.onChange} />
            </FormField>
          </Cell>
          <Cell span={5}>
            <FormField label="City">
              <Input value={cityCtrl.field.value} onChange={cityCtrl.field.onChange} />
            </FormField>
          </Cell>
          <Cell span={3}>
            <FormField label="State">
              <Input value={stateCtrl.field.value} onChange={stateCtrl.field.onChange} />
            </FormField>
          </Cell>
          <Cell span={4}>
            <FormField label="ZIP Code">
              <Input value={zipCtrl.field.value} onChange={zipCtrl.field.onChange} />
            </FormField>
          </Cell>
        </Layout>
      </Card.Content>
    </>
  );
};

export const ScheduleRouteCard = () => {
  const page = useEntityPageContext<BookingRecord, BookingFormFields>();
  const dateCtrl = useController({
    name: 'appointmentDate',
    control: page.form.control,
    defaultValue: page.entity?.appointmentDate ?? '',
  });
  const timeCtrl = useController({
    name: 'appointmentTime',
    control: page.form.control,
    defaultValue: page.entity?.appointmentTime ?? '',
  });
  const milesCtrl = useController({
    name: 'drivingMiles',
    control: page.form.control,
    defaultValue: page.entity?.drivingMiles ?? 0,
  });
  const minsCtrl = useController({
    name: 'drivingMinutes',
    control: page.form.control,
    defaultValue: page.entity?.drivingMinutes ?? 0,
  });

  return (
    <>
      <Card.Header title="Appointment Schedule & Dispatch Route" />
      <Card.Divider />
      <Card.Content>
        <Layout>
          <Cell span={6}>
            <FormField label="Appointment Date (YYYY-MM-DD)">
              <Input value={dateCtrl.field.value} onChange={dateCtrl.field.onChange} />
            </FormField>
          </Cell>
          <Cell span={6}>
            <FormField label="Appointment Time">
              <Input value={timeCtrl.field.value} onChange={timeCtrl.field.onChange} />
            </FormField>
          </Cell>
          <Cell span={4}>
            <FormField label="Driving Miles">
              <NumberInput
                min={0}
                step={0.1}
                value={milesCtrl.field.value}
                onChange={(v) => milesCtrl.field.onChange(v ?? 0)}
              />
            </FormField>
          </Cell>
          <Cell span={4}>
            <FormField label="Drive Time (mins)">
              <NumberInput
                min={0}
                value={minsCtrl.field.value}
                onChange={(v) => minsCtrl.field.onChange(v ?? 0)}
              />
            </FormField>
          </Cell>
          <Cell span={4}>
            <FormField label="Dispatch Origin">
              <Box paddingTop="SP1">
                <Text size="small">
                  {page.entity?.originShort || page.entity?.originAddressUsed || 'Default Hub'}
                </Text>
              </Box>
            </FormField>
          </Cell>
        </Layout>
      </Card.Content>
    </>
  );
};

function parseIntakePairs(raw: string): Array<{ label: string; value: string }> {
  const clean = (raw || '').trim();
  if (!clean) return [];
  return clean
    .split(/\s*\|\s*/)
    .map((segment) => segment.trim())
    .filter(Boolean)
    .map((segment, idx) => {
      const colonIdx = segment.indexOf(':');
      if (colonIdx > 0) {
        return {
          label: segment.slice(0, colonIdx).trim(),
          value: segment.slice(colonIdx + 1).trim() || 'Not provided',
        };
      }
      return { label: `Detail #${idx + 1}`, value: segment };
    });
}

export const DocumentCountsNotesCard = () => {
  const page = useEntityPageContext<BookingRecord, BookingFormFields>();
  const [editRawIntake, setEditRawIntake] = useState(false);
  const signersCtrl = useController({
    name: 'signersCount',
    control: page.form.control,
    defaultValue: page.entity?.signersCount ?? 1,
  });
  const sigsCtrl = useController({
    name: 'notarizedSignatures',
    control: page.form.control,
    defaultValue: page.entity?.notarizedSignatures ?? 0,
  });
  const pagesCtrl = useController({
    name: 'pageCount',
    control: page.form.control,
    defaultValue: page.entity?.pageCount ?? 0,
  });
  const printingCtrl = useController({
    name: 'printingOption',
    control: page.form.control,
    defaultValue: page.entity?.printingOption ?? 'no',
  });
  const witnessCtrl = useController({
    name: 'witnessOption',
    control: page.form.control,
    defaultValue: page.entity?.witnessOption ?? 'no',
  });
  const addonsSummaryCtrl = useController({
    name: 'addonsSummary',
    control: page.form.control,
    defaultValue: page.entity?.addonsSummary ?? '',
  });
  const notesCtrl = useController({
    name: 'specialInstructions',
    control: page.form.control,
    defaultValue: page.entity?.specialInstructions ?? '',
  });
  const detailsCtrl = useController({
    name: 'serviceSpecificDetails',
    control: page.form.control,
    defaultValue: page.entity?.serviceSpecificDetails ?? '',
  });
  const intakePairs = useMemo(
    () => parseIntakePairs(detailsCtrl.field.value ?? ''),
    [detailsCtrl.field.value],
  );

  return (
    <>
      <Card.Header title="Document Details & Intake Answers" />
      <Card.Divider />
      <Card.Content>
        <Layout>
          <Cell span={4}>
            <FormField label="Signers">
              <NumberInput
                min={1}
                value={signersCtrl.field.value}
                onChange={(v) => signersCtrl.field.onChange(v ?? 1)}
              />
            </FormField>
          </Cell>
          <Cell span={4}>
            <FormField label="Notarized Signatures">
              <NumberInput
                min={0}
                value={sigsCtrl.field.value}
                onChange={(v) => sigsCtrl.field.onChange(v ?? 0)}
              />
            </FormField>
          </Cell>
          <Cell span={4}>
            <FormField label="Page Count">
              <NumberInput
                min={0}
                value={pagesCtrl.field.value}
                onChange={(v) => pagesCtrl.field.onChange(v ?? 0)}
              />
            </FormField>
          </Cell>
          <Cell span={4}>
            <FormField label="Printing Needed">
              <Input value={printingCtrl.field.value} onChange={printingCtrl.field.onChange} />
            </FormField>
          </Cell>
          <Cell span={4}>
            <FormField label="Witness Needed">
              <Input value={witnessCtrl.field.value} onChange={witnessCtrl.field.onChange} />
            </FormField>
          </Cell>
          <Cell span={4}>
            <FormField label="Selected Add-ons">
              <Input value={addonsSummaryCtrl.field.value} onChange={addonsSummaryCtrl.field.onChange} />
            </FormField>
          </Cell>
          <Cell span={12}>
            <FormField label="Special Instructions">
              <InputArea
                rows={2}
                value={notesCtrl.field.value}
                onChange={notesCtrl.field.onChange}
              />
            </FormField>
          </Cell>
          <Cell span={12}>
            <Box direction="vertical" gap="SP1">
              <Box align="space-between" verticalAlign="middle">
                <Text size="small" weight="bold">
                  Service-Specific Intake Details ({intakePairs.length})
                </Text>
                <TextButton
                  size="tiny"
                  onClick={() => setEditRawIntake((prev) => !prev)}
                >
                  {editRawIntake ? 'Show Visual Cards' : 'Edit Raw Text'}
                </TextButton>
              </Box>
              {editRawIntake ? (
                <InputArea
                  rows={4}
                  value={detailsCtrl.field.value}
                  onChange={detailsCtrl.field.onChange}
                />
              ) : intakePairs.length > 0 ? (
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                    gap: '10px',
                    marginTop: '4px',
                  }}
                >
                  {intakePairs.map((pair, idx) => (
                    <div
                      key={`${pair.label}-${idx}`}
                      style={{
                        background: '#FAF7FC',
                        border: '1px solid #E6DCF0',
                        borderTop: '2px solid #4B247A',
                        padding: '10px 12px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '4px',
                      }}
                    >
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: 700,
                          textTransform: 'uppercase',
                          letterSpacing: '0.04em',
                          color: '#6B5C7A',
                        }}
                      >
                        {pair.label}
                      </span>
                      <span
                        style={{
                          fontSize: '13.5px',
                          fontWeight: 600,
                          color: '#1D1724',
                          lineHeight: 1.35,
                        }}
                      >
                        {pair.value}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <Box padding="12px" backgroundColor="#FAF7FC" border="1px solid #E6DCF0">
                  <Text size="small" secondary>
                    No service-specific intake responses recorded.
                  </Text>
                </Box>
              )}
            </Box>
          </Cell>
        </Layout>
      </Card.Content>
    </>
  );
};

export const PricingBreakdownCard = () => {
  const page = useEntityPageContext<BookingRecord, BookingFormFields>();
  const serviceFeeCtrl = useController({
    name: 'serviceFee',
    control: page.form.control,
    defaultValue: page.entity?.serviceFee ?? 0,
  });
  const travelFeeCtrl = useController({
    name: 'travelFee',
    control: page.form.control,
    defaultValue: page.entity?.travelFee ?? 0,
  });
  const addonsFeeCtrl = useController({
    name: 'addonsFee',
    control: page.form.control,
    defaultValue: page.entity?.addonsFee ?? 0,
  });
  const grandTotalCtrl = useController({
    name: 'grandTotal',
    control: page.form.control,
    defaultValue: page.entity?.grandTotal ?? 0,
  });

  const handleSum = () => {
    const sum =
      Number(serviceFeeCtrl.field.value ?? 0) +
      Number(travelFeeCtrl.field.value ?? 0) +
      Number(addonsFeeCtrl.field.value ?? 0);
    grandTotalCtrl.field.onChange(Number(sum.toFixed(2)));
  };

  return (
    <>
      <Card.Header
        title="Pricing & Quote Total"
        suffix={
          <Button size="small" priority="secondary" onClick={handleSum}>
            Recalculate Total
          </Button>
        }
      />
      <Card.Divider />
      <Card.Content>
        <Box direction="vertical" gap="SP2">
          <FormField label="Service Fee ($)">
            <NumberInput
              min={0}
              step={1}
              value={serviceFeeCtrl.field.value}
              onChange={(v) => serviceFeeCtrl.field.onChange(v ?? 0)}
            />
          </FormField>
          <FormField label="Travel Fee ($)">
            <NumberInput
              min={0}
              step={0.5}
              value={travelFeeCtrl.field.value}
              onChange={(v) => travelFeeCtrl.field.onChange(v ?? 0)}
            />
          </FormField>
          <FormField label="Add-ons Fee ($)">
            <NumberInput
              min={0}
              step={1}
              value={addonsFeeCtrl.field.value}
              onChange={(v) => addonsFeeCtrl.field.onChange(v ?? 0)}
            />
          </FormField>
          <FormField label="Grand Total ($)">
            <NumberInput
              min={0}
              step={1}
              value={grandTotalCtrl.field.value}
              onChange={(v) => grandTotalCtrl.field.onChange(v ?? 0)}
            />
          </FormField>
          <Text size="small" secondary>
            Displayed total: {formatCurrency(grandTotalCtrl.field.value)}
          </Text>
        </Box>
      </Card.Content>
    </>
  );
};

export const UploadedFilesCard = () => {
  const page = useEntityPageContext<BookingRecord, BookingFormFields>();
  const summaryCtrl = useController({
    name: 'uploadedFilesSummary',
    control: page.form.control,
    defaultValue: page.entity?.uploadedFilesSummary ?? '',
  });
  const rawList = (page.entity?.uploadedFiles ?? page.entity?.Uploadedfiles ?? []) as UploadedFileItem[];

  return (
    <>
      <Card.Header title="Uploaded Documents" />
      <Card.Divider />
      <Card.Content>
        <Box direction="vertical" gap="SP2">
          {rawList.length > 0 ? (
            rawList.map((f, idx) => {
              const href = f.url || f.wixUrl || f.fileUrl || f.src || '';
              return (
                <Box
                  key={`${f.name || 'file'}-${idx}`}
                  align="space-between"
                  verticalAlign="middle"
                  padding="10px 12px"
                  backgroundColor="#FAF7FC"
                  border="1px solid #E6DCF0"
                  borderLeft="3px solid #4B247A"
                >
                  <Box direction="vertical" gap="2px">
                    <Text size="small" weight="bold">
                      {f.name || `Document #${idx + 1}`}
                    </Text>
                    <Text size="tiny" secondary>
                      {f.type || 'Uploaded to Wix Media Manager'}
                    </Text>
                  </Box>
                  {href ? (
                    <TextButton
                      size="small"
                      suffixIcon={<ExternalLinkSmall />}
                      as="a"
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      View / Open
                    </TextButton>
                  ) : (
                    <Badge size="tiny" skin="neutral">
                      URL Pending
                    </Badge>
                  )}
                </Box>
              );
            })
          ) : (
            <Box padding="12px" backgroundColor="#FAF7FC" border="1px solid #E6DCF0">
              <Text size="small" secondary>
                No client documents attached to this booking.
              </Text>
            </Box>
          )}
          <FormField label="Files Summary">
            <InputArea
              rows={2}
              value={summaryCtrl.field.value}
              onChange={summaryCtrl.field.onChange}
            />
          </FormField>
        </Box>
      </Card.Content>
    </>
  );
};
