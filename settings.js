/* ==========================================================================
   TuitionHub — Comprehensive Institute Settings Script (settings.js)
   Customization Center: Appearance, Branding, Fees, Students, Receipts,
   WhatsApp Templates, Dashboard Widgets, Academic Settings, System Backup & Sync
   ========================================================================== */

let activeSettingsTab = 'appearance';

const THEME_PRESETS = [
  { id: 'blue', name: 'Classic Blue', hex: '#2563EB' },
  { id: 'emerald', name: 'Emerald Green', hex: '#059669' },
  { id: 'violet', name: 'Royal Violet', hex: '#7C3AED' },
  { id: 'crimson', name: 'Crimson Rose', hex: '#E11D48' },
  { id: 'amber', name: 'Warm Amber', hex: '#D97706' },
  { id: 'slate', name: 'Slate Navy', hex: '#334155' }
];

document.addEventListener('DOMContentLoaded', () => {
  injectShellLayout('settings', 'Settings Center');
  renderSettingsPage();
});

window.onSyncComplete = function () {
  renderSettingsPage();
};

function renderSettingsPage() {
  const container = $('#page-content');
  if (!container) return;

  const s = STATE.settings;
  const app = s.appearance || {};
  const rec = s.receiptSettings || {};
  const wa = s.whatsappTemplates || {};
  const dash = s.dashboardWidgets || {};
  const acad = s.academicSettings || {};

  container.innerHTML = `
    <div class="section-head">
      <div>
        <h2>Settings & Customization Center</h2>
        <div class="section-sub">Personalize branding, theme, fees, receipts, WhatsApp templates, and system preferences</div>
      </div>
    </div>

    <!-- MAIN SETTINGS LAYOUT -->
    <div class="settings-layout">
      <!-- NAVIGATION SIDEBAR / TABS -->
      <nav class="settings-nav">
        <button class="settings-nav-btn ${activeSettingsTab === 'appearance' ? 'active' : ''}" data-tab="appearance">
          <i data-lucide="palette" class="icon"></i> Appearance
        </button>
        <button class="settings-nav-btn ${activeSettingsTab === 'branding' ? 'active' : ''}" data-tab="branding">
          <i data-lucide="building" class="icon"></i> Center Branding
        </button>
        <button class="settings-nav-btn ${activeSettingsTab === 'fees' ? 'active' : ''}" data-tab="fees">
          <i data-lucide="wallet" class="icon"></i> Fee Defaults
        </button>
        <button class="settings-nav-btn ${activeSettingsTab === 'students' ? 'active' : ''}" data-tab="students">
          <i data-lucide="users" class="icon"></i> Student & IDs
        </button>
        <button class="settings-nav-btn ${activeSettingsTab === 'receipt' ? 'active' : ''}" data-tab="receipt">
          <i data-lucide="receipt" class="icon"></i> Receipt Design
        </button>
        <button class="settings-nav-btn ${activeSettingsTab === 'whatsapp' ? 'active' : ''}" data-tab="whatsapp">
          <i data-lucide="message-square" class="icon"></i> WhatsApp Templates
        </button>
        <button class="settings-nav-btn ${activeSettingsTab === 'dashboard' ? 'active' : ''}" data-tab="dashboard">
          <i data-lucide="layout-dashboard" class="icon"></i> Dashboard Widgets
        </button>
        <button class="settings-nav-btn ${activeSettingsTab === 'academic' ? 'active' : ''}" data-tab="academic">
          <i data-lucide="calendar" class="icon"></i> Academic Settings
        </button>
        <button class="settings-nav-btn ${activeSettingsTab === 'system' ? 'active' : ''}" data-tab="system">
          <i data-lucide="database" class="icon"></i> System & Backup
        </button>
      </nav>

      <!-- ACTIVE TAB CONTENT AREA -->
      <div class="settings-tab-content">
        ${renderTabContent(activeSettingsTab, s, app, rec, wa, dash, acad)}
      </div>
    </div>
  `;

  if (window.lucide) lucide.createIcons();
  bindSettingsEvents();
}

function renderTabContent(tab, s, app, rec, wa, dash, acad) {
  switch (tab) {
    case 'appearance':
      return renderAppearanceTab(app);
    case 'branding':
      return renderBrandingTab(s);
    case 'fees':
      return renderFeesTab(s);
    case 'students':
      return renderStudentsTab(s);
    case 'receipt':
      return renderReceiptTab(s, rec);
    case 'whatsapp':
      return renderWhatsAppTab(wa);
    case 'dashboard':
      return renderDashboardTab(dash);
    case 'academic':
      return renderAcademicTab(acad);
    case 'system':
      return renderSystemTab(s);
    default:
      return '';
  }
}

/* ==========================================================================
   1. APPEARANCE TAB
   ========================================================================== */
function renderAppearanceTab(app) {
  const currentTheme = app.theme || STATE.theme || 'light';
  const currentAccent = app.accentColor || '#2563EB';
  const density = app.density || 'comfortable';

  return `
    <div class="card">
      <h3 style="font-size:18px;margin-bottom:6px;display:flex;align-items:center;gap:8px">
        <i data-lucide="palette" class="icon" style="color:var(--primary)"></i> Theme & Appearance
      </h3>
      <p style="font-size:13.5px;color:var(--text-secondary);margin-bottom:20px">
        Customize interface colors, dark mode behavior, and layout density. Preferences are saved automatically.
      </p>

      <form id="appearance-form" style="display:flex;flex-direction:column;gap:20px">
        <!-- THEME MODE -->
        <div class="form-row">
          <label>Theme Mode</label>
          <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(130px, 1fr));gap:10px;margin-top:4px">
            <label class="btn btn-outline" style="cursor:pointer;justify-content:center;gap:8px;font-weight:600;${currentTheme === 'light' ? 'background:var(--primary-container);color:var(--primary);border-color:var(--primary)' : ''}">
              <input type="radio" name="app-theme" value="light" ${currentTheme === 'light' ? 'checked' : ''} style="display:none">
              <i data-lucide="sun" class="icon"></i> Light
            </label>
            <label class="btn btn-outline" style="cursor:pointer;justify-content:center;gap:8px;font-weight:600;${currentTheme === 'dark' ? 'background:var(--primary-container);color:var(--primary);border-color:var(--primary)' : ''}">
              <input type="radio" name="app-theme" value="dark" ${currentTheme === 'dark' ? 'checked' : ''} style="display:none">
              <i data-lucide="moon" class="icon"></i> Dark
            </label>
            <label class="btn btn-outline" style="cursor:pointer;justify-content:center;gap:8px;font-weight:600;${currentTheme === 'system' ? 'background:var(--primary-container);color:var(--primary);border-color:var(--primary)' : ''}">
              <input type="radio" name="app-theme" value="system" ${currentTheme === 'system' ? 'checked' : ''} style="display:none">
              <i data-lucide="laptop" class="icon"></i> System Sync
            </label>
          </div>
        </div>

        <!-- PRESET ACCENT PALETTES -->
        <div class="form-row">
          <label>Accent Color Presets</label>
          <div class="color-swatch-list">
            ${THEME_PRESETS.map(p => `
              <div class="color-swatch ${currentAccent.toLowerCase() === p.hex.toLowerCase() ? 'active' : ''}" 
                   style="background:${p.hex}" 
                   data-hex="${p.hex}" 
                   title="${p.name}">
                ${currentAccent.toLowerCase() === p.hex.toLowerCase() ? '<i data-lucide="check" style="width:18px;height:18px"></i>' : ''}
              </div>
            `).join('')}
          </div>
        </div>

        <!-- CUSTOM ACCENT COLOR -->
        <div class="form-grid-2">
          <div class="form-row">
            <label>Custom Accent Color</label>
            <div style="display:flex;gap:10px;align-items:center">
              <input type="color" id="app-color-picker" value="${currentAccent}" style="width:46px;height:42px;padding:2px;border:1px solid var(--border);border-radius:var(--radius-sm);cursor:pointer">
              <input type="text" id="app-color-hex" value="${currentAccent}" placeholder="#2563EB" style="flex:1">
            </div>
          </div>

          <!-- LAYOUT DENSITY -->
          <div class="form-row">
            <label>Layout Density</label>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:4px">
              <label class="btn btn-outline" style="cursor:pointer;justify-content:center;gap:8px;font-weight:600;${density === 'comfortable' ? 'background:var(--primary-container);color:var(--primary);border-color:var(--primary)' : ''}">
                <input type="radio" name="app-density" value="comfortable" ${density === 'comfortable' ? 'checked' : ''} style="display:none">
                Comfortable
              </label>
              <label class="btn btn-outline" style="cursor:pointer;justify-content:center;gap:8px;font-weight:600;${density === 'compact' ? 'background:var(--primary-container);color:var(--primary);border-color:var(--primary)' : ''}">
                <input type="radio" name="app-density" value="compact" ${density === 'compact' ? 'checked' : ''} style="display:none">
                Compact
              </label>
            </div>
          </div>
        </div>

        <div style="display:flex;gap:12px;margin-top:8px">
          <button type="button" class="btn btn-primary" id="save-appearance-btn">
            <i data-lucide="save" class="icon"></i> Save Appearance Preferences
          </button>
        </div>
      </form>
    </div>
  `;
}

