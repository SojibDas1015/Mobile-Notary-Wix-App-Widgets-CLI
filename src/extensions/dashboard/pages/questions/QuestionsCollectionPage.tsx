import React, { useEffect, useMemo, useState } from 'react';
import { Badge, Box, Text } from '@wix/design-system';
import {
  CollectionEmptyState,
  CollectionErrorState,
  CollectionNoResultsState,
  CollectionSearch,
  CollectionToolbarFilters,
  MultiSelectCheckboxFilter,
  PrimaryActions,
  Table,
  stringsArrayFilter,
  useStaticListFilterCollection,
  useTableCollection,
  useWixPatternsContainer,
} from '@wix/patterns';
import { CollectionPage } from '@wix/patterns/page';
import { usePatternsNavigate } from '@wix/patterns/router';
import { fetchAllServicesList, fetchQuestionsPage } from '../../cms/notary-cms-api';
import type { QuestionInputType, QuestionRecord, ServiceRecord } from '../../cms/types';
import { formatCurrency, INPUT_TYPE_LABELS } from '../../shared/constants';

const activeFilter = stringsArrayFilter<'active' | 'inactive'>({
  name: 'QuestionStatus',
  itemKey: (v) => v,
  itemName: (v) => (v === 'active' ? 'Active' : 'Inactive'),
});

const inputTypeFilter = stringsArrayFilter<QuestionInputType>({
  name: 'QuestionInputType',
  itemKey: (t) => t,
  itemName: (t) => INPUT_TYPE_LABELS[t] ?? t,
});

