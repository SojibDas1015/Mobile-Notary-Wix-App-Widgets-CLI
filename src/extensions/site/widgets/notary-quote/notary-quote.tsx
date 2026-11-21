import NotaryBookingWidget from '../notary-booking/notary-booking';

class NotaryQuoteWidget extends NotaryBookingWidget {
  override get widgetMode(): 'booking' | 'quote' {
    return 'quote';
  }
}

export default NotaryQuoteWidget;
