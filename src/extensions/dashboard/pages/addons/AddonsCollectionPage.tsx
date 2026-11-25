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
import { fetchAddonsPage, fetchAllServicesList } from '../../cms/notary-cms-api';
import type { AddonRecord, FeeType, ServiceRecord } from '../../cms/types';
import { FEE_TYPE_LABELS, formatCurrency } from '../../shared/constants';

const activeFilter = stringsArrayFilter<'active' | 'inactive'>({
  name: 'AddonStatus',
  itemKey: (v) => v,
  itemName: (v) => (v === 'active' ? 'Active' : 'Inactive'),
});

const feeTypeFilter = stringsArrayFilter<FeeType>({
  name: 'AddonFeeType',
  itemKey: (t) => t,
  itemName: (t) => FEE_TYPE_LABELS[t] ?? t,
});

export const AddonsCollectionPage = () => {
  const { navigateToEntityPage } = usePatternsNavigate<AddonRecord>();
  const { errorHandler } = useWixPatternsContainer();
  const [services, setServices] = useState<ServiceRecord[]>([]);

  useEffect(() => {
    fetchAllServicesList()
      .then(setServices)
      .catch(() => {
        // Fallback to raw serviceId labels.
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
        name: 'AddonService',
        itemKey: (id) => id,
        itemName: (id) => serviceNameById[id] ?? id,
      }),
    [serviceNameById],
  );

  const openNew = () => navigateToEntityPage({ path: '/addons/new' });

  const state = useTableCollection<
    AddonRecord,
    {
      serviceId: typeof serviceFilter;
      active: typeof activeFilter;
      feeType: typeof feeTypeFilter;
    }
  >({
    queryName: 'notary-addons',
    paginationMode: 'cursor',
    itemKey: (item) => item._id,
    itemName: (item) => item.label || item.title || item.addonId,
    filters: {
      serviceId: serviceFilter,
      active: activeFilter,
      feeType: feeTypeFilter,
    },
    fetchData: (query) =>
      fetchAddonsPage({
        limit: query.limit,
        cursor: query.cursor ?? undefined,
        search: query.search,
        filters: {
          serviceId: query.filters.serviceId,
          active: query.filters.active,
          feeType: query.filters.feeType,
        },
      }),
  });

  const serviceIds = useMemo(
    () => ['all', ...services.map((s) => s.serviceId)],
    [services],
  );
  const serviceOptions = useStaticListFilterCollection(serviceFilter, serviceIds);
  const activeOptions = useStaticListFilterCollection(activeFilter, ['active', 'inactive']);
  const feeTypeOptions = useStaticListFilterCollection(feeTypeFilter, [
    'flat',
    'per_signature',
    'per_signer',
  ]);

  return (
    <CollectionPage>
      <CollectionPage.Header
        title={{ text: 'Service Add-ons' }}
        subtitle={{
          text: 'Configure paid add-ons such as document printing, courier return, or witness coordination.',
        }}
        primaryAction={<PrimaryActions label="Add add-on" onClick={openNew} />}
      />
      <CollectionPage.Content>
        <div className="dmn-responsive-table dmn-table-2col">
          <Table
            state={state}
          horizontalScroll
          search={<CollectionSearch placeholder="Search add-on label, key, or service" />}
          filters={
            <CollectionToolbarFilters>
              <MultiSelectCheckboxFilter
                filter={serviceFilter}
                collection={serviceOptions}
                toolbarItemProps={{ label: 'Service Scope' }}
                accordionItemProps={{ label: 'Service Scope' }}
              />
              <MultiSelectCheckboxFilter
                filter={feeTypeFilter}
                collection={feeTypeOptions}
                toolbarItemProps={{ label: 'Fee Type' }}
                accordionItemProps={{ label: 'Fee Type' }}
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
              title="No service add-ons configured"
              subtitle="Create optional add-ons that customers can toggle during booking."
              addNewCta={{ text: 'Add add-on', onClick: openNew }}
            />
          }
          noResultsState={
            <CollectionNoResultsState
              title="No matching add-ons"
              subtitle="Try adjusting your search or clearing the active filters."
            />
          }
          errorState={(err, { retry }) => {
            const resolved = errorHandler.getResolvedError?.(err);
            return (
              <CollectionErrorState
                title="Couldn't load add-ons"
                subtitle={resolved?.message}
                requestId={resolved?.requestId}
                action={{ text: 'Retry', onClick: retry }}
              />
            );
          }}
          onRowClick={(item) =>
            navigateToEntityPage({ path: `/addons/${item._id}`, entity: item })
          }
          columns={[
            {
              id: 'label',
              title: 'Add-on',
              width: '260px',
              render: (item) => (
                <Box direction="vertical" gap="3px">
                  <Text size="small" weight="bold">
                    {item.label || item.title}
                  </Text>
                  <Text size="tiny" secondary>
                    Key: {item.selectionKey || item.addonId}
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
                    <Text size="tiny" weight="bold">
                      {formatCurrency(item.feeAmount)} ({FEE_TYPE_LABELS[item.feeType] ?? item.feeType})
                    </Text>
                    <Badge size="tiny" skin={item.active ? 'success' : 'neutral'}>
                      {item.active ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                </Box>
              ),
              mobile: { column: 'second' },
            },
            {
              id: 'fee',
              title: 'Fee',
              width: '150px',
              render: (item) => (
                <Box direction="vertical" gap="3px">
                  <Text size="small" weight="bold">
                    {formatCurrency(item.feeAmount)}
                  </Text>
                  <Text size="tiny" secondary>
                    {FEE_TYPE_LABELS[item.feeType] ?? item.feeType}
                  </Text>
                </Box>
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
              width: '120px',
              render: (item) => (
                <Badge size="small" skin={item.active ? 'success' : 'neutral'}>
                  {item.active ? 'Active' : 'Inactive'}
                </Badge>
              ),
            },
          ]}
        />
        </div>
      </CollectionPage.Content>
    </CollectionPage>
  );
};
