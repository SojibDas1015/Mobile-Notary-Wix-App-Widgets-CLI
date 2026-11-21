import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  Box,
  Card,
  Cell,
  Dropdown,
  FormField,
  Input,
  InputArea,
  Layout,
  NumberInput,
  ToggleSwitch,
} from '@wix/design-system';
import {
  EntityPage,
  useEntityPage,
  useEntityPageContext,
  useWixPatternsContainer,
} from '@wix/patterns';
import { useController, useForm } from '@wix/patterns/form';
import {
  fetchAddon,
  fetchAllServicesList,
  removeAddon,
  saveAddon,
} from '../../cms/notary-cms-api';
import type { AddonRecord, FeeType, ServiceRecord } from '../../cms/types';
import { FEE_TYPE_OPTIONS } from '../../shared/constants';

type AddonFormFields = Omit<AddonRecord, '_id'>;

export const AddonEntityPage = () => {
  const { id } = useParams<{ id?: string }>();
  const form = useForm<AddonFormFields>();
  const { errorHandler } = useWixPatternsContainer();
  const [services, setServices] = useState<ServiceRecord[]>([]);

  useEffect(() => {
    fetchAllServicesList()
      .then(setServices)
      .catch(() => {
        // Service scope dropdown falls back to Global ('all').
      });
  }, []);

  const state = useEntityPage<AddonRecord, AddonFormFields>({
    parentPath: '/addons',
    isNewEntity: () => !id,
    form,
    fetch: async () => ({
      entity: id ? await fetchAddon(id) : undefined,
    }),
    onSave: async ({ entity }) => ({
      updatedEntity: await saveAddon({
        ...entity,
        ...form.getValues(),
        _id: id,
      }),
    }),
    deleteAction: id
      ? {
          enabled: true,
          itemName: (entity) => entity.label || entity.title || 'Add-on',
          onDelete: async (entity) => {
            await removeAddon(entity._id);
          },
          successToast: 'Add-on deleted',
          errorToast: (err) => ({
            message:
              errorHandler.getResolvedError?.(err)?.message ??
              'Failed to delete add-on',
          }),
        }
      : undefined,
    saveSuccessToast: 'Add-on saved',
    saveErrorToast: (err) => ({
      message:
        errorHandler.getResolvedError?.(err)?.message ??
        'Failed to save add-on',
    }),
  });

  return (
    <EntityPage state={state}>
      <EntityPage.Header
        title={{ text: id ? form.watch('label') || 'Edit Add-on' : 'New Add-on' }}
        subtitle={{
          text: 'Changes update the live Step 3 add-ons and quote calculator.',
        }}
      />
      <EntityPage.Content>
        <EntityPage.MainContent>
          <EntityPage.Card>
            <Card.Header title="Add-on Details" />
            <Card.Divider />
            <Card.Content>
              <AddonMainFields services={services} isNew={!id} />
            </Card.Content>
          </EntityPage.Card>
        </EntityPage.MainContent>
        <EntityPage.AdditionalContent>
          <EntityPage.Card>
            <Card.Header title="Pricing & Visibility" />
            <Card.Divider />
            <Card.Content>
              <AddonSideFields />
            </Card.Content>
          </EntityPage.Card>
        </EntityPage.AdditionalContent>
      </EntityPage.Content>
    </EntityPage>
  );
};

