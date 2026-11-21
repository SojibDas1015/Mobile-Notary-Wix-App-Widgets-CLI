import React, { useEffect, useState } from 'react';
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
import {
  fetchAllServicesList,
  fetchQuestion,
  removeQuestion,
  saveQuestion,
} from '../../cms/notary-cms-api';
import type { QuestionInputType, QuestionRecord, ServiceRecord } from '../../cms/types';
import { FEE_TYPE_OPTIONS, QUESTION_INPUT_OPTIONS } from '../../shared/constants';

type QuestionFormFields = Omit<QuestionRecord, '_id'>;

export const QuestionEntityPage = () => {
  const { id } = useParams<{ id?: string }>();
  const form = useForm<QuestionFormFields>();
  const { errorHandler } = useWixPatternsContainer();
  const [services, setServices] = useState<ServiceRecord[]>([]);

  useEffect(() => {
    fetchAllServicesList()
      .then(setServices)
      .catch(() => {
        // Service scope dropdown falls back to Global ('all').
      });
  }, []);

  const isProtected = Boolean(form.watch('protected'));

  const state = useEntityPage<QuestionRecord, QuestionFormFields>({
    parentPath: '/questions',
    isNewEntity: () => !id,
    form,
    fetch: async () => ({
      entity: id ? await fetchQuestion(id) : undefined,
    }),
    onSave: async ({ entity }) => ({
      updatedEntity: await saveQuestion({
        ...entity,
        ...form.getValues(),
        _id: id,
      }),
    }),
    deleteAction:
      id && !isProtected
        ? {
            enabled: true,
            itemName: (entity) => entity.label || entity.title || 'Question',
            onDelete: async (entity) => {
              await removeQuestion(entity._id);
            },
            successToast: 'Question deleted',
            errorToast: (err) => ({
              message:
                errorHandler.getResolvedError?.(err)?.message ??
                'Failed to delete question',
            }),
          }
        : undefined,
    saveSuccessToast: 'Question saved',
    saveErrorToast: (err) => ({
      message:
        errorHandler.getResolvedError?.(err)?.message ??
        'Failed to save question',
    }),
  });

  return (
    <EntityPage state={state}>
      <EntityPage.Header
        title={{
          text: id ? form.watch('label') || 'Edit Intake Question' : 'New Intake Question',
        }}
        subtitle={{
          text: 'Configure field label, input type, choices, optional fee, and target service.',
        }}
      />
      <EntityPage.Content>
        <EntityPage.MainContent>
          <EntityPage.Card>
            <Card.Header title="Question Configuration" />
            <Card.Divider />
            <Card.Content>
              <QuestionMainFields services={services} isNew={!id} />
            </Card.Content>
          </EntityPage.Card>
        </EntityPage.MainContent>
        <EntityPage.AdditionalContent>
          <EntityPage.Card>
            <Card.Header title="Rules & Fee" />
            <Card.Divider />
            <Card.Content>
              <QuestionSideFields />
            </Card.Content>
          </EntityPage.Card>
        </EntityPage.AdditionalContent>
      </EntityPage.Content>
    </EntityPage>
  );
};