/* ==========================================================================
   2. CENTER BRANDING TAB
   ========================================================================== */
function renderBrandingTab(s) {
  return `
    <div class="card">
      <h3 style="font-size:18px;margin-bottom:6px;display:flex;align-items:center;gap:8px">
        <i data-lucide="building" class="icon" style="color:var(--primary)"></i> Center Details & Branding
      </h3>
      <p style="font-size:13.5px;color:var(--text-secondary);margin-bottom:20px">
        Your tuition center details appear in receipts, top navbar, PDF reports, and student portals.
      </p>

      <form id="branding-form" style="display:flex;flex-direction:column;gap:16px">
        <div class="form-row">
          <label>Tuition Center Name *</label>
          <input type="text" id="st-tuition-name" value="${escapeHtml(s.tuitionName || '')}" placeholder="e.g. TuitionHub Center" required>
        </div>

        <!-- LOGO UPLOADER -->
        <div class="form-row">
          <label>Center Logo</label>
          <div class="logo-preview-container">
            <div class="logo-preview-box" id="st-logo-preview">
              ${s.logoUrl ? `<img src="${escapeHtml(s.logoUrl)}" alt="Center Logo">` : `<span style="font-size:11px;color:var(--text-muted);text-align:center">No Logo</span>`}
            </div>
            <div style="display:flex;flex-direction:column;gap:8px;flex:1">
              <label class="btn btn-outline btn-sm" style="cursor:pointer;width:fit-content">
                <i data-lucide="upload" class="icon"></i> Upload Logo Image
                <input type="file" id="st-logo-file" accept="image/*" style="display:none">
              </label>
              ${s.logoUrl ? `
                <button type="button" class="btn btn-danger btn-sm" id="remove-logo-btn" style="width:fit-content">
                  <i data-lucide="trash-2" class="icon"></i> Remove Logo
                </button>
              ` : ''}
              <span style="font-size:11.5px;color:var(--text-secondary)">Recommended: PNG or JPEG up to 2MB</span>
            </div>
          </div>
          <input type="text" id="st-logo-url" value="${escapeHtml(s.logoUrl || '')}" placeholder="Or paste Logo Image URL (https://... or data:image/...)">
        </div>

        <div class="form-grid-2">
          <div class="form-row">
            <label>Primary Tutor / Admin Name</label>
            <input type="text" id="st-teacher-name" value="${escapeHtml(s.teacherName || '')}" placeholder="e.g. Prof. Sharma">
          </div>
          <div class="form-row">
            <label>Official Email</label>
            <input type="email" id="st-email" value="${escapeHtml(s.email || '')}" placeholder="e.g. contact@tuitionhub.edu">
          </div>
        </div>

        <div class="form-grid-2">
          <div class="form-row">
            <label>Contact Phone Number</label>
            <input type="tel" id="st-teacher-phone" value="${escapeHtml(s.teacherPhone || '')}" placeholder="e.g. 9876543210">
          </div>
          <div class="form-row">
            <label>WhatsApp Number (with country code)</label>
            <input type="tel" id="st-teacher-wa" value="${escapeHtml(s.teacherWhatsapp || '')}" placeholder="e.g. 919876543210">
          </div>
        </div>

        <div class="form-row">
          <label>Center Physical Address</label>
          <input type="text" id="st-address" value="${escapeHtml(s.address || '')}" placeholder="e.g. 123 Education Hub, Knowledge Park">
        </div>

        <div class="form-grid-2">
          <div class="form-row">
            <label>Website or Social Link</label>
            <input type="url" id="st-website" value="${escapeHtml(s.website || '')}" placeholder="https://tuitionhub.com">
          </div>
          <div class="form-row">
            <label>Online Class Link (Meet / Zoom)</label>
            <input type="url" id="st-live-link" value="${escapeHtml(s.liveClassLink || '')}" placeholder="https://meet.google.com/xyz">
          </div>
        </div>

        <div class="form-row">
          <label>Custom Portal Footer Text</label>
          <input type="text" id="st-footer-text" value="${escapeHtml(s.footerText || '')}" placeholder="e.g. Empowering students with quality guidance.">
        </div>

        <div style="display:flex;gap:12px;margin-top:8px">
          <button type="button" class="btn btn-primary" id="save-branding-btn">
            <i data-lucide="save" class="icon"></i> Save Branding Details
          </button>
        </div>
      </form>
    </div>
  `;
}

/* ==========================================================================
   3. FEE DEFAULTS TAB
   ========================================================================== */
