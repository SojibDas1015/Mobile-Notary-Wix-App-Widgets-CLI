import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Box } from '@wix/design-system';
import {
  EntityPage,
  useEntityPage,
  useWixPatternsContainer,
} from '@wix/patterns';
import { useForm } from '@wix/patterns/form';
import {
  fetchAllServicesList,
  fetchBooking,
  removeBooking,
  saveBooking,
} from '../../cms/notary-cms-api';
import type { BookingRecord, ServiceRecord } from '../../cms/types';
import { BOOKING_STATUS_SKIN } from '../../shared/constants';
import {
  BookingSummaryCard,
  ClientLocationCard,
  DocumentCountsNotesCard,
  PricingBreakdownCard,
  ScheduleRouteCard,
  UploadedFilesCard,
  type BookingFormFields,
} from './BookingEntityCards';

export const BookingEntityPage = () => {
  const { id } = useParams<{ id?: string }>();
  const form = useForm<BookingFormFields>();
  const { errorHandler } = useWixPatternsContainer();
  const [services, setServices] = useState<ServiceRecord[]>([]);

  useEffect(() => {
    fetchAllServicesList()
      .then(setServices)
      .catch(() => {
        // Fallback to manual service name input if catalog fetch fails.
      });
  }, []);

  const state = useEntityPage<BookingRecord, BookingFormFields>({
    parentPath: '/',
    isNewEntity: () => !id,
    form,
    fetch: async () => ({
      entity: id ? await fetchBooking(id) : undefined,
    }),
    onSave: async ({ entity }) => ({
      updatedEntity: await saveBooking({
        ...entity,
        ...form.getValues(),
        _id: id,
      }),
    }),
    deleteAction: id
      ? {
          enabled: true,
          itemName: (entity) => entity.bookingRef || entity.clientName || 'Booking',
          onDelete: async (entity) => {
            await removeBooking(entity._id);
          },
          successToast: 'Booking deleted',
          errorToast: (err) => ({
            message:
              errorHandler.getResolvedError?.(err)?.message ??
              'Failed to delete booking',
          }),
        }
      : undefined,
    saveSuccessToast: 'Booking saved',
    saveErrorToast: (err) => ({
      message:
        errorHandler.getResolvedError?.(err)?.message ??
        'Failed to save booking',
    }),
  });

  const watchedStatus = form.watch('status') || 'Confirmed';
  const watchedRef = form.watch('bookingRef');

  return (
    <EntityPage state={state}>
      <EntityPage.Header
        title={{
          text: id ? `Booking ${watchedRef || ''}`.trim() : 'New Booking',
          badges: id
            ? [
                {
                  text: watchedStatus,
                  skin: BOOKING_STATUS_SKIN[watchedStatus] ?? 'neutral',
                },
              ]
            : undefined,
        }}
        subtitle={{
          text: id
            ? 'Review client details, adjust quote totals, or update appointment status.'
            : 'Log a manual mobile notary appointment or quote request into CMS.',
        }}
      />
      <EntityPage.Content>
        <EntityPage.MainContent>
          <Box direction="vertical" gap="SP3">
            <BookingSummaryCard services={services} />
            <EntityPage.Card>
              <ClientLocationCard />
            </EntityPage.Card>
            <EntityPage.Card>
              <ScheduleRouteCard />
            </EntityPage.Card>
            <EntityPage.Card>
              <DocumentCountsNotesCard />
            </EntityPage.Card>
          </Box>
        </EntityPage.MainContent>
        <EntityPage.AdditionalContent>
          <Box direction="vertical" gap="SP3">
            <EntityPage.Card>
              <PricingBreakdownCard />
            </EntityPage.Card>
            <EntityPage.Card>
              <UploadedFilesCard />
            </EntityPage.Card>
          </Box>
        </EntityPage.AdditionalContent>
      </EntityPage.Content>
    </EntityPage>
  );
};
