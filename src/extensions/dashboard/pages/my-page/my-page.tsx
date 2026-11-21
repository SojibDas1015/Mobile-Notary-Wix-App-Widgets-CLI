import React, { useEffect, useState } from 'react';
import { dashboard, type PageLocation, type PageParams } from '@wix/dashboard';
import { BusinessManagerTheme } from '../../shared/BusinessManagerTheme';
import { BookingsApp } from './BookingsApp';

const Page = () => {
  const [location, setLocation] = useState<PageLocation | undefined>();

  useEffect(() => {
    const subscription = dashboard.observeState<PageParams>((pageParams) => {
      setLocation(pageParams.location);
    });
    return () => subscription.disconnect();
  }, []);

  return (
    <BusinessManagerTheme>
      {location ? <BookingsApp location={location} /> : null}
    </BusinessManagerTheme>
  );
};

export default Page;
