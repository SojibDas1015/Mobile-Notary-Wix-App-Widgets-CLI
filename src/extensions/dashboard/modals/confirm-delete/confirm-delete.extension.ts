import { extensions } from '@wix/custom-extensions';
import config from './confirm-delete.config.ts';

export default extensions.dashboardModal({
  id: '2164c0c3-22c7-4007-a2cb-7c4b8862460c',
  title: config.title,
  width: config.width,
  height: config.height,
  component: './extensions/dashboard/modals/confirm-delete/confirm-delete.tsx',
  metaData: {
    aiContext: {
      description:
        'Confirms permanent deletion of a Direct Mobile Notary CMS record (booking, service, intake question, add-on, or service area).',
    },
  },
});
