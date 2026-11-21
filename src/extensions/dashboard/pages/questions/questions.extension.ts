import { extensions } from '@wix/custom-extensions';

export default extensions.dashboardPage({
  id: 'e543cd73-832d-429e-be32-119d2b0d846c',
  title: 'Intake Questions',
  routePath: 'questions',
  component: './extensions/dashboard/pages/questions/questions.tsx',
  fullPage: false,
  metaData: {
    searchable: true,
    description:
      'Manage service-specific and global intake questions shown during step 2 of booking.',
    aiContext: {
      description:
        'Manage BookingQuestions CMS records including serviceId mapping, inputType, options, required, feeAmount, feeType, sortOrder, and active flags.',
    },
  },
});