function renderFeesTab(s) {
  return `
    <div class="card">
      <h3 style="font-size:18px;margin-bottom:6px;display:flex;align-items:center;gap:8px">
        <i data-lucide="wallet" class="icon" style="color:var(--primary)"></i> Fee & Billing Defaults
      </h3>
      <p style="font-size:13.5px;color:var(--text-secondary);margin-bottom:20px">
        Configure default monthly dues, currency symbol, payment due days, and receipt numbering.
      </p>

      <form id="fees-defaults-form" style="display:flex;flex-direction:column;gap:16px">
        <div class="form-grid-2">
          <div class="form-row">
            <label>Currency Symbol</label>
            <input type="text" id="st-currency" value="${escapeHtml(s.currency || '₹')}" placeholder="₹, $, €, £" required>
          </div>
          <div class="form-row">
            <label>Default Monthly Fee Amount</label>
            <input type="number" id="st-default-fee" value="${s.defaultMonthlyFee || 1000}" min="0" required>
          </div>
        </div>

        <div class="form-grid-2">
          <div class="form-row">
            <label>Fee Due Day of Month</label>
            <input type="number" id="st-due-day" value="${s.feeDueDay || 5}" min="1" max="31" placeholder="e.g. 5 (5th of each month)">
          </div>
          <div class="form-row">
            <label>Optional Late Fee Charge</label>
            <input type="number" id="st-late-fee" value="${s.lateFee || 0}" min="0" placeholder="0">
          </div>
        </div>

        <div class="form-row">
          <label>Receipt Number Prefix</label>
          <input type="text" id="st-receipt-prefix" value="${escapeHtml(s.receiptPrefix || (s.receiptSettings && s.receiptSettings.prefix) || 'REC-')}" placeholder="REC-">
        </div>

        <div style="display:flex;gap:12px;margin-top:8px">
          <button type="button" class="btn btn-primary" id="save-fees-defaults-btn">
            <i data-lucide="save" class="icon"></i> Save Fee Defaults
          </button>
        </div>
      </form>
    </div>
  `;
}

/* ==========================================================================
   4. STUDENT & ID SETTINGS TAB
   ========================================================================== */
function renderStudentsTab(s) {
  const batches = Array.isArray(s.availableBatches) && s.availableBatches.length > 0
    ? s.availableBatches
    : Array.from(new Set(STATE.students.map(st => st.batch).filter(Boolean)));

  return `
    <div class="card">
      <h3 style="font-size:18px;margin-bottom:6px;display:flex;align-items:center;gap:8px">
        <i data-lucide="users" class="icon" style="color:var(--primary)"></i> Student Directory & ID Settings
      </h3>
      <p style="font-size:13.5px;color:var(--text-secondary);margin-bottom:20px">
        Configure auto-generated student ID schemes, default batches, and manage the list of active grades.
      </p>

      <form id="student-settings-form" style="display:flex;flex-direction:column;gap:16px">
        <div class="form-grid-2">
          <div class="form-row">
            <label>Student ID Prefix</label>
            <input type="text" id="st-id-prefix" value="${escapeHtml(s.idPrefix || 'ST')}" placeholder="e.g. ST" required>
          </div>
          <div class="form-row">
            <label>Starting ID Number</label>
            <input type="number" id="st-starting-id" value="${s.startingId || 1001}" min="1" required>
          </div>
        </div>

        <div class="form-row">
          <label>Default Grade / Batch for New Students</label>
          <input type="text" id="st-default-batch" value="${escapeHtml(s.defaultBatch || 'Grade 10')}" placeholder="e.g. Grade 10">
        </div>

        <!-- AVAILABLE BATCHES LIST -->
        <div class="form-row">
          <label>Available Grades / Batches</label>
          <div class="template-chips" id="batches-chip-list">
            ${batches.map(b => `
              <span class="badge badge-blue" style="padding:6px 12px;font-size:13px;display:inline-flex;align-items:center;gap:6px">
                ${escapeHtml(b)}
                <button type="button" class="remove-batch-btn" data-batch="${escapeHtml(b)}" style="color:inherit;cursor:pointer;border:none;background:none">&times;</button>
              </span>
            `).join('')}
          </div>
          <div style="display:flex;gap:10px;margin-top:8px">
            <input type="text" id="new-batch-input" placeholder="Add new grade (e.g. Grade 9, Class A)" style="flex:1">
            <button type="button" class="btn btn-outline btn-sm" id="add-batch-btn">
              <i data-lucide="plus" class="icon"></i> Add Grade
            </button>
          </div>
        </div>

        <div style="display:flex;gap:12px;margin-top:8px">
          <button type="button" class="btn btn-primary" id="save-student-settings-btn">
            <i data-lucide="save" class="icon"></i> Save Student Settings
          </button>
        </div>
      </form>
    </div>
  `;
}

/* ==========================================================================
   5. RECEIPT CUSTOMIZATION TAB
   ========================================================================== */
function renderReceiptTab(s, rec) {
  const title = rec.title || 'FEE PAYMENT RECEIPT';
  const footer = rec.footerMessage || 'Thank you for your payment!';
  const prefix = rec.prefix || s.receiptPrefix || 'REC-';

  return `
    <div class="card">
      <h3 style="font-size:18px;margin-bottom:6px;display:flex;align-items:center;gap:8px">
        <i data-lucide="receipt" class="icon" style="color:var(--primary)"></i> Fee Receipt PDF Customization
      </h3>
      <p style="font-size:13.5px;color:var(--text-secondary);margin-bottom:20px">
        Customize the PDF receipt downloaded when payments are collected. All settings seamlessly integrate with the existing receipt engine.
      </p>

      <form id="receipt-settings-form" style="display:flex;flex-direction:column;gap:16px">
        <div class="form-grid-2">
          <div class="form-row">
            <label>Receipt Document Title</label>
            <input type="text" id="rc-title" value="${escapeHtml(title)}" placeholder="FEE PAYMENT RECEIPT">
          </div>
          <div class="form-row">
            <label>Receipt Number Prefix</label>
            <input type="text" id="rc-prefix" value="${escapeHtml(prefix)}" placeholder="REC-">
          </div>
        </div>

        <div class="form-row">
          <label>Footer Thank-You Message</label>
          <input type="text" id="rc-footer" value="${escapeHtml(footer)}" placeholder="Thank you for your payment!">
        </div>

        <!-- RECEIPT FIELD TOGGLES -->
        <div class="form-row">
          <label>Fields Included in Receipt</label>
          <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(220px, 1fr));gap:10px;margin-top:4px">
            <label class="switch-label">
              <span>Show Center Logo</span>
              <span class="switch">
                <input type="checkbox" id="rc-show-logo" ${rec.showLogo !== false ? 'checked' : ''}>
                <span class="slider"></span>
              </span>
            </label>
            <label class="switch-label">
              <span>Show Student ID</span>
              <span class="switch">
                <input type="checkbox" id="rc-show-id" ${rec.showStudentId !== false ? 'checked' : ''}>
                <span class="slider"></span>
              </span>
            </label>
            <label class="switch-label">
              <span>Show Parent Details</span>
              <span class="switch">
                <input type="checkbox" id="rc-show-parent" ${rec.showParentDetails !== false ? 'checked' : ''}>
                <span class="slider"></span>
              </span>
            </label>
            <label class="switch-label">
              <span>Show Payment Date</span>
              <span class="switch">
                <input type="checkbox" id="rc-show-date" ${rec.showPaymentDate !== false ? 'checked' : ''}>
                <span class="slider"></span>
              </span>
            </label>
          </div>
        </div>

        <!-- LIVE MINI PREVIEW -->
        <div class="form-row">
          <label>Visual Receipt Preview</label>
          <div class="receipt-preview-card" id="receipt-live-preview">
            <div class="receipt-preview-header">
              <strong style="color:var(--primary);font-size:14px">${escapeHtml(s.tuitionName || 'Tuition Center')}</strong>
              <span style="font-size:11px;color:var(--text-secondary)">A5 Portrait</span>
            </div>
            <div style="font-weight:700;font-size:13px;margin-bottom:8px" id="prev-rc-title">${escapeHtml(title)}</div>
            <div style="font-size:11.5px;color:var(--text-secondary);margin-bottom:12px">
              <div>Receipt No: <strong>${escapeHtml(prefix)}123456</strong></div>
              <div>Date: ${new Date().toLocaleDateString()}</div>
            </div>
            <div style="background:var(--card);border:1px solid var(--border);border-radius:var(--radius-sm);padding:10px;font-size:12px;margin-bottom:12px">
              <div>Student: <strong>Demo Student</strong> (Grade 10)</div>
              <div>Amount: <strong style="color:var(--success)">${s.currency || '₹'}1,000</strong></div>
            </div>
            <div style="font-size:11px;color:var(--text-muted);text-align:center" id="prev-rc-footer">${escapeHtml(footer)}</div>
          </div>
        </div>

        <div style="display:flex;gap:12px;margin-top:8px">
          <button type="button" class="btn btn-primary" id="save-receipt-settings-btn">
            <i data-lucide="save" class="icon"></i> Save Receipt Customization
          </button>
        </div>
      </form>
    </div>
  `;
}

