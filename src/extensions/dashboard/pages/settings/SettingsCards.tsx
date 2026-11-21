import React, { useCallback, useEffect, useState } from 'react';
import { dashboard } from '@wix/dashboard';
import {
  Badge,
  Box,
  Button,
  Card,
  Cell,
  Dropdown,
  FormField,
  IconButton,
  Input,
  InputArea,
  Layout,
  NumberInput,
  Text,
  ToggleSwitch,
} from '@wix/design-system';
import { DeleteSmall } from '@wix/wix-ui-icons-common/lazy';
import { SettingsPage, useSettingsPageContext } from '@wix/patterns';
import { useController } from '@wix/patterns/form';
import { generateTimeSlotsForDay } from '../../cms/mappers';
import {
  fetchSecretStatus,
  fetchServiceAreas,
  saveServiceArea,
  type SecretStatusResult,
} from '../../cms/notary-cms-api';
import {
  COLLECTION_IDS,
  type BusinessHourRecord,
  type OwnerSettingsRecord,
  type ServiceAreaRecord,
  type TripCalculationMode,
} from '../../cms/types';
import { CONFIRM_DELETE_MODAL_ID } from '../../shared/constants';

export interface CombinedDispatchSettings {
  owner: OwnerSettingsRecord;
  hours: BusinessHourRecord[];
}

const TRIP_MODE_OPTIONS: Array<{ id: TripCalculationMode; value: string }> = [
  { id: 'one-way', value: 'One-Way Mileage' },
  { id: 'round-trip', value: 'Round-Trip Mileage (2x distance)' },
];

const INTERVAL_OPTIONS = [
  { id: '15', value: 'Every 15 min' },
  { id: '30', value: 'Every 30 min' },
  { id: '45', value: 'Every 45 min' },
  { id: '60', value: 'Every 60 min' },
  { id: '90', value: 'Every 90 min' },
  { id: '120', value: 'Every 120 min' },
];

