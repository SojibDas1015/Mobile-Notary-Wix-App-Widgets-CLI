import React from 'react';
import { Avatar, Badge, Box, Text } from '@wix/design-system';
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
import { fetchServicesPage } from '../../cms/notary-cms-api';
import type { PricingModel, ServiceRecord } from '../../cms/types';
import { formatCurrency, PAYMENT_POLICY_LABELS, PRICING_MODEL_LABELS } from '../../shared/constants';

const activeFilter = stringsArrayFilter<'active' | 'inactive'>({
  name: 'ServiceStatus',
  itemKey: (v) => v,
  itemName: (v) => (v === 'active' ? 'Active' : 'Hidden / Inactive'),
});

const pricingModelFilter = stringsArrayFilter<PricingModel>({
  name: 'ServicePricingModel',
  itemKey: (m) => m,
  itemName: (m) => PRICING_MODEL_LABELS[m] ?? m,
});

export const ServicesCollectionPage = () => {
  const { navigateToEntityPage } = usePatternsNavigate<ServiceRecord>();
  const { errorHandler } = useWixPatternsContainer();
  const openNew = () => navigateToEntityPage({ path: '/services/new' });

  const state = useTableCollection<
    ServiceRecord,
    { active: typeof activeFilter; pricingModel: typeof pricingModelFilter }
  >({
    queryName: 'notary-services',
    paginationMode: 'cursor',
    itemKey: (item) => item._id,
    itemName: (item) => item.title || item.serviceId,
    filters: {
      active: activeFilter,
      pricingModel: pricingModelFilter,
    },
    fetchData: (query) =>
      fetchServicesPage({
        limit: query.limit,
        cursor: query.cursor ?? undefined,
        search: query.search,
        filters: {
          active: query.filters.active,
          pricingModel: query.filters.pricingModel,
        },
      }),
  });

  const activeOptions = useStaticListFilterCollection(activeFilter, ['active', 'inactive']);
  const pricingOptions = useStaticListFilterCollection(pricingModelFilter, [
    'per_signature',
    'flat',
    'quote_only',
  ]);

  return (
    <CollectionPage>
      <CollectionPage.Header
        title={{ text: 'Services Catalog' }}
        subtitle={{
          text: 'Configure notary services, pricing models, popular badges, and visibility on your booking page.',
        }}
        primaryAction={<PrimaryActions label="Add service" onClick={openNew} />}
      />
      <CollectionPage.Content>
        <div className="dmn-responsive-table dmn-table-3col">
          <Table
            state={state}
          horizontalScroll
          search={<CollectionSearch placeholder="Search services by name, ID, or badge" />}
          filters={
            <CollectionToolbarFilters>
              <MultiSelectCheckboxFilter
                filter={activeFilter}
                collection={activeOptions}
                toolbarItemProps={{ label: 'Visibility' }}
                accordionItemProps={{ label: 'Visibility' }}
              />
              <MultiSelectCheckboxFilter
                filter={pricingModelFilter}
                collection={pricingOptions}
                toolbarItemProps={{ label: 'Pricing Model' }}
                accordionItemProps={{ label: 'Pricing Model' }}
              />
            </CollectionToolbarFilters>
          }
          emptyState={
            <CollectionEmptyState
              title="No services configured"
              subtitle="Add services in ServicesCatalog so customers can choose a notary service."
              addNewCta={{ text: 'Add service', onClick: openNew }}
            />
          }
          noResultsState={
            <CollectionNoResultsState
              title="No matching services"
              subtitle="Try clearing your search or filters."
            />
          }
          errorState={(err, { retry }) => {
            const resolved = errorHandler.getResolvedError?.(err);
            return (
              <CollectionErrorState
                title="Couldn't load services"
                subtitle={resolved?.message}
                requestId={resolved?.requestId}
                action={{ text: 'Retry', onClick: retry }}
              />
            );
          }}
          onRowClick={(item) =>
            navigateToEntityPage({ path: `/services/${item._id}`, entity: item })
          }
          columns={[
            {
              id: 'image',
              title: '',
              width: '56px',
              render: (item) => (
                <Avatar
                  size="size36"
                  name={item.title}
                  imgProps={item.imageUrl ? { src: item.imageUrl } : undefined}
                />
              ),
              mobile: { column: 'image' },
            },
            {
              id: 'title',
              title: 'Service',
              width: '260px',
              render: (item) => (
                <Box direction="vertical" gap="3px">
                  <Box gap="SP1" verticalAlign="middle" flexWrap="wrap">
                    <Text size="small" weight="bold">
                      {item.title}
                    </Text>
                    {item.popularLabel ? (
                      <Badge size="tiny" skin="general">
                        {item.popularLabel}
                      </Badge>
                    ) : null}
                  </Box>
                  <Text size="tiny" secondary>
                    ID: {item.serviceId}
                  </Text>
                </Box>
              ),
              mobile: { column: 'first', order: 1 },
            },
            {
              id: 'pricing',
              title: 'Pricing Model',
              width: '170px',
              render: (item) => (
                <Box direction="vertical" gap="3px">
                  <Text size="small">
                    {PRICING_MODEL_LABELS[item.pricingModel] ?? item.pricingModel}
                  </Text>
                  <Text size="tiny" secondary>
                    {item.isQuoteOnly || item.pricingModel === 'quote_only'
                      ? 'Custom quote flow'
                      : `${formatCurrency(item.basePrice)} base · ${
                          PAYMENT_POLICY_LABELS[item.paymentPolicy ?? 'full_advance'] ?? 'Stripe'
                        }`}
                  </Text>
                  <div className="dmn-mobile-row-meta">
                    <Badge size="tiny" skin={item.active ? 'success' : 'neutral'}>
                      {item.active ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                </Box>
              ),
              mobile: { column: 'second' },
            },
            {
              id: 'sortOrder',
              title: 'Sort',
              width: '80px',
              render: (item) => <Text size="small">#{item.sortOrder}</Text>,
            },
            {
              id: 'visibility',
              title: 'Status',
              width: '160px',
              render: (item) => (
                <Box gap="SP1" verticalAlign="middle">
                  <Badge size="small" skin={item.active ? 'success' : 'neutral'}>
                    {item.active ? 'Active' : 'Inactive'}
                  </Badge>
                  {item.hiddenByDefault ? (
                    <Badge size="tiny" skin="neutralStandard">
                      More drawer
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
