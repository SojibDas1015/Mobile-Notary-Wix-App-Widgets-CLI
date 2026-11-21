import React, { type ReactNode } from 'react';
import {
  WixDesignSystemProvider,
  WixDesignSystemIconThemeProvider,
  WixDesignSystemDefaultPropsProvider,
} from '@wix/design-system';
import { IconThemeProvider } from '@wix/wix-ui-icons-common/core';
import '@wix/design-system/styles.global.css';
import '@wix/design-system/themes/odeditor.global.css';

export interface BusinessManagerThemeProps {
  children: ReactNode;
}

/** Wraps dashboard pages and modals in the official Wix Business Manager WDS theme. */
export const BusinessManagerTheme = ({ children }: BusinessManagerThemeProps) => (
  <WixDesignSystemProvider features={{ newColorsBranding: true }}>
    <WixDesignSystemIconThemeProvider>
      <IconThemeProvider theme="odeditor">
        <WixDesignSystemDefaultPropsProvider defaults={{}}>
          {children}
        </WixDesignSystemDefaultPropsProvider>
      </IconThemeProvider>
    </WixDesignSystemIconThemeProvider>
  </WixDesignSystemProvider>
);