export const DispatchOriginCard = () => {
  const page = useSettingsPageContext<CombinedDispatchSettings, CombinedDispatchSettings>();
  const addrCtrl = useController({
    name: 'owner.defaultOriginAddress',
    control: page.form.control,
    defaultValue: page.settings?.owner.defaultOriginAddress ?? '',
    rules: { required: { value: true, message: 'Origin dispatch address is required' } },
  });
  const labelCtrl = useController({
    name: 'owner.defaultOriginLabel',
    control: page.form.control,
    defaultValue: page.settings?.owner.defaultOriginLabel ?? '',
  });
  const zipCtrl = useController({
    name: 'owner.defaultOriginZip',
    control: page.form.control,
    defaultValue: page.settings?.owner.defaultOriginZip ?? '',
  });
  const latCtrl = useController({
    name: 'owner.originLat',
    control: page.form.control,
    defaultValue: page.settings?.owner.originLat ?? 0,
  });
  const lngCtrl = useController({
    name: 'owner.originLng',
    control: page.form.control,
    defaultValue: page.settings?.owner.originLng ?? 0,
  });
  const baseFeeCtrl = useController({
    name: 'owner.baseTravelFee',
    control: page.form.control,
    defaultValue: page.settings?.owner.baseTravelFee ?? 0,
  });
  const baseMilesCtrl = useController({
    name: 'owner.baseTravelMiles',
    control: page.form.control,
    defaultValue: page.settings?.owner.baseTravelMiles ?? 0,
  });
  const perMileCtrl = useController({
    name: 'owner.perMileRate',
    control: page.form.control,
    defaultValue: page.settings?.owner.perMileRate ?? 0,
  });
  const modeCtrl = useController({
    name: 'owner.tripCalculationMode',
    control: page.form.control,
    defaultValue: page.settings?.owner.tripCalculationMode ?? 'one-way',
  });
  const ronCtrl = useController({
    name: 'owner.enableRonService',
    control: page.form.control,
    defaultValue: Boolean(page.settings?.owner.enableRonService),
  });

  return (
    <SettingsPage.Card>
      <Card.Header
        title="Dispatch Origin & Travel Pricing"
        subtitle="Controls Google Routes driving distance origin, base trip fee, included miles, and mileage rate."
      />
      <Card.Divider />
      <Card.Content>
        <Layout>
          <Cell span={12}>
            <FormField
              label="Private Dispatch Starting Address (Never Displayed Publicly)"
              infoContent="Used strictly on the server for mileage calculation. Your private street address is never exposed to website visitors or receipts."
              required
              status={addrCtrl.fieldState.error ? 'error' : undefined}
              statusMessage={addrCtrl.fieldState.error?.message}
            >
              <Input value={addrCtrl.field.value} onChange={addrCtrl.field.onChange} />
            </FormField>
          </Cell>
          <Cell span={6}>
            <FormField label="Origin Short Label">
              <Input value={labelCtrl.field.value} onChange={labelCtrl.field.onChange} />
            </FormField>
          </Cell>
          <Cell span={6}>
            <FormField label="Origin ZIP">
              <Input value={zipCtrl.field.value} onChange={zipCtrl.field.onChange} />
            </FormField>
          </Cell>
          <Cell span={6}>
            <FormField label="Origin Latitude">
              <NumberInput
                step={0.0001}
                value={latCtrl.field.value}
                onChange={(v) => latCtrl.field.onChange(v ?? 0)}
              />
            </FormField>
          </Cell>
          <Cell span={6}>
            <FormField label="Origin Longitude">
              <NumberInput
                step={0.0001}
                value={lngCtrl.field.value}
                onChange={(v) => lngCtrl.field.onChange(v ?? 0)}
              />
            </FormField>
          </Cell>
          <Cell span={4}>
            <FormField label="Base Travel Fee ($)">
              <NumberInput
                min={0}
                step={1}
                value={baseFeeCtrl.field.value}
                onChange={(v) => baseFeeCtrl.field.onChange(v ?? 0)}
              />
            </FormField>
          </Cell>
          <Cell span={4}>
            <FormField label="Included Base Miles">
              <NumberInput
                min={0}
                step={1}
                value={baseMilesCtrl.field.value}
                onChange={(v) => baseMilesCtrl.field.onChange(v ?? 0)}
              />
            </FormField>
          </Cell>
          <Cell span={4}>
            <FormField label="Per-Mile Rate ($/mi)">
              <NumberInput
                min={0}
                step={0.05}
                value={perMileCtrl.field.value}
                onChange={(v) => perMileCtrl.field.onChange(v ?? 0)}
              />
            </FormField>
          </Cell>
          <Cell span={6}>
            <FormField label="Trip Mileage Mode">
              <Dropdown
                selectedId={modeCtrl.field.value}
                options={TRIP_MODE_OPTIONS}
                onSelect={(opt) => modeCtrl.field.onChange(String(opt.id) as TripCalculationMode)}
              />
            </FormField>
          </Cell>
          <Cell span={6}>
            <FormField label="Remote Online Notarization (RON)" labelPlacement="right">
              <ToggleSwitch
                checked={Boolean(ronCtrl.field.value)}
                onChange={(e) => ronCtrl.field.onChange(e.target.checked)}
              />
            </FormField>
          </Cell>
        </Layout>
      </Card.Content>
    </SettingsPage.Card>
  );
};

