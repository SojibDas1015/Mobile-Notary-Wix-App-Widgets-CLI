// @ts-check
import { defineWixConfig } from '@wix/cli/config';
import customExtensions from '@wix/custom-extensions/flow';
import zeroConfig from '@wix/cli-zero-config-flow';

const appId = '8fe7181f-9e2f-4fa8-958f-e5348342cf43';

export default defineWixConfig({
  flows: [
    customExtensions({
      appId,
      projectId: 'direct-mobile-notary-app',
      namespace: '@techsparkpr/direct-mobile-notary-app',
      codeIdentifier: 'direct_mobile_notary_app',
    }),
    zeroConfig({ appId }),
  ],
});
