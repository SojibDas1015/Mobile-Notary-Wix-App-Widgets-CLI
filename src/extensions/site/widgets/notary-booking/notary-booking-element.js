/**
 * WIX CUSTOM ELEMENT — DIRECT MOBILE NOTARY & VERIFICATION SERVICES LLC
 * File: public/custom-elements/notary-booking.js
 * Tag Name: notary-booking
 * Business Owner: Lakechia Sanders (Commissioned NC Notary Public)
 * Square Sharp Corners · Interactive Time Slot Grid · Dedicated Receipt Print
 * Complete 12 Service-Specific Intakes · Itemized Add-on Fees · Google Maps
 * Strictly CMS-Driven (OwnerSettings, ServicesCatalog, BookingQuestions, BookingAddons, BusinessHours, ServiceAreas)
 * ============================================================================
 */

class DirectNotaryBooking extends HTMLElement {
  static get observedAttributes() {
    return ['widget-mode', 'submission-status', 'site-config', 'site-config-error', 'distance-result', 'file-upload-result', 'stripe-checkout-result'];
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (name === 'submission-status' && newValue) {
      try {
        const parsed = JSON.parse(newValue);
        if (typeof this._onSubmissionStatus === 'function') {
          this._onSubmissionStatus(parsed);
        }
      } catch (err) {
        console.warn('[Custom Element] Invalid submission-status JSON:', err);
      }
    }
    if (name === 'site-config' && newValue) {
      try {
        const parsed = JSON.parse(newValue);
        if (typeof this._applySiteConfig === 'function') {
          this._applySiteConfig(parsed);
        } else {
          this._pendingSiteConfig = parsed;
        }
      } catch (err) {
        console.warn('[Custom Element] Invalid site-config JSON:', err);
      }
    }
    if (name === 'site-config-error' && newValue) {
      try {
        const parsed = JSON.parse(newValue);
        if (typeof this._onSiteConfigError === 'function') {
          this._onSiteConfigError(parsed);
        } else {
          this._pendingSiteConfigError = parsed;
        }
      } catch (err) {
        console.warn('[Custom Element] Invalid site-config-error JSON:', err);
      }
    }
    if (name === 'distance-result' && newValue) {
      try {
        const parsed = JSON.parse(newValue);
        if (typeof this._onDistanceResult === 'function') {
          this._onDistanceResult(parsed);
        }
      } catch (err) {
        console.warn('[Custom Element] Invalid distance-result JSON:', err);
      }
    }
    if (name === 'file-upload-result' && newValue) {
      try {
        const parsed = JSON.parse(newValue);
        if (typeof this._onFileUploadResult === 'function') {
          this._onFileUploadResult(parsed);
        }
      } catch (err) {
        console.warn('[Custom Element] Invalid file-upload-result JSON:', err);
      }
    }
    if (name === 'stripe-checkout-result' && newValue) {
      try {
        const parsed = JSON.parse(newValue);
        if (typeof this._onStripeCheckoutResult === 'function') {
          this._onStripeCheckoutResult(parsed);
        }
      } catch (err) {
        console.warn('[Custom Element] Invalid stripe-checkout-result JSON:', err);
      }
    }
  }