export const BusinessIdentityCard = () => {
  const page = useSettingsPageContext<CombinedDispatchSettings, CombinedDispatchSettings>();
  const nameCtrl = useController({
    name: 'owner.businessName',
    control: page.form.control,
    defaultValue: page.settings?.owner.businessName ?? '',
  });
  const phoneCtrl = useController({
    name: 'owner.businessPhone',
    control: page.form.control,
    defaultValue: page.settings?.owner.businessPhone ?? '',
  });
  const disclaimerCtrl = useController({
    name: 'owner.receiptDisclaimer',
    control: page.form.control,
    defaultValue: page.settings?.owner.receiptDisclaimer ?? '',
  });
  const [secretStatus, setSecretStatus] = useState<SecretStatusResult | null>(null);
  const [checkingSecrets, setCheckingSecrets] = useState(false);

  const checkSecrets = useCallback(async () => {
    setCheckingSecrets(true);
    try {
      const res = await fetchSecretStatus();
      setSecretStatus(res);
    } catch (err) {
      setSecretStatus({
        hasPlacesKey: false,
        hasRoutesKey: false,
        secretError: err instanceof Error ? err.message : 'Unable to query Wix Secrets Manager',
      });
    } finally {
      setCheckingSecrets(false);
    }
  }, []);

  useEffect(() => {
    void checkSecrets();
  }, [checkSecrets]);

  return (
    <SettingsPage.Card>
      <Card.Header
        title="Business Contact & Google Secrets"
        subtitle="Displayed on confirmation screens and printable receipts. Google API keys are loaded securely from Wix Secrets Manager."
      />
      <Card.Divider />
      <Card.Content>
        <Layout>
          <Cell span={6}>
            <FormField label="Business Display Name">
              <Input
                value={nameCtrl.field.value}
                onChange={nameCtrl.field.onChange}
                placeholder="Direct Mobile Notary"
              />
            </FormField>
          </Cell>
          <Cell span={6}>
            <FormField label="Dispatch Phone Number">
              <Input
                value={phoneCtrl.field.value}
                onChange={phoneCtrl.field.onChange}
                placeholder="(803) 412-0170"
              />
            </FormField>
          </Cell>
          <Cell span={12}>
            <FormField label="Booking / Receipt Disclaimer">
              <InputArea
                rows={2}
                value={disclaimerCtrl.field.value}
                onChange={disclaimerCtrl.field.onChange}
              />
            </FormField>
          </Cell>
          <Cell span={12}>
            <Box
              direction="vertical"
              gap="SP2"
              padding="14px 16px"
              backgroundColor="#FAF7FC"
              border="1px solid #E6DCF0"
              borderTop="3px solid #4B247A"
              borderRadius="0px"
            >
              <Box align="space-between" verticalAlign="middle" gap="SP2">
                <Box direction="vertical" gap="2px">
                  <Text size="small" weight="bold">
                    Wix Secrets Manager Integration
                  </Text>
                  <Text size="tiny" secondary>
                    Backend endpoints read GOOGLE_PLACES_API_KEY and GOOGLE_ROUTES_API_KEY directly from Site Secrets Manager.
                  </Text>
                </Box>
                <Button
                  size="tiny"
                  priority="secondary"
                  onClick={() => void checkSecrets()}
                  disabled={checkingSecrets}
                >
                  {checkingSecrets ? 'Checking...' : 'Recheck Secrets'}
                </Button>
              </Box>
              <Box gap="SP3" align="left" verticalAlign="middle" flexWrap="wrap">
                <Box gap="6px" verticalAlign="middle">
                  <Text size="tiny" weight="bold">
                    GOOGLE_PLACES_API_KEY:
                  </Text>
                  <Badge
                    size="small"
                    skin={secretStatus?.hasPlacesKey ? 'success' : 'warning'}
                  >
                    {secretStatus?.hasPlacesKey
                      ? 'Connected'
                      : secretStatus
                        ? 'Not Accessible'
                        : 'Checking...'}
                  </Badge>
                </Box>
                <Box gap="6px" verticalAlign="middle">
                  <Text size="tiny" weight="bold">
                    GOOGLE_ROUTES_API_KEY:
                  </Text>
                  <Badge
                    size="small"
                    skin={secretStatus?.hasRoutesKey ? 'success' : 'warning'}
                  >
                    {secretStatus?.hasRoutesKey
                      ? 'Connected'
                      : secretStatus
                        ? 'Not Accessible'
                        : 'Checking...'}
                  </Badge>
                </Box>
              </Box>
              {secretStatus?.secretError &&
                (!secretStatus.hasPlacesKey || !secretStatus.hasRoutesKey) && (
                  <Text size="tiny" skin="error">
                    {secretStatus.secretError.includes('403')
                      ? 'Wix Secrets Manager returned 403 Permission Denied. In Wix Dev Center -> App -> Permissions, enable "Manage Secrets", save, and accept the updated permissions on this site.'
                      : secretStatus.secretError}
                  </Text>
                )}
            </Box>
          </Cell>
        </Layout>
      </Card.Content>
    </SettingsPage.Card>
  );
};

