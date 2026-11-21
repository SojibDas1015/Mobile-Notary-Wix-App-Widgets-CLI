import React, { useState } from 'react';
import { Box, Button, Card, Text } from '@wix/design-system';
import {
  SettingsPage,
  useSettingsPage,
  useWixPatternsContainer,
} from '@wix/patterns';
import { useForm } from '@wix/patterns/form';
import {
  fetchBusinessHours,
  fetchOwnerSettings,
  saveBusinessHours,
  saveOwnerSettings,
} from '../../cms/notary-cms-api';
import {
  BusinessIdentityCard,
  DispatchOriginCard,
  ServiceAreasSideCard,
  WeeklyHoursCard,
  type CombinedDispatchSettings,
} from './SettingsCards';

export const SettingsPageView = () => {
  const form = useForm<CombinedDispatchSettings>();
  const { errorHandler } = useWixPatternsContainer();
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loadedRevision, setLoadedRevision] = useState(0);

  const state = useSettingsPage<CombinedDispatchSettings, CombinedDispatchSettings>({
    form,
    fetch: async () => {
      try {
        setLoadError(null);
        const [owner, hours] = await Promise.all([
          fetchOwnerSettings(),
          fetchBusinessHours(),
        ]);
        const nextSettings = { owner, hours };
        form.reset(nextSettings);
        setLoadedRevision((n) => n + 1);
        return { settings: nextSettings };
      } catch (err) {
        const msg =
          errorHandler.getResolvedError?.(err)?.message ??
          (err instanceof Error ? err.message : 'Failed to load settings from CMS.');
        setLoadError(msg);
        throw err;
      }
    },
    onSave: async () => {
      const values = form.getValues();
      const [savedOwner, savedHours] = await Promise.all([
        saveOwnerSettings(values.owner),
        saveBusinessHours(values.hours),
      ]);
      const nextSettings = { owner: savedOwner, hours: savedHours };
      form.reset(nextSettings);
      setLoadedRevision((n) => n + 1);
    },
    onCancel: async () => form.reset(),
    saveSuccessToast: 'Dispatch settings and business hours saved',
    saveErrorToast: (err, { retry }) => ({
      message:
        errorHandler.getResolvedError?.(err)?.message ??
        'Failed to save dispatch settings',
      action: { text: 'Retry', onClick: retry },
    }),
  });

  return (
    <SettingsPage state={state}>
      <SettingsPage.Header
        title={{ text: 'Dispatch & Hours' }}
        subtitle={{
          text: 'Manage OwnerSettings mileage rules, origin hub, business hours, and service areas.',
        }}
      />
      <SettingsPage.Content>
        <SettingsPage.MainContent>
          {loadError ? (
            <Card>
              <Card.Header title="Couldn't load CMS settings" />
              <Card.Divider />
              <Card.Content>
                <Box direction="vertical" gap="SP2">
                  <Text skin="error">{loadError}</Text>
                  <Button size="small" onClick={() => window.location.reload()}>
                    Retry
                  </Button>
                </Box>
              </Card.Content>
            </Card>
          ) : (
            <Box key={loadedRevision} direction="vertical" gap="SP3">
              <DispatchOriginCard />
              <BusinessIdentityCard />
              <WeeklyHoursCard />
            </Box>
          )}
        </SettingsPage.MainContent>
        <SettingsPage.AdditionalContent>
          <ServiceAreasSideCard />
        </SettingsPage.AdditionalContent>
      </SettingsPage.Content>
    </SettingsPage>
  );
};