  connectedCallback() {
    const self = this;
    if (this._initialized) return;
    this._initialized = true;

    this.style.display = 'block';
    this.style.width = '100%';

    // 0. Global Google Maps auth error handler to suppress modal popup
    if (!window.gm_authFailure) {
      window.gm_authFailure = function () {
        console.warn('[Google Places API]: Client auth notice. Direct address input & backend route calculation remain active.');
        const pacs = document.querySelectorAll('.pac-container');
        pacs.forEach(pac => {
          pac.style.setProperty('display', 'none', 'important');
          pac.style.setProperty('border', 'none', 'important');
          pac.style.setProperty('height', '0px', 'important');
        });
      };
    }

    // 1. Google Fonts
    if (!document.getElementById('dmn-google-fonts')) {
      const fontLink = document.createElement('link');
      fontLink.id = 'dmn-google-fonts';
      fontLink.rel = 'stylesheet';
      fontLink.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Playfair+Display:ital,wght@0,600;0,700;1,600&display=swap';
      document.head.appendChild(fontLink);
    }

    // 2. Leaflet CSS
    if (!document.getElementById('dmn-leaflet-css')) {
      const leafletCss = document.createElement('link');
      leafletCss.id = 'dmn-leaflet-css';
      leafletCss.rel = 'stylesheet';
      leafletCss.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(leafletCss);
    }

    // 3. Leaflet JavaScript
    if (!window.L && !document.getElementById('dmn-leaflet-js')) {
      const leafletScript = document.createElement('script');
      leafletScript.id = 'dmn-leaflet-js';
      leafletScript.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      document.head.appendChild(leafletScript);
    }

    // 4. Global PAC container styling in document.head
    if (!document.getElementById('dmn-pac-styles')) {
      const pacStyle = document.createElement('style');
      pacStyle.id = 'dmn-pac-styles';
      pacStyle.textContent = `
        .pac-container {
          z-index: 99999999 !important;
          background-color: #ffffff !important;
          border: 1px solid #d5ccd9 !important;
          box-shadow: 0 4px 16px rgba(0,0,0,0.15) !important;
          font-family: 'Inter', ui-sans-serif, sans-serif !important;
          margin-top: 2px !important;
        }
        .pac-container:empty {
          display: none !important;
          border: none !important;
          box-shadow: none !important;
        }
        .pac-item {
          padding: 8px 12px !important;
          font-size: 13.5px !important;
          cursor: pointer !important;
          color: #19141e !important;
          border-top: 1px solid #f1edf4 !important;
        }
        .pac-item:hover, .pac-item-selected {
          background-color: #f6f2fa !important;
        }
        .pac-item-query {
          font-size: 14px !important;
          color: #4b247a !important;
          font-weight: 700 !important;
        }
      `;
      document.head.appendChild(pacStyle);
    }

    // 5. Inject Markup & Scoped Styles
    this.innerHTML = `
      <style>
        :host, :is(notary-booking, notary-quote) {
          --purple: #4b247a;
          --purple-dark: #37175c;
          --purple-light: #f6f2fa;
          --purple-border: #d4c7e2;
          --ink: #19141e;
          --muted: #615769;
          --line: #ded6e3;
          --surface: #ffffff;
          --bg-soft: #fcfbfe;
          --success: #0d8050;
          --danger: #dc2626;
          --amber: #d97706;
          display: block;
          width: 100%;
          color: var(--ink);
          background: transparent;
          font-family: 'Inter', ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          font-size: 15px;
          line-height: 1.5;
        }

        /* Dynamic Details Tab (Step 3) Grid & Field Alignment */
        :is(notary-booking, notary-quote) .cms-questions-grid { 
          display: grid !important; 
          grid-template-columns: repeat(2, minmax(0, 1fr)) !important; 
          gap: 20px 24px !important; 
          align-items: stretch !important;
        }
        @media(max-width: 680px) { 
          :is(notary-booking, notary-quote) .cms-questions-grid { grid-template-columns: 1fr !important; gap: 16px !important; } 
        }

        :is(notary-booking, notary-quote) .cms-question-field { 
          display: flex !important;
          flex-direction: column !important;
          justify-content: flex-start !important;
          margin-bottom: 0px !important;
          min-width: 0 !important;
        }
        :is(notary-booking, notary-quote) .cms-question-field.full-width { 
          grid-column: 1 / -1 !important; 
        }

        :is(notary-booking, notary-quote) .cms-question-field .cms-label-block {
          margin-bottom: 8px !important;
          flex-grow: 1 !important;
          display: flex !important;
          flex-direction: column !important;
          justify-content: flex-start !important;
        }

        :is(notary-booking, notary-quote) .cms-question-field label {
          font-size: 11px !important;
          font-weight: 800 !important;
          text-transform: uppercase !important;
          letter-spacing: 0.05em !important;
          color: var(--ink) !important;
          display: block !important;
          margin-bottom: 4px !important;
          line-height: 1.35 !important;
        }

        :is(notary-booking, notary-quote) .cms-question-field small { 
          display: block !important; 
          color: var(--muted) !important; 
          margin: 0 !important;
          font-size: 12px !important; 
          line-height: 1.4 !important;
        }

        :is(notary-booking, notary-quote) .cms-question-field input, 
        :is(notary-booking, notary-quote) .cms-question-field select, 
        :is(notary-booking, notary-quote) .cms-question-field textarea { 
          margin-top: auto !important; 
          width: 100% !important; 
          height: 48px !important; 
          min-height: 48px !important; 
          border: 1px solid var(--purple-border, #d4c7e2) !important; 
          padding: 0 14px !important; 
          background: #ffffff !important; 
          color: var(--ink) !important; 
          font-size: 14.5px !important;
          font-family: inherit !important;
          border-radius: 0px !important;
          box-sizing: border-box !important;
          transition: border-color 0.15s ease, box-shadow 0.15s ease !important;
        }

        :is(notary-booking, notary-quote) .cms-question-field select {
          cursor: pointer !important;
          appearance: none !important;
          -webkit-appearance: none !important;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%234b247a' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E") !important;
          background-repeat: no-repeat !important;
          background-position: right 14px center !important;
          padding-right: 40px !important;
        }

        :is(notary-booking, notary-quote) .cms-question-field textarea {
          height: auto !important;
          min-height: 90px !important;
          padding: 10px 14px !important;
        }

        :is(notary-booking, notary-quote) .cms-question-field input:focus,
        :is(notary-booking, notary-quote) .cms-question-field select:focus,
        :is(notary-booking, notary-quote) .cms-question-field textarea:focus {
          border-color: var(--purple) !important;
          outline: none !important;
          box-shadow: inset 0 0 0 1px var(--purple) !important;
        }

        :is(notary-booking, notary-quote) .cms-question-field input.has-error,
        :is(notary-booking, notary-quote) .cms-question-field select.has-error,
        :is(notary-booking, notary-quote) .cms-question-field textarea.has-error {
          border-color: var(--danger) !important;
          background: #fffafa !important;
          box-shadow: inset 0 0 0 1px var(--danger) !important;
        }

        :is(notary-booking, notary-quote) .cms-addon-section { margin-top:22px; padding-top:18px; border-top:1px solid var(--line); }
        :is(notary-booking, notary-quote) .cms-addon-grid { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:10px; }
        :is(notary-booking, notary-quote) .cms-addon { 
          display:flex; 
          gap:10px; 
          align-items:flex-start; 
          border:1px solid var(--line); 
          padding:12px; 
          background:#fff; 
          cursor:pointer; 
          transition: border-color 0.15s, background-color 0.15s;
        }
        :is(notary-booking, notary-quote) .cms-addon:hover { border-color: var(--purple); background: #faf8fc; }
        :is(notary-booking, notary-quote) .cms-addon.is-selected { border-color: var(--purple); background: #f6f1fb; }
        :is(notary-booking, notary-quote) .cms-addon input[type="checkbox"] { margin-top: 3px; accent-color: var(--purple); width: 16px; height: 16px; }
        :is(notary-booking, notary-quote) .cms-addon span { flex:1; display:grid; gap:3px; }
        :is(notary-booking, notary-quote) .cms-addon small { color:var(--muted); font-size:12px; }
        :is(notary-booking, notary-quote) .cms-addon strong { white-space:nowrap; color:var(--purple); font-size: 13.5px; }
        :is(notary-booking, notary-quote) .cms-empty { padding:14px; background:var(--purple-light); color:var(--muted); font-size: 13.5px; }
        @media(max-width:640px){ :is(notary-booking, notary-quote) .cms-addon-grid{grid-template-columns:1fr;} }

        /* 100% SHARP CORNERS ACROSS EVERYTHING */
        :is(notary-booking, notary-quote) *, 
        :is(notary-booking, notary-quote) *::before, 
        :is(notary-booking, notary-quote) *::after {
          box-sizing: border-box;
          border-radius: 0px !important;
        }

        :is(notary-booking, notary-quote) h1, 
        :is(notary-booking, notary-quote) h2, 
        :is(notary-booking, notary-quote) h3 {
          font-family: "Playfair Display", Georgia, serif;
          font-weight: 700;
          letter-spacing: -0.01em;
          color: #17111c;
        }

        :is(notary-booking, notary-quote) button, 
        :is(notary-booking, notary-quote) input, 
        :is(notary-booking, notary-quote) select, 
        :is(notary-booking, notary-quote) textarea {
          font-family: inherit;
        }

        :is(notary-booking, notary-quote) button { cursor: pointer; }

        :is(notary-booking, notary-quote) .shell {
          max-width: 1500px;
          width: 100%;
          margin: 0 auto;
          padding: 0 20px;
        }

        :is(notary-booking, notary-quote) .booking-section {
          padding: 44px 0 70px;
        }

        /* Intro Header */
        :is(notary-booking, notary-quote) .booking-intro {
          text-align: center;
          max-width: 840px;
          margin: 0 auto 34px;
        }
        :is(notary-booking, notary-quote) .booking-intro .badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: var(--purple-light);
          color: var(--purple);
          border: 1px solid var(--purple-border);
          padding: 5px 14px;
          font-size: 11.5px;
          font-weight: 800;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          margin-bottom: 12px;
        }
        :is(notary-booking, notary-quote) .booking-intro h2 {
          font-size: clamp(28px, 3.2vw, 42px);
          margin: 0 0 10px;
          line-height: 1.25;
        }
        :is(notary-booking, notary-quote) .booking-intro p {
          margin: 0;
          color: var(--muted);
          font-size: 15.5px;
          line-height: 1.6;
        }

        /* Journey Progress Bar */
        :is(notary-booking, notary-quote) .journey {
          background: #ffffff;
          border: 1px solid var(--line);
          padding: 20px 28px;
          margin-bottom: 28px;
        }
        :is(notary-booking, notary-quote) .journey-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 16px;
          padding-bottom: 12px;
          border-bottom: 1px solid #f1edf4;
        }
        :is(notary-booking, notary-quote) .journey-top b {
          font-size: 15px;
          font-weight: 700;
          color: var(--ink);
          display: flex;
          align-items: center;
          gap: 8px;
        }
        :is(notary-booking, notary-quote) .journey-status {
          font-size: 12.5px;
          font-weight: 700;
          color: var(--purple);
          background: var(--purple-light);
          padding: 3px 10px;
          border: 1px solid var(--purple-border);
        }
        :is(notary-booking, notary-quote) .journey-track {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        :is(notary-booking, notary-quote) .journey-item {
          display: flex;
          align-items: center;
          flex: 1;
        }
        :is(notary-booking, notary-quote) .journey-item:last-child {
          flex: 0;
        }
        :is(notary-booking, notary-quote) .journey-dot {
          width: 32px;
          height: 32px;
          display: grid;
          place-items: center;
          background: #ffffff;
          border: 2px solid #d5ccd9;
          color: #7b7182;
          font-size: 12px;
          font-weight: 800;
          flex-shrink: 0;
        }
        :is(notary-booking, notary-quote) .journey-item.active .journey-dot {
          background: var(--purple);
          border-color: var(--purple);
          color: #ffffff;
        }
        :is(notary-booking, notary-quote) .journey-item.done .journey-dot {
          background: #ffffff;
          border-color: var(--purple);
          color: var(--purple);
        }
        :is(notary-booking, notary-quote) .journey-text {
          margin-left: 10px;
          text-align: left;
          white-space: nowrap;
        }
        :is(notary-booking, notary-quote) .journey-text b {
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 0.04em;
          text-transform: uppercase;
          display: block;
          color: #554a5c;
        }
        :is(notary-booking, notary-quote) .journey-item.active .journey-text b {
          color: var(--purple);
          font-weight: 800;
        }
        :is(notary-booking, notary-quote) .journey-line {
          flex: 1;
          height: 2px;
          background: #e8e2ec;
          margin: 0 12px;
        }
        :is(notary-booking, notary-quote) .journey-item.done .journey-line {
          background: var(--purple);
        }

        /* Booking Grid */
        :is(notary-booking, notary-quote) .booking-grid {
          display: grid;
          grid-template-columns: minmax(0, 1fr) 420px;
          gap: 28px;
          align-items: start;
        }

        /* Task Card */
        :is(notary-booking, notary-quote) .task-card {
          background: #ffffff;
          border: 1px solid var(--line);
          min-height: 600px;
          display: flex;
          flex-direction: column;
          position: relative;
        }
        :is(notary-booking, notary-quote) .task-head {
          padding: 26px 36px 18px;
          background: #fdfcfe;
          border-bottom: 1px solid #eee7f2;
        }
        :is(notary-booking, notary-quote) .step-count {
          display: inline-block;
          font-size: 11.5px;
          text-transform: uppercase;
          letter-spacing: 0.14em;
          font-weight: 800;
          color: var(--purple);
          margin-bottom: 4px;
        }
        :is(notary-booking, notary-quote) .task-head h2 {
          font-size: clamp(22px, 2.2vw, 30px);
          margin: 2px 0 6px;
        }
        :is(notary-booking, notary-quote) .task-head p {
          margin: 0;
          font-size: 14.5px;
          color: var(--muted);
        }
        :is(notary-booking, notary-quote) .task-body {
          padding: 32px 36px;
          flex: 1;
        }
        :is(notary-booking, notary-quote) .task-view { display: none; }
        :is(notary-booking, notary-quote) .task-view.active { display: block !important; }

        /* Step 1 Services Grid */
        :is(notary-booking, notary-quote) .service-list {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 16px;
        }
        :is(notary-booking, notary-quote) .service-option {
          width: 100%;
          border: 1px solid #dfd8e5;
          padding: 16px;
          background: #ffffff;
          text-align: left;
          display: grid;
          grid-template-columns: 70px 1fr;
          gap: 16px;
          align-items: start;
          position: relative;
          cursor: pointer;
          transition: border-color 0.15s;
        }
        :is(notary-booking, notary-quote) .service-option:hover {
          border-color: var(--purple);
        }
        :is(notary-booking, notary-quote) .service-option.selected {
          border-color: var(--purple);
          background: #faf6fd;
          box-shadow: inset 3px 0 0 var(--purple);
        }
        :is(notary-booking, notary-quote) .service-thumb {
          width: 70px;
          height: 70px;
          overflow: hidden;
          background: #ede8f2;
          flex-shrink: 0;
        }
        :is(notary-booking, notary-quote) .service-thumb img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }
        :is(notary-booking, notary-quote) .service-copy b {
          font-size: 15.5px;
          font-weight: 700;
          display: block;
          color: #1d1724;
          line-height: 1.35;
        }
        :is(notary-booking, notary-quote) .service-copy span {
          font-size: 12.5px;
          color: var(--muted);
          display: block;
          margin-top: 5px;
          line-height: 1.45;
        }
        :is(notary-booking, notary-quote) .service-bottom-row {
          grid-column: 1 / -1;
          margin-top: 10px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding-top: 10px;
          border-top: 1px dashed #e7dfec;
        }
        :is(notary-booking, notary-quote) .mode-pill {
          padding: 4px 10px;
          background: #ede6f5;
          color: var(--purple);
          font-size: 11.5px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          border: 1px solid var(--purple-border);
        }
        :is(notary-booking, notary-quote) .mode-pill.quote {
          background: #fdf3e7;
          color: #9a5b13;
          border-color: #f0d5b5;
        }
        :is(notary-booking, notary-quote) .btn-card-select-next {
          background: var(--purple);
          color: #ffffff;
          border: 0;
          padding: 7px 14px;
          font-size: 12px;
          font-weight: 700;
          display: inline-flex;
          align-items: center;
          gap: 6px;
        }
        :is(notary-booking, notary-quote) .btn-card-select-next:hover {
          background: var(--purple-dark);
        }

        /* Inputs & Form Elements */
        :is(notary-booking, notary-quote) .field {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        :is(notary-booking, notary-quote) .field label {
          font-size: 11.5px;
          font-weight: 800;
          color: #4b4154;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        :is(notary-booking, notary-quote) .field input,
        :is(notary-booking, notary-quote) .field select,
        :is(notary-booking, notary-quote) .field textarea {
          border: 1px solid #d5ccd9;
          padding: 12px 14px;
          font-size: 14.5px;
          background: #ffffff;
          color: var(--ink);
          outline: none;
        }
        :is(notary-booking, notary-quote) .field input:focus,
        :is(notary-booking, notary-quote) .field select:focus,
        :is(notary-booking, notary-quote) .field textarea:focus {
          border-color: var(--purple);
          box-shadow: inset 0 0 0 1px var(--purple);
        }
        :is(notary-booking, notary-quote) .field input.has-error,
        :is(notary-booking, notary-quote) .field select.has-error,
        :is(notary-booking, notary-quote) .field textarea.has-error {
          border-color: var(--danger) !important;
          background: #fffafa;
        }
        :is(notary-booking, notary-quote) .field-error-text {
          font-size: 12px;
          color: var(--danger);
          font-weight: 600;
          display: none;
          margin-top: 2px;
        }
        :is(notary-booking, notary-quote) .field-error-text.show { display: block; }

        :is(notary-booking, notary-quote) .big-input {
          min-height: 52px;
          border: 1px solid #d5ccd9;
          background: #ffffff;
          padding: 0 16px;
          display: flex;
          align-items: center;
          gap: 12px;
        }
        :is(notary-booking, notary-quote) .big-input:focus-within {
          border-color: var(--purple);
          box-shadow: inset 0 0 0 1px var(--purple);
        }
        :is(notary-booking, notary-quote) .big-input input {
          border: 0;
          outline: 0;
          width: 100%;
          font-size: 15px;
          background: transparent;
        }

        /* Live Places Search Dropdown Box & Result Cards */
        :is(notary-booking, notary-quote) .places-search-shell {
          position: relative;
          width: 100%;
        }

        :is(notary-booking, notary-quote) .dmn-places-dropdown {
          position: absolute;
          top: calc(100% + 2px);
          left: 0;
          right: 0;
          z-index: 99999999 !important;
          background: #ffffff !important;
          border: 1px solid var(--purple) !important;
          box-shadow: 0 14px 36px rgba(25, 20, 30, 0.22) !important;
          max-height: 320px !important;
          overflow-y: auto !important;
          display: none;
          border-radius: 0px !important;
        }

        :is(notary-booking, notary-quote) .dmn-places-dropdown.show {
          display: block !important;
        }

        :is(notary-booking, notary-quote) .dmn-place-item {
          display: flex !important;
          flex-direction: row !important;
          align-items: center !important;
          gap: 14px !important;
          padding: 12px 16px !important;
          cursor: pointer !important;
          border-bottom: 1px solid #ede8f2 !important;
          border-left: 3px solid transparent !important;
          background: #ffffff !important;
          transition: all 0.15s ease !important;
          border-radius: 0px !important;
          text-align: left !important;
          user-select: none !important;
        }

        :is(notary-booking, notary-quote) .dmn-place-item:last-child {
          border-bottom: none !important;
        }

        :is(notary-booking, notary-quote) .dmn-place-item:hover,
        :is(notary-booking, notary-quote) .dmn-place-item.active {
          background: #f6f2fa !important;
          border-left-color: var(--purple) !important;
        }

        :is(notary-booking, notary-quote) .dmn-place-icon-box {
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          width: 34px !important;
          height: 34px !important;
          background: #f4eef9 !important;
          border: 1px solid #e5daf0 !important;
          flex-shrink: 0 !important;
          cursor: pointer !important;
          transition: all 0.15s ease !important;
        }

        :is(notary-booking, notary-quote) .dmn-place-item:hover .dmn-place-icon-box,
        :is(notary-booking, notary-quote) .dmn-place-item.active .dmn-place-icon-box {
          background: var(--purple) !important;
          border-color: var(--purple) !important;
        }

        :is(notary-booking, notary-quote) .dmn-place-icon-box svg {
          stroke: var(--purple) !important;
          transition: stroke 0.15s ease !important;
        }

        :is(notary-booking, notary-quote) .dmn-place-item:hover .dmn-place-icon-box svg,
        :is(notary-booking, notary-quote) .dmn-place-item.active .dmn-place-icon-box svg {
          stroke: #ffffff !important;
        }

        :is(notary-booking, notary-quote) .dmn-place-text {
          flex: 1 !important;
          min-width: 0 !important;
          text-align: left !important;
          cursor: pointer !important;
        }

        :is(notary-booking, notary-quote) .dmn-place-main {
          font-size: 14.5px !important;
          font-weight: 700 !important;
          color: #19141e !important;
          line-height: 1.35 !important;
          cursor: pointer !important;
        }

        :is(notary-booking, notary-quote) .dmn-place-sub {
          font-size: 12px !important;
          color: #615769 !important;
          margin-top: 3px !important;
          line-height: 1.35 !important;
          cursor: pointer !important;
        }

        /* Location Search Input Row & Dedicated Calculate Button */
        :is(notary-booking, notary-quote) .location-search-row {
          display: flex !important;
          align-items: stretch !important;
          gap: 10px !important;
          width: 100% !important;
        }

        :is(notary-booking, notary-quote) .btn-calc-route {
          display: inline-flex !important;
          align-items: center !important;
          justify-content: center !important;
          gap: 8px !important;
          background: var(--purple, #4b247a) !important;
          color: #ffffff !important;
          font-weight: 700 !important;
          font-size: 14px !important;
          padding: 0 22px !important;
          border: none !important;
          cursor: pointer !important;
          white-space: nowrap !important;
          border-radius: 0px !important;
          transition: background 0.15s ease, transform 0.1s ease !important;
          font-family: inherit !important;
          min-height: 52px !important;
          user-select: none !important;
        }

        :is(notary-booking, notary-quote) .btn-calc-route:hover {
          background: var(--purple-dark, #37175c) !important;
        }

        :is(notary-booking, notary-quote) .btn-calc-route:active {
          transform: translateY(1px) !important;
        }

        :is(notary-booking, notary-quote) .btn-calc-route.is-calculating {
          opacity: 0.8 !important;
          pointer-events: none !important;
        }

        @keyframes dmnSpin {
          100% { transform: rotate(360deg); }
        }
        .dmn-spin {
          animation: dmnSpin 0.8s linear infinite;
        }

        :is(notary-booking, notary-quote) .address-grid {
          display: grid;
          grid-template-columns: 1fr 140px 1fr;
          gap: 14px;
          margin-bottom: 20px;
        }
        :is(notary-booking, notary-quote) .two-col-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
        }

        /* Map Styling */
        :is(notary-booking, notary-quote) .route-map-shell {
          border: 1px solid var(--line);
          background: #ffffff;
          overflow: hidden;
        }
        :is(notary-booking, notary-quote) .route-map-bar {
          padding: 12px 18px;
          background: #fcfbfe;
          border-bottom: 1px solid #eee7f2;
          display: flex;
          align-items: center;
          justify-content: space-between;
          font-size: 13px;
        }
        :is(notary-booking, notary-quote) .live-map-canvas {
          width: 100%;
          height: 310px;
          background: #eef0f3;
          position: relative;
          z-index: 1;
        }
        :is(notary-booking, notary-quote) .route-map-footer {
          padding: 14px 20px;
          background: #23162b;
          color: #ffffff;
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 12px;
        }
        :is(notary-booking, notary-quote) .area-stats {
          display: flex;
          gap: 12px;
        }
        :is(notary-booking, notary-quote) .area-stat {
          background: rgba(255, 255, 255, 0.08);
          padding: 8px 14px;
          border-left: 3px solid #bba3d6;
        }
        :is(notary-booking, notary-quote) .area-stat span {
          display: block;
          font-size: 10.5px;
          text-transform: uppercase;
          opacity: 0.8;
          letter-spacing: 0.04em;
        }
        :is(notary-booking, notary-quote) .area-stat strong {
          display: block;
          font-size: 16px;
          margin-top: 2px;
          color: #ffffff;
        }

        /* Leaflet Marker */
        .dmn-map-marker { background: transparent; border: 0; }
        .dmn-pin-wrap {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: #0d8050;
          color: #ffffff;
          padding: 6px 14px;
          border: 2px solid #ffffff;
          white-space: nowrap;
          font-family: inherit;
          font-size: 12px;
          font-weight: 700;
          transform: translate(-50%, -100%);
          position: relative;
        }
        .dmn-pin-wrap:after {
          content: "";
          position: absolute;
          left: 50%;
          bottom: -6px;
          transform: translateX(-50%);
          border-left: 5px solid transparent;
          border-right: 5px solid transparent;
          border-top: 6px solid #0d8050;
        }

        /* Dynamic Box & Callouts */
        :is(notary-booking, notary-quote) .dynamic-intake-shell {
          background: #fdfcfe;
          border: 1px solid #dfd5e7;
          padding: 22px;
          margin-top: 10px;
        }
        :is(notary-booking, notary-quote) .intake-section-title {
          color: var(--purple);
          font-size: 14.5px;
          font-weight: 800;
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 14px;
          padding-bottom: 8px;
          border-bottom: 1px solid #eee7f2;
        }

        :is(notary-booking, notary-quote) .warning-callout {
          background: #fffaf0;
          border: 1px solid #fde2b4;
          border-left: 4px solid var(--amber);
          padding: 12px 14px;
          font-size: 12.5px;
          color: #7c440a;
          line-height: 1.5;
          margin-top: 12px;
          display: flex;
          gap: 10px;
          align-items: flex-start;
        }

        /* Upload Container */
        :is(notary-booking, notary-quote) .upload-container {
          background: #faf8fc;
          border: 1px dashed #cfc2dc;
          padding: 20px;
          margin-top: 16px;
        }
        :is(notary-booking, notary-quote) .file-drop-area {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 18px 16px;
          background: #ffffff;
          border: 1px solid #ded7e2;
          cursor: pointer;
          text-align: center;
        }
        :is(notary-booking, notary-quote) .file-drop-area:hover {
          border-color: var(--purple);
          background: #fdfcff;
        }
        :is(notary-booking, notary-quote) .uploaded-files-list {
          margin-top: 12px;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        :is(notary-booking, notary-quote) .file-chip {
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: #f1ecf7;
          border: 1px solid var(--purple-border);
          padding: 8px 14px;
          font-size: 13px;
          color: var(--purple);
          font-weight: 600;
        }

        /* Step 4: Schedule */
        :is(notary-booking, notary-quote) .schedule-container {
          display: grid;
          gap: 22px;
        }
        :is(notary-booking, notary-quote) .date-picker-box {
          border: 1px solid var(--line);
          background: #ffffff;
          padding: 18px 20px;
        }
        :is(notary-booking, notary-quote) .date-picker-box .field input {
          border: 1px solid #d5ccd9;
          padding: 12px 14px;
          font-size: 15px;
          font-weight: 600;
          color: var(--purple);
          background: #fcfbfe;
          cursor: pointer;
        }
        :is(notary-booking, notary-quote) .time-slots-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 12px;
        }
        :is(notary-booking, notary-quote) .time-slots-header b {
          font-size: 12px;
          font-weight: 800;
          color: #4b4154;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          display: flex;
          align-items: center;
          gap: 6px;
        }
        :is(notary-booking, notary-quote) .time-slots-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 10px;
        }
        :is(notary-booking, notary-quote) .time-slot-btn {
          border: 1px solid #d5ccd9;
          background: #ffffff;
          color: #2b2133;
          padding: 14px 8px;
          font-size: 14px;
          font-weight: 700;
          text-align: center;
          transition: all 0.15s ease;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
        }
        :is(notary-booking, notary-quote) .time-slot-btn span {
          font-size: 10.5px;
          font-weight: 600;
          color: var(--muted);
          text-transform: uppercase;
        }
        :is(notary-booking, notary-quote) .time-slot-btn:hover {
          border-color: var(--purple);
          background: #faf6fd;
        }
        :is(notary-booking, notary-quote) .time-slot-btn.active-slot {
          background: var(--purple) !important;
          border-color: var(--purple) !important;
          color: #ffffff !important;
        }
        :is(notary-booking, notary-quote) .time-slot-btn.active-slot span {
          color: #dfd1ef !important;
        }

        /* Quote Window Cards */
        :is(notary-booking, notary-quote) .quote-windows-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 12px;
          margin-top: 10px;
        }
        :is(notary-booking, notary-quote) .quote-window-card {
          border: 1px solid #eedbc5;
          background: #ffffff;
          padding: 16px 12px;
          text-align: center;
          cursor: pointer;
          transition: all 0.15s;
        }
        :is(notary-booking, notary-quote) .quote-window-card:hover {
          border-color: var(--purple);
        }
        :is(notary-booking, notary-quote) .quote-window-card.active-window {
          border-color: var(--purple) !important;
          background: var(--purple-light) !important;
          box-shadow: inset 0 0 0 2px var(--purple);
        }
        :is(notary-booking, notary-quote) .quote-window-card strong {
          display: block;
          font-size: 14px;
          color: #1a1420;
          margin-bottom: 2px;
        }
        :is(notary-booking, notary-quote) .quote-window-card span {
          font-size: 12px;
          color: #78350f;
          font-weight: 600;
        }

        /* Action Bar */
        :is(notary-booking, notary-quote) .action-bar {
          background: #ffffff;
          padding: 18px 36px 24px;
          display: flex;
          align-items: stretch;
          justify-content: space-between;
          gap: 16px;
          border-top: 1px solid #f0eaf5;
          margin-top: auto;
          box-sizing: border-box;
          width: 100%;
        }
        :is(notary-booking, notary-quote) .primary-btn {
          background: var(--purple);
          color: #ffffff;
          border: 1px solid var(--purple);
          padding: 12px 24px;
          font-size: 14.5px;
          font-weight: 700;
          min-height: 48px;
          line-height: 1.35;
          margin-left: auto;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          text-align: center;
          gap: 8px;
          box-sizing: border-box;
          cursor: pointer;
          transition: background 0.15s ease, border-color 0.15s ease;
        }
        :is(notary-booking, notary-quote) .primary-btn:hover {
          background: var(--purple-dark);
          border-color: var(--purple-dark);
        }
        :is(notary-booking, notary-quote) .back-btn {
          border: 1px solid #d5ccd9;
          background: #ffffff;
          color: #4f4752;
          padding: 12px 22px;
          font-weight: 700;
          font-size: 14px;
          min-height: 48px;
          line-height: 1.35;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          box-sizing: border-box;
          cursor: pointer;
          transition: background 0.15s ease, border-color 0.15s ease;
        }
        :is(notary-booking, notary-quote) .back-btn:not(.show) {
          display: none !important;
        }
        :is(notary-booking, notary-quote) .back-btn:hover {
          background: #f9f6fc;
          border-color: #beb2c5;
        }
        :is(notary-booking, notary-quote) .back-btn.show {
          display: inline-flex !important;
          visibility: visible !important;
        }

        /* Step 6 Review Box */
        :is(notary-booking, notary-quote) .review-card {
          background: #fcfbfe;
          border: 1px solid var(--line);
          padding: 24px 28px;
        }
        :is(notary-booking, notary-quote) .review-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 9px 0;
          font-size: 14px;
          border-bottom: 1px solid #f3edf7;
        }
        :is(notary-booking, notary-quote) .review-row:last-of-type { border-bottom: none; }
        :is(notary-booking, notary-quote) .review-row span {
          color: #63586b;
        }
        :is(notary-booking, notary-quote) .review-row strong {
          color: #19141e;
          font-weight: 600;
          text-align: right;
          max-width: 60%;
        }
        :is(notary-booking, notary-quote) .review-total-box {
          margin-top: 14px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: #f4edf9;
          padding: 14px 18px;
          border: 1px solid var(--purple-border);
        }
        :is(notary-booking, notary-quote) .review-total-box span {
          font-weight: 800;
          text-transform: uppercase;
          font-size: 13px;
          color: var(--purple);
          letter-spacing: 0.05em;
        }
        :is(notary-booking, notary-quote) .review-total-box strong {
          font-size: 20px;
          font-weight: 800;
          color: var(--purple);
        }

        /* Step 7 Confirmation */
        :is(notary-booking, notary-quote) .confirm-container {
          text-align: center;
          padding: 40px 16px 20px;
        }
        :is(notary-booking, notary-quote) .confirm-icon {
          width: 68px;
          height: 68px;
          background: var(--success);
          color: #ffffff;
          display: grid;
          place-items: center;
          margin: 0 auto 18px;
        }
        :is(notary-booking, notary-quote) .confirm-badges-row {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          margin: 18px auto 22px;
          flex-wrap: wrap;
        }
        :is(notary-booking, notary-quote) .confirm-badge {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          background: var(--purple-light);
          border: 1px solid var(--purple-border);
          color: var(--purple);
          font-size: 14px;
          font-weight: 800;
          padding: 0 20px;
          min-height: 42px;
          height: 42px;
          line-height: 1;
          margin: 0;
          box-sizing: border-box;
          letter-spacing: 0.03em;
          vertical-align: middle;
        }
        :is(notary-booking, notary-quote) .confirm-payment-pill {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          background: #ecfdf5;
          border: 1px solid #a7f3d0;
          color: #065f46;
          font-size: 13.5px;
          font-weight: 700;
          padding: 0 18px;
          min-height: 42px;
          height: 42px;
          line-height: 1;
          margin: 0;
          box-sizing: border-box;
          vertical-align: middle;
        }
        :is(notary-booking, notary-quote) .payment-box {
          margin-top: 18px;
          border: 1px solid #d4c7e2;
          border-top: 3px solid var(--purple);
          background: #fff;
          padding: 16px 18px;
        }
        :is(notary-booking, notary-quote) .payment-box-title {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 10px;
          margin-bottom: 10px;
          flex-wrap: wrap;
        }
        :is(notary-booking, notary-quote) .payment-box-title b {
          font-size: 14px;
          color: var(--purple);
        }
        :is(notary-booking, notary-quote) .stripe-pill {
          font-size: 11px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          padding: 3px 9px;
          background: #eef2ff;
          color: #3730a3;
          border: 1px solid #c7d2fe;
        }
        :is(notary-booking, notary-quote) .payment-choices {
          display: grid;
          gap: 10px;
          margin-top: 8px;
        }
        :is(notary-booking, notary-quote) .payment-choice-card {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          padding: 12px 14px;
          border: 1px solid #dfd8e5;
          background: #fcfbfe;
          cursor: pointer;
        }
        :is(notary-booking, notary-quote) .payment-choice-card.is-active {
          border-color: var(--purple);
          background: #f6f1fb;
        }
        :is(notary-booking, notary-quote) .payment-choice-card input {
          margin-top: 3px;
          accent-color: var(--purple);
        }
        :is(notary-booking, notary-quote) .payment-due-row {
          margin-top: 10px;
          padding-top: 10px;
          border-top: 1px dashed #e2d8ea;
          display: flex;
          justify-content: space-between;
          font-size: 13.5px;
          color: #332938;
        }
        :is(notary-booking, notary-quote) .stripe-redirect-notice {
          margin-top: 12px;
          padding: 12px 14px;
          background: #eef2ff;
          border: 1px solid #c7d2fe;
          color: #1e1b4b;
          font-size: 13.5px;
        }

        /* Side Rail Summary */
        :is(notary-booking, notary-quote) .side-rail {
          display: grid;
          gap: 20px;
          position: sticky;
          top: 24px;
        }
        :is(notary-booking, notary-quote) .summary-card {
          border: 1px solid var(--line);
          background: #ffffff;
          padding: 24px;
        }
        :is(notary-booking, notary-quote) .summary-head {
          margin: -24px -24px 18px;
          padding: 16px 24px;
          background: var(--purple);
          color: #ffffff;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        :is(notary-booking, notary-quote) .summary-item {
          display: flex;
          justify-content: space-between;
          padding: 10px 0;
          font-size: 13.5px;
        }
        :is(notary-booking, notary-quote) .summary-item strong {
          color: #201824;
          font-weight: 600;
        }
        :is(notary-booking, notary-quote) .estimate {
          margin-top: 14px;
          background: #f9f6fc;
          padding: 14px;
          border: 1px solid #e7dced;
        }
        :is(notary-booking, notary-quote) .estimate-total {
          margin-top: 8px;
          padding-top: 10px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 19px;
          font-weight: 800;
          color: var(--purple);
          border-top: 1px solid #ded0e7;
        }

        /* Toast */
        :is(notary-booking, notary-quote) .toast {
          position: fixed;
          top: 24px;
          left: 50%;
          transform: translateX(-50%) translateY(-10px);
          background: #23162b;
          color: #ffffff;
          padding: 12px 24px;
          font-size: 14px;
          font-weight: 600;
          opacity: 0;
          pointer-events: none;
          transition: all 0.25s ease;
          z-index: 999999;
        }
        :is(notary-booking, notary-quote) .toast.show {
          opacity: 1;
          transform: translateX(-50%) translateY(0);
        }

        /* Contain all form content */
        :is(notary-booking, notary-quote) .booking-grid > *,
        :is(notary-booking, notary-quote) .task-card,
        :is(notary-booking, notary-quote) .task-body,
        :is(notary-booking, notary-quote) .two-col-grid > *,
        :is(notary-booking, notary-quote) .dynamic-intake-shell,
        :is(notary-booking, notary-quote) .field { min-width: 0; max-width: 100%; box-sizing: border-box; }
        :is(notary-booking, notary-quote) .task-card { overflow: hidden; }
        :is(notary-booking, notary-quote) .two-col-grid { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; }
        :is(notary-booking, notary-quote) .field input,
        :is(notary-booking, notary-quote) .field select,
        :is(notary-booking, notary-quote) .field textarea { min-width: 0; max-width: 100%; width: 100%; box-sizing: border-box; }
        :is(notary-booking, notary-quote) .field label { overflow-wrap: anywhere; }

        /* Comprehensive Responsive & Mobile-First Overrides */
        @media (max-width: 1180px) {
          :is(notary-booking, notary-quote) .booking-grid {
            grid-template-columns: 1fr !important;
            gap: 24px !important;
          }
          :is(notary-booking, notary-quote) .side-rail {
            position: static !important;
            order: 2 !important;
          }
        }

        @media (max-width: 980px) {
          :is(notary-booking, notary-quote) .service-list { grid-template-columns: 1fr; }
          :is(notary-booking, notary-quote) .address-grid { grid-template-columns: 1fr; }
          :is(notary-booking, notary-quote) .two-col-grid { grid-template-columns: 1fr; }
          :is(notary-booking, notary-quote) .time-slots-grid { grid-template-columns: repeat(2, 1fr); }
          :is(notary-booking, notary-quote) .quote-windows-grid { grid-template-columns: 1fr; }
          :is(notary-booking, notary-quote) .task-body { padding: 24px 20px; }
          :is(notary-booking, notary-quote) .task-head { padding: 20px 20px 16px; }
          :is(notary-booking, notary-quote) .action-bar { padding: 16px 20px; }
          :is(notary-booking, notary-quote) .journey-text { display: none; }
        }

        @media (max-width: 768px) {
          :is(notary-booking, notary-quote) .shell {
            padding: 0 12px !important;
          }
          :is(notary-booking, notary-quote) .booking-section {
            padding: 16px 0 36px !important;
          }
          :is(notary-booking, notary-quote) .booking-intro {
            margin-bottom: 20px !important;
          }
          :is(notary-booking, notary-quote) .booking-intro h2 {
            font-size: 24px !important;
          }
          :is(notary-booking, notary-quote) .booking-intro p {
            font-size: 14px !important;
          }
          :is(notary-booking, notary-quote) .task-card {
            min-height: auto !important;
          }
          :is(notary-booking, notary-quote) .field input,
          :is(notary-booking, notary-quote) .field select,
          :is(notary-booking, notary-quote) .field textarea,
          :is(notary-booking, notary-quote) .cms-question-field input,
          :is(notary-booking, notary-quote) .cms-question-field select,
          :is(notary-booking, notary-quote) .cms-question-field textarea,
          :is(notary-booking, notary-quote) .big-input input {
            font-size: 16px !important; /* Prevents unwanted auto-zoom on iOS */
          }
        }

        @media (max-width: 600px) {
          :is(notary-booking, notary-quote) .journey {
            padding: 12px 14px !important;
            margin-bottom: 16px !important;
          }
          :is(notary-booking, notary-quote) .journey-top {
            margin-bottom: 10px !important;
            padding-bottom: 8px !important;
          }
          :is(notary-booking, notary-quote) .journey-top b {
            font-size: 13px !important;
          }
          :is(notary-booking, notary-quote) .journey-status {
            font-size: 11px !important;
            padding: 2px 8px !important;
          }
          :is(notary-booking, notary-quote) .journey-dot {
            width: 26px !important;
            height: 26px !important;
            font-size: 11px !important;
          }
          :is(notary-booking, notary-quote) .journey-line {
            margin: 0 4px !important;
          }
          :is(notary-booking, notary-quote) .task-head {
            padding: 16px 14px 12px !important;
          }
          :is(notary-booking, notary-quote) .task-head h2 {
            font-size: 19px !important;
          }
          :is(notary-booking, notary-quote) .task-body {
            padding: 16px 14px !important;
          }
          :is(notary-booking, notary-quote) .action-bar {
            flex-direction: column-reverse !important;
            padding: 14px 14px 18px !important;
            gap: 10px !important;
          }
          :is(notary-booking, notary-quote) .primary-btn {
            width: 100% !important;
            min-width: 0 !important;
            min-height: 52px !important;
            font-size: 15px !important;
            margin-left: 0 !important;
            padding: 14px 16px !important;
            white-space: normal !important;
          }
          :is(notary-booking, notary-quote) .back-btn {
            width: 100% !important;
            min-width: 0 !important;
            min-height: 44px !important;
            font-size: 14px !important;
            padding: 10px 16px !important;
          }
          :is(notary-booking, notary-quote) .service-option {
            grid-template-columns: 56px 1fr !important;
            gap: 12px !important;
            padding: 12px !important;
          }
          :is(notary-booking, notary-quote) .service-thumb {
            width: 56px !important;
            height: 56px !important;
          }
          :is(notary-booking, notary-quote) .service-copy b {
            font-size: 14.5px !important;
          }
          :is(notary-booking, notary-quote) .service-copy span {
            font-size: 12px !important;
          }
          :is(notary-booking, notary-quote) .location-search-row {
            flex-direction: column !important;
            gap: 8px !important;
          }
          :is(notary-booking, notary-quote) .btn-calc-route {
            width: 100% !important;
            min-height: 48px !important;
            padding: 12px !important;
          }
          :is(notary-booking, notary-quote) .address-grid {
            grid-template-columns: 1fr !important;
            gap: 10px !important;
          }
          :is(notary-booking, notary-quote) .two-col-grid {
            grid-template-columns: 1fr !important;
          }
          :is(notary-booking, notary-quote) .cms-questions-grid {
            grid-template-columns: 1fr !important;
            gap: 14px !important;
          }
          :is(notary-booking, notary-quote) .time-slots-grid {
            grid-template-columns: repeat(2, 1fr) !important;
            gap: 8px !important;
          }
          :is(notary-booking, notary-quote) .time-slot-btn {
            padding: 10px 6px !important;
            font-size: 13px !important;
          }
          :is(notary-booking, notary-quote) .quote-windows-grid {
            grid-template-columns: 1fr !important;
            gap: 8px !important;
          }
          :is(notary-booking, notary-quote) .review-card {
            padding: 16px 14px !important;
          }
          :is(notary-booking, notary-quote) .review-row {
            font-size: 13px !important;
            padding: 8px 0 !important;
          }
          :is(notary-booking, notary-quote) .payment-box {
            padding: 14px 12px !important;
          }
          :is(notary-booking, notary-quote) .payment-box-title {
            flex-direction: column !important;
            align-items: flex-start !important;
            gap: 6px !important;
          }
          :is(notary-booking, notary-quote) .payment-due-row {
            font-size: 12.5px !important;
          }
          :is(notary-booking, notary-quote) .summary-card {
            padding: 16px 14px !important;
          }
          :is(notary-booking, notary-quote) .summary-head {
            margin: -16px -14px 14px !important;
            padding: 12px 14px !important;
          }
          :is(notary-booking, notary-quote) #confirmActionButtons {
            flex-direction: column !important;
            width: 100% !important;
            gap: 10px !important;
          }
          :is(notary-booking, notary-quote) #confirmActionButtons > * {
            width: 100% !important;
            justify-content: center !important;
          }
        }

        @keyframes dmnLoaderRotate {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        :is(notary-booking, notary-quote) .dmn-loader-wrap {
          grid-column: 1 / -1;
          min-height: 290px;
          padding: 56px 24px;
          border: 1px solid #e6dcf0;
          border-top: 3px solid var(--purple);
          background: #fcfbfe;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          gap: 14px;
        }
        :is(notary-booking, notary-quote) .dmn-loader-svg {
          width: 46px;
          height: 46px;
          animation: dmnLoaderRotate 0.9s linear infinite;
        }
        :is(notary-booking, notary-quote) .dmn-loader-title {
          font-size: 16px;
          font-weight: 700;
          color: #1d1724;
          margin: 0;
        }
        :is(notary-booking, notary-quote) .dmn-loader-sub {
          font-size: 13px;
          color: var(--muted);
          margin: 0;
        }
      </style>

      <main>
        <section class="booking-section">
          <div class="shell">
            <!-- Header Intro -->
            <div class="booking-intro">
              <span class="badge">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"/></svg>
                Direct Mobile Notary &amp; Verification Services LLC
              </span>
              <h2 id="widgetHeadingTitle">Book Your Mobile Service in a Few Easy Steps</h2>
              <p id="widgetHeadingIntro">Professional, convenient, and reliable. North Carolina statutory notarial charges and travel fees are disclosed separately before you confirm.</p>
            </div>

            <!-- Progress Journey -->
            <div class="journey">
              <div class="journey-top">
                <b>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>
                  <span id="journeyHeadingText">Your Booking Journey</span>
                </b>
                <span id="journeyStatus" class="journey-status">Step 1 of 6 · Choose a service</span>
              </div>
              <div class="journey-track" id="journeyTrack"></div>
            </div>

            <!-- Main Booking Grid -->
            <div class="booking-grid">
              <section class="task-card" id="taskCard">
                <div class="task-head">
                  <span class="step-count" id="stepCount">Step 01 · Service</span>
                  <h2 id="taskTitle">What do you need help with?</h2>
                  <p id="taskIntro">Pick the closest match from our services catalog.</p>
                </div>

                <div class="task-body">
                  <!-- STEP 1: SERVICE -->
                  <div class="task-view active" data-step="1">
                    <div id="cmsStatusBanner" style="display:none;margin-bottom:16px;padding:14px 16px;border:1px solid #e5d8ee;background:#faf7fc;font-size:13.5px;color:#3d2459"></div>
                    <div class="service-list" id="serviceList"></div>
                    <div id="moreServicesWrap" style="display:none;margin-top:14px;text-align:center">
                      <button type="button" class="back-btn show" id="btnToggleMoreServices" style="visibility:visible;margin:0 auto">Show More Services</button>
                    </div>
                  </div>

                  <!-- STEP 2: LOCATION -->
                  <div class="task-view" data-step="2">
                    <div class="field" style="margin-bottom:16px">
                      <label style="color:var(--purple);font-weight:800">
                        Appointment Street Address (Live Places Search)
                      </label>
                      <div class="places-search-shell" style="position:relative;width:100%">
                        <div class="location-search-row">
                          <div class="big-input" style="flex:1">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#4b247a" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
                            <input id="address" placeholder="Start typing street address, hospital, or business location..." autocomplete="off" />
                          </div>
                          <button type="button" id="btnCalculateRoute" class="btn-calc-route" title="Calculate driving distance and route">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="3 11 22 2 13 21 11 13 3 11"/></svg>
                            Calculate
                          </button>
                        </div>
                        <div id="dmnPlacesDropdown" class="dmn-places-dropdown"></div>
                      </div>
                      <span style="font-size:12px;color:var(--muted);margin-top:4px">
                        Enter your address to automatically preview route and calculate driving mileage from our Huntersville dispatch hub.
                      </span>
                    </div>

                    <div class="address-grid">
                      <div class="field"><label>City</label><input id="city" placeholder="e.g. Huntersville, Charlotte" /></div>
                      <div class="field"><label>ZIP Code</label><input id="zip" placeholder="e.g. 28078, 28202" inputmode="numeric" /></div>
                      <div class="field">
                        <label>Setting / Environment</label>
                        <select id="locationType">
                          <option selected>Home / Residence</option>
                          <option>Office / Business</option>
                          <option>Hospital / Care Facility</option>
                          <option>Coffee Shop / Public Location</option>
                        </select>
                      </div>
                    </div>

                    <div class="route-map-shell">
                      <div class="route-map-bar">
                        <span>Appointment Location: <strong id="destAddressBanner">Enter your address above</strong></span>
                        <div style="display:flex;align-items:center;gap:10px">
                          <span id="routeSyncBadge" style="font-size:12px;color:var(--muted);font-weight:600">Enter address to preview location</span>
                          <button type="button" id="btnRecenterRoute" style="background:#fff;border:1px solid #d5ccd9;padding:4px 10px;font-size:12px;font-weight:600;cursor:pointer;color:var(--purple);display:inline-flex;align-items:center;gap:4px">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/></svg>
                            Recenter Map
                          </button>
                        </div>
                      </div>
                      <div id="clientRouteMap" class="live-map-canvas"></div>
                      <div class="route-map-footer">
                        <div class="area-stats">
                          <div class="area-stat"><span>Driving Distance</span><strong id="distanceText">-- mi</strong></div>
                          <div class="area-stat"><span>Drive Time</span><strong id="driveText">-- min</strong></div>
                          <div class="area-stat"><span>Separate Travel Fee</span><strong id="travelText">--</strong></div>
                        </div>
                        <span style="font-size:12px;opacity:.85">Itemized pursuant to NC Notary Standards</span>
                      </div>
                    </div>
                  </div>

                  <!-- STEP 3: DETAILS (100% DYNAMIC CMS-DRIVEN SERVICE INTAKE) -->
                  <div class="task-view" data-step="3">
                    <div style="display:grid;gap:16px">

                      <div id="dynamicBox" class="dynamic-intake-shell"></div>

                      <!-- SECURE DOCUMENT UPLOAD OPTION -->
                      <div class="upload-container" id="docUploadBox">
                        <b style="color:var(--purple);font-size:14px;display:flex;align-items:center;gap:6px;margin-bottom:8px">
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                          Upload Documents for Review / Printing (Optional)
                        </b>
                        <div class="warning-callout" style="margin-top:0;margin-bottom:12px">
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#d97706" stroke-width="2" style="flex-shrink:0"><rect x="3" y="11" width="18" height="11" /><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
                          <div>
                            <strong>Important Privacy &amp; Security Notice:</strong>
                            Pursuant to NC Notary Public Law and privacy standards, do NOT upload copies of government IDs, Social Security cards, or sensitive banking details. All signers must physically present their original government photo ID at the appointment.
                          </div>
                        </div>
                        <label class="file-drop-area" for="clientFileInput">
                          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#4b247a" stroke-width="1.8" style="margin-bottom:6px"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                          <strong style="color:var(--purple);font-size:14px">Click to Browse Document Files (PDF, Word, Images)</strong>
                          <span style="font-size:12px;color:var(--muted);margin-top:2px">Upload contracts, instructions, or agreements for preparation (Max 15MB)</span>
                          <input type="file" id="clientFileInput" multiple accept=".pdf,.doc,.docx,.png,.jpg,.jpeg" style="display:none" />
                        </label>
                        <div class="uploaded-files-list" id="uploadedFilesList"></div>
                      </div>

                      <!-- Signer ID Declaration -->
                      <label id="signerIdDeclLabel" style="display:flex;align-items:flex-start;gap:12px;font-size:13px;color:#332938;margin-top:4px;cursor:pointer;background:#faf6fd;padding:12px 14px;border:1px solid #e7dced">
                        <input type="checkbox" id="chkIdVerified" checked style="margin-top:3px;accent-color:var(--purple);width:16px;height:16px" />
                        <span><strong>Signer Identification Acknowledgment:</strong> I confirm that all signers will have an original, unexpired government-issued photo ID (e.g. Driver's License, US Passport, Military ID) physically present at the appointment.</span>
                      </label>
                    </div>
                  </div>

                  <!-- STEP 4: SCHEDULE / QUOTE (INTERACTIVE TIME SLOTS GRID) -->
                  <div class="task-view" data-step="4">
                    <div id="instantSchedule" class="schedule-container">
                      <!-- 1. Date Selection -->
                      <div class="date-picker-box">
                        <div class="field">
                          <label style="display:flex;align-items:center;gap:6px">
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                            1. Select Preferred Appointment Date
                          </label>
                          <input type="date" id="bookDate" />
                          <span style="font-size:12px;color:var(--muted);margin-top:4px">Standard hours: 7:00 AM – 7:00 PM. After-hours appointments available upon request (note preferred time in Special Instructions).</span>
                        </div>
                      </div>

                      <!-- 2. Time Slot Selection Grid -->
                      <div class="date-picker-box">
                        <div class="time-slots-header">
                          <b>
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                            2. Choose Appointment Time Slot
                          </b>
                          <span id="selectedTimeSlotLabel" style="font-size:12px;font-weight:700;color:var(--purple)">Select an available time slot</span>
                        </div>

                        <!-- Underlying hidden input so selected time slot is reliably preserved -->
                        <input type="hidden" id="bookTime" value="11:00 AM" />

                        <!-- Clean Clickable Time Slots Grid -->
                        <div class="time-slots-grid" id="timeSlotsGrid"></div>
                      </div>
                    </div>

                    <!-- Quote Schedule -->
                    <div id="quoteSchedule" style="display:none;background:#fff8ef;padding:22px;border:1px solid #eedbc5">
                      <b style="color:#92400e;display:flex;align-items:center;gap:6px;margin-bottom:8px">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
                        Custom Quote Review Required
                      </b>
                      <p style="color:#78350f;font-size:13.5px;margin:0 0 16px">Due to package size, document complexity, or specialized verification requirements, Lakechia Sanders will review your request, prepare an itemized quote, and contact you promptly.</p>
                      
                      <div class="field"><label>Preferred Date</label><input type="date" id="quoteBookDate" /></div>

                      <div class="field" style="margin-top:16px">
                        <label>Preferred Appointment Window</label>
                        <input type="hidden" id="quoteWindowSelect" value="Afternoon (12 PM – 4 PM)" />
                        <div class="quote-windows-grid" id="quoteWindowsGrid"></div>
                      </div>
                    </div>
                  </div>

                  <!-- STEP 5: CONTACT & NOTICES -->
                  <div class="task-view" data-step="5">
                    <div style="display:grid;gap:14px">
                      <div class="field">
                        <label>Full Name *</label>
                        <input id="customerName" placeholder="e.g. John Doe" />
                        <span class="field-error-text" id="errCustomerName">Full name is required</span>
                      </div>
                      <div class="field">
                        <label>Mobile Phone *</label>
                        <input id="customerPhone" placeholder="(803) 412-0170" />
                        <span class="field-error-text" id="errCustomerPhone">Valid mobile phone is required</span>
                      </div>
                      <div class="field">
                        <label>Email Address *</label>
                        <input id="customerEmail" type="email" placeholder="john@example.com" />
                        <span class="field-error-text" id="errCustomerEmail">Valid email is required</span>
                      </div>
                      <div class="field">
                        <label>Special Instructions / Access Codes (Optional)</label>
                        <textarea id="specialInstructions" rows="3" placeholder="Gate codes, parking info, hospital room number, patient alertness notes, or special document instructions..."></textarea>
                      </div>
                    </div>
                  </div>

                  <!-- STEP 6: REVIEW (ITEMIZED & BESPOKE BREAKDOWN) -->
                  <div class="task-view" data-step="6">
                    <div class="review-card">
                      <div class="review-row"><span>Selected Service:</span><strong id="revService">General Notary Services</strong></div>
                      <div class="review-row"><span>Service Location:</span><strong id="revLocation">Selected Location</strong></div>
                      <div class="review-row"><span>Driving Distance:</span><strong id="revDistance">-- mi</strong></div>
                      <div class="review-row"><span>Appointment Time:</span><strong id="revTime">Selected Time</strong></div>
                      <div class="review-row"><span>Contact Client:</span><strong id="revClient">Client Name</strong></div>
                      <div class="review-row"><span id="revScopeLabel">Service Scope:</span><strong id="revSignatures">1 Signer / 1 Signature</strong></div>
                      <div class="review-row"><span>Documents Attached:</span><strong id="revUploads">None</strong></div>
                      <div class="review-row"><span>Service Charge:</span><strong id="revServiceFee">$10.00</strong></div>
                      <div class="review-row" id="revAddonsRow"><span>Add-on Services:</span><strong id="revAddonsFee" style="color:var(--purple)">$0.00 (None selected)</strong></div>
                      <div class="review-row"><span>Separate Travel Fee:</span><strong id="revTravelFee">--</strong></div>
                      
                      <div class="review-total-box">
                        <span>Total Estimated Due:</span>
                        <strong id="revTotal">Calculated at Review</strong>
                      </div>
                    </div>
                    <div id="paymentSelectionBox" class="payment-box" style="display:none"></div>
                    <div id="stripeRedirectBox" class="stripe-redirect-notice" style="display:none"></div>
                    <label style="display:flex;align-items:flex-start;gap:12px;font-size:13px;color:#332938;margin-top:16px;cursor:pointer;background:#faf6fd;padding:12px 14px;border:1px solid #d4c7e2">
                      <input type="checkbox" id="chkFeeAgreement" style="margin-top:3px;accent-color:var(--purple);width:16px;height:16px;flex-shrink:0" />
                      <span><strong>Deposit, Travel Fee, Cancellation, Rescheduling &amp; Refund Policy Agreement:</strong> I have reviewed and agree to the separately itemized statutory notarial service charges, optional add-ons, and travel fee pursuant to North Carolina Notary regulations. I acknowledge that a 50% non-refundable deposit (applied directly toward the total cost, with the remaining 50% due at the time of service) is required to officially confirm my appointment, and that deposits are non-refundable for customer cancellations or no-shows where legally permitted (and refunded in full if Direct Mobile Notary &amp; Verification Services cancels the appointment).</span>
                    </label>
                  </div>

                  <!-- STEP 7: CONFIRMATION (CLEAN & DIRECT RECEIPT PRINT) -->
                  <div class="task-view" data-step="7">
                    <div class="confirm-container">
                      <div class="confirm-icon">
                        <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                      </div>
                      <h2 id="confirmHeadingTitle" style="color:var(--purple);margin:0 0 16px;line-height:1.25">Booking Request Submitted!</h2>
                      <div class="confirm-badges-row" style="display:flex;align-items:center;justify-content:center;gap:12px;margin:18px auto 22px;flex-wrap:wrap">
                        <div class="confirm-badge" style="margin:0;display:inline-flex;align-items:center;justify-content:center;min-height:42px;height:42px;box-sizing:border-box">Reference ID: <strong id="confirmRefId" style="margin-left:5px">DMN-XXXX</strong></div>
                        <div id="confirmPaymentSummary" class="confirm-payment-pill" style="display:none;margin:0;min-height:42px;height:42px;box-sizing:border-box"></div>
                      </div>
                      <p id="confirmHeadingDesc" style="color:var(--muted);margin:0 0 22px;font-size:15px;line-height:1.55">Thank you! Your mobile appointment details have been received. Lakechia Sanders will review and contact you promptly.</p>
                      
                      <div id="confirmVerifyingSpinner" style="display:none;margin:24px auto 14px;text-align:center">
                        <div class="dmn-spin" style="display:inline-block;width:38px;height:38px;border:3px solid #eedbf7;border-top:3px solid var(--purple);border-radius:50%"></div>
                        <div style="font-weight:700;font-size:15px;color:var(--purple);margin-top:12px">Verifying payment with Stripe...</div>
                        <div style="font-size:13px;color:var(--muted);margin-top:4px">Please wait a few seconds while we confirm your appointment and generate your receipt.</div>
                        <button type="button" id="btnRetryStripeVerify" style="display:none;margin:16px auto 0;padding:10px 22px;background:var(--purple);color:#ffffff;border:none;font-weight:700;font-size:13.5px;cursor:pointer">Verify Now</button>
                      </div>

                      <div id="confirmActionButtons" style="display:flex;align-items:center;justify-content:center;gap:12px;margin-top:26px;flex-wrap:wrap">
                        <button type="button" class="primary-btn" id="btnBookAnotherDirect" style="min-width:180px;min-height:48px;height:48px;margin:0">Book Another Service</button>
                        <button type="button" class="back-btn show" id="btnPrintReceiptDirect" style="visibility:visible;min-height:48px;height:48px;margin:0">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
                          Print Confirmation Receipt
                        </button>
                        <a id="confirmCallLink" href="tel:8034120170" style="display:inline-flex;align-items:center;justify-content:center;gap:6px;padding:0 20px;min-height:48px;height:48px;border:1px solid #d5ccd9;background:#fff;color:var(--purple);font-weight:700;font-size:14px;text-decoration:none;box-sizing:border-box;margin:0">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z"/></svg>
                          <span id="confirmCallLabel">Call Notary (803) 412-0170</span>
                        </a>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- BOTTOM ACTION BAR -->
                <div class="action-bar" id="bookingActionBar">
                  <button type="button" class="back-btn" id="backBtn">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg>
                    Back
                  </button>
                  <button type="button" class="primary-btn" id="nextBtn">
                    Continue
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
                  </button>
                </div>
              </section>

              <!-- Sticky Side Summary -->
              <aside class="side-rail">
                <div class="summary-card">
                  <div class="summary-head">
                    <b style="font-size:16px;display:flex;align-items:center;gap:8px">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="1" y="4" width="22" height="16"/><line x1="10" y1="10" x2="23" y2="10"/></svg>
                      Booking Summary
                    </b>
                    <span id="sideModePill" class="mode-pill">Instant</span>
                  </div>
                  <div class="summary-item"><span>Service</span><strong id="sumService">General Notary Services</strong></div>
                  <div class="summary-item"><span>Location</span><strong id="sumLocation">Location Pending</strong></div>
                  <div class="summary-item"><span>Distance</span><strong id="sumDistance">-- mi</strong></div>
                  <div class="estimate">
                    <div class="summary-item" style="border:0;padding:4px 0"><span>Service Fee:</span><strong id="sumServiceFee">$10.00</strong></div>
                    <div class="summary-item" id="sideAddonsRow" style="border:0;padding:4px 0;display:none"><span>Add-on Services:</span><strong id="sumAddonsFee" style="color:var(--purple)">$0.00</strong></div>
                    <div id="sideAddonsList" style="display:none;font-size:11.5px;color:var(--muted);padding:2px 0 6px 2px;line-height:1.4"></div>
                    <div class="summary-item" style="border:0;padding:4px 0"><span>Travel Fee:</span><strong id="sumTravelFee">--</strong></div>
                    <div class="estimate-total"><span>Total:</span><span id="sumTotal">$10.00</span></div>
                  </div>
                </div>

                <div style="background:#fff;border:1px solid var(--line);overflow:hidden">
                  <img src="https://images.pexels.com/photos/8730998/pexels-photo-8730998.jpeg?auto=compress&cs=tinysrgb&w=600" alt="Direct Mobile Notary Signing" style="width:100%;height:180px;object-fit:cover;display:block" />
                  <div style="padding:18px">
                    <small style="color:var(--purple);font-weight:800;text-transform:uppercase;font-size:11px;letter-spacing:0.06em">Commissioned Notary Public</small>
                    <b style="display:block;margin-top:4px;font-size:15px;color:#1d1724">Direct Mobile Notary &amp; Verification Services LLC</b>
                    <p style="margin:6px 0 0;font-size:12.5px;color:var(--muted);line-height:1.5">Lakechia Sanders provides trusted, professional mobile notary &amp; verification services across Huntersville, Charlotte, Concord &amp; surrounding NC areas.</p>
                  </div>
                </div>
              </aside>
            </div>
          </div>
        </section>
      </main>

      <div class="toast" id="toast"></div>
    `;

    const $ = s => self.querySelector(s.startsWith('#') || s.startsWith('.') ? s : '#' + s);
    const $$ = s => Array.from(self.querySelectorAll(s));

    this._bootApplication(self, $, $$);
  }

