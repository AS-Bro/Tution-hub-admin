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

    const data = getGoogleSheetsInitialData(res);
    if (!data || typeof data !== 'object') {
      console.warn('Google Sheets returned invalid initial data.');
      return;
    }

    if (Array.isArray(data.students) && data.students.length > 0) { STATE.students = data.students; saveStorage(LS_KEYS.STUDENTS, STATE.students); }
    if (Array.isArray(data.attendance)) { STATE.attendance = data.attendance; saveStorage(LS_KEYS.ATTENDANCE, STATE.attendance); }
    const feeCandidates = getGoogleSheetFeeCandidates(data);
    if (feeCandidates.length > 0) {
      const feeResults = feeCandidates.map(rows => normalizeGoogleSheetFeeRows(rows)
        .filter(record => record && record.studentId && record.month));
      const fetchedFees = feeResults.reduce((best, records) => records.length > best.length ? records : best, []);
      const hasLocalFees = Array.isArray(STATE.fees)
        ? STATE.fees.length > 0
        : STATE.fees && typeof STATE.fees === 'object' && Object.keys(STATE.fees).length > 0;
      if (fetchedFees.length > 0 || !hasLocalFees) {
        STATE.fees = fetchedFees;
        saveStorage(LS_KEYS.FEES, STATE.fees);
        if (fetchedFees.length > 0) console.info(`Loaded ${STATE.fees.length} fee records from Google Sheets.`);
        else console.warn('Google Sheets returned no fee records.');
      } else {
        console.warn('Google Sheets returned no usable fee records; keeping the existing local fee ledger.');
      }
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

function getGoogleSheetsInitialData(response) {
  let data = response;
  for (let depth = 0; depth < 3 && data && !Array.isArray(data); depth++) {
    if (data.data && typeof data.data === 'object') data = data.data;
    else if (data.initialData && typeof data.initialData === 'object') data = data.initialData;
    else if (data.result && typeof data.result === 'object') data = data.result;
    else break;
  }
  return data;
}

function getGoogleSheetFeeCandidates(data) {
  if (Array.isArray(data)) return [data];
  if (!data || typeof data !== 'object') return [];

  const feeFieldNames = new Set([
    'fees', 'feerecords', 'feeledger', 'feedata', 'feepayments',
    'paymentrecords', 'payments', 'fee'
  ]);
  const candidates = [];
  const inspect = (value, depth) => {
    if (!value || typeof value !== 'object' || depth > 3) return;
    Object.entries(value).forEach(([key, child]) => {
      const normalizedKey = key.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (feeFieldNames.has(normalizedKey) && child && typeof child === 'object') {
        candidates.push(child);
      } else if (['tables', 'sheets', 'data', 'initialdata', 'result'].includes(normalizedKey) &&
          child && typeof child === 'object' && !Array.isArray(child)) {
        inspect(child, depth + 1);
      }
    });
  };
  inspect(data, 0);
  if (!candidates.length && isGoogleSheetFeeLedgerMap(data)) candidates.push(data);
  return candidates;
}

function isGoogleSheetFeeLedgerMap(value) {
  const entries = Object.entries(value || {});
  return entries.some(([key, record]) => {
    if (!record || typeof record !== 'object' || Array.isArray(record) || !parseGoogleSheetFeeCompositeKey(key)) return false;
    const fields = Object.keys(record).map(field => field.toLowerCase().replace(/[^a-z0-9]/g, ''));
    return fields.some(field => ['amount', 'amountpaid', 'paidamount', 'status', 'paymentstatus', 'paymentmethod'].includes(field));
  });
}

function normalizeGoogleSheetFeeRows(feeRows) {
  const isArray = Array.isArray(feeRows);
  const fields = !isArray && feeRows && typeof feeRows === 'object'
    ? Object.keys(feeRows).map(key => key.toLowerCase().replace(/[^a-z0-9]/g, ''))
    : [];
  const isSingleRecord = fields.some(key =>
    ['studentid', 'student', 'admissionid', 'admissionnumber', 'studentmonth', 'studentmonthkey',
      'studentperiod', 'studentperiodkey', 'compositekey', 'paymentkey'].includes(key)
  );
  const explicitHeaders = !isArray && feeRows
    ? (Array.isArray(feeRows.headers) ? feeRows.headers : Array.isArray(feeRows.columns) ? feeRows.columns : null)
    : null;
  const nestedRows = !isArray && feeRows
    ? [feeRows.records, feeRows.rows, feeRows.items, feeRows.values, feeRows.data].find(Array.isArray)
    : null;
  const rowSource = isArray ? feeRows : nestedRows || (isSingleRecord ? [feeRows] : Object.entries(feeRows || {}));
  let headers = explicitHeaders;
  let rows = rowSource;

  if (Array.isArray(rows) && rows.length && Array.isArray(rows[0])) {
    if (!headers && isFeeHeaderRow(rows[0])) {
      headers = rows[0];
      rows = rows.slice(1);
    }
  }

  return rows.map((entry, index) => {
    const keyedEntry = !isArray && !nestedRows && !isSingleRecord && Array.isArray(rowSource)
      ? entry
      : null;
    const record = keyedEntry ? keyedEntry[1] : entry;
    const sourceKey = keyedEntry ? keyedEntry[0] : '';
    return normalizeGoogleSheetFeeRecord(record, sourceKey, headers);
  });
}

function isFeeHeaderRow(row) {
  const headers = row.map(value => String(value || '').toLowerCase().replace(/[^a-z0-9]/g, ''));
  const hasStudent = headers.some(value => ['studentid', 'student', 'admissionid', 'admissionnumber'].includes(value));
  const hasPeriod = headers.some(value =>
    ['month', 'feemonth', 'paymentmonth', 'period', 'selectedperiod', 'feeperiod', 'periodkey', 'billingperiod', 'monthyear'].includes(value)
  );
  return hasStudent && hasPeriod;
}

function normalizeGoogleSheetFeeRecord(record, sourceKey = '', headers = null) {
  if (!record || typeof record !== 'object') return record;
  if (Array.isArray(record)) {
    if (!Array.isArray(headers) || !headers.length) return null;
    record = headers.reduce((mapped, header, index) => {
      mapped[String(header || `column${index + 1}`)] = record[index];
      return mapped;
    }, {});
  }

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
  const compositeKey = String(getValue('compositeKey', 'paymentKey', 'ledgerKey', 'studentMonthKey', 'studentPeriodKey', 'studentMonth', 'studentPeriod', 'key', 'recordKey') || sourceKey || '');
  const compositeParts = parseGoogleSheetFeeCompositeKey(compositeKey);
  const dateValue = getValue('date', 'datePaid', 'paymentDate', 'paidDate', 'transactionDate');
  const amountValue = getValue('amount', 'amountPaid', 'paidAmount', 'feeAmountPaid', 'collectedAmount', 'amountCollected', 'paymentAmount');
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
    studentId: String(getValue('studentId', 'studentID', 'student_id', 'student', 'admissionId', 'admissionNumber') || (compositeParts && compositeParts.studentId) || '').trim(),
    studentName: String(getValue('studentName', 'name') || ''),
    batch: String(getValue('batch', 'grade', 'class') || ''),
    month: normalizeGoogleSheetFeeMonth(getValue('month', 'feeMonth', 'paymentMonth', 'period', 'selectedPeriod', 'feePeriod', 'periodKey', 'billingPeriod', 'monthYear') || (compositeParts && compositeParts.month) || dateValue),
    amount,
    date: normalizeGoogleSheetFeeDate(dateValue),
    paymentMode: String(getValue('paymentMode', 'mode', 'paymentMethod') || 'Cash'),
    status
  });
}

