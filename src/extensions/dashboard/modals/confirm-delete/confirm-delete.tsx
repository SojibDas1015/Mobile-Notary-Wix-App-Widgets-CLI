import React, { useEffect, useState, type FC } from 'react';
import { dashboard } from '@wix/dashboard';
import { Box, CustomModalLayout, Text } from '@wix/design-system';
import { removeCmsRecord } from '../../cms/notary-cms-api';
import { BusinessManagerTheme } from '../../shared/BusinessManagerTheme';
import config from './confirm-delete.config.ts';

export interface ConfirmDeleteModalParams {
  collectionId?: string;
  itemId?: string;
  itemName?: string;
  recordLabel?: string;
}

const ConfirmDeleteModal: FC = () => {
  const [params, setParams] = useState<ConfirmDeleteModalParams>({});
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const subscription = dashboard.observeState<ConfirmDeleteModalParams>((nextParams) => {
      setParams(nextParams || {});
    });
    return () => subscription.disconnect();
  }, []);

  const handleConfirm = async () => {
    if (!params.collectionId || !params.itemId) {
      dashboard.closeModal({ confirmed: false });
      return;
    }

    setDeleting(true);
    try {
      await removeCmsRecord(params.collectionId, params.itemId);
      dashboard.showToast({
        message: `${params.recordLabel || 'Record'} "${params.itemName || params.itemId}" deleted`,
        type: 'success',
      });
      dashboard.closeModal({ confirmed: true, itemId: params.itemId });
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Failed to delete record';
      dashboard.showToast({ message: msg, type: 'error' });
      setDeleting(false);
    }
  };

  return (
    <BusinessManagerTheme>
      <CustomModalLayout
        width={config.width}
        maxHeight={config.height}
        skin="destructive"
        title={`Delete ${params.recordLabel || 'Record'}?`}
        primaryButtonText={deleting ? 'Deleting...' : 'Delete'}
        secondaryButtonText="Cancel"
        primaryButtonProps={{ disabled: deleting }}
        secondaryButtonProps={{ disabled: deleting }}
        primaryButtonOnClick={handleConfirm}
        secondaryButtonOnClick={() => dashboard.closeModal({ confirmed: false })}
        content={
          <Box direction="vertical" gap="SP2">
            <Text>
              Are you sure you want to permanently delete{' '}
              <Text weight="bold">{params.itemName || 'this record'}</Text>?
            </Text>
            <Text size="small" secondary>
              This action removes the item from the {params.collectionId || 'CMS'} collection and cannot be undone.
            </Text>
          </Box>
        }
      />
    </BusinessManagerTheme>
  );
};

export default ConfirmDeleteModal;
