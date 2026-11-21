import React, { type ReactNode } from 'react';
import { WixPatternsContainerOverridesProvider } from '@wix/patterns';

export interface BusinessManagerPatternsThemeProps {
  children: ReactNode;
}

const bmHarmonyExperiments = {
  enabled: (key: string) => key === 'bmHarmonyTheme' || key.endsWith('.bmHarmonyTheme'),
  ready: () => Promise.resolve(true),
  get: (key: string) => (key === 'bmHarmonyTheme' || key.endsWith('.bmHarmonyTheme') ? 'true' : undefined),
};

/** Enables BM Harmony theme overrides for @wix/patterns components above WixPatternsProvider. */
export const BusinessManagerPatternsTheme = ({
  children,
}: BusinessManagerPatternsThemeProps) => (
  <WixPatternsContainerOverridesProvider
    value={{
      experiments: bmHarmonyExperiments,
    }}
  >
    {children}
  </WixPatternsContainerOverridesProvider>
);