/* ==========================================================================
   6. WHATSAPP & MESSAGE TEMPLATES TAB
   ========================================================================== */
function renderWhatsAppTab(wa) {
  const absentTpl = wa.absent || 'Dear Parent, your child {studentName} was marked ABSENT for tuition on {date}. Please inform us if there is an issue. - {centerName}';
  const feeTpl = wa.feeReminder || 'Dear Parent, gentle reminder that tuition fee for {studentName} for the month of {date} ({amount}) is pending. Kindly clear the dues at your earliest convenience. Thank you - {centerName}';
  const payTpl = wa.paymentConfirmation || 'Dear Parent, fee payment of {amount} for {studentName} for the month of {date} has been successfully received. Thank you - {centerName}';

  return `
    <div class="card">
      <h3 style="font-size:18px;margin-bottom:6px;display:flex;align-items:center;gap:8px">
        <i data-lucide="message-square" class="icon" style="color:var(--primary)"></i> WhatsApp & Message Templates
      </h3>
      <p style="font-size:13.5px;color:var(--text-secondary);margin-bottom:20px">
        Configure message wording for 1-click WhatsApp parent notifications. Click the chips below each template to insert dynamic placeholders.
      </p>

      <form id="whatsapp-settings-form" style="display:flex;flex-direction:column;gap:20px">
        <!-- ABSENT MESSAGE -->
        <div class="form-row">
          <label style="font-weight:700">Attendance Absent Notice</label>
          <textarea id="wa-tpl-absent" rows="3">${escapeHtml(absentTpl)}</textarea>
          <div class="template-chips">
            <span class="chip-insert" data-target="wa-tpl-absent" data-tag="{studentName}">+ {studentName}</span>
            <span class="chip-insert" data-target="wa-tpl-absent" data-tag="{parentName}">+ {parentName}</span>
            <span class="chip-insert" data-target="wa-tpl-absent" data-tag="{date}">+ {date}</span>
            <span class="chip-insert" data-target="wa-tpl-absent" data-tag="{centerName}">+ {centerName}</span>
          </div>
        </div>

        <!-- FEE REMINDER -->
        <div class="form-row">
          <label style="font-weight:700">Fee Due Reminder</label>
          <textarea id="wa-tpl-fee" rows="3">${escapeHtml(feeTpl)}</textarea>
          <div class="template-chips">
            <span class="chip-insert" data-target="wa-tpl-fee" data-tag="{studentName}">+ {studentName}</span>
            <span class="chip-insert" data-target="wa-tpl-fee" data-tag="{amount}">+ {amount}</span>
            <span class="chip-insert" data-target="wa-tpl-fee" data-tag="{date}">+ {date}</span>
            <span class="chip-insert" data-target="wa-tpl-fee" data-tag="{centerName}">+ {centerName}</span>
          </div>
        </div>

        <!-- PAYMENT CONFIRMATION -->
        <div class="form-row">
          <label style="font-weight:700">Payment Received Confirmation</label>
          <textarea id="wa-tpl-pay" rows="3">${escapeHtml(payTpl)}</textarea>
          <div class="template-chips">
            <span class="chip-insert" data-target="wa-tpl-pay" data-tag="{studentName}">+ {studentName}</span>
            <span class="chip-insert" data-target="wa-tpl-pay" data-tag="{amount}">+ {amount}</span>
            <span class="chip-insert" data-target="wa-tpl-pay" data-tag="{date}">+ {date}</span>
            <span class="chip-insert" data-target="wa-tpl-pay" data-tag="{centerName}">+ {centerName}</span>
          </div>
        </div>

        <div style="display:flex;gap:12px;margin-top:8px">
          <button type="button" class="btn btn-primary" id="save-whatsapp-templates-btn">
            <i data-lucide="save" class="icon"></i> Save WhatsApp Templates
          </button>
        </div>
      </form>
    </div>
  `;
}

/* ==========================================================================
   7. DASHBOARD CUSTOMIZATION TAB
   ========================================================================== */
function renderDashboardTab(dash) {
  return `
    <div class="card">
      <h3 style="font-size:18px;margin-bottom:6px;display:flex;align-items:center;gap:8px">
        <i data-lucide="layout-dashboard" class="icon" style="color:var(--primary)"></i> Dashboard Widgets Customization
      </h3>
      <p style="font-size:13.5px;color:var(--text-secondary);margin-bottom:20px">
        Choose which metrics and summary panels to show on your TuitionHub home dashboard.
      </p>

      <form id="dashboard-settings-form" style="display:flex;flex-direction:column;gap:16px">
        <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(280px, 1fr));gap:12px">
          <label class="switch-label">
            <div>
              <div style="font-weight:700">Student Count Card</div>
              <div style="font-size:12px;color:var(--text-secondary)">Total enrolled active students</div>
            </div>
            <span class="switch">
              <input type="checkbox" id="dash-w-students" ${dash.studentCount !== false ? 'checked' : ''}>
              <span class="slider"></span>
            </span>
          </label>

          <label class="switch-label">
            <div>
              <div style="font-weight:700">Attendance Statistics Card</div>
              <div style="font-size:12px;color:var(--text-secondary)">Today's attendance percentage</div>
            </div>
            <span class="switch">
              <input type="checkbox" id="dash-w-att" ${dash.attendanceStats !== false ? 'checked' : ''}>
              <span class="slider"></span>
            </span>
          </label>

          <label class="switch-label">
            <div>
              <div style="font-weight:700">Pending Dues Card</div>
              <div style="font-size:12px;color:var(--text-secondary)">Total outstanding fees overview</div>
            </div>
            <span class="switch">
              <input type="checkbox" id="dash-w-fees" ${dash.pendingFees !== false ? 'checked' : ''}>
              <span class="slider"></span>
            </span>
          </label>

          <label class="switch-label">
            <div>
              <div style="font-weight:700">Exams Scheduled Card</div>
              <div style="font-size:12px;color:var(--text-secondary)">Active exams & evaluation tests</div>
            </div>
            <span class="switch">
              <input type="checkbox" id="dash-w-exams" ${dash.recentExams !== false ? 'checked' : ''}>
              <span class="slider"></span>
            </span>
          </label>

          <label class="switch-label">
            <div>
              <div style="font-weight:700">Class Timetable Panel</div>
              <div style="font-size:12px;color:var(--text-secondary)">Today's schedule and timing</div>
            </div>
            <span class="switch">
              <input type="checkbox" id="dash-w-timetable" ${dash.timetable !== false ? 'checked' : ''}>
              <span class="slider"></span>
            </span>
          </label>

          <label class="switch-label">
            <div>
              <div style="font-weight:700">Notice Board Panel</div>
              <div style="font-size:12px;color:var(--text-secondary)">Latest announcements and circulars</div>
            </div>
            <span class="switch">
              <input type="checkbox" id="dash-w-notices" ${dash.notices !== false ? 'checked' : ''}>
              <span class="slider"></span>
            </span>
          </label>
        </div>

        <div style="display:flex;gap:12px;margin-top:12px">
          <button type="button" class="btn btn-primary" id="save-dashboard-settings-btn">
            <i data-lucide="save" class="icon"></i> Save Dashboard Preferences
          </button>
        </div>
      </form>
    </div>
  `;
}

