/* ==========================================================================
   TuitionHub — Google Sheets Sync Engine (google-sheets-sync.js)
   Integrates directly with Google Apps Script (code.gs) backend endpoint
   ========================================================================== */

// GOOGLE SHEETS CONFIGURATION
const GOOGLE_SHEETS_WEB_APP_URL = "https://script.google.com/macros/s/AKfycbxwQ6DxfQYFTfraO5XtrLrT1IpsvRQv3jHlkmeDmLadMErSbfxJI2pQf_lLmlST8uA/exec";

function getGasUrl() {
  return GOOGLE_SHEETS_WEB_APP_URL || (STATE.settings && STATE.settings.gasUrl) || "";
}
window.getGoogleSheetsUrl = getGasUrl;

function setSyncState(status) {
  STATE.syncStatus = status;
  const dot = $('#sync-dot'), txt = $('#sync-text');
  if (dot && txt) {
    dot.className = 'sync-dot ' + status;
    txt.textContent = status === 'synced' ? 'Synced' : status === 'saving' ? 'Saving...' : 'Offline';
  }
}

async function apiRequest(action, payload = {}) {
  const url = getGasUrl();
  if (!url) {
    setSyncState('offline');
    return null;
  }
  setSyncState('saving');

  // Method 1: Try POST request
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action, ...payload }),
      redirect: 'follow'
    });

    if (res.ok) {
      const data = await res.json();
      if (data && data.success !== false) {
        setSyncState('synced');
        STATE.settings.lastSync = Date.now();
        STATE.settings.connected = true;
        saveStorage(LS_KEYS.SETTINGS, STATE.settings);
        return data;
      }
    }
  } catch (e) {
    console.warn('POST sync attempt failed, trying GET fallback:', e);
  }

  // Method 2: Fallback to GET request with URL parameters
  try {
    const getUrl = url + (url.includes('?') ? '&' : '?') + 'action=' + encodeURIComponent(action) + '&payload=' + encodeURIComponent(JSON.stringify(payload));
    const resGet = await fetch(getUrl, { method: 'GET', redirect: 'follow' });
    if (resGet.ok) {
      const dataGet = await resGet.json();
      if (dataGet && dataGet.success !== false) {
        setSyncState('synced');
        STATE.settings.lastSync = Date.now();
        STATE.settings.connected = true;
        saveStorage(LS_KEYS.SETTINGS, STATE.settings);
        return dataGet;
      }
    }
  } catch (getErr) {
    console.warn('GET sync fallback failed:', getErr);
  }

  setSyncState('offline');
  showToast('warning', 'Google Sheets sync failed. Make sure your Apps Script Web App is deployed with access "Anyone".');
  throw new Error('Google Sheets sync connection failed.');
}

async function fetchGoogleSheetsData() {
  if (!getGasUrl()) return;
  try {
    const res = await apiRequest('getInitialData');
    if (res) {
      const data = res.data || res;
      if (data) {
        if (Array.isArray(data.students) && data.students.length > 0) { STATE.students = data.students; saveStorage(LS_KEYS.STUDENTS, STATE.students); }
        if (Array.isArray(data.attendance)) { STATE.attendance = data.attendance; saveStorage(LS_KEYS.ATTENDANCE, STATE.attendance); }
        if (Array.isArray(data.fees)) { STATE.fees = data.fees; saveStorage(LS_KEYS.FEES, STATE.fees); }
        if (Array.isArray(data.exams)) { STATE.exams = data.exams; saveStorage(LS_KEYS.EXAMS, STATE.exams); }
        if (data.examMarks && typeof data.examMarks === 'object') { STATE.examMarks = data.examMarks; saveStorage(LS_KEYS.EXAM_MARKS, STATE.examMarks); }
        if (Array.isArray(data.notices)) { STATE.notices = data.notices; saveStorage(LS_KEYS.NOTICES, STATE.notices); }
        if (Array.isArray(data.schedule)) { STATE.schedule = data.schedule; saveStorage(LS_KEYS.SCHEDULE, STATE.schedule); }
        if (data.settings && typeof data.settings === 'object' && Object.keys(data.settings).length > 0) {
          // Deep-merge settings to avoid overwriting nested preference objects like appearance
          STATE.settings = Object.assign({}, STATE.settings, data.settings, {
            appearance: Object.assign({}, STATE.settings.appearance || {}, data.settings.appearance || {}),
            receiptSettings: Object.assign({}, STATE.settings.receiptSettings || {}, data.settings.receiptSettings || {}),
            whatsappTemplates: Object.assign({}, STATE.settings.whatsappTemplates || {}, data.settings.whatsappTemplates || {}),
            dashboardWidgets: Object.assign({}, STATE.settings.dashboardWidgets || {}, data.settings.dashboardWidgets || {}),
            academicSettings: Object.assign({}, STATE.settings.academicSettings || {}, data.settings.academicSettings || {})
          });
          saveStorage(LS_KEYS.SETTINGS, STATE.settings);
          // Re-apply theme and appearance so UI remains consistent after sync
          try {
            const themeToApply = (STATE.settings.appearance && STATE.settings.appearance.theme) || STATE.theme || 'light';
            applyTheme(themeToApply);
            applyAppearanceSettings();
          } catch (err) { /* ignore if functions not available yet */ }
        }
        showToast('success', 'Google Sheets data synced successfully');
        if (window.onSyncComplete) window.onSyncComplete();
      }
    }
  } catch (e) {
    console.warn('Initial sync error:', e);
  }
}

window.apiRequest = apiRequest;
window.triggerGoogleSheetsSync = function () {
  fetchGoogleSheetsData();
};

/* Auto-sync on page load if GAS URL is configured */
document.addEventListener('DOMContentLoaded', () => {
  if (getGasUrl()) {
    fetchGoogleSheetsData();
  }
});
