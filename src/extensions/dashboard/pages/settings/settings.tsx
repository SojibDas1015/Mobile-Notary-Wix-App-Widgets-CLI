import React from 'react';
import { withDashboard } from '@wix/patterns';
import { WixPatternsProvider } from '@wix/patterns/provider';
import { BusinessManagerTheme } from '../../shared/BusinessManagerTheme';
import { BusinessManagerPatternsTheme } from '../../shared/BusinessManagerPatternsTheme';
import { SettingsPageView } from './SettingsPageView';

const Page = () => (
  <BusinessManagerTheme>
    <BusinessManagerPatternsTheme>
      <WixPatternsProvider>
        <SettingsPageView />
      </WixPatternsProvider>
    </BusinessManagerPatternsTheme>
  </BusinessManagerTheme>
);

export default withDashboard(Page);