/* ==========================================================================
   8. ACADEMIC SETTINGS TAB
   ========================================================================== */
function renderAcademicTab(acad) {
  return `
    <div class="card">
      <h3 style="font-size:18px;margin-bottom:6px;display:flex;align-items:center;gap:8px">
        <i data-lucide="calendar" class="icon" style="color:var(--primary)"></i> Academic Calendar & Schedule Settings
      </h3>
      <p style="font-size:13.5px;color:var(--text-secondary);margin-bottom:20px">
        Configure academic session years, working days, and general center schedules.
      </p>

      <form id="academic-settings-form" style="display:flex;flex-direction:column;gap:16px">
        <div class="form-grid-2">
          <div class="form-row">
            <label>Current Academic Session</label>
            <input type="text" id="acad-year" value="${escapeHtml(acad.academicYear || '2026-2027')}" placeholder="e.g. 2026-2027">
          </div>
          <div class="form-row">
            <label>Working Days</label>
            <input type="text" id="acad-working-days" value="${escapeHtml(acad.workingDays || 'Mon, Tue, Wed, Thu, Fri, Sat')}" placeholder="e.g. Mon - Sat">
          </div>
        </div>

        <div class="form-row">
          <label>Week Starting Day</label>
          <select id="acad-week-start">
            <option value="Monday" ${acad.weekStart === 'Monday' ? 'selected' : ''}>Monday</option>
            <option value="Sunday" ${acad.weekStart === 'Sunday' ? 'selected' : ''}>Sunday</option>
          </select>
        </div>

        <div class="form-row">
          <label>Center Holidays / Closures</label>
          <textarea id="acad-holidays" rows="3" placeholder="List scheduled holiday periods or recurring closures...">${escapeHtml(acad.holidays || '')}</textarea>
        </div>

        <div style="display:flex;gap:12px;margin-top:8px">
          <button type="button" class="btn btn-primary" id="save-academic-settings-btn">
            <i data-lucide="save" class="icon"></i> Save Academic Settings
          </button>
        </div>
      </form>
    </div>
  `;
}

/* ==========================================================================
   9. SYSTEM, BACKUP & SYNC TAB
   ========================================================================== */
function renderSystemTab(s) {
  const currentUrl = (window.getGoogleSheetsUrl && window.getGoogleSheetsUrl()) || s.gasUrl || '';

  return `
    <div style="display:flex;flex-direction:column;gap:24px">
      <!-- GOOGLE SHEETS LIVE INTEGRATION -->
      <div class="card">
        <h3 style="font-size:18px;margin-bottom:6px;display:flex;align-items:center;gap:8px">
          <i data-lucide="sheet" class="icon" style="color:var(--success)"></i> Google Sheets Database Connection
        </h3>
        <p style="font-size:13.5px;color:var(--text-secondary);margin-bottom:16px">
          Your Google Sheets Web App URL is securely configured in <code>google-sheets-sync.js</code>. Real-time synchronization is active.
        </p>

        <div style="background:var(--border-subtle);border:1px solid var(--border);border-radius:var(--radius-md);padding:14px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;margin-bottom:16px">
          <div style="display:flex;align-items:center;gap:10px">
            <span class="sync-dot ${STATE.syncStatus}"></span>
            <div>
              <div style="font-weight:700;font-size:14px">Sync Status: <span style="text-transform:capitalize">${escapeHtml(STATE.syncStatus)}</span></div>
              <div style="font-size:12px;color:var(--text-secondary)">Last Synced: ${s.lastSync ? new Date(s.lastSync).toLocaleString() : 'Never'}</div>
            </div>
          </div>
          <div style="font-size:12px;color:var(--text-muted);font-family:monospace">
            ${currentUrl ? currentUrl.slice(0, 45) + '...' : 'URL Not Configured in google-sheets-sync.js'}
          </div>
        </div>

        <div style="display:flex;gap:12px;flex-wrap:wrap">
          <button class="btn btn-primary btn-sm" id="test-gas-btn">
            <i data-lucide="refresh-cw" class="icon"></i> Test Connection & Sync Live Data
          </button>
          <button class="btn btn-outline btn-sm" id="view-gs-instructions-btn">
            <i data-lucide="file-code" class="icon"></i> View code.gs Guide
          </button>
        </div>
      </div>

      <!-- SETTINGS EXPORT / IMPORT -->
      <div class="card">
        <h3 style="font-size:16px;margin-bottom:6px;display:flex;align-items:center;gap:8px">
          <i data-lucide="sliders" class="icon" style="color:var(--primary)"></i> Customization Preferences Backup
        </h3>
        <p style="font-size:13px;color:var(--text-secondary);margin-bottom:16px">
          Export or import your theme, templates, branding, and UI customizations separately from student records.
        </p>
        <div style="display:flex;gap:12px;flex-wrap:wrap">
          <button class="btn btn-outline btn-sm" id="export-settings-only-btn">
            <i data-lucide="download" class="icon"></i> Export Settings Only (JSON)
          </button>
          <label class="btn btn-outline btn-sm" style="cursor:pointer">
            <i data-lucide="upload" class="icon"></i> Import Settings (JSON)
            <input type="file" id="import-settings-only-file" accept=".json" style="display:none">
          </label>
        </div>
      </div>

      <!-- COMPLETE SYSTEM BACKUP -->
      <div class="card">
        <h3 style="font-size:16px;margin-bottom:6px;display:flex;align-items:center;gap:8px">
          <i data-lucide="archive" class="icon" style="color:var(--secondary)"></i> Full Institute Data Backup
        </h3>
        <p style="font-size:13px;color:var(--text-secondary);margin-bottom:16px">
          Download a comprehensive backup of all students, attendance, fee logs, exams, and notices.
        </p>
        <div style="display:flex;gap:12px;flex-wrap:wrap">
          <button class="btn btn-outline btn-sm" id="export-json-backup-btn">
            <i data-lucide="download" class="icon"></i> Export Full System Backup (JSON)
          </button>
          <label class="btn btn-outline btn-sm" style="cursor:pointer">
            <i data-lucide="upload" class="icon"></i> Restore Full Backup
            <input type="file" id="import-json-file" accept=".json" style="display:none">
          </label>
        </div>
      </div>

      <!-- RESET PREFERENCES (SAFE) -->
      <div class="card" style="border-color:rgba(239, 68, 68, 0.3)">
        <h3 style="font-size:16px;margin-bottom:6px;color:var(--danger);display:flex;align-items:center;gap:8px">
          <i data-lucide="rotate-ccw" class="icon" style="color:var(--danger)"></i> Reset UI Preferences
        </h3>
        <p style="font-size:13px;color:var(--text-secondary);margin-bottom:16px">
          Reset theme, colors, layout density, and default message templates back to initial values.
          <br><strong style="color:var(--text)">Safety Guarantee:</strong> This will <u>never</u> delete or modify your students, attendance, fees, or Google Sheets database.
        </p>
        <button class="btn btn-outline btn-sm" id="reset-ui-preferences-btn" style="color:var(--danger);border-color:var(--danger)">
          <i data-lucide="rotate-ccw" class="icon"></i> Reset Customization Preferences to Defaults
        </button>
      </div>
    </div>
  `;
}