const AddonMainFields = ({
  services,
  isNew,
}: {
  services: ServiceRecord[];
  isNew: boolean;
}) => {
  const page = useEntityPageContext<AddonRecord, AddonFormFields>();
  const labelCtrl = useController({
    name: 'label',
    control: page.form.control,
    defaultValue: page.entity?.label ?? '',
    rules: { required: { value: true, message: 'Add-on label is required' } },
  });
  const titleCtrl = useController({
    name: 'title',
    control: page.form.control,
    defaultValue: page.entity?.title ?? '',
  });
  const addonIdCtrl = useController({
    name: 'addonId',
    control: page.form.control,
    defaultValue: page.entity?.addonId ?? '',
  });
  const selectionKeyCtrl = useController({
    name: 'selectionKey',
    control: page.form.control,
    defaultValue: page.entity?.selectionKey ?? '',
  });
  const serviceIdCtrl = useController({
    name: 'serviceId',
    control: page.form.control,
    defaultValue: page.entity?.serviceId ?? 'all',
  });
  const descCtrl = useController({
    name: 'description',
    control: page.form.control,
    defaultValue: page.entity?.description ?? '',
  });

  const serviceOptions = [
    { id: 'all', value: 'All Services (Global)' },
    ...services.map((s) => ({ id: s.serviceId, value: s.title })),
  ];

  return (
    <Layout>
      <Cell span={6}>
        <FormField
          label="Customer-Facing Label"
          required
          status={labelCtrl.fieldState.error ? 'error' : undefined}
          statusMessage={labelCtrl.fieldState.error?.message}
        >
          <Input value={labelCtrl.field.value} onChange={labelCtrl.field.onChange} />
        </FormField>
      </Cell>
      <Cell span={6}>
        <FormField label="Service Scope">
          <Dropdown
            selectedId={serviceIdCtrl.field.value}
            options={serviceOptions}
            onSelect={(opt) => serviceIdCtrl.field.onChange(String(opt.id))}
          />
        </FormField>
      </Cell>
      <Cell span={6}>
        <FormField label="Internal Title">
          <Input value={titleCtrl.field.value} onChange={titleCtrl.field.onChange} />
        </FormField>
      </Cell>
      <Cell span={6}>
        <FormField label="Add-on Key (addonId / selectionKey)">
          <Input
            value={selectionKeyCtrl.field.value || addonIdCtrl.field.value}
            onChange={(e) => {
              selectionKeyCtrl.field.onChange(e.target.value);
              if (isNew) addonIdCtrl.field.onChange(e.target.value);
            }}
            placeholder="Auto-generated if blank"
          />
        </FormField>
      </Cell>
      <Cell span={12}>
        <FormField label="Description">
          <InputArea rows={3} value={descCtrl.field.value} onChange={descCtrl.field.onChange} />
        </FormField>
      </Cell>
    </Layout>
  );
};

const AddonSideFields = () => {
  const page = useEntityPageContext<AddonRecord, AddonFormFields>();
  const activeCtrl = useController({
    name: 'active',
    control: page.form.control,
    defaultValue: page.entity?.active ?? true,
  });
  const feeCtrl = useController({
    name: 'feeAmount',
    control: page.form.control,
    defaultValue: page.entity?.feeAmount ?? 0,
  });
  const feeTypeCtrl = useController({
    name: 'feeType',
    control: page.form.control,
    defaultValue: page.entity?.feeType ?? 'flat',
  });
  const sortCtrl = useController({
    name: 'sortOrder',
    control: page.form.control,
    defaultValue: page.entity?.sortOrder ?? 10,
  });

  return (
    <Box direction="vertical" gap="SP3">
      <FormField label="Active on Book Now Page" labelPlacement="right">
        <ToggleSwitch
          checked={Boolean(activeCtrl.field.value)}
          onChange={(e) => activeCtrl.field.onChange(e.target.checked)}
        />
      </FormField>
      <FormField label="Fee Amount ($)">
        <NumberInput
          min={0}
          step={5}
          value={feeCtrl.field.value}
          onChange={(v) => feeCtrl.field.onChange(v ?? 0)}
        />
      </FormField>
      <FormField label="Fee Calculation Type">
        <Dropdown
          selectedId={feeTypeCtrl.field.value}
          options={FEE_TYPE_OPTIONS}
          onSelect={(opt) => feeTypeCtrl.field.onChange(String(opt.id) as FeeType)}
        />
      </FormField>
      <FormField label="Display Sort Order">
        <NumberInput
          min={0}
          value={sortCtrl.field.value}
          onChange={(v) => sortCtrl.field.onChange(v ?? 10)}
        />
      </FormField>
    </Box>
  );
};