export const WeeklyHoursCard = () => {
  const page = useSettingsPageContext<CombinedDispatchSettings, CombinedDispatchSettings>();
  const hoursCtrl = useController({
    name: 'hours',
    control: page.form.control,
    defaultValue: page.settings?.hours ?? [],
  });

  const rows = hoursCtrl.field.value ?? [];

  const updateRow = (index: number, patch: Partial<BusinessHourRecord>) => {
    const next = rows.map((row, idx) => (idx === index ? { ...row, ...patch } : row));
    hoursCtrl.field.onChange(next);
  };

  return (
    <SettingsPage.Card>
      <Card.Header
        title="Weekly Business Hours"
        subtitle="Defines enabled appointment days, opening/closing hours (24h HH:MM), and generated time slot intervals."
      />
      <Card.Divider />
      <Card.Content>
        <Box direction="vertical" gap="SP2">
          {rows.map((row, index) => {
            const previewSlots = generateTimeSlotsForDay(row);
            return (
              <Box
                key={row.dayKey}
                padding="SP2"
                border="1px solid var(--wds-color-border-light, #e5e7eb)"
                borderRadius="8px"
                direction="vertical"
                gap="SP2"
              >
                <Layout>
                  <Cell span={3}>
                    <Box verticalAlign="middle" gap="SP2" height="36px">
                      <ToggleSwitch
                        size="small"
                        checked={row.enabled}
                        onChange={(e) => updateRow(index, { enabled: e.target.checked })}
                      />
                      <Text size="small" weight="bold">
                        {row.dayLabel}
                      </Text>
                    </Box>
                  </Cell>
                  <Cell span={3}>
                    <FormField label="Start (HH:MM)" labelSize="small">
                      <Input
                        size="small"
                        disabled={!row.enabled}
                        value={row.startTime}
                        onChange={(e) => updateRow(index, { startTime: e.target.value })}
                      />
                    </FormField>
                  </Cell>
                  <Cell span={3}>
                    <FormField label="End (HH:MM)" labelSize="small">
                      <Input
                        size="small"
                        disabled={!row.enabled}
                        value={row.endTime}
                        onChange={(e) => updateRow(index, { endTime: e.target.value })}
                      />
                    </FormField>
                  </Cell>
                  <Cell span={3}>
                    <FormField label="Slot Interval" labelSize="small">
                      <Dropdown
                        size="small"
                        disabled={!row.enabled}
                        selectedId={String(row.slotInterval)}
                        options={INTERVAL_OPTIONS}
                        onSelect={(opt) => updateRow(index, { slotInterval: Number(opt.id) })}
                      />
                    </FormField>
                  </Cell>
                </Layout>
                <Box align="space-between" verticalAlign="middle">
                  <Text size="tiny" secondary>
                    {row.enabled
                      ? previewSlots.length > 0
                        ? `Generates ${previewSlots.length} slots: ${previewSlots[0]} – ${previewSlots[previewSlots.length - 1]}`
                        : 'Check HH:MM format (e.g. 09:00 to 18:00)'
                      : 'Closed — no time slots offered'}
                  </Text>
                  <Badge size="tiny" skin={row.enabled ? 'success' : 'neutral'}>
                    {row.enabled ? 'Open' : 'Closed'}
                  </Badge>
                </Box>
              </Box>
            );
          })}
        </Box>
      </Card.Content>
    </SettingsPage.Card>
  );
};

