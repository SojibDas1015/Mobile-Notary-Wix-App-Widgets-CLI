import React from 'react';
import { PatternsFieldsProvider, withDashboard } from '@wix/patterns';
import { WixPatternsProvider } from '@wix/patterns/provider';
import { PatternsReactRoute, PatternsReactRouter } from '@wix/patterns/router';
import { BusinessManagerPatternsTheme } from '../../shared/BusinessManagerPatternsTheme';
import { QuestionsCollectionPage } from './QuestionsCollectionPage';
import { QuestionEntityPage } from './QuestionEntityPage';

export const QuestionsApp = withDashboard(() => (
  <BusinessManagerPatternsTheme>
    <WixPatternsProvider>
      <PatternsFieldsProvider>
        <PatternsReactRouter>
          <PatternsReactRoute
            type="collection"
            path="/"
            element={<QuestionsCollectionPage />}
          />
          <PatternsReactRoute
            type="editEntity"
            path="/:id"
            element={<QuestionEntityPage />}
          />
          <PatternsReactRoute
            type="createEntity"
            path="/new"
            element={<QuestionEntityPage />}
          />
        </PatternsReactRouter>
      </PatternsFieldsProvider>
    </WixPatternsProvider>
  </BusinessManagerPatternsTheme>
));
