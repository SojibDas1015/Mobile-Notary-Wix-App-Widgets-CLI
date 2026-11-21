import { extensions } from '@wix/custom-extensions';

export default extensions.customElement({
  id: '73715ad7-6409-4ad9-8211-7428b20a0a9c',
  name: 'Request a Quote',
  width: {
    defaultWidth: 1120,
    allowStretch: true,
    stretchByDefault: true,
  },
  height: {
    defaultHeight: 920,
    heightMode: 'AUTO',
  },
  installation: {
    autoAdd: false,
  },
  presets: [
    {
      id: '05662e7e-1144-4744-b1fb-1206ba12e948',
      name: 'default',
      thumbnailUrl: '{{BASE_URL}}/notary-quote-thumbnail.png',
    },
  ],
  tagName: 'notary-quote',
  element: './extensions/site/widgets/notary-quote/notary-quote.tsx',
  settings: './extensions/site/widgets/notary-quote/notary-quote.panel.tsx',
});