export const ServiceAreasSideCard = () => {
  const [available, setAvailable] = useState(true);
  const [areas, setAreas] = useState<ServiceAreaRecord[]>([]);
  const [city, setCity] = useState('');
  const [stateCode, setStateCode] = useState('NC');
  const [zipCode, setZipCode] = useState('');
  const [saving, setSaving] = useState(false);

  const loadAreas = useCallback(async () => {
    const res = await fetchServiceAreas();
    setAvailable(res.available);
    setAreas(res.items);
  }, []);

  useEffect(() => {
    loadAreas().catch(() => setAvailable(false));
  }, [loadAreas]);

  const handleAdd = async () => {
    if (!city.trim() && !zipCode.trim()) return;
    setSaving(true);
    try {
      await saveServiceArea({
        title: `${city.trim()} ${zipCode.trim()}`.trim(),
        city: city.trim(),
        state: stateCode.trim() || 'NC',
        zipCode: zipCode.trim(),
        active: true,
        sortOrder: areas.length + 1,
      });
      setCity('');
      setZipCode('');
      await loadAreas();
      dashboard.showToast({ message: 'Service area added', type: 'success' });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to save service area';
      dashboard.showToast({ message: msg, type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (area: ServiceAreaRecord) => {
    if (!area._id) return;
    const { modalClosed } = dashboard.openModal(CONFIRM_DELETE_MODAL_ID, {
      collectionId: COLLECTION_IDS.SERVICE_AREAS,
      itemId: area._id,
      itemName: area.title || area.city || area.zipCode,
      recordLabel: 'Service Area',
    });
    const result = (await modalClosed) as { confirmed?: boolean } | undefined;
    if (result?.confirmed) {
      await loadAreas();
    }
  };

  return (
    <Card>
      <Card.Header
        title="Service Areas"
        subtitle="Optional ServiceAreas CMS collection for city/ZIP dispatch coverage."
      />
      <Card.Divider />
      <Card.Content>
        {!available ? (
          <Text size="small" secondary>
            No optional ServiceAreas CMS collection was detected on this site. Distance pricing uses your OwnerSettings hub and mileage rules.
          </Text>
        ) : (
          <Box direction="vertical" gap="SP2">
            {areas.length === 0 ? (
              <Text size="small" secondary>
                No custom service area rows yet.
              </Text>
            ) : (
              areas.map((area) => (
                <Box
                  key={area._id ?? `${area.city}-${area.zipCode}`}
                  align="space-between"
                  verticalAlign="middle"
                >
                  <Box direction="vertical">
                    <Text size="small" weight="bold">
                      {area.city || area.title}
                      {area.state ? `, ${area.state}` : ''}
                    </Text>
                    {area.zipCode ? (
                      <Text size="tiny" secondary>
                        ZIP: {area.zipCode}
                      </Text>
                    ) : null}
                  </Box>
                  <IconButton
                    size="small"
                    skin="dark"
                    onClick={() => handleDelete(area)}
                    aria-label="Delete service area"
                  >
                    <DeleteSmall />
                  </IconButton>
                </Box>
              ))
            )}
            <Layout>
              <Cell span={6}>
                <Input
                  size="small"
                  placeholder="City"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                />
              </Cell>
              <Cell span={3}>
                <Input
                  size="small"
                  placeholder="State"
                  value={stateCode}
                  onChange={(e) => setStateCode(e.target.value)}
                />
              </Cell>
              <Cell span={3}>
                <Input
                  size="small"
                  placeholder="ZIP"
                  value={zipCode}
                  onChange={(e) => setZipCode(e.target.value)}
                />
              </Cell>
            </Layout>
            <Button size="small" priority="secondary" disabled={saving} onClick={handleAdd}>
              {saving ? 'Adding...' : 'Add Area'}
            </Button>
          </Box>
        )}
      </Card.Content>
    </Card>
  );
};