/* ==========================================================================
   EVENT HANDLERS BINDING
   ========================================================================== */
function bindSettingsEvents() {
  // Tab switching
  $all('.settings-nav-btn').forEach(btn => {
    btn.onclick = () => {
      activeSettingsTab = btn.dataset.tab;
      renderSettingsPage();
    };
  });

  // 1. Appearance Events
  bindAppearanceEvents();

  // 2. Branding Events
  bindBrandingEvents();

  // 3. Fees Events
  bindFeesEvents();

  // 4. Students Events
  bindStudentsEvents();

  // 5. Receipt Events
  bindReceiptEvents();

  // 6. WhatsApp Events
  bindWhatsAppEvents();

  // 7. Dashboard Events
  bindDashboardEvents();

  // 8. Academic Events
  bindAcademicEvents();

  // 9. System & Backup Events
  bindSystemEvents();
}

function bindAppearanceEvents() {
  // Color Swatch clicking
  $all('.color-swatch').forEach(sw => {
    sw.onclick = () => {
      const hex = sw.dataset.hex;
      $('#app-color-picker').value = hex;
      $('#app-color-hex').value = hex;
      if (!STATE.settings.appearance) STATE.settings.appearance = {};
      STATE.settings.appearance.accentColor = hex;
      applyAppearanceSettings();
      renderSettingsPage();
    };
  });

  const picker = $('#app-color-picker');
  const hexInput = $('#app-color-hex');
  if (picker && hexInput) {
    picker.oninput = (e) => {
      hexInput.value = e.target.value;
      if (!STATE.settings.appearance) STATE.settings.appearance = {};
      STATE.settings.appearance.accentColor = e.target.value;
      applyAppearanceSettings();
    };
    hexInput.onchange = (e) => {
      let val = e.target.value.trim();
      if (!val.startsWith('#')) val = '#' + val;
      picker.value = val;
      if (!STATE.settings.appearance) STATE.settings.appearance = {};
      STATE.settings.appearance.accentColor = val;
      applyAppearanceSettings();
    };
  }

  // Theme radios
  $all('input[name="app-theme"]').forEach(r => {
    r.onchange = (e) => {
      const themeVal = e.target.value;
      if (!STATE.settings.appearance) STATE.settings.appearance = {};
      STATE.settings.appearance.theme = themeVal;
      applyTheme(themeVal);
      renderSettingsPage();
    };
  });

  // Density radios
  $all('input[name="app-density"]').forEach(r => {
    r.onchange = (e) => {
      const densityVal = e.target.value;
      if (!STATE.settings.appearance) STATE.settings.appearance = {};
      STATE.settings.appearance.density = densityVal;
      applyAppearanceSettings();
      renderSettingsPage();
    };
  });

  const saveAppBtn = $('#save-appearance-btn');
  if (saveAppBtn) {
    saveAppBtn.onclick = () => {
      saveStorage(LS_KEYS.SETTINGS, STATE.settings);
      showToast('success', 'Appearance preferences saved!');
    };
  }
}

function bindBrandingEvents() {
  const logoFileInput = $('#st-logo-file');
  if (logoFileInput) {
    logoFileInput.onchange = (e) => {
      const file = e.target.files[0];
      if (!file) return;
      if (file.size > 2 * 1024 * 1024) {
        showToast('warning', 'Please select an image smaller than 2MB');
        return;
      }
      const reader = new FileReader();
      reader.onload = (evt) => {
        const base64Url = evt.target.result;
        STATE.settings.logoUrl = base64Url;
        saveStorage(LS_KEYS.SETTINGS, STATE.settings);
        showToast('success', 'Logo updated successfully!');
        injectShellLayout('settings', 'Settings Center');
        renderSettingsPage();
      };
      reader.readAsDataURL(file);
    };
  }

  const removeLogoBtn = $('#remove-logo-btn');
  if (removeLogoBtn) {
    removeLogoBtn.onclick = () => {
      STATE.settings.logoUrl = '';
      saveStorage(LS_KEYS.SETTINGS, STATE.settings);
      showToast('info', 'Logo removed');
      injectShellLayout('settings', 'Settings Center');
      renderSettingsPage();
    };
  }

  const saveBrandingBtn = $('#save-branding-btn');
  if (saveBrandingBtn) {
    saveBrandingBtn.onclick = async () => {
      STATE.settings.tuitionName = $('#st-tuition-name').value.trim() || 'Tuition Center';
      STATE.settings.logoUrl = $('#st-logo-url').value.trim();
      STATE.settings.teacherName = $('#st-teacher-name').value.trim();
      STATE.settings.email = $('#st-email').value.trim();
      STATE.settings.teacherPhone = $('#st-teacher-phone').value.trim();
      STATE.settings.teacherWhatsapp = $('#st-teacher-wa').value.trim();
      STATE.settings.address = $('#st-address').value.trim();
      STATE.settings.website = $('#st-website').value.trim();
      STATE.settings.liveClassLink = $('#st-live-link').value.trim();
      STATE.settings.footerText = $('#st-footer-text').value.trim();

      saveStorage(LS_KEYS.SETTINGS, STATE.settings);
      showToast('success', 'Branding details saved!');
      injectShellLayout('settings', 'Settings Center');
      renderSettingsPage();

      if (window.apiRequest) {
        try { await window.apiRequest('saveSettings', { settings: STATE.settings }); } catch (e) { }
      }
    };
  }
}

