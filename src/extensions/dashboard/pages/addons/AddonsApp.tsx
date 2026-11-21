import React from 'react';
import { PatternsFieldsProvider, withDashboard } from '@wix/patterns';
import { WixPatternsProvider } from '@wix/patterns/provider';
import { PatternsReactRoute, PatternsReactRouter } from '@wix/patterns/router';
import { BusinessManagerPatternsTheme } from '../../shared/BusinessManagerPatternsTheme';
import { AddonsCollectionPage } from './AddonsCollectionPage';
import { AddonEntityPage } from './AddonEntityPage';

export const AddonsApp = withDashboard(() => (
  <BusinessManagerPatternsTheme>
    <WixPatternsProvider>
      <PatternsFieldsProvider>
        <PatternsReactRouter>
          <PatternsReactRoute
            type="collection"
            path="/"
            element={<AddonsCollectionPage />}
          />
          <PatternsReactRoute
            type="editEntity"
            path="/:id"
            element={<AddonEntityPage />}
          />
          <PatternsReactRoute
            type="createEntity"
            path="/new"
            element={<AddonEntityPage />}
          />
        </PatternsReactRouter>
      </PatternsFieldsProvider>
    </WixPatternsProvider>
  </BusinessManagerPatternsTheme>
));
