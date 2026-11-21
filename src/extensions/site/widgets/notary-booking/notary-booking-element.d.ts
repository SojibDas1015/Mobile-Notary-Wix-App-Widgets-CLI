export declare class DirectNotaryBooking extends HTMLElement {
  static get observedAttributes(): string[];
  get widgetMode(): 'booking' | 'quote';
  connectedCallback(): void;
  attributeChangedCallback(name: string, oldValue: string | null, newValue: string | null): void;
  _applySiteConfig?: (cfg: unknown) => void;
  _onSiteConfigError?: (err: { error?: string }) => void;
  _onDistanceResult?: (res: unknown) => void;
  _onFileUploadResult?: (res: unknown) => void;
  _onSubmissionStatus?: (res: unknown) => void;
}