function bindFeesEvents() {
  const saveBtn = $('#save-fees-defaults-btn');
  if (saveBtn) {
    saveBtn.onclick = async () => {
      STATE.settings.currency = $('#st-currency').value.trim() || '₹';
      STATE.settings.defaultMonthlyFee = Number($('#st-default-fee').value) || 1000;
      STATE.settings.feeDueDay = Number($('#st-due-day').value) || 5;
      STATE.settings.lateFee = Number($('#st-late-fee').value) || 0;
      STATE.settings.receiptPrefix = $('#st-receipt-prefix').value.trim() || 'REC-';

      if (!STATE.settings.receiptSettings) STATE.settings.receiptSettings = {};
      STATE.settings.receiptSettings.prefix = STATE.settings.receiptPrefix;

      saveStorage(LS_KEYS.SETTINGS, STATE.settings);
      showToast('success', 'Fee defaults saved!');

      if (window.apiRequest) {
        try { await window.apiRequest('saveSettings', { settings: STATE.settings }); } catch (e) { }
      }
    };
  }
}

function bindStudentsEvents() {
  const addBatchBtn = $('#add-batch-btn');
  const newBatchInput = $('#new-batch-input');
  if (addBatchBtn && newBatchInput) {
    addBatchBtn.onclick = () => {
      const val = newBatchInput.value.trim();
      if (!val) return;
      if (!Array.isArray(STATE.settings.availableBatches)) {
        STATE.settings.availableBatches = ['Grade 7', 'Grade 8', 'Grade 9', 'Grade 10', 'Grade 11', 'Grade 12'];
      }
      if (!STATE.settings.availableBatches.includes(val)) {
        STATE.settings.availableBatches.push(val);
        saveStorage(LS_KEYS.SETTINGS, STATE.settings);
        showToast('success', `Added ${val}`);
        renderSettingsPage();
      } else {
        showToast('info', 'Grade already exists');
      }
    };
  }

  $all('.remove-batch-btn').forEach(b => {
    b.onclick = () => {
      const target = b.dataset.batch;
      if (confirm(`Remove ${target} from available grades list?`)) {
        STATE.settings.availableBatches = (STATE.settings.availableBatches || []).filter(item => item !== target);
        saveStorage(LS_KEYS.SETTINGS, STATE.settings);
        renderSettingsPage();
      }
    };
  });

  const saveBtn = $('#save-student-settings-btn');
  if (saveBtn) {
    saveBtn.onclick = async () => {
      STATE.settings.idPrefix = $('#st-id-prefix').value.trim() || 'ST';
      STATE.settings.startingId = Number($('#st-starting-id').value) || 1001;
      STATE.settings.defaultBatch = $('#st-default-batch').value.trim() || 'Grade 10';

      saveStorage(LS_KEYS.SETTINGS, STATE.settings);
      showToast('success', 'Student & ID settings saved!');

      if (window.apiRequest) {
        try { await window.apiRequest('saveSettings', { settings: STATE.settings }); } catch (e) { }
      }
    };
  }
}

function bindReceiptEvents() {
  const titleInput = $('#rc-title');
  const footerInput = $('#rc-footer');
  if (titleInput) {
    titleInput.oninput = (e) => {
      const el = $('#prev-rc-title');
      if (el) el.textContent = e.target.value.trim() || 'FEE PAYMENT RECEIPT';
    };
  }
  if (footerInput) {
    footerInput.oninput = (e) => {
      const el = $('#prev-rc-footer');
      if (el) el.textContent = e.target.value.trim() || 'Thank you for your payment!';
    };
  }

  const saveBtn = $('#save-receipt-settings-btn');
  if (saveBtn) {
    saveBtn.onclick = async () => {
      if (!STATE.settings.receiptSettings) STATE.settings.receiptSettings = {};
      STATE.settings.receiptSettings.title = $('#rc-title').value.trim() || 'FEE PAYMENT RECEIPT';
      STATE.settings.receiptSettings.prefix = $('#rc-prefix').value.trim() || 'REC-';
      STATE.settings.receiptSettings.footerMessage = $('#rc-footer').value.trim() || 'Thank you for your payment!';
      STATE.settings.receiptSettings.showLogo = $('#rc-show-logo').checked;
      STATE.settings.receiptSettings.showStudentId = $('#rc-show-id').checked;
      STATE.settings.receiptSettings.showParentDetails = $('#rc-show-parent').checked;
      STATE.settings.receiptSettings.showPaymentDate = $('#rc-show-date').checked;

      STATE.settings.receiptPrefix = STATE.settings.receiptSettings.prefix;

      saveStorage(LS_KEYS.SETTINGS, STATE.settings);
      showToast('success', 'Receipt customization saved!');

      if (window.apiRequest) {
        try { await window.apiRequest('saveSettings', { settings: STATE.settings }); } catch (e) { }
      }
    };
  }
}

function bindWhatsAppEvents() {
  // Placeholder chips insertion
  $all('.chip-insert').forEach(chip => {
    chip.onclick = () => {
      const targetId = chip.dataset.target;
      const tag = chip.dataset.tag;
      const textarea = $('#' + targetId);
      if (textarea) {
        const start = textarea.selectionStart || textarea.value.length;
        const end = textarea.selectionEnd || textarea.value.length;
        textarea.value = textarea.value.substring(0, start) + tag + textarea.value.substring(end);
        textarea.focus();
        textarea.selectionStart = textarea.selectionEnd = start + tag.length;
      }
    };
  });

  const saveBtn = $('#save-whatsapp-templates-btn');
  if (saveBtn) {
    saveBtn.onclick = async () => {
      if (!STATE.settings.whatsappTemplates) STATE.settings.whatsappTemplates = {};
      STATE.settings.whatsappTemplates.absent = $('#wa-tpl-absent').value.trim();
      STATE.settings.whatsappTemplates.feeReminder = $('#wa-tpl-fee').value.trim();
      STATE.settings.whatsappTemplates.paymentConfirmation = $('#wa-tpl-pay').value.trim();

      saveStorage(LS_KEYS.SETTINGS, STATE.settings);
      showToast('success', 'WhatsApp message templates saved!');

      if (window.apiRequest) {
        try { await window.apiRequest('saveSettings', { settings: STATE.settings }); } catch (e) { }
      }
    };
  }
}

function bindDashboardEvents() {
  const saveBtn = $('#save-dashboard-settings-btn');
  if (saveBtn) {
    saveBtn.onclick = () => {
      if (!STATE.settings.dashboardWidgets) STATE.settings.dashboardWidgets = {};
      STATE.settings.dashboardWidgets.studentCount = $('#dash-w-students').checked;
      STATE.settings.dashboardWidgets.attendanceStats = $('#dash-w-att').checked;
      STATE.settings.dashboardWidgets.pendingFees = $('#dash-w-fees').checked;
      STATE.settings.dashboardWidgets.recentExams = $('#dash-w-exams').checked;
      STATE.settings.dashboardWidgets.timetable = $('#dash-w-timetable').checked;
      STATE.settings.dashboardWidgets.notices = $('#dash-w-notices').checked;

      saveStorage(LS_KEYS.SETTINGS, STATE.settings);
      showToast('success', 'Dashboard widgets preferences saved!');
    };
  }
}

