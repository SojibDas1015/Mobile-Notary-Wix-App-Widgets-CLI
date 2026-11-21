import { extensions } from '@wix/custom-extensions';

export default extensions.customElement({
  id: 'fa1094d0-1fd1-4b77-95ef-3f4b53df7102',
  name: 'Customer Reviews',
  width: {
    defaultWidth: 1120,
    allowStretch: true,
    stretchByDefault: true,
  },
  height: {
    defaultHeight: 420,
    heightMode: 'AUTO',
  },
  installation: {
    autoAdd: false,
  },
  presets: [
    {
      id: '3c74270a-5102-4f99-b149-43fdfeebbc84',
      name: 'default',
      thumbnailUrl: '{{BASE_URL}}/notary-reviews-thumbnail.png',
    },
  ],
  tagName: 'notary-reviews',
  element: './extensions/site/widgets/notary-reviews/notary-reviews.tsx',
  settings: './extensions/site/widgets/notary-reviews/notary-reviews.panel.tsx',
});
