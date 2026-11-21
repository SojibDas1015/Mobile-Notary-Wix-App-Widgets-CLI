import { httpClient } from '@wix/essentials';
import { DirectNotaryBooking } from './notary-booking-element.js';

interface DistanceEventDetail {
  origin?: string;
  destination?: string;
}

interface UploadEventDetail {
  fileId?: string;
  name?: string;
  base64?: string;
  type?: string;
}

class NotaryBookingWidget extends DirectNotaryBooking {
  private _bridgeBound = false;

  get widgetMode(): 'booking' | 'quote' {
    return 'booking';
  }

  static get observedAttributes(): string[] {
    return [
      'heading-badge',
      'heading-title',
      'intro-subtitle',
      ...DirectNotaryBooking.observedAttributes,
    ];
  }

  override connectedCallback(): void {
    super.connectedCallback();
    this._syncEditorHeadings();

    if (!this._bridgeBound) {
      this._bridgeBound = true;
      this.addEventListener('requestRetryConfig', () => {
        void this._fetchLiveConfig();
      });
      this.addEventListener('requestDistanceCalc', (evt: Event) => {
        const detail = (evt as CustomEvent<DistanceEventDetail>).detail || {};
        void this._handleDistanceCalc(detail);
      });
      this.addEventListener('requestFileUpload', (evt: Event) => {
        const detail = (evt as CustomEvent<UploadEventDetail>).detail || {};
        void this._handleFileUpload(detail);
      });
      this.addEventListener('bookingSubmitted', (evt: Event) => {
        const detail = (evt as CustomEvent<Record<string, unknown>>).detail || {};
        void this._handleBookingSubmit(detail);
      });
    }

    void this._fetchLiveConfig();
  }

  override attributeChangedCallback(
    name: string,
    oldValue: string | null,
    newValue: string | null,
  ): void {
    super.attributeChangedCallback(name, oldValue, newValue);
    if (
      name === 'heading-badge' ||
      name === 'heading-title' ||
      name === 'intro-subtitle'
    ) {
      this._syncEditorHeadings();
    }
  }

  private _apiUrl(routePath: string): string {
    const origin = new URL(import.meta.url).origin;
    const basePath = import.meta.env.WIX_SERVER_BASE_PATH || '/';
    const normalizedBase = basePath.endsWith('/') ? basePath : `${basePath}/`;
    const normalizedRoute = routePath.replace(/^\/+/, '');
    return `${origin}${normalizedBase}${normalizedRoute}`;
  }

  private _syncEditorHeadings(): void {
    const badgeAttr = this.getAttribute('heading-badge');
    const titleAttr = this.getAttribute('heading-title');
    const introAttr = this.getAttribute('intro-subtitle');

    const titleEl = this.querySelector('#widgetHeadingTitle');
    if (titleEl && titleAttr) {
      titleEl.textContent = titleAttr;
    }

    const introEl = this.querySelector('#widgetHeadingIntro');
    if (introEl && introAttr) {
      introEl.textContent = introAttr;
    }

    const badgeEl = this.querySelector('.booking-intro .badge');
    if (badgeEl && badgeAttr) {
      const textNodes = Array.from(badgeEl.childNodes).filter(
        (n) => n.nodeType === Node.TEXT_NODE,
      );
      const lastText = textNodes[textNodes.length - 1];
      if (lastText) {
        lastText.textContent = ` ${badgeAttr}`;
      }
    }
  }

  private async _fetchJson<T extends Record<string, unknown>>(
    routePath: string,
    init?: RequestInit,
  ): Promise<{ ok: boolean; status: number; data: T }> {
    const response = await httpClient.fetchWithAuth(this._apiUrl(routePath), init);
    const rawText = await response.text();
    try {
      const parsed = JSON.parse(rawText) as T;
      return { ok: response.ok, status: response.status, data: parsed };
    } catch {
      throw new Error(
        `HTTP ${response.status} from ${routePath}: ${rawText.slice(0, 140)}`,
      );
    }
  }

  private async _fetchLiveConfig(): Promise<void> {
    try {
      const { ok, data } = await this._fetchJson<{
        success?: boolean;
        error?: string;
        settings?: Record<string, unknown>;
      }>('/booking-config');
      if (ok && data.success) {
        this.setAttribute(
          'site-config',
          JSON.stringify({
            ...(data.settings || {}),
            ...data,
            _ts: Date.now(),
          }),
        );
        return;
      }
      this.setAttribute(
        'site-config-error',
        JSON.stringify({
          error: data.error || 'Failed to load live CMS booking configuration.',
          _ts: Date.now(),
        }),
      );
    } catch (error) {
      const msg =
        error instanceof Error ? error.message : 'Network error loading CMS configuration.';
      this.setAttribute(
        'site-config-error',
        JSON.stringify({ error: msg, _ts: Date.now() }),
      );
    }
  }

  private async _handleDistanceCalc(detail: DistanceEventDetail): Promise<void> {
    try {
      const { data: result } = await this._fetchJson<Record<string, unknown>>(
        '/calculate-distance',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            origin: detail.origin,
            destination: detail.destination,
          }),
        },
      );
      this.setAttribute(
        'distance-result',
        JSON.stringify({ ...result, _ts: Date.now() }),
      );
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Route calculation failed.';
      this.setAttribute(
        'distance-result',
        JSON.stringify({ success: false, error: msg, _ts: Date.now() }),
      );
    }
  }

  private async _handleFileUpload(detail: UploadEventDetail): Promise<void> {
    try {
      const { data: result } = await this._fetchJson<{
        success?: boolean;
        publicUrl?: string;
        fileUrl?: string;
        error?: string;
      }>('/upload-document', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: detail.name,
          base64: detail.base64,
          type: detail.type,
        }),
      });
      this.setAttribute(
        'file-upload-result',
        JSON.stringify({
          fileId: detail.fileId,
          name: detail.name,
          success: Boolean(result.success),
          url: result.publicUrl || result.fileUrl || '',
          wixUrl: result.fileUrl || '',
          error: result.error || '',
          _ts: Date.now(),
        }),
      );
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'File upload failed.';
      this.setAttribute(
        'file-upload-result',
        JSON.stringify({
          fileId: detail.fileId,
          name: detail.name,
          success: false,
          error: msg,
          _ts: Date.now(),
        }),
      );
    }
  }

  private async _handleBookingSubmit(payload: Record<string, unknown>): Promise<void> {
    try {
      const { data: result } = await this._fetchJson<Record<string, unknown>>(
        '/submit-booking',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        },
      );
      this.setAttribute(
        'submission-status',
        JSON.stringify({ ...result, _ts: Date.now() }),
      );
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Booking submission failed.';
      this.setAttribute(
        'submission-status',
        JSON.stringify({ success: false, error: msg, _ts: Date.now() }),
      );
    }
  }
}

export default NotaryBookingWidget;
