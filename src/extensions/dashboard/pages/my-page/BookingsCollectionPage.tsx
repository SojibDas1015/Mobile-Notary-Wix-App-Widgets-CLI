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
  TabsFilter,
  stringsArrayFilter,
  useStaticListFilterCollection,
  useTableCollection,
  useWixPatternsContainer,
} from '@wix/patterns';
import { CollectionPage } from '@wix/patterns/page';
import { usePatternsNavigate } from '@wix/patterns/router';
import { fetchAllServicesList, fetchBookingsPage } from '../../cms/notary-cms-api';
import { NotaryOverviewStrip } from './NotaryOverviewStrip';
import type { BookingRecord, ServiceRecord } from '../../cms/types';
import {
  BOOKING_STATUS_OPTIONS,
  BOOKING_STATUS_SKIN,
  BOOKING_TYPE_OPTIONS,
  formatCurrency,
} from '../../shared/constants';

const STATUS_VALUES = BOOKING_STATUS_OPTIONS.map((o) => o.id);
const TYPE_LABELS: Record<string, string> = {
  instant: 'Instant Booking',
  quote: 'Custom Quote',
};

const statusFilter = stringsArrayFilter<string>({
  name: 'BookingStatus',
  itemKey: (status) => status,
  itemName: (status) => status,
});

const bookingTypeFilter = stringsArrayFilter<string>({
  name: 'BookingType',
  itemKey: (type) => type,
  itemName: (type) => TYPE_LABELS[type] ?? type,
});

