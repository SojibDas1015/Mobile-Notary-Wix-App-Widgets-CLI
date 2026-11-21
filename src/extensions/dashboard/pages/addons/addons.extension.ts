import { extensions } from '@wix/custom-extensions';

export default extensions.dashboardPage({
  id: '04d9bd2e-c726-4479-a64f-603824c6863f',
  title: 'Service Add-ons',
  routePath: 'addons',
  component: './extensions/dashboard/pages/addons/addons.tsx',
  fullPage: false,
  metaData: {
    searchable: true,
    description:
      'Manage optional notary add-on fees such as printing, witness coordination, or rush surcharges.',
    aiContext: {
      description:
        'Manage BookingAddons CMS records including feeAmount, feeType, serviceId scope, selectionKey, sortOrder, and active flags.',
    },
  },
});
