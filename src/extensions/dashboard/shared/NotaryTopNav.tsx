import React from 'react';
import { useLocation } from 'react-router-dom';
import { usePatternsNavigate } from '@wix/patterns/router';
import './notary-brand.css';

interface NavTabItem {
  id: string;
  step: string;
  label: string;
  shortDesc: string;
  guideSummary: string;
  whereUsed: string;
  path: string;
  matchPrefixes: string[];
}

const NAV_TABS: NavTabItem[] = [
  {
    id: 'bookings',
    step: '01',
    label: 'Bookings & Quotes',
    shortDesc: 'Client requests & approvals',
    guideSummary:
      'Review live appointments, approve quote requests, inspect client uploads, and update booking statuses.',
    whereUsed: 'Syncs with AppointmentsAndQuotes CMS',
    path: '/',
    matchPrefixes: ['/bookings'],
  },
  {
    id: 'services',
    step: '02',
    label: 'Services Catalog',
    shortDesc: 'Services, prices & badges',
    guideSummary:
      'Add or edit notary services, base prices, pricing models (Per Signature / Flat / Quote Only), and Step 1 display order.',
    whereUsed: 'Appears on Booking Widget Step 1',
    path: '/services',
    matchPrefixes: ['/services'],
  },
  {
    id: 'questions',
    step: '03',
    label: 'Intake Questions',
    shortDesc: 'Step 2 custom form fields',
    guideSummary:
      'Configure dynamic document & signer questions shown to customers based on their selected service.',
    whereUsed: 'Appears on Booking Widget Step 2',
    path: '/questions',
    matchPrefixes: ['/questions'],
  },
  {
    id: 'addons',
    step: '04',
    label: 'Service Add-ons',
    shortDesc: 'Optional paid extras & fees',
    guideSummary:
      'Manage optional extras (printing, courier return, witness support, extra seals) that add directly to the booking total.',
    whereUsed: 'Appears on Booking Widget Step 2–3',
    path: '/addons',
    matchPrefixes: ['/addons'],
  },
  {
    id: 'settings',
    step: '05',
    label: 'Dispatch & Hours',
    shortDesc: 'Hub, travel rates & Secrets',
    guideSummary:
      'Set your dispatch hub address, mileage travel rates, weekly appointment hours, service areas, and verify Wix Secrets Manager.',
    whereUsed: 'Controls Route Calculation & Time Slots',
    path: '/settings',
    matchPrefixes: ['/settings'],
  },
  {
    id: 'reviews',
    step: '06',
    label: 'Customer Reviews',
    shortDesc: 'Google sync & Approve/Hide',
    guideSummary:
      'Sync reviews from Google Business Profile via Places API and toggle which reviews are approved to show on your website.',
    whereUsed: 'Appears in Customer Reviews Widget',
    path: '/reviews',
    matchPrefixes: ['/reviews'],
  },
];

function isTabActive(pathname: string, tab: NavTabItem): boolean {
  if (tab.path === '/') {
    return pathname === '/' || pathname.startsWith('/bookings');
  }
  return (
    pathname === tab.path ||
    tab.matchPrefixes.some((prefix) => pathname.startsWith(`${prefix}/`))
  );
}

export const NotaryTopNav = () => {
  const { pathname } = useLocation();
  const { navigateToCollectionPage } = usePatternsNavigate();
  const activeTab = NAV_TABS.find((tab) => isTabActive(pathname, tab)) ?? NAV_TABS[0];

  return (
    <>
      <header className="dmn-topbar">
        <div className="dmn-topbar-head">
          <div className="dmn-brand-group">
            <h1 className="dmn-brand-title">Direct Mobile Notary &amp; Verification Services</h1>
            <div className="dmn-brand-sub">
              Manage appointments, services catalog, intake questions, add-ons, and dispatch settings
            </div>
          </div>
          <div className="dmn-dispatch-pill">NC Mobile Dispatch</div>
        </div>
        <nav className="dmn-nav-tabs" aria-label="Notary management sections">
          {NAV_TABS.map((tab) => {
            const active = tab.id === activeTab.id;
            return (
              <button
                key={tab.id}
                type="button"
                className={`dmn-nav-tab ${active ? 'is-active' : ''}`}
                onClick={() => navigateToCollectionPage({ path: tab.path })}
              >
                <span className="dmn-nav-tab-top">
                  <span>{tab.step}</span>
                  <span>{tab.label}</span>
                </span>
                <span className="dmn-nav-tab-desc">{tab.shortDesc}</span>
              </button>
            );
          })}
        </nav>
      </header>
      <div className="dmn-tab-guide">
        <div className="dmn-tab-guide-main">
          <span className="dmn-tab-guide-tag">
            {activeTab.step} · {activeTab.label}
          </span>
          <span>{activeTab.guideSummary}</span>
        </div>
        <span className="dmn-tab-guide-where">{activeTab.whereUsed}</span>
      </div>
    </>
  );
};
