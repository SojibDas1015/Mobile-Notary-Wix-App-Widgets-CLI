import { extensions } from '@wix/custom-extensions';

export default extensions.dashboardPage({
  id: 'a03f14ba-1b51-4e89-99b8-b4628d182765',
  title: 'Dispatch & Hours',
  routePath: 'settings',
  component: './extensions/dashboard/pages/settings/settings.tsx',
  fullPage: false,
  metaData: {
    searchable: true,
    description:
      'Configure dispatch origin hub, mileage rates, one-way/round-trip calculation, weekly business hours, and service areas.',
    aiContext: {
      description:
        'Manage OwnerSettings (origin address, travel fees, per-mile rate, tripCalculationMode, RON toggle, business contact, disclaimer) and BusinessHours 7-day schedule.',
    },
  },
});