export const QuestionsCollectionPage = () => {
  const { navigateToEntityPage } = usePatternsNavigate<QuestionRecord>();
  const { errorHandler } = useWixPatternsContainer();
  const [services, setServices] = useState<ServiceRecord[]>([]);

  useEffect(() => {
    fetchAllServicesList()
      .then(setServices)
      .catch(() => {
        // Table remains functional using raw serviceId if services fail to load.
      });
  }, []);

  const serviceNameById = useMemo(() => {
    const map: Record<string, string> = { all: 'All Services (Global)' };
    for (const s of services) {
      map[s.serviceId] = s.title;
    }
    return map;
  }, [services]);

  const serviceFilter = useMemo(
    () =>
      stringsArrayFilter<string>({
        name: 'QuestionService',
        itemKey: (id) => id,
        itemName: (id) => serviceNameById[id] ?? id,
      }),
    [serviceNameById],
  );

  const openNew = () => navigateToEntityPage({ path: '/questions/new' });

  const state = useTableCollection<
    QuestionRecord,
    {
      serviceId: typeof serviceFilter;
      active: typeof activeFilter;
      inputType: typeof inputTypeFilter;
    }
  >({
    queryName: 'notary-questions',
    paginationMode: 'cursor',
    itemKey: (item) => item._id,
    itemName: (item) => item.label || item.title || item.fieldKey,
    filters: {
      serviceId: serviceFilter,
      active: activeFilter,
      inputType: inputTypeFilter,
    },
    fetchData: (query) =>
      fetchQuestionsPage({
        limit: query.limit,
        cursor: query.cursor ?? undefined,
        search: query.search,
        filters: {
          serviceId: query.filters.serviceId,
          active: query.filters.active,
          inputType: query.filters.inputType,
        },
      }),
  });

  const serviceIds = useMemo(
    () => ['all', ...services.map((s) => s.serviceId)],
    [services],
  );
  const serviceOptions = useStaticListFilterCollection(serviceFilter, serviceIds);
  const activeOptions = useStaticListFilterCollection(activeFilter, ['active', 'inactive']);
  const inputOptions = useStaticListFilterCollection(inputTypeFilter, [
    'text',
    'textarea',
    'number',
    'select',
    'radio',
    'checkbox',
    'date',
  ]);

  return (
    <CollectionPage>
      <CollectionPage.Header
        title={{ text: 'Intake Questions' }}
        subtitle={{
          text: 'Customize document & intake form questions shown per service on Step 2 of Book Now.',
        }}
        primaryAction={<PrimaryActions label="Add question" onClick={openNew} />}
      />
      <CollectionPage.Content>
        <div className="dmn-responsive-table dmn-table-2col">
          <Table
            state={state}
          horizontalScroll
          search={<CollectionSearch placeholder="Search label, fieldKey, or serviceId" />}
          filters={
            <CollectionToolbarFilters>
              <MultiSelectCheckboxFilter
                filter={serviceFilter}
                collection={serviceOptions}
                toolbarItemProps={{ label: 'Service Scope' }}
                accordionItemProps={{ label: 'Service Scope' }}
              />
              <MultiSelectCheckboxFilter
                filter={inputTypeFilter}
                collection={inputOptions}
                toolbarItemProps={{ label: 'Input Type' }}
                accordionItemProps={{ label: 'Input Type' }}
              />
              <MultiSelectCheckboxFilter
                filter={activeFilter}
                collection={activeOptions}
                toolbarItemProps={{ label: 'Status' }}
                accordionItemProps={{ label: 'Status' }}
              />
            </CollectionToolbarFilters>
          }
          emptyState={
            <CollectionEmptyState
              title="No intake questions yet"
              subtitle="Add dynamic questions to collect signer counts, loan types, or document requirements."
              addNewCta={{ text: 'Add question', onClick: openNew }}
            />
          }
          noResultsState={
            <CollectionNoResultsState
              title="No matching questions"
              subtitle="Try adjusting your search or clearing the active filters."
            />
          }
          errorState={(err, { retry }) => {
            const resolved = errorHandler.getResolvedError?.(err);
            return (
              <CollectionErrorState
                title="Couldn't load intake questions"
                subtitle={resolved?.message}
                requestId={resolved?.requestId}
                action={{ text: 'Retry', onClick: retry }}
              />
            );
          }}
          onRowClick={(item) =>
            navigateToEntityPage({ path: `/questions/${item._id}`, entity: item })
          }
          columns={[
            {
              id: 'label',
              title: 'Question Label',
              width: '260px',
              render: (item) => (
                <Box direction="vertical" gap="3px">
                  <Box gap="SP1" verticalAlign="middle" flexWrap="wrap">
                    <Text size="small" weight="bold">
                      {item.label || item.title}
                    </Text>
                    {item.required ? (
                      <Badge size="tiny" skin="warning">
                        Required
                      </Badge>
                    ) : null}
                  </Box>
                  <Text size="tiny" secondary>
                    Key: {item.fieldKey}
                  </Text>
                </Box>
              ),
              mobile: { column: 'first', order: 1 },
            },
            {
              id: 'service',
              title: 'Service Scope',
              width: '190px',
              render: (item) => (
                <Box direction="vertical" gap="3px">
                  <Text size="small">{serviceNameById[item.serviceId] ?? item.serviceId}</Text>
                  <div className="dmn-mobile-row-meta">
                    <Text size="tiny" secondary>
                      {INPUT_TYPE_LABELS[item.inputType] ?? item.inputType}
                    </Text>
                    <Badge size="tiny" skin={item.active ? 'success' : 'neutral'}>
                      {item.active ? 'Active' : 'Hidden'}
                    </Badge>
                  </div>
                </Box>
              ),
              mobile: { column: 'second' },
            },
            {
              id: 'type',
              title: 'Field Type',
              width: '130px',
              render: (item) => (
                <Text size="small">
                  {INPUT_TYPE_LABELS[item.inputType] ?? item.inputType}
                </Text>
              ),
            },
            {
              id: 'fee',
              title: 'Fee Rule',
              width: '120px',
              render: (item) => (
                <Text size="small">
                  {item.feeAmount ? `+${formatCurrency(item.feeAmount)}` : '—'}
                </Text>
              ),
            },
            {
              id: 'sortOrder',
              title: 'Order',
              width: '70px',
              render: (item) => <Text size="small">#{item.sortOrder}</Text>,
            },
            {
              id: 'status',
              title: 'Status',
              width: '140px',
              render: (item) => (
                <Box gap="SP1" verticalAlign="middle">
                  <Badge size="small" skin={item.active ? 'success' : 'neutral'}>
                    {item.active ? 'Active' : 'Hidden'}
                  </Badge>
                  {item.protected ? (
                    <Badge size="tiny" skin="neutralStandard">
                      Protected
                    </Badge>
                  ) : null}
                </Box>
              ),
            },
          ]}
        />
        </div>
      </CollectionPage.Content>
    </CollectionPage>
  );
};
