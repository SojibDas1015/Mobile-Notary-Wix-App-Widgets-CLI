import { httpClient } from '@wix/essentials';

interface PublicReviewItem {
  _id: string;
  reviewerName: string;
  rating: number;
  reviewText: string;
  relativeTime: string;
  source: 'Google' | 'Direct';
  profilePhotoUrl?: string;
}

interface PublicReviewsResponse {
  success: boolean;
  reviews?: PublicReviewItem[];
  averageRating?: number;
  totalApproved?: number;
  googleReviewLink?: string;
  error?: string;
}

function escapeHtml(input: unknown): string {
  return String(input ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function safeHref(url: string): string {
  const trimmed = String(url || '').trim();
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return '';
}

function starString(rating: number): string {
  const safe = Math.max(1, Math.min(5, Math.round(rating || 5)));
  return '★'.repeat(safe) + '☆'.repeat(5 - safe);
}

class NotaryReviewsWidget extends HTMLElement {
  private _root: ShadowRoot;
  private _loading = true;
  private _error = '';
  private _reviews: PublicReviewItem[] = [];
  private _averageRating = 0;
  private _totalApproved = 0;
  private _googleReviewLink = '';

  constructor() {
    super();
    this._root = this.attachShadow({ mode: 'open' });
  }

  static get observedAttributes(): string[] {
    return ['heading-badge', 'heading-title', 'intro-subtitle', 'max-reviews'];
  }

  connectedCallback(): void {
    this._render();
    void this._loadReviews();
  }

  attributeChangedCallback(): void {
    this._render();
  }

  private _apiUrl(routePath: string): string {
    const origin = new URL(import.meta.url).origin;
    const basePath = import.meta.env.WIX_SERVER_BASE_PATH || '/';
    const normalizedBase = basePath.endsWith('/') ? basePath : `${basePath}/`;
    const normalizedRoute = routePath.replace(/^\/+/, '');
    return `${origin}${normalizedBase}${normalizedRoute}`;
  }

  private async _loadReviews(): Promise<void> {
    this._loading = true;
    this._error = '';
    this._render();

    try {
      const response = await httpClient.fetchWithAuth(this._apiUrl('reviews'), {
        method: 'GET',
      });
      const text = await response.text();
      const parsed = JSON.parse(text) as PublicReviewsResponse;
      if (!response.ok || parsed.success === false) {
        throw new Error(parsed.error || `HTTP ${response.status}`);
      }
      this._reviews = Array.isArray(parsed.reviews) ? parsed.reviews : [];
      this._averageRating = Number(parsed.averageRating ?? 0);
      this._totalApproved = Number(parsed.totalApproved ?? this._reviews.length);
      this._googleReviewLink = String(parsed.googleReviewLink ?? '').trim();
    } catch (err) {
      this._error = err instanceof Error ? err.message : 'Unable to load reviews right now.';
    } finally {
      this._loading = false;
      this._render();
    }
  }

  private _render(): void {
    const badge =
      this.getAttribute('heading-badge') ||
      'Direct Mobile Notary & Verification Services LLC';
    const title =
      this.getAttribute('heading-title') ||
      'Trusted by Clients Across Greater Charlotte';
    const subtitle =
      this.getAttribute('intro-subtitle') ||
      'Verified feedback from mobile notary, loan signing, fingerprinting, and I-9 verification clients.';
    const maxAttr = Number(this.getAttribute('max-reviews') ?? 6);
    const maxLimit = Number.isFinite(maxAttr) && maxAttr > 0 ? maxAttr : this._reviews.length;
    const visibleReviews = this._reviews.slice(0, maxLimit);
    const ctaHref = safeHref(this._googleReviewLink);

    const summaryHtml =
      this._totalApproved > 0
        ? `<div class="dmn-rev-summary">
            <span class="dmn-rev-stars">${starString(Math.round(this._averageRating))}</span>
            <strong>${this._averageRating.toFixed(1)}</strong>
            <span>(${this._totalApproved} verified ${this._totalApproved === 1 ? 'review' : 'reviews'})</span>
          </div>`
        : '';

    let bodyHtml = '';
    if (this._loading) {
      bodyHtml = `<div class="dmn-rev-state">Loading approved client reviews...</div>`;
    } else if (this._error) {
      bodyHtml = `<div class="dmn-rev-state dmn-rev-error">Could not load reviews right now.</div>`;
    } else if (visibleReviews.length === 0) {
      bodyHtml = `<div class="dmn-rev-state">
        Verified client reviews will appear here once approved in your Direct Mobile Notary Dashboard.
      </div>`;
    } else {
      bodyHtml = `<div class="dmn-rev-grid">
        ${visibleReviews
          .map((rev) => {
            const initial = escapeHtml((rev.reviewerName || 'V').charAt(0).toUpperCase());
            const sourceLabel = rev.source === 'Google' ? 'Google Review' : 'Verified Client';
            const timeLine = rev.relativeTime
              ? `<span class="dmn-rev-time">${escapeHtml(rev.relativeTime)}</span>`
              : '';
            const quote = rev.reviewText
              ? `<p class="dmn-rev-text">&ldquo;${escapeHtml(rev.reviewText)}&rdquo;</p>`
              : `<p class="dmn-rev-text dmn-rev-muted">Rated ${rev.rating} out of 5 stars.</p>`;

            return `<article class="dmn-rev-card">
              <div class="dmn-rev-card-top">
                <div class="dmn-rev-stars" aria-label="${rev.rating} out of 5 stars">${starString(rev.rating)}</div>
                <span class="dmn-rev-source">${escapeHtml(sourceLabel)}</span>
              </div>
              ${quote}
              <div class="dmn-rev-author">
                <div class="dmn-rev-avatar">${initial}</div>
                <div class="dmn-rev-author-meta">
                  <div class="dmn-rev-name">${escapeHtml(rev.reviewerName)}</div>
                  ${timeLine}
                </div>
              </div>
            </article>`;
          })
          .join('')}
      </div>`;
    }

    const ctaHtml = ctaHref
      ? `<div class="dmn-rev-cta-row">
          <a class="dmn-rev-cta" href="${escapeHtml(ctaHref)}" target="_blank" rel="noopener noreferrer">
            Read or Leave a Review on Google
          </a>
        </div>`
      : '';

    this._root.innerHTML = `
      <style>
        :host {
          display: block;
          width: 100%;
          box-sizing: border-box;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
          color: #1d1724;
        }
        *, *::before, *::after {
          box-sizing: border-box;
        }
        .dmn-rev-wrap {
          width: 100%;
          max-width: 1120px;
          margin: 0 auto;
          padding: 36px 20px;
          background: #ffffff;
        }
        .dmn-rev-header {
          text-align: center;
          max-width: 740px;
          margin: 0 auto 28px;
        }
        .dmn-rev-badge {
          display: inline-block;
          background: #f5effc;
          color: #4b247a;
          border: 1px solid #d9c6f0;
          padding: 6px 14px;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          margin-bottom: 12px;
        }
        .dmn-rev-title {
          margin: 0 0 10px;
          font-size: 28px;
          line-height: 1.2;
          font-weight: 800;
          color: #1d1724;
        }
        .dmn-rev-sub {
          margin: 0 0 14px;
          font-size: 15px;
          line-height: 1.55;
          color: #554965;
        }
        .dmn-rev-summary {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 8px 16px;
          border: 1px solid #e4dbf6;
          background: #faf8fd;
          font-size: 14px;
          color: #2d223a;
        }
        .dmn-rev-stars {
          color: #d97706;
          font-size: 16px;
          letter-spacing: 1px;
          line-height: 1;
        }
        .dmn-rev-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 20px;
        }
        @media (max-width: 900px) {
          .dmn-rev-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }
        @media (max-width: 600px) {
          .dmn-rev-grid {
            grid-template-columns: 1fr;
          }
          .dmn-rev-title {
            font-size: 22px;
          }
        }
        .dmn-rev-card {
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          gap: 16px;
          padding: 22px;
          border: 1px solid #e4dbf6;
          border-top: 3px solid #4b247a;
          background: #ffffff;
        }
        .dmn-rev-card-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
        }
        .dmn-rev-source {
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: #4b247a;
          background: #f5effc;
          padding: 4px 8px;
        }
        .dmn-rev-text {
          margin: 0;
          font-size: 14.5px;
          line-height: 1.6;
          color: #2b2236;
          flex: 1;
        }
        .dmn-rev-muted {
          color: #6b5e7c;
          font-style: italic;
        }
        .dmn-rev-author {
          display: flex;
          align-items: center;
          gap: 12px;
          padding-top: 12px;
          border-top: 1px solid #f0eaf8;
        }
        .dmn-rev-avatar {
          width: 36px;
          height: 36px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #4b247a;
          color: #ffffff;
          font-weight: 700;
          font-size: 14px;
          flex-shrink: 0;
        }
        .dmn-rev-author-meta {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .dmn-rev-name {
          font-size: 14px;
          font-weight: 700;
          color: #1d1724;
        }
        .dmn-rev-time {
          font-size: 12px;
          color: #6b5e7c;
        }
        .dmn-rev-state {
          text-align: center;
          padding: 28px 18px;
          border: 1px dashed #d4c4ec;
          background: #faf8fd;
          color: #554965;
          font-size: 14px;
        }
        .dmn-rev-error {
          border-color: #f5c2c7;
          background: #fff5f5;
          color: #842029;
        }
        .dmn-rev-cta-row {
          margin-top: 26px;
          text-align: center;
        }
        .dmn-rev-cta {
          display: inline-block;
          background: #4b247a;
          color: #ffffff;
          text-decoration: none;
          font-size: 13px;
          font-weight: 700;
          letter-spacing: 0.04em;
          text-transform: uppercase;
          padding: 12px 24px;
          border: 1px solid #4b247a;
        }
        .dmn-rev-cta:hover {
          background: #36185b;
        }
      </style>
      <section class="dmn-rev-wrap">
        <header class="dmn-rev-header">
          <div class="dmn-rev-badge">${escapeHtml(badge)}</div>
          <h2 class="dmn-rev-title">${escapeHtml(title)}</h2>
          <p class="dmn-rev-sub">${escapeHtml(subtitle)}</p>
          ${summaryHtml}
        </header>
        ${bodyHtml}
        ${ctaHtml}
      </section>
    `;
  }
}

export default NotaryReviewsWidget;
