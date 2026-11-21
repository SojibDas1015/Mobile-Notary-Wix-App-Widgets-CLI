import React from 'react';
import { useParams } from 'react-router-dom';
import {
  Box,
  Card,
  Cell,
  Checkbox,
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
import { ControlledImageInput } from '@wix/patterns-fields';
import { fetchService, removeService, saveService } from '../../cms/notary-cms-api';
import type { PricingModel, ServiceRecord } from '../../cms/types';
import { PRICING_MODEL_OPTIONS } from '../../shared/constants';

type ServiceFormFields = Omit<ServiceRecord, '_id'>;

export const ServiceEntityPage = () => {
  const { id } = useParams<{ id?: string }>();
  const form = useForm<ServiceFormFields>();
  const { errorHandler } = useWixPatternsContainer();

  const state = useEntityPage<ServiceRecord, ServiceFormFields>({
    parentPath: '/services',
    isNewEntity: () => !id,
    form,
    fetch: async () => ({
      entity: id ? await fetchService(id) : undefined,
    }),
    onSave: async ({ entity }) => ({
      updatedEntity: await saveService({
        ...entity,
        ...form.getValues(),
        _id: id,
      }),
    }),
    deleteAction: id
      ? {
          enabled: true,
          itemName: (entity) => entity.title || entity.serviceId,
          onDelete: async (entity) => {
            await removeService(entity._id);
          },
          successToast: 'Service deleted',
          errorToast: (err) => ({
            message:
              errorHandler.getResolvedError?.(err)?.message ??
              'Failed to delete service',
          }),
        }
      : undefined,
    saveSuccessToast: 'Service saved',
    saveErrorToast: (err) => ({
      message:
        errorHandler.getResolvedError?.(err)?.message ??
        'Failed to save service',
    }),
  });

  return (
    <EntityPage state={state}>
      <EntityPage.Header
        title={{ text: id ? form.watch('title') || 'Edit Service' : 'New Service' }}
        subtitle={{
          text: 'Changes apply immediately to the live Book Now service selector and fee calculator.',
        }}
      />
      <EntityPage.Content>
        <EntityPage.MainContent>
          <EntityPage.Card>
            <Card.Header title="Service Details & Pricing" />
            <Card.Divider />
            <Card.Content>
              <ServiceMainFields isNew={!id} />
            </Card.Content>
          </EntityPage.Card>
        </EntityPage.MainContent>
        <EntityPage.AdditionalContent>
          <EntityPage.Card>
            <Card.Header title="Display & Media" />
            <Card.Divider />
            <Card.Content>
              <ServiceSideFields />
            </Card.Content>
          </EntityPage.Card>
        </EntityPage.AdditionalContent>
      </EntityPage.Content>
    </EntityPage>
  );
};

const ServiceMainFields = ({ isNew }: { isNew: boolean }) => {
  const page = useEntityPageContext<ServiceRecord, ServiceFormFields>();
  const titleCtrl = useController({
    name: 'title',
    control: page.form.control,
    defaultValue: page.entity?.title ?? '',
    rules: { required: { value: true, message: 'Service title is required' } },
  });
  const serviceIdCtrl = useController({
    name: 'serviceId',
    control: page.form.control,
    defaultValue: page.entity?.serviceId ?? '',
    rules: { required: { value: true, message: 'Unique serviceId key is required' } },
  });
  const descCtrl = useController({
    name: 'description',
    control: page.form.control,
    defaultValue: page.entity?.description ?? '',
  });
  const modelCtrl = useController({
    name: 'pricingModel',
    control: page.form.control,
    defaultValue: page.entity?.pricingModel ?? 'flat',
  });
  const priceCtrl = useController({
    name: 'basePrice',
    control: page.form.control,
    defaultValue: page.entity?.basePrice ?? 0,
  });
  const quoteCtrl = useController({
    name: 'isQuoteOnly',
    control: page.form.control,
    defaultValue: Boolean(page.entity?.isQuoteOnly),
  });
  const popularCtrl = useController({
    name: 'popularLabel',
    control: page.form.control,
    defaultValue: page.entity?.popularLabel ?? '',
  });
  const sortCtrl = useController({
    name: 'sortOrder',
    control: page.form.control,
    defaultValue: page.entity?.sortOrder ?? 10,
  });

  return (
    <Layout>
      <Cell span={6}>
        <FormField
          label="Service Name"
          required
          status={titleCtrl.fieldState.error ? 'error' : undefined}
          statusMessage={titleCtrl.fieldState.error?.message}
        >
          <Input value={titleCtrl.field.value} onChange={titleCtrl.field.onChange} />
        </FormField>
      </Cell>
      <Cell span={6}>
        <FormField
          label="Service Key (serviceId)"
          required
          infoContent="Unique key referenced by BookingQuestions, BookingAddons, and Bookings (e.g., gen, loan, i9)."
          status={serviceIdCtrl.fieldState.error ? 'error' : undefined}
          statusMessage={serviceIdCtrl.fieldState.error?.message}
        >
          <Input
            value={serviceIdCtrl.field.value}
            onChange={serviceIdCtrl.field.onChange}
            disabled={!isNew && Boolean(page.entity?.serviceId)}
          />
        </FormField>
      </Cell>
      <Cell span={12}>
        <FormField label="Description">
          <InputArea rows={3} value={descCtrl.field.value} onChange={descCtrl.field.onChange} />
        </FormField>
      </Cell>
      <Cell span={6}>
        <FormField label="Pricing Model">
          <Dropdown
            selectedId={modelCtrl.field.value}
            options={PRICING_MODEL_OPTIONS}
            onSelect={(opt) => {
              const nextModel = String(opt.id) as PricingModel;
              modelCtrl.field.onChange(nextModel);
              if (nextModel === 'quote_only') {
                quoteCtrl.field.onChange(true);
              }
            }}
          />
        </FormField>
      </Cell>
      <Cell span={6}>
        <FormField label="Base Price ($)">
          <NumberInput
            min={0}
            step={5}
            value={priceCtrl.field.value}
            onChange={(v) => priceCtrl.field.onChange(v ?? 0)}
          />
        </FormField>
      </Cell>
      <Cell span={6}>
        <FormField label="Popular / Highlight Badge">
          <Input
            value={popularCtrl.field.value}
            onChange={popularCtrl.field.onChange}
            placeholder="e.g. Most Popular"
          />
        </FormField>
      </Cell>
      <Cell span={6}>
        <FormField label="Display Sort Order">
          <NumberInput
            min={0}
            value={sortCtrl.field.value}
            onChange={(v) => sortCtrl.field.onChange(v ?? 10)}
          />
        </FormField>
      </Cell>
      <Cell span={12}>
        <Checkbox
          checked={Boolean(quoteCtrl.field.value)}
          onChange={(e) => quoteCtrl.field.onChange(e.target.checked)}
        >
          Custom Quote Only (skips instant pricing and submits as Pending Quote Approval)
        </Checkbox>
      </Cell>
    </Layout>
  );
};

const ServiceSideFields = () => {
  const page = useEntityPageContext<ServiceRecord, ServiceFormFields>();
  const activeCtrl = useController({
    name: 'active',
    control: page.form.control,
    defaultValue: page.entity?.active ?? true,
  });
  const hiddenCtrl = useController({
    name: 'hiddenByDefault',
    control: page.form.control,
    defaultValue: Boolean(page.entity?.hiddenByDefault),
  });
  const imageCtrl = useController({
    name: 'imageUrl',
    control: page.form.control,
    defaultValue: page.entity?.imageUrl ?? '',
  });

  return (
    <Box direction="vertical" gap="SP3">
      <FormField label="Active on Book Now Page" labelPlacement="right">
        <ToggleSwitch
          checked={Boolean(activeCtrl.field.value)}
          onChange={(e) => activeCtrl.field.onChange(e.target.checked)}
        />
      </FormField>
      <FormField
        label="Place in 'More Services' drawer"
        labelPlacement="right"
      >
        <ToggleSwitch
          checked={Boolean(hiddenCtrl.field.value)}
          onChange={(e) => hiddenCtrl.field.onChange(e.target.checked)}
        />
      </FormField>
      <FormField label="Service Card Image">
        <ControlledImageInput
          data={imageCtrl.field.value || undefined}
          onChange={(val) => imageCtrl.field.onChange(val ?? '')}
          onBlur={imageCtrl.field.onBlur}
        />
      </FormField>
    </Box>
  );
};
