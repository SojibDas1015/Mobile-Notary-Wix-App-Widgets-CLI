import React, { useCallback, useEffect, useState, type FC } from 'react';
import { widget } from '@wix/editor';
import {
  Box,
  Dropdown,
  FormField,
  Input,
  InputArea,
  SectionHelper,
  SidePanel,
} from '@wix/design-system';
import { BusinessManagerTheme } from '../../../dashboard/shared/BusinessManagerTheme';

const MAX_REVIEW_OPTIONS = [
  { id: '3', value: '3 reviews' },
  { id: '6', value: '6 reviews' },
  { id: '9', value: '9 reviews' },
  { id: '12', value: '12 reviews' },
  { id: '0', value: 'All approved reviews' },
];

export default function NotaryReviewsPanel(): ReturnType<FC> {
  const [badge, setBadge] = useState('Direct Mobile Notary & Verification Services LLC');
  const [headingTitle, setHeadingTitle] = useState('Trusted by Clients Across Greater Charlotte');
  const [subtitle, setSubtitle] = useState(
    'Verified feedback from mobile notary, loan signing, fingerprinting, and I-9 verification clients.',
  );
  const [maxReviews, setMaxReviews] = useState('6');

  useEffect(() => {
    Promise.all([
      widget.getProp('heading-badge').catch(() => ''),
      widget.getProp('heading-title').catch(() => ''),
      widget.getProp('intro-subtitle').catch(() => ''),
      widget.getProp('max-reviews').catch(() => ''),
    ]).then(([b, t, s, m]) => {
      if (b) setBadge(b);
      if (t) setHeadingTitle(t);
      if (s) setSubtitle(s);
      if (m) setMaxReviews(m);
    });
  }, []);

  const handleBadgeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setBadge(val);
    widget.setProp('heading-badge', val);
  }, []);

  const handleTitleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setHeadingTitle(val);
    widget.setProp('heading-title', val);
  }, []);

  const handleSubtitleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setSubtitle(val);
    widget.setProp('intro-subtitle', val);
  }, []);

  const handleMaxChange = useCallback((opt: { id: string | number } | null) => {
    const val = String(opt?.id ?? '6');
    setMaxReviews(val);
    widget.setProp('max-reviews', val);
  }, []);

  return (
    <BusinessManagerTheme>
      <SidePanel width="300" height="100vh">
        <SidePanel.Content noPadding stretchVertically>
          <SidePanel.Field>
            <Box direction="vertical" gap="SP2">
              <FormField label="Top Badge Text">
                <Input value={badge} onChange={handleBadgeChange} />
              </FormField>
              <FormField label="Section Heading">
                <Input value={headingTitle} onChange={handleTitleChange} />
              </FormField>
              <FormField label="Intro Subtitle">
                <InputArea rows={3} value={subtitle} onChange={handleSubtitleChange} />
              </FormField>
              <FormField label="Maximum Reviews Shown">
                <Dropdown
                  selectedId={maxReviews}
                  options={MAX_REVIEW_OPTIONS}
                  onSelect={handleMaxChange}
                />
              </FormField>
            </Box>
          </SidePanel.Field>
        </SidePanel.Content>
        <SidePanel.Footer noPadding>
          <SectionHelper fullWidth appearance="standard" border="topBottom">
            Shows only approved reviews from your Direct Mobile Notary Dashboard (Customer Reviews tab).
          </SectionHelper>
        </SidePanel.Footer>
      </SidePanel>
    </BusinessManagerTheme>
  );
}
