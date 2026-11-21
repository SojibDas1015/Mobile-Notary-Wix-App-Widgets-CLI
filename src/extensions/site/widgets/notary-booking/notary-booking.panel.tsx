import React, { useCallback, useEffect, useState, type FC } from 'react';
import { widget } from '@wix/editor';
import {
  Box,
  FormField,
  Input,
  InputArea,
  SectionHelper,
  SidePanel,
} from '@wix/design-system';
import { BusinessManagerTheme } from '../../../dashboard/shared/BusinessManagerTheme';

export interface PanelDefaults {
  badge: string;
  title: string;
  subtitle: string;
  footerNote: string;
}

const BOOKING_DEFAULTS: PanelDefaults = {
  badge: 'Direct Mobile Notary & Verification Services LLC',
  title: 'Book Your Mobile Service in a Few Easy Steps',
  subtitle:
    'Professional, convenient, and reliable. North Carolina statutory notarial charges and travel fees are disclosed separately before you confirm.',
  footerNote:
    'Shows only Instant Booking services from your Wix Dashboard Services Catalog.',
};

export function createNotarySettingsPanel(defaults: PanelDefaults): FC {
  const Panel: FC = () => {
    const [badge, setBadge] = useState(defaults.badge);
    const [headingTitle, setHeadingTitle] = useState(defaults.title);
    const [subtitle, setSubtitle] = useState(defaults.subtitle);

    useEffect(() => {
      Promise.all([
        widget.getProp('heading-badge').catch(() => ''),
        widget.getProp('heading-title').catch(() => ''),
        widget.getProp('intro-subtitle').catch(() => ''),
      ]).then(([b, t, s]) => {
        if (b) setBadge(b);
        if (t) setHeadingTitle(t);
        if (s) setSubtitle(s);
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

    return (
      <BusinessManagerTheme>
        <SidePanel width="300" height="100vh">
          <SidePanel.Content noPadding stretchVertically>
            <SidePanel.Field>
              <Box direction="vertical" gap="SP2">
                <FormField label="Top Badge Text">
                  <Input value={badge} onChange={handleBadgeChange} />
                </FormField>
                <FormField label="Widget Main Heading">
                  <Input value={headingTitle} onChange={handleTitleChange} />
                </FormField>
                <FormField label="Intro Subtitle">
                  <InputArea rows={3} value={subtitle} onChange={handleSubtitleChange} />
                </FormField>
              </Box>
            </SidePanel.Field>
          </SidePanel.Content>
          <SidePanel.Footer noPadding>
            <SectionHelper fullWidth appearance="standard" border="topBottom">
              {defaults.footerNote}
            </SectionHelper>
          </SidePanel.Footer>
        </SidePanel>
      </BusinessManagerTheme>
    );
  };

  return Panel;
}

export default createNotarySettingsPanel(BOOKING_DEFAULTS);