function bindAcademicEvents() {
  const saveBtn = $('#save-academic-settings-btn');
  if (saveBtn) {
    saveBtn.onclick = async () => {
      if (!STATE.settings.academicSettings) STATE.settings.academicSettings = {};
      STATE.settings.academicSettings.academicYear = $('#acad-year').value.trim() || '2026-2027';
      STATE.settings.academicSettings.workingDays = $('#acad-working-days').value.trim() || 'Mon - Sat';
      STATE.settings.academicSettings.weekStart = $('#acad-week-start').value;
      STATE.settings.academicSettings.holidays = $('#acad-holidays').value.trim();

      saveStorage(LS_KEYS.SETTINGS, STATE.settings);
      showToast('success', 'Academic calendar settings saved!');

      if (window.apiRequest) {
        try { await window.apiRequest('saveSettings', { settings: STATE.settings }); } catch (e) { }
      }
    };
  }
}

function bindSystemEvents() {
  // Test Sync Button
  const testGasBtn = $('#test-gas-btn');
  if (testGasBtn) {
    testGasBtn.onclick = async () => {
      showToast('info', 'Testing Google Sheets sync connection...');
      try {
        if (window.triggerGoogleSheetsSync) {
          await window.triggerGoogleSheetsSync();
        }
      } catch (e) {
        showToast('error', 'Sync failed: ' + e.message);
      }
    };
  }

  // Code.gs Instructions Modal
  const instructionsBtn = $('#view-gs-instructions-btn');
  if (instructionsBtn) {
    instructionsBtn.onclick = () => openCodeGsModal();
  }

  // Export Settings Only
  const exportSettingsBtn = $('#export-settings-only-btn');
  if (exportSettingsBtn) {
    exportSettingsBtn.onclick = () => {
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(STATE.settings, null, 2));
      downloadFile(dataStr, `tuitionhub_settings_${todayISO()}.json`);
      showToast('success', 'Customization settings exported');
    };
  }

  // Import Settings Only
  const importSettingsFile = $('#import-settings-only-file');
  if (importSettingsFile) {
    importSettingsFile.onchange = (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const parsed = JSON.parse(event.target.result);
          if (parsed && typeof parsed === 'object') {
            STATE.settings = Object.assign({}, DEFAULT_SETTINGS, STATE.settings, parsed);
            saveStorage(LS_KEYS.SETTINGS, STATE.settings);
            applyTheme(STATE.settings.appearance?.theme || 'light');
            applyAppearanceSettings();
            showToast('success', 'Settings preferences imported successfully');
            renderSettingsPage();
          }
        } catch (err) {
          showToast('error', 'Invalid settings JSON file');
        }
      };
      reader.readAsText(file);
    };
  }

  // Export Full System Backup
  const exportBackupBtn = $('#export-json-backup-btn');
  if (exportBackupBtn) {
    exportBackupBtn.onclick = () => {
      const backupData = {
        version: '1.0',
        exportedAt: new Date().toISOString(),
        settings: STATE.settings,
        students: STATE.students,
        attendance: STATE.attendance,
        fees: STATE.fees,
        exams: STATE.exams,
        examMarks: STATE.examMarks,
        schedule: STATE.schedule,
        notices: STATE.notices
      };
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backupData, null, 2));
      downloadFile(dataStr, `tuitionhub_full_backup_${todayISO()}.json`);
      showToast('success', 'Full system backup exported');
    };
  }

  // Restore Full System Backup
  const importFile = $('#import-json-file');
  if (importFile) {
    importFile.onchange = (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const parsed = JSON.parse(event.target.result);
          if (parsed.students) STATE.students = parsed.students;
          if (parsed.attendance) STATE.attendance = parsed.attendance;
          if (parsed.fees) STATE.fees = parsed.fees;
          if (parsed.exams) STATE.exams = parsed.exams;
          if (parsed.examMarks) STATE.examMarks = parsed.examMarks;
          if (parsed.schedule) STATE.schedule = parsed.schedule;
          if (parsed.notices) STATE.notices = parsed.notices;
          if (parsed.settings) STATE.settings = Object.assign({}, DEFAULT_SETTINGS, STATE.settings, parsed.settings);

          saveAllState();
          showToast('success', 'Full backup restored successfully');
          renderSettingsPage();
        } catch (err) {
          showToast('error', 'Invalid JSON backup file');
        }
      };
      reader.readAsText(file);
    };
  }

  // Reset Preferences Safely (NEVER wipes students, attendance, fees, or Google Sheets)
  const resetBtn = $('#reset-ui-preferences-btn');
  if (resetBtn) {
    resetBtn.onclick = () => {
      if (confirm('Reset theme, accent color, receipt styles, and message templates to defaults?\n\nNOTE: Your student records, attendance logs, and Google Sheets database will remain completely untouched.')) {
        STATE.settings.appearance = Object.assign({}, DEFAULT_SETTINGS.appearance);
        STATE.settings.receiptSettings = Object.assign({}, DEFAULT_SETTINGS.receiptSettings);
        STATE.settings.whatsappTemplates = Object.assign({}, DEFAULT_SETTINGS.whatsappTemplates);
        STATE.settings.dashboardWidgets = Object.assign({}, DEFAULT_SETTINGS.dashboardWidgets);
        STATE.settings.academicSettings = Object.assign({}, DEFAULT_SETTINGS.academicSettings);

        saveStorage(LS_KEYS.SETTINGS, STATE.settings);
        applyTheme('light');
        applyAppearanceSettings();
        showToast('success', 'UI customization preferences reset to defaults');
        renderSettingsPage();
      }
    };
  }
}

function downloadFile(dataUrl, filename) {
  const downloadAnchor = document.createElement('a');
  downloadAnchor.setAttribute("href", dataUrl);
  downloadAnchor.setAttribute("download", filename);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
}

function openCodeGsModal() {
  const html = `
    <div class="modal-header">
      <h3>Google Apps Script (code.gs) Live Sync Guide</h3>
      <button class="icon-btn" data-modal-close><i data-lucide="x" class="icon"></i></button>
    </div>
    <div class="modal-body" style="font-size:13.5px;line-height:1.6">
      <p>TuitionHub connects directly to your Google Spreadsheet via Google Apps Script Web App.</p>
      <ol style="padding-left:20px;display:flex;flex-direction:column;gap:8px;margin-top:8px">
        <li>Open <a href="https://sheets.new" target="_blank" style="color:var(--primary);text-decoration:underline">sheets.new</a> to create or view your spreadsheet.</li>
        <li>In Google Sheets, go to <strong>Extensions &gt; Apps Script</strong>.</li>
        <li>Ensure your Apps Script contains the backend endpoints from <code>code.gs</code>.</li>
        <li>Click <strong>Deploy &gt; Manage deployments</strong> (or <strong>New deployment</strong>).</li>
        <li>Select type: <strong>Web app</strong>.</li>
        <li>Set <strong>Execute as:</strong> <em>Me</em> and <strong>Who has access:</strong> <em>Anyone</em>.</li>
        <li>Copy your deployment URL and verify it matches the <code>GOOGLE_SHEETS_WEB_APP_URL</code> configured in <code>google-sheets-sync.js</code>.</li>
      </ol>
    </div>
    <div class="modal-footer">
      <button class="btn btn-primary" data-modal-close>Got It</button>
    </div>
  `;
  ModalManager.open(html, { wide: true });
}