const QuestionMainFields = ({
  services,
  isNew,
}: {
  services: ServiceRecord[];
  isNew: boolean;
}) => {
  const page = useEntityPageContext<QuestionRecord, QuestionFormFields>();
  const labelCtrl = useController({
    name: 'label',
    control: page.form.control,
    defaultValue: page.entity?.label ?? '',
    rules: { required: { value: true, message: 'Question label is required' } },
  });
  const titleCtrl = useController({
    name: 'title',
    control: page.form.control,
    defaultValue: page.entity?.title ?? '',
  });
  const fieldKeyCtrl = useController({
    name: 'fieldKey',
    control: page.form.control,
    defaultValue: page.entity?.fieldKey ?? '',
  });
  const questionIdCtrl = useController({
    name: 'questionId',
    control: page.form.control,
    defaultValue: page.entity?.questionId ?? '',
  });
  const serviceIdCtrl = useController({
    name: 'serviceId',
    control: page.form.control,
    defaultValue: page.entity?.serviceId ?? 'all',
  });
  const inputTypeCtrl = useController({
    name: 'inputType',
    control: page.form.control,
    defaultValue: page.entity?.inputType ?? 'text',
  });
  const placeholderCtrl = useController({
    name: 'placeholder',
    control: page.form.control,
    defaultValue: page.entity?.placeholder ?? '',
  });
  const optionsCtrl = useController({
    name: 'options',
    control: page.form.control,
    defaultValue: page.entity?.options ?? '',
  });
  const helpCtrl = useController({
    name: 'helpText',
    control: page.form.control,
    defaultValue: page.entity?.helpText ?? '',
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
  const isProtected = Boolean(page.entity?.protected);
  const currentType = inputTypeCtrl.field.value;

  return (
    <Layout>
      <Cell span={6}>
        <FormField
          label="Question Label"
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
        <FormField
          label="Field Key (camelCase)"
          infoContent="Key stored inside serviceSpecificDetails JSON (e.g., signersCount, loanType)."
        >
          <Input
            value={fieldKeyCtrl.field.value}
            onChange={fieldKeyCtrl.field.onChange}
            disabled={!isNew && isProtected}
            placeholder="Auto-generated from label if blank"
          />
        </FormField>
      </Cell>
      <Cell span={6}>
        <FormField label="Input Type">
          <Dropdown
            selectedId={inputTypeCtrl.field.value}
            options={QUESTION_INPUT_OPTIONS}
            onSelect={(opt) =>
              inputTypeCtrl.field.onChange(String(opt.id) as QuestionInputType)
            }
          />
        </FormField>
      </Cell>
      {(currentType === 'select' || currentType === 'radio') && (
        <Cell span={12}>
          <FormField
            label="Choices (comma-separated)"
            infoContent="Example: Refinance, Buyer Closing, Seller Package, HELOC"
          >
            <Input
              value={optionsCtrl.field.value}
              onChange={optionsCtrl.field.onChange}
              placeholder="Option 1, Option 2, Option 3"
            />
          </FormField>
        </Cell>
      )}
      <Cell span={6}>
        <FormField label="Placeholder">
          <Input
            value={placeholderCtrl.field.value}
            onChange={placeholderCtrl.field.onChange}
          />
        </FormField>
      </Cell>
      <Cell span={6}>
        <FormField label="Internal Title / Question ID">
          <Input
            value={titleCtrl.field.value || questionIdCtrl.field.value}
            onChange={(e) => {
              titleCtrl.field.onChange(e.target.value);
              if (isNew) questionIdCtrl.field.onChange(e.target.value);
            }}
          />
        </FormField>
      </Cell>
      <Cell span={12}>
        <FormField label="Help Text (shown under field)">
          <Input value={helpCtrl.field.value} onChange={helpCtrl.field.onChange} />
        </FormField>
      </Cell>
      <Cell span={12}>
        <FormField label="Admin / Extended Description">
          <InputArea rows={2} value={descCtrl.field.value} onChange={descCtrl.field.onChange} />
        </FormField>
      </Cell>
    </Layout>
  );
};

const QuestionSideFields = () => {
  const page = useEntityPageContext<QuestionRecord, QuestionFormFields>();
  const activeCtrl = useController({
    name: 'active',
    control: page.form.control,
    defaultValue: page.entity?.active ?? true,
  });
  const requiredCtrl = useController({
    name: 'required',
    control: page.form.control,
    defaultValue: Boolean(page.entity?.required),
  });
  const sortCtrl = useController({
    name: 'sortOrder',
    control: page.form.control,
    defaultValue: page.entity?.sortOrder ?? 10,
  });
  const sectionCtrl = useController({
    name: 'section',
    control: page.form.control,
    defaultValue: page.entity?.section ?? '',
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
  const protectedCtrl = useController({
    name: 'protected',
    control: page.form.control,
    defaultValue: Boolean(page.entity?.protected),
  });

  return (
    <Box direction="vertical" gap="SP3">
      <FormField label="Active on Book Now Form" labelPlacement="right">
        <ToggleSwitch
          checked={Boolean(activeCtrl.field.value)}
          onChange={(e) => activeCtrl.field.onChange(e.target.checked)}
        />
      </FormField>
      <FormField label="Required Field">
        <Checkbox
          checked={Boolean(requiredCtrl.field.value)}
          onChange={(e) => requiredCtrl.field.onChange(e.target.checked)}
        >
          Customer must fill before continuing
        </Checkbox>
      </FormField>
      <FormField label="Display Sort Order">
        <NumberInput
          min={0}
          value={sortCtrl.field.value}
          onChange={(v) => sortCtrl.field.onChange(v ?? 10)}
        />
      </FormField>
      <FormField label="Section Group">
        <Input
          value={sectionCtrl.field.value}
          onChange={sectionCtrl.field.onChange}
          placeholder="e.g. Document Counts"
        />
      </FormField>
      <FormField label="Optional Surcharge ($)">
        <NumberInput
          min={0}
          step={5}
          value={feeCtrl.field.value}
          onChange={(v) => feeCtrl.field.onChange(v ?? 0)}
        />
      </FormField>
      <FormField label="Surcharge Type">
        <Dropdown
          selectedId={feeTypeCtrl.field.value || 'flat'}
          options={FEE_TYPE_OPTIONS}
          onSelect={(opt) => feeTypeCtrl.field.onChange(String(opt.id))}
        />
      </FormField>
      <FormField label="Protected Core Field">
        <Checkbox
          checked={Boolean(protectedCtrl.field.value)}
          onChange={(e) => protectedCtrl.field.onChange(e.target.checked)}
        >
          Lock key & prevent accidental deletion
        </Checkbox>
      </FormField>
    </Box>
  );
};
