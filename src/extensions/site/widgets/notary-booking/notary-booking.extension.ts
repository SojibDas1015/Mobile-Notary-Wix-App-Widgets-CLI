import { extensions } from '@wix/custom-extensions';

export default extensions.customElement({
  id: '40665dc4-045d-4038-8ca1-797b243177a4',
  name: 'Book an Appointment',
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
      id: '042f8579-62bc-4402-9032-3f47085b32f3',
      name: 'default',
      thumbnailUrl: '{{BASE_URL}}/notary-booking-thumbnail.png',
    },
  ],
  tagName: 'notary-booking',
  element: './extensions/site/widgets/notary-booking/notary-booking.tsx',
  settings: './extensions/site/widgets/notary-booking/notary-booking.panel.tsx',
});
