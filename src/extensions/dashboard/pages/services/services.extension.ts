import { extensions } from '@wix/custom-extensions';

export default extensions.dashboardPage({
  id: '9d0f11c6-2d8e-4f40-9149-9c42e8b4e3cc',
  title: 'Services Catalog',
  routePath: 'services',
  component: './extensions/dashboard/pages/services/services.tsx',
  fullPage: false,
  metaData: {
    searchable: true,
    description:
      'Create, edit, sort, price, and toggle notary services displayed in the Book Now widget.',
    aiContext: {
      description:
        'Manage ServicesCatalog CMS records including pricingModel, basePrice, popularLabel, imageUrl, hiddenByDefault, sortOrder, and active flags.',
    },
  },
});
