import React, { useEffect, useState } from 'react';
import { dashboard, type PageLocation, type PageParams } from '@wix/dashboard';
import { BusinessManagerTheme } from '../../shared/BusinessManagerTheme';
import { QuestionsApp } from './QuestionsApp';

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
      {location ? <QuestionsApp location={location} /> : null}
    </BusinessManagerTheme>
  );
};

export default Page;
