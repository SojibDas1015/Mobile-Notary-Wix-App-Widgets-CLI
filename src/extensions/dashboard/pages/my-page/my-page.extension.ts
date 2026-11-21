import { extensions } from '@wix/custom-extensions';

export default extensions.dashboardPage({
  id: '8b3285ec-299d-4376-af74-acfab1d6010f',
  title: 'Direct Mobile Notary',
  routePath: '',
  component: './extensions/dashboard/pages/my-page/my-page.tsx',
  fullPage: false,
  metaData: {
    searchable: true,
    description:
      'Manage Direct Mobile Notary bookings, quote requests, services catalog, intake questions, add-ons, dispatch rules, and business hours.',
    aiContext: {
      description:
        'Unified Direct Mobile Notary management console for AppointmentsAndQuotes, ServicesCatalog, BookingQuestions, BookingAddons, OwnerSettings, BusinessHours, and ServiceAreas.',
    },
  },
});