function parseGoogleSheetFeeCompositeKey(value) {
  const key = String(value || '').trim();
  const match = key.match(/^(.+?)[_|:](.+)$/);
  if (!match) return null;
  return { studentId: match[1].trim(), month: normalizeGoogleSheetFeeMonth(match[2]) };
}

function normalizeGoogleSheetFeeMonth(value) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  }
  if (typeof value === 'number' && Number.isFinite(value) && value >= 20000 && value <= 80000) {
    const sheetDate = new Date(Date.UTC(1899, 11, 30) + value * 86400000);
    return sheetDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' });
  }
  const text = String(value || '').trim();
  if (!text) return '';
  const dateMatch = text.match(/^(\d{4})[-/](\d{1,2})(?:[-/]\d{1,2})?(?:T.*)?$/);
  if (dateMatch) {
    const year = Number(dateMatch[1]), month = Number(dateMatch[2]);
    if (month >= 1 && month <= 12) return new Date(year, month - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  }
  const slashDate = text.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (slashDate) {
    const first = Number(slashDate[1]), second = Number(slashDate[2]), year = Number(slashDate[3]);
    const month = first > 12 ? second : first;
    if (month >= 1 && month <= 12) return new Date(year, month - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  }
  const separatedMonth = text.match(/^([a-z]+)[\s,._/-]+(\d{4})$/i);
  if (separatedMonth) {
    const date = new Date(`${separatedMonth[1]} 1, ${separatedMonth[2]}`);
    if (!Number.isNaN(date.getTime())) return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  }
  return text;
}

function normalizeGoogleSheetFeeDate(value) {
  if (!value) return '';
  if (value instanceof Date && !Number.isNaN(value.getTime())) return dateToISO(value);
  if (typeof value === 'number' && Number.isFinite(value) && value >= 20000 && value <= 80000) {
    const serialDate = new Date(Date.UTC(1899, 11, 30) + value * 86400000);
    return [serialDate.getUTCFullYear(), String(serialDate.getUTCMonth() + 1).padStart(2, '0'),
      String(serialDate.getUTCDate()).padStart(2, '0')].join('-');
  }

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