  _bootApplication(hostElement, $, $$) {
    const self = hostElement || this;
    const isQuoteWidget =
      self.widgetMode === 'quote' || self.getAttribute('widget-mode') === 'quote';

    if (isQuoteWidget) {
      if ($('#widgetHeadingTitle') && !self.getAttribute('heading-title')) {
        $('#widgetHeadingTitle').textContent = 'Request a Custom Notary Quote';
      }
      if ($('#widgetHeadingIntro') && !self.getAttribute('intro-subtitle')) {
        $('#widgetHeadingIntro').textContent =
          'Share your document package, signer details, and appointment location for an itemized quote before confirming.';
      }
      if ($('#journeyHeadingText')) {
        $('#journeyHeadingText').textContent = 'Your Quote Request Journey';
      }
      if ($('#confirmHeadingTitle')) {
        $('#confirmHeadingTitle').textContent = 'Quote Request Submitted!';
      }
      if ($('#confirmHeadingDesc')) {
        $('#confirmHeadingDesc').textContent =
          'Thank you! Your quote request details have been received. Lakechia Sanders will review your documents and contact you with an itemized quote.';
      }
      if ($('#btnBookAnotherDirect')) {
        $('#btnBookAnotherDirect').textContent = 'Request Another Quote';
      }
      if ($('#sideModePill')) {
        $('#sideModePill').textContent = 'Quote Review';
        $('#sideModePill').className = 'mode-pill quote';
      }
    }

    let services = [];
    let showHiddenServices = false;
    let uploadedFiles = [];
    let bookingConfig = {
      bookingQuestions: [],
      bookingAddons: [],
      businessHours: [],
      serviceAreas: []
    };

    const todayStr = new Date().toISOString().split('T')[0];

    const earlySearch = getCurrentUrlSearch();
    const earlyParams = earlySearch ? new URLSearchParams(earlySearch) : null;
    const initialStripeSession = earlyParams ? earlyParams.get('dmn_stripe_session') : null;
    const initialStripeRef = earlyParams ? (earlyParams.get('dmn_ref') || '') : '';

    const state = {
      step: initialStripeSession ? 7 : 1,
      cmsStatus: 'loading',
      cmsError: '',
      isSubmitting: Boolean(initialStripeSession),
      service: '',
      signers: 1,
      signatures: 1,
      originAddress: '',
      originShort: '',
      originZip: '',
      originCoords: { lat: 0, lng: 0 },
      tripCalculationMode: 'one-way',
      baseTravelFee: 0,
      baseTravelMiles: 0,
      perMileRate: 0,
      businessName: 'Direct Mobile Notary & Verification Services LLC',
      businessPhone: '(803) 412-0170',
      receiptDisclaimer: '',
      distance: null,
      drive: null,
      travel: null,
      serviceFee: 0,
      addonsFee: 0,
      addonsSummary: 'None',
      addonsList: [],
      addonItems: [],
      totalFee: 0,
      path: 'instant',
      destCoords: null,
      placesApiKey: '',
      stripeEnabled: false,
      paymentChoice: 'stripe',
      paymentStatus: '',
      amountPaid: 0,
      balanceDue: 0,
      paymentPreferenceText: '',
      lockRestoredTotals: false,
      appointmentDate: todayStr,
      appointmentTime: '',
      quoteWindow: 'Afternoon (12 PM – 4 PM)'
    };

    if (initialStripeSession) {
      $$('.task-view').forEach(v => {
        const isStep7 = (Number(v.dataset.step) === 7);
        v.style.display = isStep7 ? 'block' : 'none';
        v.classList.toggle('active', isStep7);
      });
      if ($('#confirmHeadingTitle')) $('#confirmHeadingTitle').textContent = 'Verifying Your Stripe Payment...';
      if ($('#confirmHeadingDesc')) $('#confirmHeadingDesc').textContent = 'Please wait a moment while we verify your 50% deposit and confirm your appointment...';
      if ($('#confirmRefId') && initialStripeRef) $('#confirmRefId').textContent = initialStripeRef;
      if ($('#confirmVerifyingSpinner')) $('#confirmVerifyingSpinner').style.display = 'block';
      if ($('#confirmActionButtons')) $('#confirmActionButtons').style.display = 'none';
      if ($('#confirmPaymentSummary')) $('#confirmPaymentSummary').style.display = 'none';
      if ($('#bookingActionBar')) $('#bookingActionBar').style.display = 'none';
      if ($('#stepCount')) $('#stepCount').textContent = 'Payment Verification';
      if ($('#taskTitle')) $('#taskTitle').textContent = 'Verifying Your Payment...';
      if ($('#taskIntro')) $('#taskIntro').textContent = 'Please wait while we verify your deposit and confirm your appointment.';
      if ($('#journeyStatus')) $('#journeyStatus').textContent = 'Verifying Stripe Payment...';
    }

    let mapInstance = null;
    let markerDest = null;
    let autoCalcTimer = null;
    let isCalculatingRoute = false;
    let googleMapsReadyPromise = null;
    let placesSessionToken = null;
    let placesDropdownItems = [];
    let activeDropdownIndex = -1;
    let placesDebounceTimer = null;

    // Suppress legacy PAC containers
    function cleanupPacContainers() {
      try {
        const pacs = document.querySelectorAll('.pac-container');
        pacs.forEach(pac => {
          pac.style.setProperty('display', 'none', 'important');
        });
      } catch (err) { }
    }

    if ($('#bookDate')) {
      $('#bookDate').min = todayStr;
      if (!$('#bookDate').value) $('#bookDate').value = todayStr;
    }
    if ($('#quoteBookDate')) {
      $('#quoteBookDate').min = todayStr;
      if (!$('#quoteBookDate').value) $('#quoteBookDate').value = todayStr;
    }

    function service() {
      return services.find(x => x.id === state.service) || services[0] || {
        id: '',
        serviceId: '',
        title: state.cmsStatus === 'error' ? 'Unavailable' : 'Pending selection',
        desc: '',
        basePrice: 0,
        pricingModel: 'flat',
        isQuoteOnly: false,
        paymentPolicy: 'full_advance',
        depositAmount: 0,
        mode: 'instant',
        popularLabel: '',
        hiddenByDefault: false,
        img: ''
      };
    }

    function computePaymentBreakdown() {
      const total = Math.round(Math.max(0, Number(state.totalFee || 0)) * 100) / 100;
      const defaultPct = Math.max(0, Math.min(100, Number(state.defaultDepositPercent || 50)));
      if (state.path === 'quote' || !state.stripeEnabled) {
        const quoteDep = Math.round(((total * defaultPct) / 100) * 100) / 100;
        const quoteBal = Math.round(Math.max(0, total - quoteDep) * 100) / 100;
        return {
          policy: 'pay_at_appointment',
          useStripe: false,
          dueNow: 0,
          depositEstimate: quoteDep,
          balanceDue: quoteBal,
          depositPercent: defaultPct,
          isDeposit: true,
          canChoose: false,
        };
      }
      const s = service();
      const policy =
        s.paymentPolicy === 'deposit_fixed' || s.paymentPolicy === 'pay_at_appointment'
          ? s.paymentPolicy
          : 'deposit_percent';
      const dep =
        policy === 'deposit_percent'
          ? Number(s.depositAmount) > 0 && s.paymentPolicy === 'deposit_percent'
            ? Number(s.depositAmount)
            : defaultPct
          : Math.max(0, Number(s.depositAmount || 0));

      if (policy === 'pay_at_appointment') {
        return {
          policy,
          useStripe: false,
          dueNow: 0,
          balanceDue: total,
          depositPercent: defaultPct,
          isDeposit: false,
          canChoose: false,
        };
      }
      if (policy === 'deposit_fixed') {
        const due = Math.round(Math.min(total, dep) * 100) / 100;
        const bal = Math.round(Math.max(0, total - due) * 100) / 100;
        return {
          policy,
          useStripe: due >= 0.5,
          dueNow: due,
          balanceDue: bal,
          depositPercent: defaultPct,
          isDeposit: bal > 0,
          canChoose: false,
        };
      }

      const pct = Math.min(100, dep || defaultPct);
      const due = Math.round(((total * pct) / 100) * 100) / 100;
      const bal = Math.round(Math.max(0, total - due) * 100) / 100;
      return {
        policy: 'deposit_percent',
        useStripe: due >= 0.5,
        dueNow: due,
        balanceDue: bal,
        depositPercent: pct,
        isDeposit: bal > 0,
        canChoose: false,
      };
    }

    function updateReviewSubmitButton() {
      const nextBtn = $('#nextBtn');
      if (!nextBtn || state.step !== 6) return;
      if (state.path === 'quote') {
        nextBtn.innerHTML = `Submit Quote Request <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>`;
        return;
      }
      const pay = computePaymentBreakdown();
      if (pay.useStripe) {
        const pctTag = pay.depositPercent ? `${pay.depositPercent}% ` : '';
        const label = pay.isDeposit
          ? `Pay $${pay.dueNow.toFixed(2)} (${pctTag}Deposit) & Confirm`
          : `Pay $${pay.dueNow.toFixed(2)} via Stripe & Confirm`;
        nextBtn.innerHTML = `${label} <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"/></svg>`;
      } else {
        nextBtn.innerHTML = `Submit Booking Request <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>`;
      }
    }

    function renderPaymentOptions() {
      const box = $('#paymentSelectionBox');
      if (!box) return;
      const pay = computePaymentBreakdown();
      const pct = pay.depositPercent || 50;
      const policyNote = escapeHtml(
        state.depositPolicyText ||
        `A ${pct}% non-refundable deposit is required to secure and officially confirm your appointment (subject to North Carolina notary fee regulations) and is applied directly toward your total service cost. The remaining ${100 - pct}% balance is due at the time of service. Deposits are non-refundable for customer cancellations or no-shows where legally permitted. If Direct Mobile Notary & Verification Services cancels the appointment, your deposit will be refunded in full.`
      );

      if (state.path === 'quote') {
        box.style.display = 'block';
        box.innerHTML = `
          <div class="payment-box-title">
            <b>${pct}% Non-Refundable Deposit &amp; Quote Approval Policy</b>
            <span class="stripe-pill">Custom Quote Review</span>
          </div>
          <p style="margin:0 0 10px;font-size:13px;color:var(--muted);line-height:1.55">${policyNote}</p>
          <div class="payment-due-row">
            <span>Estimated ${pct}% Deposit (Due Upon Quote Approval):</span>
            <strong style="color:var(--purple)">$${Number(pay.depositEstimate || 0).toFixed(2)}</strong>
          </div>
          <div class="payment-due-row" style="border-top:none;padding-top:4px;margin-top:0">
            <span>Estimated Remaining ${100 - pct}% Due at Time of Service:</span>
            <strong>$${Number(pay.balanceDue || 0).toFixed(2)}</strong>
          </div>
        `;
        updateReviewSubmitButton();
        return;
      }

      if (!state.stripeEnabled || pay.policy === 'pay_at_appointment') {
        box.style.display = 'block';
        box.innerHTML = `
          <div class="payment-box-title">
            <b>${pct}% Non-Refundable Deposit &amp; Payment Policy</b>
            <span class="stripe-pill">Deposit Required to Confirm</span>
          </div>
          <p style="margin:0;font-size:13px;color:var(--muted);line-height:1.55">${policyNote}</p>
        `;
        updateReviewSubmitButton();
        return;
      }

      box.style.display = 'block';
      box.innerHTML = `
        <div class="payment-box-title">
          <b>${pay.isDeposit ? `${pct}% Non-Refundable Deposit Required to Confirm` : 'Advance Payment Required'}</b>
          <span class="stripe-pill">Stripe Secure Checkout · Card / Apple Pay / Google Pay</span>
        </div>
        <p style="margin:0 0 10px;font-size:13px;color:var(--muted);line-height:1.55">${policyNote}</p>
        <div class="payment-due-row">
          <span>Total Service Cost (incl. Travel &amp; Add-ons):</span>
          <strong>$${Number(state.totalFee || 0).toFixed(2)}</strong>
        </div>
        <div class="payment-due-row" style="border-top:none;padding-top:4px;margin-top:0">
          <span>${pct}% Non-Refundable Deposit Due Now via Stripe:</span>
          <strong style="color:var(--purple);font-size:15px">$${pay.dueNow.toFixed(2)}</strong>
        </div>
        ${pay.balanceDue > 0 ? `
          <div class="payment-due-row" style="border-top:none;padding-top:4px;margin-top:0">
            <span>Remaining ${100 - pct}% Balance Due at Time of Service:</span>
            <strong>$${pay.balanceDue.toFixed(2)}</strong>
          </div>
        ` : ''}
      `;
      updateReviewSubmitButton();
    }

    function getReturnPageUrl() {
      try {
        if (window.top && window.top.location && window.top.location.href) {
          return window.top.location.href;
        }
      } catch (e) { }
      return document.referrer || window.location.href;
    }

    function getCurrentUrlSearch() {
      try {
        if (window.top && window.top.location && typeof window.top.location.search === 'string') {
          return window.top.location.search;
        }
      } catch (e) { }
      return window.location.search || '';
    }

    function clearStripeParamsFromUrl() {
      try {
        const targetWin = (window.top && window.top.location && window.top.history) ? window.top : window;
        const url = new URL(targetWin.location.href);
        url.searchParams.delete('dmn_stripe_session');
        url.searchParams.delete('dmn_stripe_cancel');
        url.searchParams.delete('dmn_ref');
        targetWin.history.replaceState({}, '', url.toString());
      } catch (e) { }
    }

    function savePendingStripeState(bookingData) {
      const snapshot = {
        bookingData,
        savedAt: Date.now(),
        uiState: {
          service: state.service,
          serviceTitle: service().title,
          signers: state.signers,
          signatures: state.signatures,
          distance: state.distance,
          drive: state.drive,
          travel: state.travel,
          serviceFee: state.serviceFee,
          addonsFee: state.addonsFee,
          addonsSummary: state.addonsSummary,
          totalFee: state.totalFee,
          paymentChoice: state.paymentChoice,
          appointmentDate: bookingData.appointmentDate,
          appointmentTime: bookingData.appointmentTime,
          address: ($('#address')?.value || '').trim(),
          city: ($('#city')?.value || '').trim(),
          zip: ($('#zip')?.value || '').trim(),
          locationType: ($('#locationType')?.value || 'Home / Residence'),
          customerName: bookingData.clientName,
          customerPhone: bookingData.clientPhone,
          customerEmail: bookingData.clientEmail,
          specialInstructions: bookingData.specialInstructions,
          checkedAddonIds: Array.from(self.querySelectorAll('[data-cms-addon]:checked')).map(el => el.getAttribute('data-cms-addon')).filter(Boolean),
          cmsAnswers: Array.from(self.querySelectorAll('[data-cms-question]')).map(el => ({
            key: el.getAttribute('data-cms-question'),
            value: el.type === 'checkbox' ? Boolean(el.checked) : el.value,
          })),
        },
      };
      const raw = JSON.stringify(snapshot);
      try { window.localStorage.setItem(`dmn_pending_stripe_${bookingData.bookingRef}`, raw); } catch (e) { }
      try { window.localStorage.setItem('dmn_pending_stripe_latest', raw); } catch (e) { }
      try { window.sessionStorage.setItem('dmn_pending_stripe_latest', raw); } catch (e) { }
    }

    function loadPendingStripeState(ref) {
      const keys = ref ? [`dmn_pending_stripe_${ref}`, 'dmn_pending_stripe_latest'] : ['dmn_pending_stripe_latest'];
      for (const k of keys) {
        try {
          const raw = window.localStorage.getItem(k) || window.sessionStorage.getItem(k);
          if (raw) return JSON.parse(raw);
        } catch (e) { }
      }
      return null;
    }

    function clearPendingStripeState(ref) {
      try {
        if (ref) window.localStorage.removeItem(`dmn_pending_stripe_${ref}`);
        window.localStorage.removeItem('dmn_pending_stripe_latest');
        window.sessionStorage.removeItem('dmn_pending_stripe_latest');
      } catch (e) { }
    }

    function restoreStripeSnapshotToForm(snapshot) {
      if (!snapshot || !snapshot.uiState) return;
      const u = snapshot.uiState;
      if (u.service && services.some(s => s.id === u.service)) {
        state.service = u.service;
        renderServices();
        configureStep3Visibility();
        renderDynamicBox();
      }
      if (Array.isArray(u.cmsAnswers)) {
        u.cmsAnswers.forEach(ans => {
          if (!ans || !ans.key) return;
          const el = self.querySelector(`[data-cms-question="${ans.key}"]`);
          if (!el) return;
          if (el.type === 'checkbox') el.checked = Boolean(ans.value);
          else el.value = String(ans.value ?? '');
        });
      }
      if (Array.isArray(u.checkedAddonIds)) {
        const set = new Set(u.checkedAddonIds);
        self.querySelectorAll('[data-cms-addon]').forEach(cb => {
          const id = cb.getAttribute('data-cms-addon');
          cb.checked = Boolean(id && set.has(id));
          cb.closest('.cms-addon')?.classList.toggle('is-selected', cb.checked);
        });
      }
      if (u.signers) state.signers = Number(u.signers);
      if (u.signatures) state.signatures = Number(u.signatures);
      if (u.distance != null) state.distance = Number(u.distance);
      if (u.drive != null) state.drive = Number(u.drive);
      if (u.travel != null) state.travel = Number(u.travel);
      if (u.serviceFee != null) state.serviceFee = Number(u.serviceFee);
      if (u.addonsFee != null) state.addonsFee = Number(u.addonsFee);
      if (u.addonsSummary) state.addonsSummary = u.addonsSummary;
      if (u.totalFee != null) state.totalFee = Number(u.totalFee);
      if (u.paymentChoice) state.paymentChoice = u.paymentChoice;
      if (u.appointmentDate && $('#bookDate')) $('#bookDate').value = u.appointmentDate;
      if (u.appointmentTime) {
        state.appointmentTime = u.appointmentTime;
        if ($('#bookTime')) $('#bookTime').value = u.appointmentTime;
      }
      if (u.address && $('#address')) $('#address').value = u.address;
      if (u.city && $('#city')) $('#city').value = u.city;
      if (u.zip && $('#zip')) $('#zip').value = u.zip;
      if (u.locationType && $('#locationType')) $('#locationType').value = u.locationType;
      if (u.customerName && $('#customerName')) $('#customerName').value = u.customerName;
      if (u.customerPhone && $('#customerPhone')) $('#customerPhone').value = u.customerPhone;
      if (u.customerEmail && $('#customerEmail')) $('#customerEmail').value = u.customerEmail;
      if (u.specialInstructions && $('#specialInstructions')) $('#specialInstructions').value = u.specialInstructions;
      if ($('#chkFeeAgreement')) $('#chkFeeAgreement').checked = true;
    }

    function handleStripeReturnIfNeeded() {
      if (self._stripeReturnHandled) return;
      const search = getCurrentUrlSearch();
      if (!search) return;
      const params = new URLSearchParams(search);
      const sessionId = params.get('dmn_stripe_session');
      const cancelled = params.get('dmn_stripe_cancel');
      const refParam = params.get('dmn_ref') || '';

      if (!sessionId && !cancelled) return;
      self._stripeReturnHandled = true;
      clearStripeParamsFromUrl();

      const snapshot = loadPendingStripeState(refParam);
      if (snapshot) {
        restoreStripeSnapshotToForm(snapshot);
      }

      if (cancelled) {
        state.step = 1;
        goTo(6, true);
        toast('Stripe checkout was cancelled. You can retry payment or pick another option.');
        return;
      }

      if (sessionId) {
        state.lockRestoredTotals = true;
        state.isSubmitting = true;
        goTo(7, true);
        const refId = refParam || snapshot?.bookingData?.bookingRef || '';
        if ($('#confirmRefId') && refId) {
          $('#confirmRefId').textContent = refId;
        }
        if ($('#confirmHeadingTitle')) {
          $('#confirmHeadingTitle').textContent = 'Verifying Your Stripe Payment...';
        }
        if ($('#confirmHeadingDesc')) {
          $('#confirmHeadingDesc').textContent = 'Please wait a moment while we verify your 50% deposit and confirm your appointment...';
        }
        if ($('#confirmVerifyingSpinner')) $('#confirmVerifyingSpinner').style.display = 'block';
        if ($('#confirmActionButtons')) $('#confirmActionButtons').style.display = 'none';
        if ($('#confirmPaymentSummary')) $('#confirmPaymentSummary').style.display = 'none';
        if ($('#bookingActionBar')) $('#bookingActionBar').style.display = 'none';

        const banner = $('#cmsStatusBanner');
        if (banner) {
          banner.style.display = 'block';
          banner.textContent = 'Verifying your Stripe payment and confirming your appointment...';
        }
        toast('Verifying your Stripe payment...');

        const dispatchComplete = () => {
          self.dispatchEvent(new CustomEvent('requestStripeComplete', {
            detail: {
              sessionId,
              bookingData: snapshot?.bookingData || { bookingRef: refParam },
            },
            bubbles: true,
            composed: true,
          }));
        };

        dispatchComplete();
        setTimeout(dispatchComplete, 120);
        setTimeout(dispatchComplete, 600);

        setTimeout(() => {
          if (state.isSubmitting && $('#btnRetryStripeVerify')) {
            $('#btnRetryStripeVerify').style.display = 'inline-block';
          }
        }, 5000);

        $('#btnRetryStripeVerify')?.addEventListener('click', (e) => {
          e.preventDefault();
          toast('Verifying payment with Stripe...');
          dispatchComplete();
        });
      }
    }

    function toast(msg) {
      const t = $('#toast');
      if (!t) return;
      t.textContent = msg;
      t.classList.add('show');
      clearTimeout(window.__dmnToastTimeout);
      window.__dmnToastTimeout = setTimeout(() => t.classList.remove('show'), 3200);
    }

    function decodeGooglePolyline(encoded) {
      if (!encoded) return [];
      const poly = [];
      let index = 0, len = encoded.length;
      let lat = 0, lng = 0;
      while (index < len) {
        let b, shift = 0, result = 0;
        do {
          b = encoded.charCodeAt(index++) - 63;
          result |= (b & 0x1f) << shift;
          shift += 5;
        } while (b >= 0x20);
        const dlat = ((result & 1) !== 0 ? ~(result >> 1) : (result >> 1));
        lat += dlat;
        shift = 0; result = 0;
        do {
          b = encoded.charCodeAt(index++) - 63;
          result |= (b & 0x1f) << shift;
          shift += 5;
        } while (b >= 0x20);
        const dlng = ((result & 1) !== 0 ? ~(result >> 1) : (result >> 1));
        lng += dlng;
        poly.push([lat / 1e5, lng / 1e5]);
      }
      return poly;
    }

    function calculateTravelFee(miles) {
      if (miles == null || isNaN(miles)) return 0;
      const includedMiles = Math.max(0, Number(state.baseTravelMiles ?? 0));
      const excess = Math.max(0, miles - includedMiles);
      const fee = state.baseTravelFee + (excess * state.perMileRate);
      return Math.round(fee * 100) / 100;
    }

    function createMapPin(label) {
      const L = window.L;
      if (!L) return null;
      return L.divIcon({
        className: 'dmn-map-marker',
        html: `
          <div class="dmn-pin-wrap">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
            <span>${label}</span>
          </div>
        `,
        iconSize: [0, 0],
        iconAnchor: [0, 0]
      });
    }

    function initPlacesAutocomplete(apiKey) {
      if (!apiKey) {
        console.warn('[Google Places API]: No API Key received in site-config. Autocomplete requires "GOOGLE_PLACES_API_KEY" or "GOOGLE_MAPS_API_KEY" in Wix Secrets Manager or OwnerSettings.');
        return;
      }
      state.placesApiKey = apiKey;
      console.log('[Google Places API]: API Key configured. Initializing Places library (Places API New)...');

      // 0. Intercept and suppress legacy modal popup error
      window.gm_authFailure = function () {
        console.warn('[Google Places API]: Legacy auth notice intercepted. Modern Places API (New) active.');
      };

      if (!googleMapsReadyPromise) {
        googleMapsReadyPromise = new Promise((resolve, reject) => {
          if (window.google?.maps?.importLibrary) {
            resolve(window.google);
            return;
          }
          const existing = document.getElementById('dmn-google-places-js');
          if (existing) {
            existing.addEventListener('load', () => resolve(window.google));
            existing.addEventListener('error', (e) => reject(e));
            if (window.google?.maps) resolve(window.google);
            return;
          }
          const script = document.createElement('script');
          script.id = 'dmn-google-places-js';
          script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&libraries=places&loading=async&v=weekly`;
          script.async = true;
          script.onload = () => {
            console.log('[Google Places API]: Modern Maps script loaded successfully.');
            resolve(window.google);
          };
          script.onerror = (e) => {
            console.error('[Google Places API]: Failed to load Google Maps script from maps.googleapis.com:', e);
            reject(e);
          };
          document.head.appendChild(script);
        });
      }

      attachPlacesSearch();
    }

    function attachPlacesSearch() {
      const addressInput = $('#address');
      if (!addressInput) return;

      let dropdown = $('#dmnPlacesDropdown');
      if (!dropdown) {
        dropdown = document.createElement('div');
        dropdown.id = 'dmnPlacesDropdown';
        dropdown.className = 'dmn-places-dropdown';
        const shell = addressInput.closest('.places-search-shell') || addressInput.closest('.big-input')?.parentElement || addressInput.parentElement;
        if (shell) {
          shell.style.position = 'relative';
          shell.appendChild(dropdown);
        }
      }

      if (addressInput._placesBound) return;
      addressInput._placesBound = true;
      console.log('[Google Places Search]: Places search bound to address input.');

      // Real-time Places API (New) autocomplete query
      addressInput.addEventListener('input', (e) => {
        const query = (e.target.value || '').trim();
        clearTimeout(placesDebounceTimer);
        activeDropdownIndex = -1;

        if (query.length < 2) {
          hidePlacesDropdown();
          return;
        }

        placesDebounceTimer = setTimeout(() => {
          fetchAndShowSuggestions(query);
        }, 180);
      });

      // Keyboard navigation (ArrowDown, ArrowUp, Enter, Escape)
      addressInput.addEventListener('keydown', (e) => {
        if (!dropdown.classList.contains('show')) return;
        const items = dropdown.querySelectorAll('.dmn-place-item');
        if (!items.length) return;

        if (e.key === 'ArrowDown') {
          e.preventDefault();
          activeDropdownIndex = (activeDropdownIndex + 1) % items.length;
          updateActiveDropdownItem(items);
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          activeDropdownIndex = (activeDropdownIndex - 1 + items.length) % items.length;
          updateActiveDropdownItem(items);
        } else if (e.key === 'Enter') {
          if (activeDropdownIndex >= 0 && activeDropdownIndex < placesDropdownItems.length) {
            e.preventDefault();
            selectPlaceSuggestion(placesDropdownItems[activeDropdownIndex]);
          }
        } else if (e.key === 'Escape') {
          hidePlacesDropdown();
        }
      });

      // Close dropdown when clicking outside
      document.addEventListener('click', (e) => {
        if (!e.target.closest('.places-search-shell')) {
          hidePlacesDropdown();
        }
      });
    }

    async function fetchAndShowSuggestions(query) {
      let dropdown = $('#dmnPlacesDropdown');
      if (!dropdown) {
        const addressInput = $('#address');
        if (!addressInput) return;
        dropdown = document.createElement('div');
        dropdown.id = 'dmnPlacesDropdown';
        dropdown.className = 'dmn-places-dropdown';
        const shell = addressInput.closest('.places-search-shell') || addressInput.closest('.big-input')?.parentElement || addressInput.parentElement;
        if (shell) {
          shell.style.position = 'relative';
          shell.appendChild(dropdown);
        }
      }

      console.log('[Google Places Search]: Fetching suggestions for: "' + query + '"');

      try {
        if (!window.google?.maps?.importLibrary) {
          if (googleMapsReadyPromise) await googleMapsReadyPromise;
        }

        let placesLib = null;
        if (window.google?.maps?.importLibrary) {
          placesLib = await window.google.maps.importLibrary('places');
        } else if (window.google?.maps?.places) {
          placesLib = window.google.maps.places;
        }

        if (!placesLib) {
          console.warn('[Google Places Search]: Google Maps Places library not ready.');
          return;
        }

        let suggestions = [];

        // Modern Places API (New): AutocompleteSuggestion
        if (placesLib.AutocompleteSuggestion && typeof placesLib.AutocompleteSuggestion.fetchAutocompleteSuggestions === 'function') {
          try {
            if (!placesSessionToken && placesLib.AutocompleteSessionToken) {
              placesSessionToken = new placesLib.AutocompleteSessionToken();
            }

            const req = {
              input: query,
              includedRegionCodes: ['us']
            };
            if (placesSessionToken) req.sessionToken = placesSessionToken;

            const res = await placesLib.AutocompleteSuggestion.fetchAutocompleteSuggestions(req);
            suggestions = res?.suggestions || [];
            console.log('[Google Places Search]: AutocompleteSuggestion returned ' + suggestions.length + ' results.');
          } catch (autoErr) {
            console.warn('[Google Places Search]: AutocompleteSuggestion notice:', autoErr);
          }
        }

        if (suggestions.length > 0) {
          renderPlacesDropdown(suggestions);
          return;
        }

        // Fallback: AutocompleteService
        if (placesLib.AutocompleteService) {
          try {
            const service = new placesLib.AutocompleteService();
            service.getPlacePredictions({ input: query, componentRestrictions: { country: 'us' } }, (preds, status) => {
              console.log('[Google Places Search]: AutocompleteService fallback returned ' + (preds ? preds.length : 0) + ' results (status: ' + status + ')');
              if (preds && preds.length > 0) {
                renderLegacyDropdown(preds);
              } else {
                hidePlacesDropdown();
              }
            });
            return;
          } catch (servErr) {
            console.warn('[Google Places Search]: AutocompleteService error:', servErr);
          }
        }

        hidePlacesDropdown();
      } catch (err) {
        console.warn('[Google Places Search Notice]:', err);
        hidePlacesDropdown();
      }
    }

    function renderPlacesDropdown(suggestions) {
      const dropdown = $('#dmnPlacesDropdown');
      if (!dropdown) return;

      if (!suggestions || suggestions.length === 0) {
        hidePlacesDropdown();
        return;
      }

      placesDropdownItems = suggestions;
      activeDropdownIndex = -1;

      // Prevent input from losing focus when clicking inside dropdown
      dropdown.onpointerdown = (e) => e.preventDefault();
      dropdown.onmousedown = (e) => e.preventDefault();

      dropdown.innerHTML = suggestions.map((s, idx) => {
        const pred = s.placePrediction;
        let main = pred?.structuredFormat?.mainText?.text || '';
        let sub = pred?.structuredFormat?.secondaryText?.text || '';

        if (!main) {
          const full = pred?.text?.text || pred?.description || '';
          const parts = full.split(',');
          main = parts[0] ? parts[0].trim() : full;
          sub = parts.slice(1).join(',').trim();
        }

        return `
          <div class="dmn-place-item" data-idx="${idx}" role="button" tabindex="0">
            <div class="dmn-place-icon-box">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#4b247a" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/>
              </svg>
            </div>
            <div class="dmn-place-text">
              <div class="dmn-place-main">${escapeHtml(main)}</div>
              ${sub ? `<div class="dmn-place-sub">${escapeHtml(sub)}</div>` : ''}
            </div>
          </div>
        `;
      }).join('');

      dropdown.querySelectorAll('.dmn-place-item').forEach(item => {
        const handleSelect = (e) => {
          e.preventDefault();
          e.stopPropagation();
          const idx = parseInt(item.getAttribute('data-idx'), 10);
          if (!isNaN(idx) && placesDropdownItems[idx]) {
            selectPlaceSuggestion(placesDropdownItems[idx]);
          }
        };

        item.addEventListener('pointerdown', handleSelect);
        item.addEventListener('mousedown', handleSelect);
        item.addEventListener('click', handleSelect);
      });

      dropdown.classList.add('show');
    }

    function renderLegacyDropdown(preds) {
      renderPlacesDropdown(preds.map(p => ({
        placePrediction: {
          text: { text: p.description },
          structuredFormat: {
            mainText: { text: p.structured_formatting?.main_text || p.description },
            secondaryText: { text: p.structured_formatting?.secondary_text || '' }
          },
          toPlace: null,
          description: p.description
        }
      })));
    }

    function hidePlacesDropdown() {
      const dropdown = $('#dmnPlacesDropdown');
      if (dropdown) {
        dropdown.classList.remove('show');
        dropdown.innerHTML = '';
      }
      placesDropdownItems = [];
      activeDropdownIndex = -1;
    }

    function updateActiveDropdownItem(items) {
      items.forEach((it, idx) => {
        if (idx === activeDropdownIndex) {
          it.classList.add('active');
          it.scrollIntoView({ block: 'nearest' });
        } else {
          it.classList.remove('active');
        }
      });
    }

    async function selectPlaceSuggestion(suggestion) {
      hidePlacesDropdown();
      const addressInput = $('#address');
      if (!suggestion || !suggestion.placePrediction) return;

      try {
        const pred = suggestion.placePrediction;
        const place = typeof pred.toPlace === 'function' ? pred.toPlace() : null;

        if (place && typeof place.fetchFields === 'function') {
          await place.fetchFields({
            fields: ['displayName', 'formattedAddress', 'location', 'addressComponents']
          });

          // Reset session token for next search
          placesSessionToken = null;

          let streetNumber = '', route = '', city = '', zip = '';
          if (Array.isArray(place.addressComponents)) {
            for (const comp of place.addressComponents) {
              const types = comp.types || [];
              const val = comp.longText || comp.long_name || comp.shortText || comp.short_name || '';
              if (types.includes('street_number')) streetNumber = val;
              else if (types.includes('route')) route = val;
              else if (types.includes('locality') || types.includes('sublocality')) city = val;
              else if (types.includes('postal_code')) zip = val;
            }
          }

          let street = [streetNumber, route].filter(Boolean).join(' ');
          if (!street) {
            street = place.displayName || (place.formattedAddress ? place.formattedAddress.split(',')[0].trim() : '') || (pred.text?.text || '');
          }
          if (addressInput) addressInput.value = street;
          if (city && $('#city')) $('#city').value = city;
          if (zip && $('#zip')) $('#zip').value = zip;

          if (place.location) {
            state.destCoords = {
              lat: typeof place.location.lat === 'function' ? place.location.lat() : Number(place.location.lat),
              lng: typeof place.location.lng === 'function' ? place.location.lng() : Number(place.location.lng)
            };
          }

          const displayCity = city || ($('#city')?.value || '').trim();
          const displayZip = zip || ($('#zip')?.value || '').trim();
          if ($('#destAddressBanner')) {
            $('#destAddressBanner').textContent = [displayCity, displayZip ? `(${displayZip})` : ''].filter(Boolean).join(' ') || 'Appointment Location';
          }

          renderMapRoute();
          requestGoogleRoutesCalculation();
        } else {
          const fullText = pred.text?.text || pred.description || '';
          const parts = fullText.split(',');
          if (addressInput) addressInput.value = parts[0] ? parts[0].trim() : fullText;
          if (parts.length > 1 && $('#city') && !$('#city').value) {
            $('#city').value = parts[1].trim();
          }
          requestGoogleRoutesCalculation();
        }
      } catch (err) {
        console.warn('[Place Select notice]:', err);
        requestGoogleRoutesCalculation();
      }
    }

    function setupRouteMap() {
      const L = window.L;
      if (!L) {
        const script = document.getElementById('dmn-leaflet-js');
        if (script) script.addEventListener('load', () => setupRouteMap());
        return;
      }
      const mapEl = $('#clientRouteMap');
      if (!mapEl) return;

      if (!mapInstance) {
        try {
          const initialLat = state.destCoords ? state.destCoords.lat : (state.originCoords.lat || 35.4107);
          const initialLng = state.destCoords ? state.destCoords.lng : (state.originCoords.lng || -80.8428);
          mapInstance = L.map(mapEl, { zoomControl: true, scrollWheelZoom: false }).setView([initialLat, initialLng], 12);
          L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
            attribution: '&copy; OpenStreetMap contributors'
          }).addTo(mapInstance);
        } catch (mErr) {
          console.warn('[Map setup notice]:', mErr);
        }
      }

      if (mapInstance) {
        setTimeout(() => {
          mapInstance.invalidateSize();
          renderMapRoute();
        }, 150);
      }
    }

    function renderMapRoute() {
      const L = window.L;
      if (!L || !mapInstance) return;

      const currentCity = ($('#city')?.value || '').trim();
      const currentZip = ($('#zip')?.value || '').trim();
      const currentAddr = ($('#address')?.value || '').trim();

      let destLat = state.destCoords ? state.destCoords.lat : null;
      let destLng = state.destCoords ? state.destCoords.lng : null;

      if (destLat != null && destLng != null) {
        const destLabel = [currentCity, currentZip ? `(${currentZip})` : ''].filter(Boolean).join(' ') || currentAddr || 'Appointment Location';
        const pinIcon = createMapPin(destLabel);

        if (!markerDest) {
          markerDest = L.marker([destLat, destLng], { icon: pinIcon }).addTo(mapInstance);
        } else {
          markerDest.setLatLng([destLat, destLng]).setIcon(pinIcon);
        }
        mapInstance.setView([destLat, destLng], 14);
      } else {
        if (markerDest) {
          mapInstance.removeLayer(markerDest);
          markerDest = null;
        }
        mapInstance.setView([state.originCoords.lat || 35.4107, state.originCoords.lng || -80.8428], 11);
      }
    }

    function requestGoogleRoutesCalculation() {
      const addr = ($('#address')?.value || '').trim();
      const city = ($('#city')?.value || '').trim();
      const zip = ($('#zip')?.value || '').trim();

      if (!addr) return;

      if (isCalculatingRoute) return;
      isCalculatingRoute = true;

      const calcBtn = $('#btnCalculateRoute');
      if (calcBtn) {
        calcBtn.classList.add('is-calculating');
        calcBtn.innerHTML = `
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="dmn-spin"><circle cx="12" cy="12" r="10" stroke-opacity="0.25"/><path d="M12 2a10 10 0 0 1 10 10"/></svg>
          Calculating...
        `;
      }

      const combined = [addr, city, zip].filter(Boolean).join(', ');
      const fullDest = /,\s*[A-Z]{2}\b/i.test(combined) ? combined : `${combined}, NC`;

      const badge = $('#routeSyncBadge');
      if (badge) {
        badge.textContent = 'Calculating driving route...';
        badge.style.color = '#7c3aed';
      }

      self.dispatchEvent(new CustomEvent('requestDistanceCalc', {
        detail: { destination: fullDest },
        bubbles: true,
        composed: true
      }));

      setTimeout(() => {
        isCalculatingRoute = false;
        resetCalcButton();
      }, 8000);
    }

    function resetCalcButton() {
      const calcBtn = $('#btnCalculateRoute');
      if (calcBtn) {
        calcBtn.classList.remove('is-calculating');
        calcBtn.innerHTML = `
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="3 11 22 2 13 21 11 13 3 11"/></svg>
          Calculate
        `;
      }
    }

    self._onDistanceResult = function (res) {
      isCalculatingRoute = false;
      resetCalcButton();
      const badge = $('#routeSyncBadge');
      const rawMiles = res ? (res.distanceMiles ?? res.miles) : null;
      const rawMins = res ? (res.durationMinutes ?? res.minutes) : null;

      if (res && res.success && rawMiles != null) {
        state.distance = Number(rawMiles);
        state.drive = Number(rawMins || 0);
        if (res.tripCalculationMode) state.tripCalculationMode = res.tripCalculationMode;
        state.travel = res.travelFee != null ? Number(res.travelFee) : calculateTravelFee(state.distance);

        if (!state.destCoords && res.encodedPolyline) {
          const pts = decodeGooglePolyline(res.encodedPolyline);
          if (pts && pts.length > 0) {
            const destPt = pts[pts.length - 1];
            state.destCoords = { lat: destPt[0], lng: destPt[1] };
          }
        }

        const modeNote = state.tripCalculationMode === 'round-trip' ? ' round-trip' : '';
        if (badge) {
          badge.textContent = `Calculated: ${state.distance} mi${modeNote} (${state.drive} min)`;
          badge.style.color = 'var(--success)';
        }

        const city = ($('#city')?.value || '').trim();
        const zip = ($('#zip')?.value || '').trim();
        if ($('#destAddressBanner')) {
          $('#destAddressBanner').textContent = [city, zip ? `(${zip})` : ''].filter(Boolean).join(' ') || 'Appointment Location';
        }

        updateSummary();
        renderMapRoute();
        toast(`Distance calculated: ${state.distance} mi${modeNote} (${state.drive} min drive)`);
      } else {
        const errMsg = res ? (res.error || 'Address not found on Google Routes') : 'Error calculating distance';
        if (badge) {
          badge.textContent = `${errMsg}`;
          badge.style.color = 'var(--danger)';
        }
      }
    };

    self._onStripeCheckoutResult = function (res) {
      const nextBtn = $('#nextBtn');
      const redirBox = $('#stripeRedirectBox');
      if (res && res.success && res.checkoutUrl) {
        if (redirBox) {
          redirBox.style.display = 'block';
          redirBox.innerHTML = `Redirecting to secure Stripe Checkout... <a href="${escapeHtml(res.checkoutUrl)}" target="_top" style="font-weight:700;color:var(--purple);text-decoration:underline;margin-left:6px">Click here if not redirected</a>`;
        }
        try {
          if (window.top && window.top.location) {
            window.top.location.href = res.checkoutUrl;
            return;
          }
        } catch (e) { }
        window.location.href = res.checkoutUrl;
        return;
      }

      state.isSubmitting = false;
      if (nextBtn) {
        nextBtn.disabled = false;
        updateReviewSubmitButton();
      }
      toast(`Stripe Checkout error: ${res?.error || 'Unable to start payment session.'}`);
    };

    self._onSubmissionStatus = function (statusData) {
      state.isSubmitting = false;
      const nextBtn = $('#nextBtn');
      if (nextBtn) nextBtn.disabled = false;
      if ($('#cmsStatusBanner')) $('#cmsStatusBanner').style.display = 'none';

      if (statusData && statusData.success) {
        if ($('#confirmVerifyingSpinner')) $('#confirmVerifyingSpinner').style.display = 'none';
        if ($('#confirmActionButtons')) $('#confirmActionButtons').style.display = 'flex';
        if ($('#confirmRefId') && statusData.bookingRef) {
          $('#confirmRefId').textContent = statusData.bookingRef;
        }
        if (statusData.paymentStatus) state.paymentStatus = statusData.paymentStatus;
        if (statusData.amountPaid != null) state.amountPaid = Number(statusData.amountPaid);
        if (statusData.balanceDue != null) state.balanceDue = Number(statusData.balanceDue);
        if (statusData.paymentPreference) state.paymentPreferenceText = statusData.paymentPreference;

        const payPill = $('#confirmPaymentSummary');
        if (statusData.stripeCompleted) {
          clearPendingStripeState(statusData.bookingRef);
          if ($('#confirmHeadingTitle')) {
            $('#confirmHeadingTitle').textContent =
              state.balanceDue > 0 ? '50% Deposit Paid & Appointment Confirmed!' : 'Payment Confirmed & Appointment Booked!';
          }
          if ($('#confirmHeadingDesc')) {
            $('#confirmHeadingDesc').textContent =
              state.balanceDue > 0
                ? `Thank you! Your non-refundable Stripe deposit of $${state.amountPaid.toFixed(2)} has been received and your appointment is officially confirmed. Your remaining balance of $${state.balanceDue.toFixed(2)} is due at the time of service.`
                : `Thank you! Your Stripe payment of $${state.amountPaid.toFixed(2)} has been confirmed and your appointment is officially scheduled.`;
          }
          if (payPill) {
            payPill.style.display = 'inline-flex';
            payPill.textContent =
              state.balanceDue > 0
                ? `Total Cost: $${Number(state.totalFee || 0).toFixed(2)} • Deposit Paid: $${state.amountPaid.toFixed(2)} • Remaining Balance Due: $${state.balanceDue.toFixed(2)}`
                : `Paid in Full via Stripe: $${state.amountPaid.toFixed(2)}`;
          }
        } else {
          if (payPill) payPill.style.display = 'none';
          if ($('#confirmHeadingTitle') && state.path === 'quote') {
            $('#confirmHeadingTitle').textContent = 'Quote Request Submitted!';
          } else if ($('#confirmHeadingTitle')) {
            $('#confirmHeadingTitle').textContent = 'Appointment Request Submitted!';
          }
          if ($('#confirmHeadingDesc') && state.path !== 'quote') {
            $('#confirmHeadingDesc').textContent =
              'Thank you! Your appointment request has been received. Note: Appointments are officially confirmed once the required 50% deposit is received.';
          }
        }

        goTo(7, true);
      } else {
        if ($('#confirmVerifyingSpinner')) $('#confirmVerifyingSpinner').style.display = 'none';
        if ($('#confirmActionButtons')) $('#confirmActionButtons').style.display = 'flex';
        if (statusData?.stripeCompleted) {
          state.lockRestoredTotals = false;
          goTo(6, true);
        }
        if (state.step === 6 && nextBtn) {
          updateReviewSubmitButton();
        }
        toast(`Submission failed: ${statusData?.error || 'Please try again or contact us directly.'}`);
      }
    };

    function renderJourney() {
      const track = $('#journeyTrack');
      if (!track) return;
      const stepNames = ['Service', 'Location', 'Details', 'Time', 'Contact', 'Review'];
      track.innerHTML = stepNames.map((name, i) => {
        const n = i + 1;
        const active = (n === state.step) || (state.step === 7 && n === 6);
        const done = (n < state.step) || state.step === 7;
        const dotContent = done
          ? `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>`
          : n;
        return `
          <div class="journey-item ${active ? 'active' : ''} ${done ? 'done' : ''}">
            <span class="journey-dot">${dotContent}</span>
            <span class="journey-text"><b>${name}</b></span>
            <span class="journey-line"></span>
          </div>
        `;
      }).join('');
      const statusEl = $('#journeyStatus');
      if (statusEl) {
        statusEl.textContent = state.step === 7
          ? (state.isSubmitting ? 'Verifying Stripe Payment...' : (state.amountPaid > 0 ? '50% Deposit Paid · Confirmed' : 'Request Submitted · Pending Approval'))
          : `Step ${state.step} of 6 · ${stepNames[state.step - 1] || ''}`;
      }
    }

    function renderCmsBanner() {
      const banner = $('#cmsStatusBanner');
      if (!banner) return;

      if (state.cmsStatus === 'error') {
        banner.style.display = 'flex';
        banner.style.alignItems = 'center';
        banner.style.justifyContent = 'space-between';
        banner.style.gap = '12px';
        banner.style.flexWrap = 'wrap';
        banner.style.borderColor = '#fecaca';
        banner.style.background = '#fef2f2';
        banner.style.color = '#991b1b';
        banner.innerHTML = `
          <span><strong>Unable to load live booking data:</strong> ${escapeHtml(state.cmsError || 'CMS connection unavailable.')}</span>
          <button type="button" id="btnRetryCmsConfig" class="btn-card-select-next">Retry</button>
        `;
        $('#btnRetryCmsConfig')?.addEventListener('click', () => {
          state.cmsStatus = 'loading';
          state.cmsError = '';
          renderServices();
          self.dispatchEvent(new CustomEvent('requestRetryConfig', { bubbles: true, composed: true }));
        });
      } else {
        banner.style.display = 'none';
        banner.innerHTML = '';
      }
    }

    function renderServices() {
      renderCmsBanner();
      const list = $('#serviceList');
      const moreWrap = $('#moreServicesWrap');
      const moreBtn = $('#btnToggleMoreServices');
      if (!list) return;

      if (state.cmsStatus === 'loading') {
        if (moreWrap) moreWrap.style.display = 'none';
        list.innerHTML = `
          <div class="dmn-loader-wrap" role="status" aria-live="polite">
            <svg class="dmn-loader-svg" viewBox="0 0 50 50" fill="none" aria-hidden="true">
              <circle cx="25" cy="25" r="20" stroke="#E6DCF0" stroke-width="4" />
              <path d="M45 25a20 20 0 0 0-20-20" stroke="#4B247A" stroke-width="4" stroke-linecap="square" />
            </svg>
            <p class="dmn-loader-title">${isQuoteWidget ? 'Loading Quote Services...' : 'Loading Available Services...'}</p>
            <p class="dmn-loader-sub">Please wait a moment while we fetch live availability and pricing.</p>
          </div>
        `;
        return;
      }

      if (services.length === 0) {
        if (moreWrap) moreWrap.style.display = 'none';
        list.innerHTML = `<div style="grid-column:1/-1;padding:24px;border:1px solid var(--line);background:#fff;text-align:center;color:var(--muted)">${isQuoteWidget ? 'No quote-review services are currently active in ServicesCatalog.' : 'No instant booking services are currently active in ServicesCatalog.'}</div>`;
        return;
      }

      const hiddenCount = services.filter(s => s.hiddenByDefault).length;
      const visibleServices = showHiddenServices
        ? services
        : services.filter(s => !s.hiddenByDefault || s.id === state.service);

      if (moreWrap && moreBtn) {
        moreWrap.style.display = hiddenCount > 0 ? 'block' : 'none';
        moreBtn.textContent = showHiddenServices ? 'Show Fewer Services' : `Show ${hiddenCount} More Service(s)`;
      }

      list.innerHTML = visibleServices.map(s => {
        const priceLabel = s.mode === 'quote'
          ? 'Quote Review'
          : s.pricingModel === 'per_signature'
            ? `From $${s.basePrice}/sig`
            : `$${s.basePrice} Flat`;
        const popTag = s.popularLabel
          ? `<span class="badge" style="margin-bottom:6px;font-size:10px;padding:3px 8px">${escapeHtml(s.popularLabel)}</span>`
          : '';
        return `
          <div class="service-option ${s.id === state.service ? 'selected' : ''}" data-service="${escapeHtml(s.id)}">
            ${s.img ? `<div class="service-thumb"><img src="${escapeHtml(s.img)}" alt="${escapeHtml(s.title)}" /></div>` : ''}
            <div class="service-copy">
              ${popTag}
              <b>${escapeHtml(s.title)}</b>
              <span>${escapeHtml(s.desc)}</span>
            </div>
            <div class="service-bottom-row">
              <span class="mode-pill ${s.mode === 'quote' ? 'quote' : ''}">${priceLabel}</span>
              <button type="button" class="btn-card-select-next" data-select-go="${escapeHtml(s.id)}">
                ${s.id === state.service ? 'Selected · Next' : 'Select &amp; Next'}
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"/></svg>
              </button>
            </div>
          </div>
        `;
      }).join('');

      $$('[data-service]').forEach(card => {
        card.addEventListener('click', () => {
          state.service = card.dataset.service;
          renderServices();
          configureStep3Visibility();
          renderDynamicBox();
          calculateFees();
          updateSummary();
        });
      });

      $$('[data-select-go]').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          state.service = btn.dataset.selectGo;
          renderServices();
          configureStep3Visibility();
          renderDynamicBox();
          calculateFees();
          updateSummary();
          goTo(2);
        });
      });
    }

    // Adapt Core Step 3 layout based on service type
    function configureStep3Visibility() {
      const sId = state.service;
      const chkWrap = $('#signerIdDeclLabel');
      if (chkWrap) {
        chkWrap.style.display = ['finger', 'i9', 'apostille'].includes(sId) ? 'none' : 'flex';
      }
    }

    function escapeHtml(value) {
      return String(value == null ? '' : value).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
    }

    function parseOptionsList(raw) {
      if (!raw) return [];
      if (Array.isArray(raw)) return raw.map(v => typeof v === 'object' ? (v.value ?? v.label ?? v.title) : String(v).trim()).filter(Boolean);
      if (typeof raw === 'object') {
        if (Array.isArray(raw.options)) return parseOptionsList(raw.options);
        if (Array.isArray(raw.items)) return parseOptionsList(raw.items);
        if (Array.isArray(raw.values)) return parseOptionsList(raw.values);
        if (Array.isArray(raw.choices)) return parseOptionsList(raw.choices);
        return Object.values(raw).map(v => String(v).trim()).filter(Boolean);
      }
      if (typeof raw === 'string') {
        let str = raw.trim();
        if (!str) return [];
        if ((str.startsWith('[') && str.endsWith(']')) || (str.startsWith('{') && str.endsWith('}'))) {
          try {
            const parsed = JSON.parse(str);
            if (Array.isArray(parsed)) return parsed.map(v => typeof v === 'object' ? (v.value ?? v.label) : String(v).trim()).filter(Boolean);
            if (parsed && Array.isArray(parsed.options)) return parseOptionsList(parsed.options);
            if (parsed && Array.isArray(parsed.choices)) return parseOptionsList(parsed.choices);
          } catch (e) {
            try {
              const fixed = str.replace(/'/g, '"');
              const parsed = JSON.parse(fixed);
              if (Array.isArray(parsed)) return parsed.map(v => typeof v === 'object' ? (v.value ?? v.label) : String(v).trim()).filter(Boolean);
            } catch (e2) { }
          }
        }
        if (str.includes('\n')) {
          return str.split(/\r?\n/).map(s => s.trim().replace(/^["'`]|["'`]$/g, '').trim()).filter(Boolean);
        }
        if (str.includes(';')) {
          return str.split(';').map(s => s.trim().replace(/^["'`]|["'`]$/g, '').trim()).filter(Boolean);
        }
        str = str.replace(/^[\[\(\{]/, '').replace(/[\]\)\}]$/, '');
        return str.split(',').map(s => s.trim().replace(/^["'`]|["'`]$/g, '').trim()).filter(Boolean);
      }
      return [];
    }

    function serviceQuestions() {
      const sId = String(state.service).toLowerCase();
      const list = (bookingConfig.bookingQuestions || []).filter(q => {
        if (q.active === false || String(q.active).toLowerCase() === 'false' || q['active-1'] === false) return false;
        const qSrv = String(
          q.serviceId ||
          q.ServiceId ||
          q.service ||
          q['serviceId-1'] ||
          (q.questionId && q.questionId.includes('-') ? q.questionId.split('-')[0] : '') ||
          'all'
        ).toLowerCase().trim();
        return qSrv === 'all' || qSrv === sId;
      });
      return list.sort((a, b) => Number(a.sortOrder || a['sortOrder-1'] || 0) - Number(b.sortOrder || b['sortOrder-1'] || 0));
    }

    function serviceAddons() {
      const sId = String(state.service).toLowerCase();
      const list = (bookingConfig.bookingAddons || []).filter(a => {
        if (a.active === false || String(a.active).toLowerCase() === 'false' || a['active-1'] === false) return false;
        const aSrv = String(a.serviceId || a.ServiceId || a.service || a['serviceId-1'] || 'all').toLowerCase().trim();
        return aSrv === 'all' || aSrv === sId;
      });
      return list.sort((a, b) => Number(a.sortOrder || a['sortOrder-1'] || 0) - Number(b.sortOrder || b['sortOrder-1'] || 0));
    }

    function renderDynamicBox() {
      const box = $('#dynamicBox');
      if (!box) return;

      const questions = serviceQuestions();
      const s = service();

      // Ensure per-signature services have signers & signatures inputs if missing from CMS
      const hasSignatures = questions.some(q => {
        const k = (q.fieldKey || q.questionId || '').toLowerCase();
        return k.includes('signature');
      });
      if (!hasSignatures && s.pricingModel === 'per_signature') {
        questions.unshift(
          {
            serviceId: state.service,
            fieldKey: 'signerCount',
            label: 'Number of Signers',
            inputType: 'number',
            required: true,
            sortOrder: 1,
            placeholder: '1'
          },
          {
            serviceId: state.service,
            fieldKey: 'signatureCount',
            label: 'Number of Signatures to Notarize',
            inputType: 'number',
            required: true,
            sortOrder: 2,
            placeholder: '1'
          }
        );
      }

      const fields = questions.map((q, idx) => {
        const key = q.fieldKey || q.questionId || q.Title;
        const type = String(q.inputType || 'text').toLowerCase();
        const isRequired = (q.required === true || String(q.required).toLowerCase() === 'true');
        const isLastOdd = (idx === questions.length - 1 && questions.length % 2 === 1 && type !== 'number');
        const isFullWidth = (type === 'textarea' || (q.label && q.label.length > 45) || q.fullWidth === true || isLastOdd);

        let idAttr = '';
        if (key === 'signerCount' || key === 'signers') idAttr = 'id="signerCountInput"';
        else if (key === 'signatureCount' || key === 'signatures') idAttr = 'id="signatureCountInput"';
        else if (key === 'pageCount' || key === 'pages') idAttr = 'id="pageSelect"';
        else if (key === 'printing' || key === 'printingSupport') idAttr = 'id="printingSelect"';

        let control = '';

        // Options resolution from CMS field
        const rawOptions = q.options || q.optionsText || q.optionsJsonText || q.optionsJson || q.choices || q.items || '';
        const options = parseOptionsList(rawOptions);
        const qFee = Number(q.feeAmount || 0);
        const qFeeType = String(q.feeType || 'flat');

        if (type === 'select' || type === 'radio') {
          let currentVal = '';
          if (key === 'pageCount') currentVal = state.pageCount || '';
          else if (key === 'printing') currentVal = state.printingOption || '';

          control = `<select ${idAttr} data-cms-question="${escapeHtml(key)}" ${isRequired ? 'required' : ''}>
            <option value="">${escapeHtml(q.placeholder || 'Select an option')}</option>
            ${options.map(o => {
            const v = typeof o === 'object' ? (o.value ?? o.label) : o;
            const l = typeof o === 'object' ? (o.label ?? o.value) : o;
            const isSel = (currentVal && (currentVal === v || currentVal === l)) ? 'selected' : '';
            return `<option value="${escapeHtml(v)}" ${isSel}>${escapeHtml(l)}</option>`;
          }).join('')}
          </select>`;
        } else if (type === 'textarea') {
          control = `<textarea rows="3" ${idAttr} data-cms-question="${escapeHtml(key)}" placeholder="${escapeHtml(q.placeholder || '')}" ${isRequired ? 'required' : ''}></textarea>`;
        } else if (type === 'checkbox') {
          control = `<label class="cms-check" style="display:flex;align-items:center;gap:8px;cursor:pointer"><input type="checkbox" ${idAttr} data-cms-question="${escapeHtml(key)}" value="Yes" ${isRequired ? 'required' : ''}><span>${escapeHtml(q.placeholder || 'Yes, I acknowledge and confirm')}</span></label>`;
        } else if (type === 'number') {
          let numVal = '1';
          if (key === 'signerCount' || key === 'signers') numVal = String(state.signers || 1);
          else if (key === 'signatureCount' || key === 'signatures') numVal = String(state.signatures || 1);
          else numVal = escapeHtml(q.placeholder || '1');

          control = `<input type="number" ${idAttr} data-cms-question="${escapeHtml(key)}" min="1" max="100" value="${numVal}" placeholder="${escapeHtml(q.placeholder || '1')}" ${isRequired ? 'required' : ''} />`;
        } else {
          const safeType = ['text', 'email', 'tel', 'date'].includes(type) ? type : 'text';
          const minDate = safeType === 'date' ? `min="${todayStr}"` : '';
          control = `<input type="${safeType}" ${idAttr} ${minDate} data-cms-question="${escapeHtml(key)}" placeholder="${escapeHtml(q.placeholder || '')}" ${isRequired ? 'required' : ''} />`;
        }

        return `
          <div class="field cms-question-field ${isFullWidth ? 'full-width' : ''}">
            <div class="cms-label-block">
              <label>${escapeHtml(q.label || key)}${isRequired ? ' <span style="color:var(--danger)">*</span>' : ''}</label>
              ${q.description ? `<small>${escapeHtml(q.description)}</small>` : ''}
            </div>
            ${control}
            ${q.helpText ? `<small style="color:var(--purple);margin-top:4px">${escapeHtml(q.helpText)}</small>` : ''}
          </div>
        `;
      }).join('');

      const addons = serviceAddons();
      const addonMarkup = addons.length ? `
        <section class="cms-addon-section" style="grid-column: 1 / -1;">
          <div class="intake-section-title">Optional Service Add-ons</div>
          <div class="cms-addon-grid">
            ${addons.map(a => {
        const aId = escapeHtml(a.addonId || a.selectionKey || a._id);
        const fee = Number(a.feeAmount || 0);
        const feeType = String(a.feeType || 'flat');
        const unitSuffix = feeType === 'per_signature' ? '/sig' : feeType === 'per_signer' ? '/signer' : '';
        return `
                <label class="cms-addon" data-addon-row="${aId}">
                  <input type="checkbox" data-cms-addon="${aId}" data-fee="${fee}" data-fee-type="${escapeHtml(feeType)}" data-label="${escapeHtml(a.label || a.addonId)}">
                  <span>
                    <b>${escapeHtml(a.label || a.addonId)}</b>
                    ${a.description ? `<small>${escapeHtml(a.description)}</small>` : ''}
                  </span>
                  <strong>+$${fee.toFixed(2)}${unitSuffix}</strong>
                </label>
              `;
      }).join('')}
          </div>
        </section>
      ` : '';

      box.innerHTML = `
        <div class="intake-section-title" style="margin-bottom:18px">${escapeHtml(service().title)} — Details &amp; Customization</div>
        <div class="cms-questions-grid">
          ${fields || '<p class="cms-empty" style="grid-column: 1 / -1;">Standard service intake ready.</p>'}
          ${addonMarkup}
        </div>
      `;

      // Mutually exclusive add-ons handling
      box.querySelectorAll('[data-cms-addon]').forEach(cb => {
        cb.addEventListener('change', () => {
          const aId = cb.getAttribute('data-cms-addon') || '';
          if (cb.checked) {
            if (aId.includes('print-')) {
              box.querySelectorAll('[data-cms-addon]').forEach(other => {
                if (other !== cb && (other.getAttribute('data-cms-addon') || '').includes('print-')) {
                  other.checked = false;
                  other.closest('.cms-addon')?.classList.remove('is-selected');
                }
              });
            }
            if (aId.includes('finger-extra-')) {
              box.querySelectorAll('[data-cms-addon]').forEach(other => {
                if (other !== cb && (other.getAttribute('data-cms-addon') || '').includes('finger-extra-')) {
                  other.checked = false;
                  other.closest('.cms-addon')?.classList.remove('is-selected');
                }
              });
            }
            if (aId.includes('witness-')) {
              box.querySelectorAll('[data-cms-addon]').forEach(other => {
                if (other !== cb && (other.getAttribute('data-cms-addon') || '').includes('witness-')) {
                  other.checked = false;
                  other.closest('.cms-addon')?.classList.remove('is-selected');
                }
              });
            }
          }

          box.querySelectorAll('.cms-addon').forEach(row => {
            const rowCb = row.querySelector('input[type="checkbox"]');
            row.classList.toggle('is-selected', !!(rowCb && rowCb.checked));
          });

          updateSummary();
        });
      });

      // Question change & input handlers
      box.querySelectorAll('[data-cms-question]').forEach(el => {
        const handler = () => {
          el.classList.remove('has-error');
          const qKey = el.getAttribute('data-cms-question');
          if (qKey === 'signerCount' || qKey === 'signers') {
            state.signers = Math.max(1, parseInt(el.value, 10) || 1);
          }
          if (qKey === 'signatureCount' || qKey === 'signatures') {
            state.signatures = Math.max(1, parseInt(el.value, 10) || 1);
          }
          if (qKey === 'pageCount' || qKey === 'pages') {
            state.pageCount = el.value;
          }
          if (qKey === 'printing' || qKey === 'printingSupport') {
            state.printingOption = el.value;
          }
          updateSummary();
        };

        el.addEventListener('input', handler);
        el.addEventListener('change', handler);
      });

      calculateFees();
    }

    function generateSlotsFromWindow(hours) {
      if (!hours || hours.enabled === false || String(hours.enabled).toLowerCase() === 'false') {
        return [];
      }
      if (Array.isArray(hours.slotTimes) && hours.slotTimes.length > 0) {
        return hours.slotTimes.map(String);
      }
      const jsonSlots = parseOptionsList(hours.slotTimesJson);
      if (jsonSlots.length > 0) return jsonSlots;

      const parseMin = (t) => {
        const m = /^(\d{1,2}):(\d{2})$/.exec(String(t || '').trim());
        if (!m) return null;
        return Number(m[1]) * 60 + Number(m[2]);
      };
      const start = parseMin(hours.startTime || '09:00');
      const end = parseMin(hours.endTime || '18:00');
      const step = Math.max(15, Math.min(240, Number(hours.slotInterval || 60)));
      if (start == null || end == null || end < start) return [];

      const out = [];
      for (let mins = start; mins <= end; mins += step) {
        const h24 = Math.floor(mins / 60) % 24;
        const mm = String(mins % 60).padStart(2, '0');
        const suf = h24 >= 12 ? 'PM' : 'AM';
        const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
        out.push(`${h12}:${mm} ${suf}`);
      }
      return out;
    }

    function renderDynamicTimeSlots() {
      const grid = $('#timeSlotsGrid');
      const hiddenInput = $('#bookTime');
      if (!grid) return;

      const dateValue = (state.path === 'quote' ? $('#quoteBookDate')?.value : $('#bookDate')?.value) || $('#bookDate')?.value || '';
      const date = dateValue ? new Date(`${dateValue}T12:00:00`) : new Date();
      const dayKeys = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
      const day = dayKeys[date.getDay()];

      const hoursList = Array.isArray(bookingConfig.businessHours) ? bookingConfig.businessHours : [];
      const hours = hoursList.find(h => {
        const k = String(h.dayKey || h.dayLabel || h.title || h.Title || '').toLowerCase();
        return k.startsWith(day) || k === day;
      });

      const slots = hours ? generateSlotsFromWindow(hours) : [];

      if (slots.length === 0) {
        state.appointmentTime = '';
        if (hiddenInput) hiddenInput.value = '';
        if ($('#selectedTimeSlotLabel')) {
          const dayName = hours?.dayLabel || day.toUpperCase();
          $('#selectedTimeSlotLabel').textContent = state.cmsStatus === 'ready' ? `Closed on ${dayName}` : 'Loading availability...';
        }
        grid.innerHTML = state.cmsStatus === 'ready'
          ? `<div style="grid-column:1/-1;padding:16px;border:1px solid var(--line);background:#faf7fc;color:#6b5c7a;font-size:13.5px">We are closed on ${escapeHtml(hours?.dayLabel || day.toUpperCase())}. Please pick another date.</div>`
          : '';
      } else {
        let current = state.appointmentTime || hiddenInput?.value;
        if (!current || !slots.includes(current)) {
          current = slots[0];
        }
        state.appointmentTime = current;
        if (hiddenInput) hiddenInput.value = current;
        if ($('#selectedTimeSlotLabel')) $('#selectedTimeSlotLabel').textContent = `Selected: ${current}`;

        grid.innerHTML = slots.map((slot) => {
          const period = /AM/i.test(slot) ? 'Morning' : (parseInt(slot, 10) < 5 || parseInt(slot, 10) === 12) ? 'Afternoon' : 'Evening';
          return `
            <button type="button" class="time-slot-btn ${current === slot ? 'active-slot' : ''}" data-slot="${escapeHtml(slot)}">
              ${escapeHtml(slot)}
              <span>${period}</span>
            </button>
          `;
        }).join('');

        grid.querySelectorAll('.time-slot-btn').forEach(btn => {
          btn.addEventListener('click', (e) => {
            e.preventDefault();
            const chosen = btn.dataset.slot;
            grid.querySelectorAll('.time-slot-btn').forEach(b => b.classList.remove('active-slot'));
            btn.classList.add('active-slot');
            state.appointmentTime = chosen;
            if (hiddenInput) hiddenInput.value = chosen;
            if ($('#selectedTimeSlotLabel')) $('#selectedTimeSlotLabel').textContent = `Selected: ${chosen}`;
          });
        });
      }

      const quoteGrid = $('#quoteWindowsGrid');
      const quoteInput = $('#quoteWindowSelect');
      const quoteWindows = ['Morning (9 AM – 12 PM)', 'Afternoon (12 PM – 4 PM)', 'Evening (4 PM – 7 PM)'];
      let chosenQuote = state.quoteWindow || quoteInput?.value || quoteWindows[1];
      if (!quoteWindows.includes(chosenQuote)) chosenQuote = quoteWindows[1];
      state.quoteWindow = chosenQuote;
      if (quoteInput) quoteInput.value = chosenQuote;

      if (quoteGrid) {
        quoteGrid.innerHTML = quoteWindows.map(w => `
          <button type="button" class="quote-window-card ${chosenQuote === w ? 'active-window' : ''}" data-qwindow="${escapeHtml(w)}">
            <strong>${escapeHtml(w)}</strong>
            <span>Preferred Window</span>
          </button>
        `).join('');

        quoteGrid.querySelectorAll('.quote-window-card').forEach(btn => {
          btn.addEventListener('click', (e) => {
            e.preventDefault();
            const chosenWin = btn.dataset.qwindow;
            quoteGrid.querySelectorAll('.quote-window-card').forEach(b => b.classList.remove('active-window'));
            btn.classList.add('active-window');
            state.quoteWindow = chosenWin;
            if (quoteInput) quoteInput.value = chosenWin;
          });
        });
      }
    }

    // Flexible service area matching: does not block valid surrounding NC appointments
    function isConfiguredServiceArea(city, zip) {
      const areas = (bookingConfig.serviceAreas || []).filter(a => a.active !== false && String(a.active).toLowerCase() !== 'false');
      if (!areas.length) return true;
      const c = String(city || '').trim().toLowerCase();
      const z = String(zip || '').trim();
      if (!c && !z) return true;

      return areas.some(a => {
        const ac = String(a.city || a.areaName || '').trim().toLowerCase();
        const az = String(a.zipCode || a.zip || '').trim();
        if (az && z && az === z) return true;
        if (ac && c && (c.includes(ac) || ac.includes(c))) return true;
        return false;
      });
    }

    function getServiceSpecificDetails() {
      const answers = Array.from(self.querySelectorAll('[data-cms-question]')).map(el => {
        const key = el.getAttribute('data-cms-question');
        const label = el.closest('.cms-question-field')?.querySelector('label')?.textContent?.replace('*', '').trim() || key;
        const val = (el.type === 'checkbox') ? (el.checked ? 'Yes' : 'No') : String(el.value || '').trim();
        return `${label}: ${val || 'Not provided'}`;
      });
      return answers.join(' | ');
    }

    function computeTypedFee(amount, feeType) {
      const base = Number(amount || 0);
      if (base <= 0) return 0;
      if (feeType === 'per_signature') return base * state.signatures;
      if (feeType === 'per_signer') return base * state.signers;
      return base;
    }

    function calculateFees() {
      const s = service();

      const signerEl = $('#signerCountInput') || self.querySelector('[data-cms-question="signerCount"]') || self.querySelector('[data-cms-question="signers"]');
      const sigEl = $('#signatureCountInput') || self.querySelector('[data-cms-question="signatureCount"]') || self.querySelector('[data-cms-question="signatures"]');

      state.signers = Math.max(1, parseInt(signerEl?.value, 10) || 1);
      state.signatures = Math.max(1, parseInt(sigEl?.value, 10) || 1);

      // 1. BASE SERVICE FEE strictly driven by ServicesCatalog pricingModel
      if (s.pricingModel === 'per_signature') {
        state.serviceFee = Number(s.basePrice || 0) * state.signatures;
      } else {
        state.serviceFee = Number(s.basePrice || 0);
      }

      // 2. PRINTING SELECT ADD-ON
      let printingFee = 0;
      let printingSummary = '';
      const printEl = $('#printingSelect') || self.querySelector('[data-cms-question="printing"]') || self.querySelector('[data-cms-question="printingSupport"]');
      const pVal = printEl?.value || 'none';
      if (pVal.includes('10.00') || pVal === 'letter' || /letter/i.test(pVal)) {
        printingFee = 10;
        printingSummary = 'Standard Letter Printing (+$10.00)';
      } else if (pVal.includes('20.00') || pVal === 'legal' || /legal/i.test(pVal) || /dual/i.test(pVal)) {
        printingFee = 20;
        printingSummary = 'Dual-Tray Legal Printing (+$20.00)';
      } else if (pVal.includes('25.00') || pVal === 'color' || /color/i.test(pVal)) {
        printingFee = 25;
        printingSummary = 'Color Document Printing (+$25.00)';
      }

      // 3. CMS-DRIVEN ADD-ONS (supports flat, per_signature, per_signer)
      state.addonsFee = printingFee;
      const selectedAddons = [];
      const addonItems = [];
      if (printingSummary) {
        selectedAddons.push(printingSummary);
        addonItems.push({
          label: printingSummary.replace(/\s*\(\+\$[\d.]+\)$/, ''),
          amount: Math.round(printingFee * 100) / 100,
        });
      }

      self.querySelectorAll('[data-cms-addon]:checked').forEach(cb => {
        const base = Number(cb.getAttribute('data-fee') || 0);
        const fType = cb.getAttribute('data-fee-type') || 'flat';
        const fee = computeTypedFee(base, fType);
        const lbl = cb.getAttribute('data-label') || cb.getAttribute('data-cms-addon');
        state.addonsFee += fee;
        selectedAddons.push(`${lbl} (+$${fee.toFixed(2)})`);
        if (fee > 0) {
          addonItems.push({ label: lbl, amount: Math.round(fee * 100) / 100 });
        }
      });

      state.addonsFee = Math.round(state.addonsFee * 100) / 100;
      state.addonsSummary = selectedAddons.length > 0 ? selectedAddons.join('; ') : 'None';
      state.addonsList = selectedAddons;
      state.addonItems = addonItems;

      // 4. TRAVEL & GRAND TOTAL
      const travelVal = state.travel != null ? state.travel : 0;
      state.totalFee = Math.round((state.serviceFee + state.addonsFee + travelVal) * 100) / 100;

      // Path determination strictly from ServicesCatalog + package size
      const pageEl = $('#pageSelect') || self.querySelector('[data-cms-question="pageCount"]') || self.querySelector('[data-cms-question="pages"]');
      const pageVal = pageEl?.value || '';
      const isLargePackage = pageVal.includes('Custom Quote') || pageVal.includes('150+') || pageVal.includes('200+');
      const isQuoteService = Boolean(s.isQuoteOnly) || s.pricingModel === 'quote_only' || s.mode === 'quote';

      state.path = (isQuoteWidget || isLargePackage || isQuoteService) ? 'quote' : 'instant';

      if ($('#instantSchedule')) $('#instantSchedule').style.display = state.path === 'quote' ? 'none' : 'grid';
      if ($('#quoteSchedule')) $('#quoteSchedule').style.display = state.path === 'quote' ? 'block' : 'none';
      if ($('#sideModePill')) {
        $('#sideModePill').textContent = state.path === 'quote' ? 'Quote Review' : 'Instant';
        $('#sideModePill').className = state.path === 'quote' ? 'mode-pill quote' : 'mode-pill';
      }
    }

    function updateSummary() {
      if (!state.lockRestoredTotals && state.step !== 7) {
        calculateFees();
      }
      const s = service();
      const city = ($('#city')?.value || '').trim();
      const zip = ($('#zip')?.value || '').trim();
      const locationText = [city, zip ? `(${zip})` : ''].filter(Boolean).join(' ') || 'Pending';

      if ($('#sumService')) $('#sumService').textContent = s.title;
      if ($('#sumLocation')) $('#sumLocation').textContent = locationText;

      const distStr = state.distance != null ? `${state.distance} mi` : '-- mi';
      const driveStr = state.drive != null ? `${state.drive} min` : '-- min';
      const travelStr = state.travel != null ? `$${state.travel.toFixed(2)}` : '--';

      const subtotal = state.serviceFee + state.addonsFee;
      const totalStr = state.travel != null ? `$${state.totalFee.toFixed(2)}` : `$${subtotal.toFixed(2)} + Travel`;

      if ($('#sumDistance')) $('#sumDistance').textContent = distStr;
      if ($('#sumServiceFee')) $('#sumServiceFee').textContent = `$${state.serviceFee.toFixed(2)}`;

      const sideAddonsRow = $('#sideAddonsRow');
      const sumAddonsFee = $('#sumAddonsFee');
      const sideAddonsList = $('#sideAddonsList');

      if (sideAddonsRow && sumAddonsFee) {
        if (state.addonsFee > 0) {
          sideAddonsRow.style.display = 'flex';
          sumAddonsFee.textContent = `+$${state.addonsFee.toFixed(2)}`;
          if (sideAddonsList) {
            sideAddonsList.style.display = 'block';
            sideAddonsList.innerHTML = state.addonsList.map(a => `<div style="display:flex;align-items:center;gap:4px"><span style="color:var(--purple)">•</span> ${a}</div>`).join('');
          }
        } else {
          sideAddonsRow.style.display = 'none';
          sumAddonsFee.textContent = '$0.00';
          if (sideAddonsList) {
            sideAddonsList.style.display = 'none';
            sideAddonsList.innerHTML = '';
          }
        }
      }

      if ($('#sumTravelFee')) $('#sumTravelFee').textContent = travelStr;
      if ($('#sumTotal')) $('#sumTotal').textContent = totalStr;

      if ($('#distanceText')) $('#distanceText').textContent = distStr;
      if ($('#driveText')) $('#driveText').textContent = driveStr;
      if ($('#travelText')) $('#travelText').textContent = travelStr;
    }

    function handleFileSelection(files) {
      if (!files || files.length === 0) return;
      Array.from(files).forEach(file => {
        if (file.size > 15 * 1024 * 1024) {
          toast(`File "${file.name}" exceeds 15MB limit.`);
          return;
        }

        const fileId = 'file_' + Math.random().toString(36).substr(2, 9);
        const fileEntry = {
          id: fileId,
          name: file.name,
          size: (file.size / 1024).toFixed(1) + ' KB',
          type: file.type,
          status: 'uploading',
          url: '',
          wixUrl: ''
        };
        uploadedFiles.push(fileEntry);
        renderUploadedFilesList();

        const reader = new FileReader();
        reader.onload = function (e) {
          const base64Data = e.target.result;
          self.dispatchEvent(new CustomEvent('requestFileUpload', {
            detail: {
              fileId: fileId,
              name: file.name,
              base64: base64Data,
              type: file.type
            },
            bubbles: true,
            composed: true
          }));
        };
        reader.readAsDataURL(file);
      });
    }

    self._onFileUploadResult = function (res) {
      if (!res) return;
      const f = uploadedFiles.find(item => item.id === res.fileId || item.name === res.name);
      if (f) {
        if (res.success) {
          f.status = 'ready';
          f.url = res.url || '';
          f.wixUrl = res.wixUrl || '';
          toast(`"${f.name}" uploaded successfully!`);
        } else {
          f.status = 'error';
          toast(`Upload notice: ${res.error || 'Failed to upload'}`);
        }
        renderUploadedFilesList();
      }
    };

    function renderUploadedFilesList() {
      const listEl = $('#uploadedFilesList');
      if (!listEl) return;
      if (uploadedFiles.length === 0) {
        listEl.innerHTML = '';
        return;
      }
      listEl.innerHTML = uploadedFiles.map((f, idx) => `
        <div class="file-chip">
          <span style="display:flex;align-items:center;gap:6px;flex-wrap:wrap">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
            <strong>${escapeHtml(f.name)}</strong>
            <small style="opacity:0.75;font-weight:400">(${f.size})</small>
            ${f.status === 'uploading' ? '<span style="color:var(--amber);font-size:12px;font-weight:700;margin-left:4px">⏳ Uploading...</span>' : ''}
            ${f.status === 'ready' && f.url ? `<a href="${f.url}" target="_blank" rel="noopener" style="color:var(--purple);font-size:12px;font-weight:700;text-decoration:underline;margin-left:6px">View Document</a>` : ''}
            ${f.status === 'error' ? '<span style="color:var(--danger);font-size:12px;font-weight:700;margin-left:4px">❌ Upload Failed</span>' : ''}
          </span>
          <button type="button" data-remove-file="${idx}" style="background:transparent;border:0;color:var(--danger);font-weight:700;font-size:16px;cursor:pointer;line-height:1;padding:0 4px">×</button>
        </div>
      `).join('');

      $$('[data-remove-file]').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const removeIdx = parseInt(btn.dataset.removeFile, 10);
          uploadedFiles.splice(removeIdx, 1);
          renderUploadedFilesList();
        });
      });
    }

    // Professional Dedicated Receipt Print
    function printBookingReceipt() {
      const ref = ($('#confirmRefId')?.textContent || 'DMN-XXXX').trim();
      const s = service();
      const clientName = ($('#customerName')?.value || 'Valued Client').trim();
      const clientPhone = ($('#customerPhone')?.value || '').trim();
      const clientEmail = ($('#customerEmail')?.value || '').trim();
      const streetAddr = ($('#address')?.value || '').trim();
      const cityVal = ($('#city')?.value || '').trim();
      const zipVal = ($('#zip')?.value || '').trim();
      const fullAddr = [streetAddr, cityVal, 'NC', zipVal].filter(Boolean).join(', ') || 'Appointment Address';
      const apptDate = state.path === 'quote'
        ? ($('#quoteBookDate')?.value || $('#bookDate')?.value || todayStr)
        : ($('#bookDate')?.value || todayStr);
      const apptTime = state.path === 'quote'
        ? (state.quoteWindow || $('#quoteWindowSelect')?.value || 'Afternoon (12 PM – 4 PM)')
        : (state.appointmentTime || $('#bookTime')?.value || '11:00 AM');
      const serviceFeeStr = `$${state.serviceFee.toFixed(2)}`;
      const addonsFeeStr = state.addonsFee > 0 ? `$${state.addonsFee.toFixed(2)}` : '$0.00';
      const addonsSummaryStr = state.addonsSummary || 'None';
      const travelFeeStr = state.travel != null ? `$${state.travel.toFixed(2)}` : 'Quoted separately';
      const grandTotalStr = state.travel != null ? `$${state.totalFee.toFixed(2)}` : `$${(state.serviceFee + state.addonsFee).toFixed(2)} + Travel`;
      const distStr = state.distance != null ? `${state.distance} miles` : 'Dispatched from Hub';
      const specificDetails = getServiceSpecificDetails();

      const receiptHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Receipt - ${ref}</title>
          <style>
            * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; }
            body { background: #fff; color: #1a1420; padding: 40px; }
            .receipt-box { max-width: 680px; margin: 0 auto; border: 2px solid #4b247a; padding: 32px; }
            .header { border-bottom: 2px solid #4b247a; padding-bottom: 16px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: flex-start; }
            .brand h1 { font-size: 19px; font-weight: 800; color: #4b247a; text-transform: uppercase; margin-bottom: 4px; }
            .brand p { font-size: 12px; color: #444; }
            .ref-badge { text-align: right; }
            .ref-badge strong { font-size: 17px; color: #4b247a; display: block; font-weight: 800; }
            .ref-badge span { font-size: 11px; color: #666; }
            .section-title { font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.06em; color: #4b247a; border-bottom: 1px solid #ddd; padding-bottom: 4px; margin: 20px 0 10px; }
            .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; font-size: 13px; margin-bottom: 16px; }
            .info-item span { font-size: 11px; text-transform: uppercase; color: #666; display: block; margin-bottom: 2px; }
            .info-item strong { color: #1a1420; font-weight: 600; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 13px; }
            th { text-align: left; padding: 8px 10px; background: #f6f2fa; border-bottom: 1px solid #ddd; font-size: 11px; text-transform: uppercase; color: #4b247a; }
            td { padding: 10px; border-bottom: 1px solid #eee; }
            td.amount { text-align: right; font-weight: 600; }
            .total-row td { font-size: 15px; font-weight: 800; color: #4b247a; border-top: 2px solid #4b247a; border-bottom: none; }
            .footer-notes { margin-top: 24px; padding-top: 14px; border-top: 1px solid #ddd; font-size: 11px; color: #555; line-height: 1.5; }
            .footer-contact { margin-top: 16px; font-size: 12px; font-weight: 700; color: #4b247a; text-align: center; }
          </style>
        </head>
        <body>
          <div class="receipt-box">
            <div class="header">
              <div class="brand">
                <h1>Direct Mobile Notary</h1>
                <p>&amp; Verification Services LLC</p>
                <p>Lakechia Sanders · Commissioned NC Notary Public</p>
              </div>
              <div class="ref-badge">
                <span>Confirmation Ref</span>
                <strong>${ref}</strong>
                <span>Date: ${new Date().toLocaleDateString()}</span>
              </div>
            </div>

            <div class="section-title">Appointment &amp; Client Details</div>
            <div class="info-grid">
              <div class="info-item"><span>Client Name</span><strong>${clientName}</strong></div>
              <div class="info-item"><span>Contact Info</span><strong>${clientPhone} · ${clientEmail}</strong></div>
              <div class="info-item"><span>Appointment Time</span><strong>${apptDate} at ${apptTime}</strong></div>
              <div class="info-item"><span>Service Location</span><strong>${fullAddr}</strong></div>
              <div class="info-item"><span>Selected Service</span><strong>${s.title}</strong></div>
              <div class="info-item"><span>Travel Distance</span><strong>${distStr}</strong></div>
            </div>

            <div class="section-title">Service Details &amp; Questions</div>
            <p style="font-size:12.5px;color:#333;margin-bottom:16px">${specificDetails || 'Standard mobile notarization'}</p>

            <div class="section-title">Itemized Fee Breakdown</div>
            <table>
              <thead>
                <tr>
                  <th>Description</th>
                  <th style="text-align:right">Amount</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Notarial / Base Service Charge</td>
                  <td class="amount">${serviceFeeStr}</td>
                </tr>
                <tr>
                  <td>Add-on Services &amp; Options (${addonsSummaryStr})</td>
                  <td class="amount">${addonsFeeStr}</td>
                </tr>
                <tr>
                  <td>Separate Travel Fee (${distStr} pursuant to NC Standards)</td>
                  <td class="amount">${travelFeeStr}</td>
                </tr>
                <tr class="total-row">
                  <td>Total Estimated Due</td>
                  <td class="amount">${grandTotalStr}</td>
                </tr>
                ${state.amountPaid > 0 ? `
                <tr>
                  <td><strong>Paid Online via Stripe (${escapeHtml(state.paymentStatus || 'Paid')})</strong></td>
                  <td class="amount" style="color:#065f46">-$${state.amountPaid.toFixed(2)}</td>
                </tr>
                <tr class="total-row">
                  <td>Remaining Balance Due</td>
                  <td class="amount">$${Number(state.balanceDue || 0).toFixed(2)}</td>
                </tr>
                ` : `
                <tr>
                  <td>Payment Method</td>
                  <td class="amount">${escapeHtml(state.paymentPreferenceText || (state.path === 'quote' ? 'Quote Review – Pay upon approval' : 'Pay at appointment'))}</td>
                </tr>
                `}
              </tbody>
            </table>

            <div class="footer-notes">
              <strong>Notice:</strong> ${escapeHtml(state.receiptDisclaimer || 'All signers must physically present valid, unexpired government-issued photo identification at the appointment. Direct Mobile Notary & Verification Services LLC operates pursuant to North Carolina General Statutes Chapter 10B. Travel fees and notarial charges are separately itemized and agreed upon.')}
            </div>
            <div class="footer-contact">
              ${escapeHtml(state.businessName || 'Direct Mobile Notary & Verification Services LLC')} · Phone: ${escapeHtml(state.businessPhone || '(803) 412-0170')} · directmobilenotaryclt@gmail.com · ${escapeHtml(state.originShort || 'Huntersville Hub')}
            </div>
          </div>
          <script>
            window.onload = function() {
              window.print();
            };
          </script>
        </body>
        </html>
      `;

      const printFrame = document.createElement('iframe');
      printFrame.style.position = 'fixed';
      printFrame.style.right = '0';
      printFrame.style.bottom = '0';
      printFrame.style.width = '0';
      printFrame.style.height = '0';
      printFrame.style.border = '0';
      document.body.appendChild(printFrame);

      const frameDoc = printFrame.contentWindow.document;
      frameDoc.open();
      frameDoc.write(receiptHtml);
      frameDoc.close();

      setTimeout(() => {
        try {
          printFrame.contentWindow.focus();
          printFrame.contentWindow.print();
        } catch (e) {
          window.print();
        }
        setTimeout(() => {
          document.body.removeChild(printFrame);
        }, 1200);
      }, 350);
    }

    function validate(step) {
      if (step === 1) {
        if (state.cmsStatus !== 'ready' || !services.length || !state.service) {
          toast(state.cmsError || 'Please wait for live services to finish loading.');
          return false;
        }
      }
      if (step === 2) {
        const a = ($('#address')?.value || '').trim();
        if (!a) {
          toast('Please enter your appointment address.');
          return false;
        }
        if (state.distance == null) {
          toast('Calculating driving route, please wait...');
          requestGoogleRoutesCalculation();
          return false;
        }
      }
      if (step === 3) {
        // Validate required CMS questions
        const requiredFields = Array.from(self.querySelectorAll('[data-cms-question][required]'));
        for (const input of requiredFields) {
          const val = (input.type === 'checkbox') ? input.checked : String(input.value || '').trim();
          if (!val) {
            input.classList.add('has-error');
            const labelText = input.closest('.cms-question-field')?.querySelector('label')?.textContent?.replace('*', '').trim() || 'Required Field';
            toast(`Please complete: ${labelText}`);
            input.focus();
            return false;
          } else {
            input.classList.remove('has-error');
          }
        }

        const chk = $('#chkIdVerified');
        if (chk && !chk.checked && !['finger', 'i9', 'apostille'].includes(state.service)) {
          toast('Please acknowledge that all signers will have valid photo IDs.');
          return false;
        }
      }
      if (step === 4 && state.path !== 'quote') {
        if (!state.appointmentTime) {
          toast('Selected day is closed. Please choose another appointment date.');
          return false;
        }
      }
      if (step === 5) {
        let valid = true;
        const name = ($('#customerName')?.value || '').trim();
        const phone = ($('#customerPhone')?.value || '').trim();
        const email = ($('#customerEmail')?.value || '').trim();

        if (!name) {
          $('#customerName')?.classList.add('has-error');
          $('#errCustomerName')?.classList.add('show');
          valid = false;
        } else {
          $('#customerName')?.classList.remove('has-error');
          $('#errCustomerName')?.classList.remove('show');
        }

        if (!phone) {
          $('#customerPhone')?.classList.add('has-error');
          $('#errCustomerPhone')?.classList.add('show');
          valid = false;
        } else {
          $('#customerPhone')?.classList.remove('has-error');
          $('#errCustomerPhone')?.classList.remove('show');
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!email || !emailRegex.test(email)) {
          $('#customerEmail')?.classList.add('has-error');
          $('#errCustomerEmail')?.classList.add('show');
          valid = false;
        } else {
          $('#customerEmail')?.classList.remove('has-error');
          $('#errCustomerEmail')?.classList.remove('show');
        }

        if (!valid) {
          toast('Please complete all required contact fields.');
          return false;
        }
      }
      if (step === 6) {
        const chkFee = $('#chkFeeAgreement');
        if (chkFee && !chkFee.checked) {
          toast('Please check the Travel & Fee Disclosure Agreement box before submitting.');
          chkFee.focus();
          return false;
        }
      }
      return true;
    }

    function resetFormToStart() {
      state.step = 1;
      const inputs = $$('#customerName, #customerPhone, #customerEmail, #specialInstructions, #address, #city, #zip');
      inputs.forEach(i => i.value = '');
      uploadedFiles = [];
      renderUploadedFilesList();
      state.distance = null;
      state.drive = null;
      state.travel = null;
      state.destCoords = null;
      state.paymentChoice = 'stripe';
      state.paymentStatus = '';
      state.amountPaid = 0;
      state.balanceDue = 0;
      state.paymentPreferenceText = '';
      state.lockRestoredTotals = false;
      state.appointmentTime = '';
      state.quoteWindow = 'Afternoon (12 PM – 4 PM)';
      if ($('#bookTime')) $('#bookTime').value = '';
      if ($('#quoteWindowSelect')) $('#quoteWindowSelect').value = 'Afternoon (12 PM – 4 PM)';
      if (markerDest && mapInstance) {
        mapInstance.removeLayer(markerDest);
        markerDest = null;
      }
      renderDynamicTimeSlots();
      goTo(1);
      toast('Ready for a new booking.');
    }

    function goTo(n, force = false) {
      if (!force && n > state.step && state.step <= 6 && !validate(state.step)) return;
      state.step = Math.max(1, Math.min(7, n));

      $$('.task-view').forEach(v => {
        const isMatch = (Number(v.dataset.step) === state.step);
        v.style.display = isMatch ? 'block' : 'none';
        v.classList.toggle('active', isMatch);
      });

      const titles = [
        { c: 'Step 01 · Service', t: 'What do you need help with?', i: 'Pick the closest match from our services catalog.' },
        { c: 'Step 02 · Location', t: 'Where should we meet you?', i: 'Preview your appointment location and calculated travel fee.' },
        { c: 'Step 03 · Details', t: 'Service-Specific Intake & Options', i: 'Answer questions tailored specifically to your selected service.' },
        { c: 'Step 04 · Appointment', t: 'When works best for you?', i: 'Choose your preferred date and appointment time slot.' },
        { c: 'Step 05 · Contact', t: 'Where should we send updates?', i: 'Appointment confirmation and travel reminders.' },
        { c: 'Step 06 · Review', t: 'Review Your Request', i: 'Check your itemized notarial and travel charges before submitting.' },
        state.isSubmitting
          ? { c: 'Payment Verification', t: 'Verifying Your Payment...', i: 'Please wait a moment while we verify your Stripe deposit and confirm your appointment.' }
          : { c: 'Step 06 · Submitted', t: 'Appointment Request Submitted!', i: 'Your request has been received and is awaiting owner approval.' }
      ];

      const m = titles[state.step - 1] || titles[0];
      if ($('#stepCount')) $('#stepCount').textContent = m.c;
      if ($('#taskTitle')) $('#taskTitle').textContent = m.t;
      if ($('#taskIntro')) $('#taskIntro').textContent = m.i;

      const backBtn = $('#backBtn');
      const nextBtn = $('#nextBtn');
      const actionBar = $('#bookingActionBar');

      if (actionBar) {
        actionBar.style.display = (state.step === 7) ? 'none' : 'flex';
      }

      if (backBtn) backBtn.classList.toggle('show', state.step > 1 && state.step < 7);

      if (nextBtn) {
        if (state.step === 6) {
          nextBtn.innerHTML = state.path === 'quote'
            ? `Submit Quote Request <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>`
            : `Submit Booking Request <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>`;
        } else {
          nextBtn.innerHTML = `
            Continue
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
          `;
        }
      }

      if (state.step === 2) {
        setupRouteMap();
        attachPlacesSearch();
        cleanupPacContainers();
      }

      if (state.step === 3) {
        configureStep3Visibility();
      }

      if (state.step === 4) {
        renderDynamicTimeSlots();
      }

      if (state.step === 6) {
        const s = service();
        if ($('#revService')) $('#revService').textContent = s.title;
        const revCity = ($('#city')?.value || '').trim();
        const revZip = ($('#zip')?.value || '').trim();
        if ($('#revLocation')) $('#revLocation').textContent = `${($('#address')?.value || '').trim()}, ${revCity ? revCity + ', ' : ''}NC ${revZip}`;
        if ($('#revDistance')) $('#revDistance').textContent = state.distance != null ? `${state.distance} mi` : '--';
        const revDate = state.path === 'quote' ? ($('#quoteBookDate')?.value || $('#bookDate')?.value || 'Preferred Date') : ($('#bookDate')?.value || 'Preferred Date');
        const revTimeVal = state.path === 'quote' ? (state.quoteWindow || $('#quoteWindowSelect')?.value || 'Afternoon (12 PM – 4 PM)') : (state.appointmentTime || $('#bookTime')?.value || '11:00 AM');
        if ($('#revTime')) $('#revTime').textContent = `${revDate} · ${revTimeVal}`;
        if ($('#revClient')) $('#revClient').textContent = `${$('#customerName')?.value || ''} (${$('#customerPhone')?.value || ''})`;

        // Dynamic review scope for each service
        const revScopeLabel = $('#revScopeLabel');
        const revSignatures = $('#revSignatures');

        const primaryQuestion = self.querySelector('[data-cms-question]');
        const primaryAnswer = primaryQuestion ? primaryQuestion.value : '';

        if (state.service === 'finger') {
          if (revScopeLabel) revScopeLabel.textContent = 'Fingerprint Cards:';
          const cardsVal = self.querySelector('[data-cms-question="cardCount"]')?.value || '1 Card';
          const typeVal = self.querySelector('[data-cms-question="cardType"]')?.value || 'FD-258';
          if (revSignatures) revSignatures.textContent = `${cardsVal} Card(s) · ${typeVal}`;
        } else if (state.service === 'i9') {
          if (revScopeLabel) revScopeLabel.textContent = 'I-9 Verification:';
          const emp = self.querySelector('[data-cms-question="employee"]')?.value || 'Employee';
          const comp = self.querySelector('[data-cms-question="employer"]')?.value || 'Company';
          if (revSignatures) revSignatures.textContent = `${emp} (${comp})`;
        } else if (state.service === 'apostille') {
          if (revScopeLabel) revScopeLabel.textContent = 'Apostille Scope:';
          const dest = self.querySelector('[data-cms-question="destinationCountry"]')?.value || 'International';
          const doc = self.querySelector('[data-cms-question="documentType"]')?.value || 'Document';
          if (revSignatures) revSignatures.textContent = `${doc} for ${dest}`;
        } else if (state.service === 'virtual_hearing') {
          if (revScopeLabel) revScopeLabel.textContent = 'Virtual Hearing:';
          const hType = self.querySelector('[data-cms-question="hearingType"]')?.value || 'Court Trial';
          const plat = self.querySelector('[data-cms-question="platform"]')?.value || 'Virtual';
          if (revSignatures) revSignatures.textContent = `${hType} via ${plat}`;
        } else if (['general', 'mobile', 'estate'].includes(state.service)) {
          if (revScopeLabel) revScopeLabel.textContent = 'Signers & Signatures:';
          if (revSignatures) revSignatures.textContent = `${state.signers} Signer(s) · ${state.signatures} Signature(s)`;
        } else {
          if (revScopeLabel) revScopeLabel.textContent = 'Service Scope:';
          if (revSignatures) revSignatures.textContent = primaryAnswer ? `${primaryAnswer}` : `${state.signers} Signer(s)`;
        }

        if ($('#revUploads')) $('#revUploads').textContent = uploadedFiles.length > 0 ? `${uploadedFiles.length} file(s) attached` : 'None';
        if ($('#revServiceFee')) $('#revServiceFee').textContent = `$${state.serviceFee.toFixed(2)}`;

        const revAddonsRow = $('#revAddonsRow');
        const revAddonsFee = $('#revAddonsFee');
        if (revAddonsRow && revAddonsFee) {
          revAddonsRow.style.display = 'flex';
          if (state.addonsFee > 0) {
            revAddonsFee.textContent = `+$${state.addonsFee.toFixed(2)} (${state.addonsSummary})`;
            revAddonsFee.style.color = 'var(--purple)';
          } else {
            revAddonsFee.textContent = '$0.00 (None selected)';
            revAddonsFee.style.color = 'var(--muted)';
          }
        }

        if ($('#revTravelFee')) $('#revTravelFee').textContent = state.travel != null ? `$${state.travel.toFixed(2)}` : 'Calculated after route';
        const subtotal = state.serviceFee + state.addonsFee;
        if ($('#revTotal')) $('#revTotal').textContent = state.travel != null ? `$${state.totalFee.toFixed(2)}` : `$${subtotal.toFixed(2)} + Travel`;
        renderPaymentOptions();
      } else if ($('#stripeRedirectBox')) {
        $('#stripeRedirectBox').style.display = 'none';
      }

      renderJourney();
      updateSummary();
      $('#taskCard')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    self._onSiteConfigError = function (errData) {
      state.cmsStatus = 'error';
      state.cmsError = errData?.error || 'Unable to load CMS configuration.';
      renderServices();
      renderDynamicTimeSlots();
      updateSummary();
    };

    self._applySiteConfig = function (cfg) {
      if (!cfg || typeof cfg !== 'object') return;
      state.cmsStatus = 'ready';
      state.cmsError = '';

      if (cfg.baseTravelFee != null) state.baseTravelFee = Number(cfg.baseTravelFee);
      if (cfg.baseTravelMiles != null) state.baseTravelMiles = Number(cfg.baseTravelMiles);
      if (cfg.perMileRate != null) state.perMileRate = Number(cfg.perMileRate);
      if (cfg.defaultOriginAddress) state.originAddress = String(cfg.defaultOriginAddress).trim();
      if (cfg.defaultOriginLabel) state.originShort = String(cfg.defaultOriginLabel).trim();
      if (cfg.defaultOriginZip) state.originZip = String(cfg.defaultOriginZip).trim();
      if (cfg.originLat != null && cfg.originLng != null) {
        state.originCoords = { lat: Number(cfg.originLat), lng: Number(cfg.originLng) };
      }
      if (cfg.tripCalculationMode) state.tripCalculationMode = cfg.tripCalculationMode;
      state.stripeEnabled = Boolean(cfg.stripeEnabled);
      if (cfg.businessName) state.businessName = String(cfg.businessName);
      if (cfg.businessPhone) {
        state.businessPhone = String(cfg.businessPhone).trim();
        const digits = state.businessPhone.replace(/[^\d+]/g, '');
        if ($('#confirmCallLink') && digits) {
          $('#confirmCallLink').setAttribute('href', `tel:${digits}`);
        }
        if ($('#confirmCallLabel')) {
          $('#confirmCallLabel').textContent = `Call Notary ${state.businessPhone}`;
        }
      }
      if (cfg.receiptDisclaimer) state.receiptDisclaimer = String(cfg.receiptDisclaimer);
      if (cfg.defaultDepositPercent != null) state.defaultDepositPercent = Number(cfg.defaultDepositPercent);
      if (cfg.depositPolicyText) state.depositPolicyText = String(cfg.depositPolicyText);

      if (cfg.placesApiKey) {
        initPlacesAutocomplete(cfg.placesApiKey);
      }

      bookingConfig = {
        bookingQuestions: Array.isArray(cfg.bookingQuestions) ? cfg.bookingQuestions : [],
        bookingAddons: Array.isArray(cfg.bookingAddons) ? cfg.bookingAddons : [],
        businessHours: Array.isArray(cfg.businessHours) ? cfg.businessHours : [],
        serviceAreas: Array.isArray(cfg.serviceAreas) ? cfg.serviceAreas : []
      };

      if (Array.isArray(cfg.services)) {
        const mappedServices = cfg.services.map(s => ({
          id: s.id || s.serviceId,
          serviceId: s.serviceId || s.id,
          title: s.title || s.Title || 'Notary Service',
          desc: s.description || s.desc || '',
          basePrice: Number(s.basePrice != null ? s.basePrice : 0),
          pricingModel: s.pricingModel || (s.isQuoteOnly ? 'quote_only' : 'flat'),
          isQuoteOnly: Boolean(s.isQuoteOnly || s.pricingModel === 'quote_only'),
          paymentPolicy: s.paymentPolicy || 'deposit_percent',
          depositAmount: Number(s.depositAmount != null && s.depositAmount > 0 ? s.depositAmount : (state.defaultDepositPercent || 50)),
          mode: s.mode || (s.isQuoteOnly || s.pricingModel === 'quote_only' ? 'quote' : 'instant'),
          popularLabel: s.popularLabel || '',
          hiddenByDefault: Boolean(s.hiddenByDefault),
          img: s.imageUrl || s.img || ''
        }));
        services = mappedServices.filter(s =>
          isQuoteWidget ? s.mode === 'quote' : s.mode !== 'quote'
        );
        if (services.length > 0 && !services.some(x => x.id === state.service)) {
          state.service = services[0].id;
        }
      } else {
        services = [];
      }

      renderServices();
      configureStep3Visibility();
      renderDynamicBox();
      renderDynamicTimeSlots();
      updateSummary();
      handleStripeReturnIfNeeded();
    };

    if (self._pendingSiteConfig) {
      self._applySiteConfig(self._pendingSiteConfig);
      self._pendingSiteConfig = null;
    } else if (self._pendingSiteConfigError) {
      self._onSiteConfigError(self._pendingSiteConfigError);
      self._pendingSiteConfigError = null;
    }

    $('#btnToggleMoreServices')?.addEventListener('click', () => {
      showHiddenServices = !showHiddenServices;
      renderServices();
    });

    // Appointment availability from BusinessHours
    $('#bookDate')?.addEventListener('change', () => renderDynamicTimeSlots());
    $('#quoteBookDate')?.addEventListener('change', () => renderDynamicTimeSlots());
    renderDynamicTimeSlots();

    $('#btnRecenterRoute')?.addEventListener('click', () => {
      if (mapInstance) {
        mapInstance.invalidateSize();
        if (markerDest) mapInstance.setView(markerDest.getLatLng(), 14);
        else mapInstance.setView([35.4107, -80.8428], 11);
      }
    });

    $('#clientFileInput')?.addEventListener('change', (e) => {
      handleFileSelection(e.target.files);
    });

    $('#nextBtn')?.addEventListener('click', () => {
      if (state.step === 7) {
        resetFormToStart();
        return;
      }

      // STEP 6: SUBMISSION
      if (state.step === 6) {
        if (!validate(6)) return;
        const newRef = `DMN-${Math.floor(1000 + Math.random() * 9000)}`;
        const streetAddr = ($('#address')?.value || '').trim();
        const cityVal = ($('#city')?.value || '').trim();
        const zipVal = ($('#zip')?.value || '').trim();

        if (!isConfiguredServiceArea(cityVal, zipVal)) {
          toast('Note: Outside primary hub. Your appointment request will be reviewed for dispatch approval.');
        }

        const fullAddr = [streetAddr, cityVal, 'NC', zipVal].filter(Boolean).join(', ');

        const apptDate = state.path === 'quote'
          ? ($('#quoteBookDate')?.value || $('#bookDate')?.value || todayStr)
          : ($('#bookDate')?.value || todayStr);

        const apptTime = state.path === 'quote'
          ? (state.quoteWindow || $('#quoteWindowSelect')?.value || 'Afternoon (12 PM – 4 PM)')
          : (state.appointmentTime || $('#bookTime')?.value || '11:00 AM');

        const stillUploading = uploadedFiles.some(f => f.status === 'uploading');
        if (stillUploading) {
          toast('Please wait: File upload is still in progress...');
          return;
        }

        let apptDateTimeIso = '';
        let apptTime24 = '09:00';
        try {
          const cleanDate = String(apptDate || '').split('T')[0];
          const dp = cleanDate.split('-');
          if (dp.length === 3) {
            const yr = parseInt(dp[0], 10);
            const mo = parseInt(dp[1], 10) - 1;
            const da = parseInt(dp[2], 10);
            let hr = 9;
            let mn = 0;
            const tm = String(apptTime || '').match(/(\d{1,2})(?::(\d{2}))?\s*(AM|PM)?/i);
            if (tm) {
              hr = parseInt(tm[1], 10);
              mn = tm[2] ? parseInt(tm[2], 10) : 0;
              const mer = (tm[3] || '').toUpperCase();
              if (mer === 'PM' && hr < 12) hr += 12;
              if (mer === 'AM' && hr === 12) hr = 0;
            } else if (/afternoon/i.test(apptTime)) {
              hr = 12;
            } else if (/evening/i.test(apptTime)) {
              hr = 16;
            } else if (/morning/i.test(apptTime)) {
              hr = 9;
            }
            apptTime24 = `${String(hr).padStart(2, '0')}:${String(mn).padStart(2, '0')}`;
            const localDt = new Date(yr, mo, da, hr, mn, 0, 0);
            if (!isNaN(localDt.getTime())) {
              apptDateTimeIso = localDt.toISOString();
            }
          }
        } catch (e) { }

        const bookingData = {
          bookingRef: newRef,
          serviceName: service().title,
          serviceId: service().id,
          bookingType: state.path,
          status: state.path === 'quote' ? 'Pending Quote Approval' : 'Pending Approval',
          clientName: ($('#customerName')?.value || '').trim(),
          clientPhone: ($('#customerPhone')?.value || '').trim(),
          clientEmail: ($('#customerEmail')?.value || '').trim(),
          fullServiceAddress: fullAddr,
          city: cityVal,
          state: 'NC',
          zip: zipVal,
          locationType: $('#locationType')?.value || 'Home / Residence',
          originShort: state.originShort,
          originZip: state.originZip,
          tripCalculationMode: state.tripCalculationMode || 'one-way',
          drivingMiles: state.distance != null ? Number(state.distance) : 0,
          drivingMinutes: state.drive != null ? Number(state.drive) : 0,
          appointmentDate: apptDate,
          appointmentTime: apptTime,
          appointmentTime24: apptTime24,
          appointmentTimeDate: apptDateTimeIso,
          clientTimeZone: (typeof Intl !== 'undefined' && Intl.DateTimeFormat) ? Intl.DateTimeFormat().resolvedOptions().timeZone : '',
          signersCount: state.signers || 1,
          notarizedSignatures: state.signatures || 1,
          pageCount: ($('#pageSelect')?.value || self.querySelector('[data-cms-question="pageCount"]')?.value || '1–25 pages'),
          printingOption: ($('#printingSelect')?.value || self.querySelector('[data-cms-question="printing"]')?.value || 'Documents already printed by client'),
          witnessOption: (self.querySelector('[data-cms-question="witnesses"]')?.value || self.querySelector('[data-cms-question="witnessSource"]')?.value || 'No witness needed'),
          uploadedFiles: uploadedFiles.map(f => ({
            name: f.name || 'Document',
            url: f.url || '',
            wixUrl: f.wixUrl || '',
            type: f.type || '',
            size: f.size || ''
          })),
          serviceFee: state.serviceFee,
          addonsFee: state.addonsFee || 0,
          addonsSummary: state.addonsSummary || 'None',
          selectedAddons: state.addonsSummary || 'None',
          travelFee: state.travel || 0,
          grandTotal: state.totalFee,
          paymentPreference: state.path === 'quote' ? 'Quote Review – Pay upon approval' : 'Pay at appointment',
          specialInstructions: ($('#specialInstructions')?.value || '').trim(),
          serviceSpecificDetails: getServiceSpecificDetails(),
          idVerifiedConfirmed: Boolean($('#chkIdVerified')?.checked),
          submittedAt: new Date().toISOString()
        };

        if (state.isSubmitting) return;
        const pay = computePaymentBreakdown();
        if (pay.useStripe && pay.dueNow >= 0.5) {
          state.isSubmitting = true;
          savePendingStripeState(bookingData);
          const nextBtn = $('#nextBtn');
          if (nextBtn) {
            nextBtn.disabled = true;
            nextBtn.textContent = 'Starting Stripe Checkout...';
          }
          self.dispatchEvent(new CustomEvent('requestStripeCheckout', {
            detail: {
              bookingRef: newRef,
              serviceId: service().id,
              serviceName: service().title,
              serviceFee: state.serviceFee,
              addonsFee: state.addonsFee || 0,
              addonsSummary: state.addonsSummary || 'None',
              addonItems: state.addonItems || [],
              travelFee: state.travel || 0,
              drivingMiles: state.distance,
              tripCalculationMode: state.tripCalculationMode || 'one-way',
              signersCount: state.signers || 1,
              notarizedSignatures: state.signatures || 1,
              grandTotal: state.totalFee,
              paymentChoice: state.paymentChoice,
              clientEmail: bookingData.clientEmail,
              appointmentDate: apptDate,
              appointmentTime: apptTime,
              city: cityVal,
              returnUrl: getReturnPageUrl(),
            },
            bubbles: true,
            composed: true
          }));
          return;
        }

        state.isSubmitting = true;
        state.amountPaid = 0;
        state.balanceDue = state.totalFee;
        state.paymentPreferenceText = bookingData.paymentPreference;
        const nextBtn = $('#nextBtn');
        if (nextBtn) {
          nextBtn.disabled = true;
          nextBtn.textContent = 'Submitting...';
        }
        if ($('#confirmRefId')) $('#confirmRefId').textContent = newRef;

        self.dispatchEvent(new CustomEvent('bookingSubmitted', {
          detail: bookingData,
          bubbles: true,
          composed: true
        }));
        return;
      }

      goTo(state.step + 1);
    });

    $('#backBtn')?.addEventListener('click', () => {
      if (state.step > 1 && state.step < 7) goTo(state.step - 1);
    });

    $('#btnBookAnotherDirect')?.addEventListener('click', () => resetFormToStart());
    $('#btnPrintReceiptDirect')?.addEventListener('click', () => printBookingReceipt());

    // Inputs in Step 3 are dynamically attached inside renderDynamicBox

    ['address', 'city', 'zip'].forEach(id => {
      const el = $('#' + id);
      if (!el) return;

      el.addEventListener('input', () => {
        if (state.distance != null) {
          state.distance = null;
          state.drive = null;
          state.travel = null;
          state.destCoords = null;
          if (markerDest && mapInstance) {
            mapInstance.removeLayer(markerDest);
            markerDest = null;
          }
          updateSummary();
          const badge = $('#routeSyncBadge');
          if (badge) {
            badge.textContent = 'Address changed. Select a suggestion or click Calculate to update route.';
            badge.style.color = '#7c3aed';
          }
        }
      });

      el.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          const dropdown = $('#dmnPlacesDropdown');
          if (dropdown && dropdown.classList.contains('show')) return;
          e.preventDefault();
          requestGoogleRoutesCalculation();
        }
      });
    });

    // Dedicated Calculate Button Click Handler
    $('#btnCalculateRoute')?.addEventListener('click', (e) => {
      e.preventDefault();
      hidePlacesDropdown();
      const addr = ($('#address')?.value || '').trim();
      if (!addr) {
        toast('Please enter your appointment address.');
        $('#address')?.focus();
        return;
      }
      requestGoogleRoutesCalculation();
    });

    attachPlacesSearch();
    renderJourney();
    renderServices();
    configureStep3Visibility();
    renderDynamicBox();
    renderDynamicTimeSlots();
    updateSummary();
    handleStripeReturnIfNeeded();
  }
}


export { DirectNotaryBooking };
