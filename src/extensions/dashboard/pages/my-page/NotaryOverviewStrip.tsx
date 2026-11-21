import React, { useEffect, useState } from 'react';
import { Badge, Box } from '@wix/design-system';
import { usePatternsNavigate } from '@wix/patterns/router';
import {
  fetchDashboardOverview,
  type DashboardOverviewResult,
} from '../../cms/notary-cms-api';

export const NotaryOverviewStrip = () => {
  const { navigateToCollectionPage } = usePatternsNavigate();
  const [overview, setOverview] = useState<DashboardOverviewResult | null>(null);

  useEffect(() => {
    fetchDashboardOverview()
      .then(setOverview)
      .catch(() => {
        // Overview metrics are supplemental; the main table handles retry errors.
      });
  }, []);

  if (!overview) return null;

  const secretsReady = overview.hasPlacesKey && overview.hasRoutesKey;

  return (
    <div className="dmn-kpi-grid">
      <div className="dmn-kpi-card">
        <span className="dmn-kpi-label">Total Bookings &amp; Quotes</span>
        <span className="dmn-kpi-value">{overview.totalBookings}</span>
        <span className="dmn-kpi-meta">Synced with AppointmentsAndQuotes</span>
      </div>

      <div className="dmn-kpi-card">
        <span className="dmn-kpi-label">Pending Quote Approval</span>
        <span className="dmn-kpi-value">{overview.pendingQuotes}</span>
        <Box paddingTop="3px">
          <Badge size="tiny" skin={overview.pendingQuotes > 0 ? 'warning' : 'success'}>
            {overview.pendingQuotes > 0 ? 'Needs Review' : 'All Caught Up'}
          </Badge>
        </Box>
      </div>

      <div
        className="dmn-kpi-card is-clickable"
        onClick={() => navigateToCollectionPage({ path: '/services' })}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            navigateToCollectionPage({ path: '/services' });
          }
        }}
      >
        <span className="dmn-kpi-label">Active Services</span>
        <span className="dmn-kpi-value">{overview.activeServices}</span>
        <span className="dmn-kpi-meta">Manage catalog &amp; pricing →</span>
      </div>

      <div
        className="dmn-kpi-card is-clickable"
        onClick={() => navigateToCollectionPage({ path: '/settings' })}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            navigateToCollectionPage({ path: '/settings' });
          }
        }}
      >
        <span className="dmn-kpi-label">Google Secret Manager</span>
        <Box paddingTop="4px" paddingBottom="2px">
          <Badge size="small" skin={secretsReady ? 'success' : 'warning'}>
            {secretsReady ? 'Places & Routes Connected' : 'Permission Needed'}
          </Badge>
        </Box>
        <span className="dmn-kpi-meta">Origin: {overview.originLabel}</span>
      </div>
    </div>
  );
};
