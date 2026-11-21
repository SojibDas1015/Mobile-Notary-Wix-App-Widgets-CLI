import React from 'react';
import { PatternsFieldsProvider, withDashboard } from '@wix/patterns';
import { WixPatternsProvider } from '@wix/patterns/provider';
import { PatternsReactRoute, PatternsReactRouter } from '@wix/patterns/router';
import { BusinessManagerPatternsTheme } from '../../shared/BusinessManagerPatternsTheme';
import { NotaryWorkspaceShell } from '../../shared/NotaryWorkspaceShell';
import { BookingsCollectionPage } from './BookingsCollectionPage';
import { BookingEntityPage } from './BookingEntityPage';
import { ServicesCollectionPage } from '../services/ServicesCollectionPage';
import { ServiceEntityPage } from '../services/ServiceEntityPage';
import { QuestionsCollectionPage } from '../questions/QuestionsCollectionPage';
import { QuestionEntityPage } from '../questions/QuestionEntityPage';
import { AddonsCollectionPage } from '../addons/AddonsCollectionPage';
import { AddonEntityPage } from '../addons/AddonEntityPage';
import { SettingsPageView } from '../settings/SettingsPageView';
import { ReviewsManagementPage } from '../reviews/ReviewsManagementPage';

const withShell = (node: React.ReactNode) => (
  <NotaryWorkspaceShell>{node}</NotaryWorkspaceShell>
);

export const BookingsApp = withDashboard(() => (
  <BusinessManagerPatternsTheme>
    <WixPatternsProvider>
      <PatternsFieldsProvider>
        <PatternsReactRouter>
          <PatternsReactRoute
            type="collection"
            path="/"
            element={withShell(<BookingsCollectionPage />)}
          />
          <PatternsReactRoute
            type="createEntity"
            path="/bookings/new"
            element={withShell(<BookingEntityPage />)}
          />
          <PatternsReactRoute
            type="editEntity"
            path="/bookings/:id"
            element={withShell(<BookingEntityPage />)}
          />

          <PatternsReactRoute
            type="collection"
            path="/services"
            element={withShell(<ServicesCollectionPage />)}
          />
          <PatternsReactRoute
            type="createEntity"
            path="/services/new"
            element={withShell(<ServiceEntityPage />)}
          />
          <PatternsReactRoute
            type="editEntity"
            path="/services/:id"
            element={withShell(<ServiceEntityPage />)}
          />

          <PatternsReactRoute
            type="collection"
            path="/questions"
            element={withShell(<QuestionsCollectionPage />)}
          />
          <PatternsReactRoute
            type="createEntity"
            path="/questions/new"
            element={withShell(<QuestionEntityPage />)}
          />
          <PatternsReactRoute
            type="editEntity"
            path="/questions/:id"
            element={withShell(<QuestionEntityPage />)}
          />

          <PatternsReactRoute
            type="collection"
            path="/addons"
            element={withShell(<AddonsCollectionPage />)}
          />
          <PatternsReactRoute
            type="createEntity"
            path="/addons/new"
            element={withShell(<AddonEntityPage />)}
          />
          <PatternsReactRoute
            type="editEntity"
            path="/addons/:id"
            element={withShell(<AddonEntityPage />)}
          />

          <PatternsReactRoute
            type="other"
            path="/settings"
            element={withShell(<SettingsPageView />)}
          />
          <PatternsReactRoute
            type="other"
            path="/reviews"
            element={withShell(<ReviewsManagementPage />)}
          />
        </PatternsReactRouter>
      </PatternsFieldsProvider>
    </WixPatternsProvider>
  </BusinessManagerPatternsTheme>
));
