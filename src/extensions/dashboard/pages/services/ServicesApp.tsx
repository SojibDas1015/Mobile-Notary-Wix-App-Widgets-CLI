import React from 'react';
import { PatternsFieldsProvider, withDashboard } from '@wix/patterns';
import { WixPatternsProvider } from '@wix/patterns/provider';
import { PatternsReactRoute, PatternsReactRouter } from '@wix/patterns/router';
import { BusinessManagerPatternsTheme } from '../../shared/BusinessManagerPatternsTheme';
import { ServicesCollectionPage } from './ServicesCollectionPage';
import { ServiceEntityPage } from './ServiceEntityPage';

export const ServicesApp = withDashboard(() => (
  <BusinessManagerPatternsTheme>
    <WixPatternsProvider>
      <PatternsFieldsProvider>
        <PatternsReactRouter>
          <PatternsReactRoute
            type="collection"
            path="/"
            element={<ServicesCollectionPage />}
          />
          <PatternsReactRoute
            type="editEntity"
            path="/:id"
            element={<ServiceEntityPage />}
          />
          <PatternsReactRoute
            type="createEntity"
            path="/new"
            element={<ServiceEntityPage />}
          />
        </PatternsReactRouter>
      </PatternsFieldsProvider>
    </WixPatternsProvider>
  </BusinessManagerPatternsTheme>
));
