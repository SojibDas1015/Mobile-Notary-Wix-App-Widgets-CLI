import { app } from '@wix/custom-extensions';
import myPage from './extensions/dashboard/pages/my-page/my-page.extension.ts';
import confirmDelete from './extensions/dashboard/modals/confirm-delete/confirm-delete.extension.ts';
import notaryBooking from './extensions/site/widgets/notary-booking/notary-booking.extension.ts';
import notaryQuote from './extensions/site/widgets/notary-quote/notary-quote.extension.ts';
import notaryReviews from './extensions/site/widgets/notary-reviews/notary-reviews.extension.ts';

export default app()
  .use(myPage)
  .use(confirmDelete)
  .use(notaryBooking)
  .use(notaryQuote)
  .use(notaryReviews);
