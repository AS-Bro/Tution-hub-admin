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
  if (!getGasUrl()) {
    console.warn('Google Sheets fee data was not fetched because no Web App URL is configured.');
    return;
  }
  try {
    const res = await apiRequest('getInitialData');
    if (!res) {
      console.warn('Google Sheets returned an empty initial-data response.');
      return;
    }

    const data = res.data || res;
    if (!data || typeof data !== 'object') {
      console.warn('Google Sheets returned invalid initial data.');
      return;
    }

    if (Array.isArray(data.students) && data.students.length > 0) { STATE.students = data.students; saveStorage(LS_KEYS.STUDENTS, STATE.students); }
    if (Array.isArray(data.attendance)) { STATE.attendance = data.attendance; saveStorage(LS_KEYS.ATTENDANCE, STATE.attendance); }
    const feeRows = Array.isArray(data)
      ? data
      : data.fees || data.Fees || data.feeRecords || data.payments || data.fee;
    if (Array.isArray(feeRows)) {
      STATE.fees = feeRows.map(normalizeGoogleSheetFeeRecord);
      saveStorage(LS_KEYS.FEES, STATE.fees);
      if (STATE.fees.length === 0) console.warn('Google Sheets returned no fee records.');
      else console.info(`Loaded ${STATE.fees.length} fee records from Google Sheets.`);
    } else {
      console.warn('Google Sheets initial data did not include a fee records array.');
    }
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
  } catch (e) {
    console.error('Failed to fetch initial data from Google Sheets:', e);
  }
}

function normalizeGoogleSheetFeeRecord(record) {
  if (!record || typeof record !== 'object') return record;

  const fields = Object.keys(record).reduce((map, key) => {
    map[key.toLowerCase().replace(/[^a-z0-9]/g, '')] = record[key];
    return map;
  }, {});
  const getValue = (...names) => {
    for (const name of names) {
      const value = fields[name.toLowerCase().replace(/[^a-z0-9]/g, '')];
      if (value !== undefined && value !== null && value !== '') return value;
    }
    return '';
  };
  const amountValue = getValue('amount', 'amountPaid', 'paidAmount', 'collectedAmount', 'amountCollected', 'paymentAmount');
  const amount = typeof amountValue === 'number'
    ? amountValue
    : Number(String(amountValue).replace(/[^0-9.-]/g, '')) || 0;
  const rawStatus = String(getValue('status', 'paymentStatus', 'feeStatus') || '').trim().toLowerCase();
  const status = ['paid', 'complete', 'completed', 'received', 'success', 'successful'].includes(rawStatus)
    ? 'Paid'
    : rawStatus
      ? 'Pending'
      : amount > 0 ? 'Paid' : 'Pending';

  return Object.assign({}, record, {
    studentId: String(getValue('studentId', 'studentID', 'student_id') || ''),
    studentName: String(getValue('studentName', 'name') || ''),
    batch: String(getValue('batch', 'grade', 'class') || ''),
    month: String(getValue('month', 'feeMonth', 'paymentMonth', 'period') || ''),
    amount,
    date: normalizeGoogleSheetFeeDate(getValue('date', 'datePaid', 'paymentDate', 'paidDate', 'transactionDate')),
    paymentMode: String(getValue('paymentMode', 'mode', 'paymentMethod') || 'Cash'),
    status
  });
}

function normalizeGoogleSheetFeeDate(value) {
  if (!value) return '';
  if (value instanceof Date && !Number.isNaN(value.getTime())) return dateToISO(value);

  const dateValue = String(value).trim();
  const isoMatch = dateValue.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (isoMatch) {
    const [, year, month, day] = isoMatch;
    const date = new Date(Number(year), Number(month) - 1, Number(day));
    return date.getFullYear() === Number(year) && date.getMonth() === Number(month) - 1 && date.getDate() === Number(day)
      ? dateToISO(date)
      : dateValue;
  }

  const slashMatch = dateValue.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (slashMatch) {
    const [, first, second, year] = slashMatch;
    const firstValue = Number(first);
    const secondValue = Number(second);
    const month = firstValue > 12 ? secondValue : firstValue;
    const day = firstValue > 12 ? firstValue : secondValue;
    const date = new Date(Number(year), month - 1, day);
    if (date.getFullYear() === Number(year) && date.getMonth() === month - 1 && date.getDate() === day) return dateToISO(date);
  }

  return dateValue;
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
