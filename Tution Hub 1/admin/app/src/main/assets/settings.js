/* ==========================================================================
   TuitionHub — Institute Settings Script (settings.js)
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
  injectShellLayout('settings', 'System Settings');
  renderSettingsPage();
});

window.onSyncComplete = function() {
  renderSettingsPage();
};

function renderSettingsPage() {
  const container = $('#page-content');
  if (!container) return;

  const s = STATE.settings;

  container.innerHTML = `
    <div class="section-head">
      <div>
        <h2>Tuition Center Configurations</h2>
        <div class="section-sub">Manage institute details, Google Sheets sync, theme & backups</div>
      </div>
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:24px">
      <!-- GOOGLE SHEETS SYNC CARD -->
      <div class="card" style="grid-column:1 / -1">
        <h3 style="font-size:18px;margin-bottom:12px;display:flex;align-items:center;gap:8px">
          <i data-lucide="sheet" class="icon" style="color:var(--success)"></i> Google Sheets Database Integration (code.gs)
        </h3>
        <p style="font-size:13.5px;color:var(--text-secondary);margin-bottom:16px">
          Paste your Google Apps Script Web App URL below to sync student data, attendance, fees, marks, and timetable live to your Google Sheet.
        </p>

        <div class="form-row" style="margin-bottom:16px">
          <label>Google Apps Script Web App URL</label>
          <input type="url" id="st-gas-url" value="${escapeHtml(s.gasUrl || '')}" placeholder="https://script.google.com/macros/s/.../exec">
        </div>

        <div style="display:flex;gap:12px;align-items:center;flex-wrap:wrap">
          <button class="btn btn-primary btn-sm" id="test-gas-btn">
            <i data-lucide="refresh-cw" class="icon"></i> Save & Test Sync
          </button>
          <button class="btn btn-outline btn-sm" id="view-gs-instructions-btn">
            <i data-lucide="file-code" class="icon"></i> View code.gs Guide
          </button>
          <span style="font-size:12px;color:var(--text-muted);margin-left:auto">
            Last Sync: ${s.lastSync ? new Date(s.lastSync).toLocaleString() : 'Never'}
          </span>
        </div>
      </div>

      <!-- CENTER BRANDING CARD -->
      <div class="card">
        <h3 style="font-size:16px;margin-bottom:16px;display:flex;align-items:center;gap:8px">
          <i data-lucide="building" class="icon" style="color:var(--primary)"></i> Center Details & Branding
        </h3>

        <form id="branding-form" style="display:flex;flex-direction:column;gap:14px">
          <div class="form-row">
            <label>Tuition Center Name</label>
            <input type="text" id="st-tuition-name" value="${escapeHtml(s.tuitionName || '')}" placeholder="e.g. Acme Academy" required>
          </div>

          <div class="form-row">
            <label>Tuition Center Logo</label>
            <div class="logo-preview-container">
              <div class="logo-preview-box" id="st-logo-preview">
                ${s.logoUrl ? `<img src="${escapeHtml(s.logoUrl)}" alt="Center Logo">` : `<span style="font-size:11px;color:var(--text-muted);text-align:center">No Logo Set</span>`}
              </div>
              <div style="display:flex;flex-direction:column;gap:8px;flex:1">
                <label class="btn btn-outline btn-sm" style="cursor:pointer;width:fit-content">
                  <i data-lucide="upload" class="icon"></i> Choose Image File
                  <input type="file" id="st-logo-file" accept="image/*" style="display:none">
                </label>
                ${s.logoUrl ? `
                  <button type="button" class="btn btn-danger btn-sm" id="remove-logo-btn" style="width:fit-content">
                    <i data-lucide="trash-2" class="icon"></i> Remove Logo
                  </button>
                ` : ''}
              </div>
            </div>
            <input type="text" id="st-logo-url" value="${escapeHtml(s.logoUrl || '')}" placeholder="Or paste Logo URL (https://... or data:image/...)">
          </div>

          <div class="form-row">
            <label>Primary Tutor / Teacher Name</label>
            <input type="text" id="st-teacher-name" value="${escapeHtml(s.teacherName || '')}">
          </div>
          <div class="form-row">
            <label>Contact Phone Number</label>
            <input type="tel" id="st-teacher-phone" value="${escapeHtml(s.teacherPhone || '')}">
          </div>
          <div class="form-row">
            <label>WhatsApp Number (with country code)</label>
            <input type="tel" id="st-teacher-wa" value="${escapeHtml(s.teacherWhatsapp || '')}">
          </div>
          <div class="form-row">
            <label>Online Class Link (Google Meet / Zoom)</label>
            <input type="url" id="st-live-link" value="${escapeHtml(s.liveClassLink || '')}">
          </div>
          <button type="button" class="btn btn-primary btn-sm" id="save-branding-btn" style="margin-top:8px">Save Branding Details</button>
        </form>
      </div>

      <!-- ACADEMIC DEFAULTS CARD -->
      <div class="card">
        <h3 style="font-size:16px;margin-bottom:16px;display:flex;align-items:center;gap:8px">
          <i data-lucide="settings-2" class="icon" style="color:var(--secondary)"></i> Fee & ID Defaults
        </h3>

        <form id="defaults-form" style="display:flex;flex-direction:column;gap:14px">
          <div class="form-row">
            <label>Currency Symbol</label>
            <input type="text" id="st-currency" value="${escapeHtml(s.currency || '₹')}">
          </div>
          <div class="form-row">
            <label>Default Student ID Prefix</label>
            <input type="text" id="st-id-prefix" value="${escapeHtml(s.idPrefix || 'ST')}">
          </div>
          <div class="form-row">
            <label>Default Monthly Fee</label>
            <input type="number" id="st-default-fee" value="${s.defaultMonthlyFee || 1000}">
          </div>
          <div class="form-row">
            <label>Default Batch Name</label>
            <input type="text" id="st-default-batch" value="${escapeHtml(s.defaultBatch || 'Grade 10')}">
          </div>
          <button type="button" class="btn btn-primary btn-sm" id="save-defaults-btn" style="margin-top:8px">Save Fee Defaults</button>
        </form>
      </div>

      <!-- BACKUP & DATA RESTORE CARD -->
      <div class="card" style="grid-column:1 / -1">
        <h3 style="font-size:16px;margin-bottom:12px;display:flex;align-items:center;gap:8px">
          <i data-lucide="database" class="icon" style="color:var(--warning)"></i> Data Backup & System Maintenance
        </h3>
        <p style="font-size:13.5px;color:var(--text-secondary);margin-bottom:16px">
          Download a complete JSON backup of all your students, attendance logs, fee records, exams, and timetable entries.
        </p>

        <div style="display:flex;gap:12px;flex-wrap:wrap">
          <button class="btn btn-outline btn-sm" id="export-json-backup-btn">
            <i data-lucide="download" class="icon"></i> Export System Backup (JSON)
          </button>
          <label class="btn btn-outline btn-sm" style="cursor:pointer">
            <i data-lucide="upload" class="icon"></i> Restore Backup
            <input type="file" id="import-json-file" accept=".json" style="display:none">
          </label>
          <button class="btn btn-danger btn-sm" id="factory-reset-btn" style="margin-left:auto">
            <i data-lucide="trash-2" class="icon"></i> Factory Reset All Data
          </button>
        </div>
      </div>
    </div>
  `;

  if (window.lucide) lucide.createIcons();
  bindSettingsEvents();
}

function bindSettingsEvents() {
  const testGasBtn = $('#test-gas-btn');
  if (testGasBtn) {
    testGasBtn.onclick = async () => {
      const url = $('#st-gas-url').value.trim();
      STATE.settings.gasUrl = url;
      saveStorage(LS_KEYS.SETTINGS, STATE.settings);

      if (!url) {
        showToast('info', 'Google Sheets URL cleared. Operating offline.');
        return;
      }

      showToast('info', 'Connecting to Google Sheets...');
      try {
        if (window.triggerGoogleSheetsSync) {
          await window.triggerGoogleSheetsSync();
        }
      } catch(e) {
        showToast('error', 'Sync failed: ' + e.message);
      }
    };
  }

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
        $('#st-logo-url').value = base64Url;
        saveStorage(LS_KEYS.SETTINGS, STATE.settings);
        showToast('success', 'Logo updated successfully!');
        injectShellLayout('settings', 'System Settings');
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
      injectShellLayout('settings', 'System Settings');
      renderSettingsPage();
    };
  }

  const saveBrandingBtn = $('#save-branding-btn');
  if (saveBrandingBtn) {
    saveBrandingBtn.onclick = async () => {
      STATE.settings.tuitionName = $('#st-tuition-name').value.trim() || 'Tuition Center';
      STATE.settings.logoUrl = $('#st-logo-url').value.trim();
      STATE.settings.teacherName = $('#st-teacher-name').value.trim();
      STATE.settings.teacherPhone = $('#st-teacher-phone').value.trim();
      STATE.settings.teacherWhatsapp = $('#st-teacher-wa').value.trim();
      STATE.settings.liveClassLink = $('#st-live-link').value.trim();

      saveStorage(LS_KEYS.SETTINGS, STATE.settings);
      showToast('success', 'Center branding details updated!');
      injectShellLayout('settings', 'System Settings');
      renderSettingsPage();

      if (STATE.settings.gasUrl && window.apiRequest) {
        try { await window.apiRequest('saveSettings', { settings: STATE.settings }); } catch(e) {}
      }
    };
  }

  const saveDefaultsBtn = $('#save-defaults-btn');
  if (saveDefaultsBtn) {
    saveDefaultsBtn.onclick = () => {
      STATE.settings.currency = $('#st-currency').value.trim() || '₹';
      STATE.settings.idPrefix = $('#st-id-prefix').value.trim() || 'ST';
      STATE.settings.defaultMonthlyFee = Number($('#st-default-fee').value) || 1000;
      STATE.settings.defaultBatch = $('#st-default-batch').value.trim() || 'Grade 10';

      saveStorage(LS_KEYS.SETTINGS, STATE.settings);
      showToast('success', 'Fee defaults saved!');
    };
  }

  const instructionsBtn = $('#view-gs-instructions-btn');
  if (instructionsBtn) {
    instructionsBtn.onclick = () => openCodeGsModal();
  }

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
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", `tuitionhub_backup_${todayISO()}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      showToast('success', 'System backup exported');
    };
  }

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
          if (parsed.settings) STATE.settings = Object.assign({}, STATE.settings, parsed.settings);

          saveAllState();
          showToast('success', 'Backup restored successfully');
          renderSettingsPage();
        } catch(err) {
          showToast('error', 'Invalid JSON backup file');
        }
      };
      reader.readAsText(file);
    };
  }

  const resetBtn = $('#factory-reset-btn');
  if (resetBtn) {
    resetBtn.onclick = () => {
      if (confirm('CRITICAL WARNING: This will erase all local students, attendance, fees, and settings! Proceed?')) {
        localStorage.clear();
        showToast('info', 'System reset. Reloading page...');
        setTimeout(() => location.reload(), 800);
      }
    };
  }
}

function openCodeGsModal() {
  const html = `
    <div class="modal-header">
      <h3>Google Apps Script (code.gs) Setup Instructions</h3>
      <button class="icon-btn" data-modal-close><i data-lucide="x" class="icon"></i></button>
    </div>
    <div class="modal-body" style="font-size:13.5px;line-height:1.6">
      <p>Follow these steps to connect TuitionHub to your Google Spreadsheet:</p>
      <ol style="padding-left:20px;display:flex;flex-direction:column;gap:8px;margin-top:8px">
        <li>Open <a href="https://sheets.new" target="_blank" style="color:var(--primary);text-decoration:underline">sheets.new</a> to create a new blank Google Sheet.</li>
        <li>Click <strong>Extensions &gt; Apps Script</strong> in the top menu.</li>
        <li>Replace all existing code in the script editor with the contents of <code>code.gs</code> from this project.</li>
        <li>Click <strong>Deploy &gt; New deployment</strong>.</li>
        <li>Select type: <strong>Web app</strong>.</li>
        <li>Set <strong>Execute as:</strong> <em>Me</em> and <strong>Who has access:</strong> <em>Anyone</em>.</li>
        <li>Click <strong>Deploy</strong> and copy the resulting <strong>Web App URL</strong>.</li>
        <li>Paste the Web App URL in the settings box above and click <strong>Save & Test Sync</strong>.</li>
      </ol>
    </div>
    <div class="modal-footer">
      <button class="btn btn-primary" data-modal-close>Got It</button>
    </div>
  `;

  ModalManager.open(html, { wide: true });
}