export const BookingsCollectionPage = () => {
  const { navigateToEntityPage } = usePatternsNavigate<BookingRecord>();
  const { errorHandler } = useWixPatternsContainer();
  const [services, setServices] = useState<ServiceRecord[]>([]);

  useEffect(() => {
    fetchAllServicesList()
      .then(setServices)
      .catch(() => {
        // Service list is only for filter labels; table remains usable if unavailable.
      });
  }, []);

  const serviceNameById = useMemo(() => {
    const map: Record<string, string> = {};
    for (const s of services) {
      map[s.serviceId] = s.title;
    }
    return map;
  }, [services]);

  const serviceFilter = useMemo(
    () =>
      stringsArrayFilter<string>({
        name: 'BookingService',
        itemKey: (id) => id,
        itemName: (id) => serviceNameById[id] ?? id,
      }),
    [serviceNameById],
  );

  const openNew = () => navigateToEntityPage({ path: '/bookings/new' });

  const state = useTableCollection<
    BookingRecord,
    {
      status: typeof statusFilter;
      bookingType: typeof bookingTypeFilter;
      serviceId: typeof serviceFilter;
    }
  >({
    queryName: 'notary-bookings',
    paginationMode: 'cursor',
    itemKey: (item) => item._id,
    itemName: (item) => item.bookingRef || item.clientName || item.title || 'Booking',
    filters: {
      status: statusFilter,
      bookingType: bookingTypeFilter,
      serviceId: serviceFilter,
    },
    fetchData: (query) =>
      fetchBookingsPage({
        limit: query.limit,
        cursor: query.cursor ?? undefined,
        search: query.search,
        filters: {
          status: query.filters.status,
          bookingType: query.filters.bookingType,
          serviceId: query.filters.serviceId,
        },
      }),
  });

  const statusOptions = useStaticListFilterCollection(statusFilter, STATUS_VALUES);
  const typeOptions = useStaticListFilterCollection(
    bookingTypeFilter,
    BOOKING_TYPE_OPTIONS.map((o) => o.id),
  );
  const serviceOptions = useStaticListFilterCollection(
    serviceFilter,
    services.map((s) => s.serviceId),
  );

  const statusTabs = useMemo(() => STATUS_VALUES, []);

  return (
    <CollectionPage>
      <CollectionPage.Header
        title={{ text: 'Bookings & Quotes' }}
        subtitle={{
          text: 'Manage mobile notary appointments, quote requests, fees, and client documents.',
        }}
        primaryAction={<PrimaryActions label="New booking" onClick={openNew} />}
      />
      <CollectionPage.Content>
        <Box direction="vertical" gap="SP2" width="100%">
          <NotaryOverviewStrip />
          <Table
          state={state}
          horizontalScroll
          search={<CollectionSearch placeholder="Search ref, client, address, or service" />}
          tabs={
            <TabsFilter
              filter={statusFilter}
              data={statusTabs}
              all="All"
            />
          }
          filters={
            <CollectionToolbarFilters>
              <MultiSelectCheckboxFilter
                filter={statusFilter}
                collection={statusOptions}
                toolbarItemProps={{ label: 'Status' }}
                accordionItemProps={{ label: 'Status' }}
              />
              <MultiSelectCheckboxFilter
                filter={bookingTypeFilter}
                collection={typeOptions}
                toolbarItemProps={{ label: 'Type' }}
                accordionItemProps={{ label: 'Type' }}
              />
              {services.length > 0 && (
                <MultiSelectCheckboxFilter
                  filter={serviceFilter}
                  collection={serviceOptions}
                  toolbarItemProps={{ label: 'Service' }}
                  accordionItemProps={{ label: 'Service' }}
                />
              )}
            </CollectionToolbarFilters>
          }
          emptyState={
            <CollectionEmptyState
              title="No bookings or quotes yet"
              subtitle="Submissions from your Book Now page appear here automatically, or you can log a manual appointment."
              addNewCta={{ text: 'New booking', onClick: openNew }}
            />
          }
          noResultsState={
            <CollectionNoResultsState
              title="No matching bookings"
              subtitle="Try adjusting your search or clearing the active filters."
            />
          }
          errorState={(err, { retry }) => {
            const resolved = errorHandler.getResolvedError?.(err);
            return (
              <CollectionErrorState
                title="Couldn't load bookings"
                subtitle={resolved?.message}
                requestId={resolved?.requestId}
                action={{ text: 'Retry', onClick: retry }}
              />
            );
          }}
          onRowClick={(item) =>
            navigateToEntityPage({ path: `/bookings/${item._id}`, entity: item })
          }
          columns={[
            {
              id: 'bookingRef',
              title: 'Reference',
              width: '140px',
              render: (item) => (
                <Box direction="vertical" gap="3px">
                  <Text size="small" weight="bold">
                    {item.bookingRef || 'Pending Ref'}
                  </Text>
                  <Text size="tiny" secondary>
                    {TYPE_LABELS[item.bookingType] ?? item.bookingType}
                  </Text>
                </Box>
              ),
              mobile: { column: 'first', order: 1 },
            },
            {
              id: 'client',
              title: 'Client',
              width: '210px',
              render: (item) => (
                <Box direction="vertical" gap="3px">
                  <Text size="small" weight="normal">
                    {item.clientName || 'Unnamed client'}
                  </Text>
                  <Text size="tiny" secondary>
                    {item.clientPhone || item.clientEmail || 'No contact'}
                  </Text>
                </Box>
              ),
              mobile: { column: 'second' },
            },
            {
              id: 'service',
              title: 'Service',
              width: '200px',
              render: (item) => (
                <Box direction="vertical" gap="3px">
                  <Text size="small">{item.serviceName || item.serviceId || '—'}</Text>
                  <Text size="tiny" secondary>
                    {item.city ? `${item.city}, ${item.state || ''}`.trim() : item.locationType || ''}
                  </Text>
                </Box>
              ),
            },
            {
              id: 'schedule',
              title: 'Schedule',
              width: '170px',
              render: (item) => (
                <Box direction="vertical" gap="3px">
                  <Text size="small">{item.appointmentDate || 'TBD'}</Text>
                  <Text size="tiny" secondary>
                    {item.appointmentTime || 'Flexible'}
                  </Text>
                </Box>
              ),
            },
            {
              id: 'total',
              title: 'Total',
              width: '110px',
              render: (item) => (
                <Text size="small" weight="bold">
                  {item.bookingType === 'quote' && !item.grandTotal
                    ? 'Quote TBD'
                    : formatCurrency(item.grandTotal)}
                </Text>
              ),
            },
            {
              id: 'status',
              title: 'Status',
              width: '180px',
              render: (item) => (
                <Badge
                  size="small"
                  skin={BOOKING_STATUS_SKIN[item.status] ?? 'neutral'}
                >
                  {item.status}
                </Badge>
              ),
            },
          ]}
        />
        </Box>
      </CollectionPage.Content>
    </CollectionPage>
  );
};
