/**
 * TuitionHub Google Sheets Web App backend.
 * Bind this script to the TuitionHub spreadsheet, or set SPREADSHEET_ID
 * in Script Properties when using a standalone Apps Script project.
 */
var SPREADSHEET_ID = '';

var SHEET_CONFIG = {
  students: {
    names: ['Students', 'Student'],
    headers: ['studentId', 'studentName', 'batch', 'phone', 'parentName', 'monthlyFee', 'status', 'joiningDate']
  },
  attendance: {
    names: ['Attendance', 'Attendance Register'],
    headers: ['id', 'studentId', 'studentName', 'batch', 'date', 'status']
  },
  fees: {
    names: ['Fees', 'Fee Ledger', 'Fee Payments', 'Fee Records', 'Fee'],
    headers: ['id', 'studentId', 'studentName', 'batch', 'month', 'amount', 'transactionAmount', 'baseAmount', 'expectedAmount', 'date', 'paymentMode', 'status']
  },
  exams: {
    names: ['Exams', 'Tests'],
    headers: ['id', 'testName', 'subject', 'chapter', 'testTitle', 'batch', 'totalMarks', 'date']
  },
  examMarks: {
    names: ['Exam Marks', 'ExamMarks', 'Marks'],
    headers: ['examId', 'studentId', 'marks']
  },
  notices: {
    names: ['Notices', 'Notice Board'],
    headers: ['id', 'title', 'category', 'content', 'batch', 'date']
  },
  schedule: {
    names: ['Schedule', 'Timetable', 'Class Schedule'],
    headers: ['id', 'subject', 'batch', 'time', 'days', 'teacher', 'room']
  },
  materials: {
    names: ['Materials', 'Study Materials'],
    headers: ['id', 'title', 'subject', 'batch', 'type', 'description', 'url', 'createdDate']
  },
  settings: {
    names: ['Settings', 'App Settings'],
    headers: ['key', 'value']
  }
};

var FEE_HEADER_ALIASES = {
  id: ['id', 'recordid', 'paymentid', 'feeid'],
  studentId: ['studentid', 'student', 'admissionid', 'admissionnumber', 'studentcode'],
  studentName: ['studentname', 'name'],
  batch: ['batch', 'grade', 'class'],
  month: ['month', 'feemonth', 'paymentmonth', 'paymentmonthperiod', 'period', 'selectedperiod', 'feeperiod', 'periodkey', 'billingperiod', 'monthyear'],
  amount: ['amount', 'amountpaid', 'paidamount', 'feeamountpaid', 'collectedamount', 'amountcollected', 'paymentamount', 'paid'],
  transactionAmount: ['transactionamount', 'lastpaymentamount', 'paymenttransactionamount'],
  baseAmount: ['baseamount', 'monthlyamount', 'monthlyfee', 'feeamount', 'basefee'],
  expectedAmount: ['expectedamount', 'amountdue', 'totaldue', 'totalamountdue', 'totalamount', 'feeexpectedamount'],
  date: ['date', 'datepaid', 'paymentdate', 'dateofpayment', 'paiddate', 'transactiondate'],
  paymentMode: ['paymentmode', 'mode', 'paymentmethod'],
  status: ['status', 'paymentstatus', 'feestatus']
};

var GENERAL_HEADER_ALIASES = {
  examId: ['examid', 'testid'],
  testName: ['testname', 'examname', 'testtitle'],
  totalMarks: ['totalmarks', 'maxmarks', 'maximummarks'],
  marks: ['marks', 'markdata', 'marksjson'],
  joiningDate: ['joiningdate', 'datejoined'],
  parentName: ['parentname', 'guardianname'],
  monthlyFee: ['monthlyfee', 'feepermonth'],
  phone: ['phone', 'phonenumber', 'contactnumber'],
  title: ['title', 'noticetitle'],
  category: ['category', 'type'],
  content: ['content', 'description', 'message'],
  key: ['key', 'setting', 'settingname'],
  value: ['value', 'settingvalue'],
  time: ['time', 'classtime'],
  days: ['days', 'weekdays'],
  teacher: ['teacher', 'instructor'],
  room: ['room', 'link', 'classlink']
};

function doGet(e) {
  try {
    var action = e && e.parameter ? String(e.parameter.action || 'getInitialData') : 'getInitialData';
    var payload = {};
    if (e && e.parameter && e.parameter.payload) {
      try {
        payload = JSON.parse(e.parameter.payload);
      } catch (parseError) {
        return jsonResponse({ success: false, error: 'Invalid JSON payload.' });
      }
    }
    return jsonResponse(dispatchAction(action, payload));
  } catch (error) {
    console.error('TuitionHub GET error: ' + error.stack);
    return jsonResponse({ success: false, error: error.message || String(error) });
  }
}

function doPost(e) {
  try {
    var request = {};
    var body = e && e.postData && e.postData.contents ? e.postData.contents : '';
    if (body) {
      request = JSON.parse(body);
    } else if (e && e.parameter) {
      request = e.parameter;
      if (request.payload) request = Object.assign({}, request, JSON.parse(request.payload));
    }
    var action = String(request.action || 'getInitialData');
    return jsonResponse(dispatchAction(action, request));
  } catch (error) {
    console.error('TuitionHub POST error: ' + error.stack);
    return jsonResponse({ success: false, error: error.message || String(error) });
  }
}

function dispatchAction(action, payload) {
  switch (String(action || 'getInitialData').toLowerCase()) {
    case 'getinitialdata':
    case 'getalldata':
      return { success: true, data: getAllData() };
    case 'getfees':
    case 'getfeesdata':
      var fees = getFeesData();
      return { success: true, data: fees, fees: fees };
    case 'getmaterials':
      var materials = getMaterialsData();
      return { success: true, data: materials, materials: materials };
    case 'savematerial':
      return saveMaterialRecord(payload.material || payload.record || payload);
    case 'deletematerial':
      return deleteMaterialRecord(payload.id || payload.materialId);
    case 'savefee':
      return saveFee(payload.record || payload.fee || payload);
    case 'savestudent':
      return saveStudent(payload.student || payload);
    case 'deletestudent':
      return deleteStudent(payload.studentId);
    case 'saveattendance':
      return saveAttendance(payload);
    case 'saveexam':
      return saveExam(payload.exam || payload);
    case 'savemarks':
      return saveExamMarks(payload);
    case 'savenotice':
      return saveNotices(payload);
    case 'saveschedule':
      return saveSchedule(payload);
    case 'savesettings':
      return saveSettings(payload.settings || payload);
    default:
      return { success: false, error: 'Unsupported action: ' + action };
  }
}

function getAllData() {
  return {
    students: getSheetRecords_('students'),
    attendance: getSheetRecords_('attendance'),
    fees: getFeesData(),
    exams: getSheetRecords_('exams'),
    examMarks: getExamMarksData_(),
    notices: getSheetRecords_('notices'),
    schedule: getSheetRecords_('schedule'),
    materials: getMaterialsData(),
    settings: getSettingsData_()
  };
}

function getMaterialsData() {
  return getSheetRecords_('materials').map(function(record) {
    return normalizeMaterialRecord_(record);
  }).filter(function(record) {
    return record.id && record.title;
  });
}

function saveMaterialRecord(payload) {
  if (!payload || typeof payload !== 'object') throw new Error('Material record is required.');
  var material = normalizeMaterialRecord_(payload.material || payload.record || payload);
  if (!material.title || !material.subject || !material.batch || !material.url) {
    throw new Error('Material title, subject, batch, and URL are required.');
  }
  if (!/^https?:\/\//i.test(material.url)) throw new Error('Material URL must use http or https.');
  if (['note', 'pdf', 'text', 'class', 'other'].indexOf(material.type) < 0) {
    throw new Error('Material type is invalid.');
  }
  if (!material.id) material.id = 'mat-' + Utilities.getUuid();
  if (!material.createdDate) material.createdDate = normalizeDate_(new Date());
  var result = upsertRecord_('materials', material, ['id']);
  return { success: true, data: normalizeMaterialRecord_(result.data) };
}

function deleteMaterialRecord(id) {
  var materialId = String(id || '').trim();
  if (!materialId) throw new Error('Material id is required.');
  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    var sheet = getSheet_('materials', true);
    var headers = ensureHeaders_(sheet, SHEET_CONFIG.materials.headers);
    var idColumn = findHeaderColumn_(headers, 'id');
    var lastRow = sheet.getLastRow();
    for (var row = lastRow; row >= 2; row--) {
      if (String(sheet.getRange(row, idColumn + 1).getValue()).trim() === materialId) {
        sheet.deleteRow(row);
        return { success: true, id: materialId, deleted: true };
      }
    }
    return { success: true, id: materialId, deleted: false };
  } finally {
    lock.releaseLock();
  }
}

function normalizeMaterialRecord_(record) {
  var source = record || {};
  return {
    id: String(source.id || '').trim(),
    title: String(source.title || '').trim(),
    subject: String(source.subject || '').trim(),
    batch: String(source.batch || '').trim(),
    type: String(source.type || 'other').trim().toLowerCase(),
    description: String(source.description || '').trim(),
    url: String(source.url || '').trim(),
    createdDate: normalizeDate_(source.createdDate || source.date || '')
  };
}

/**
 * Public fee retrieval function used by getInitialData, getAllData and getFees.
 * The returned records always contain the frontend's canonical fee properties.
 */
function getFeesData() {
  var sheet = getSheet_('fees', true);
  var headers = ensureHeaders_(sheet, SHEET_CONFIG.fees.headers);
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];

  var values = sheet.getRange(2, 1, lastRow - 1, headers.length).getValues();
  var monthColumn = findHeaderColumn_(headers, 'month');
  var dateColumn = findHeaderColumn_(headers, 'date');
  var changed = false;
  var records = values.map(function(row) {
    var record = rowToObject_(headers, row);
    var normalized = normalizeFeeRecord_(record);
    if (!normalized.studentId || !normalized.month) return null;

    if (monthColumn >= 0 && row[monthColumn] !== normalized.month) {
      row[monthColumn] = normalized.month;
      changed = true;
    }
    if (dateColumn >= 0 && normalized.date && row[dateColumn] !== normalized.date) {
      row[dateColumn] = normalized.date;
      changed = true;
    }
    return normalized;
  }).filter(Boolean);

  if (monthColumn >= 0) sheet.getRange(1, monthColumn + 1, Math.max(lastRow, 1), 1).setNumberFormat('@');
  if (dateColumn >= 0) sheet.getRange(1, dateColumn + 1, Math.max(lastRow, 1), 1).setNumberFormat('@');
  if (changed) sheet.getRange(2, 1, values.length, headers.length).setValues(values);
  return records;
}

function saveFee(record) {
  if (!record || typeof record !== 'object') throw new Error('Fee record is required.');
  var normalized = normalizeFeeRecord_(record);
  if (!normalized.studentId || !normalized.month) {
    throw new Error('Fee record must include studentId and month.');
  }

  var result = upsertRecord_('fees', normalized, ['studentId', 'month'], ['id']);
  var sheet = getSheet_('fees', true);
  var headers = ensureHeaders_(sheet, SHEET_CONFIG.fees.headers);
  formatFeeDateColumns_(sheet, headers);
  return { success: true, data: normalizeFeeRecord_(result.data) };
}

function normalizeFeeRecord_(record) {
  var values = normalizeObjectKeys_(record || {});
  var composite = parseFeeKey_(values.compositekey || values.paymentkey || values.ledgerkey ||
    values.studentmonthkey || values.studentperiodkey || values.studentmonth ||
    values.studentperiod || values.key || values.recordkey);
  var dateValue = firstValue_(values, FEE_HEADER_ALIASES.date);
  var monthValue = firstValue_(values, FEE_HEADER_ALIASES.month);
  if (!monthValue && composite) monthValue = composite.month;
  if (!monthValue && dateValue) monthValue = dateValue;

  var amountValue = firstValue_(values, FEE_HEADER_ALIASES.amount);
  var transactionAmountValue = firstValue_(values, FEE_HEADER_ALIASES.transactionAmount);
  var amount = parseAmount_(amountValue !== '' ? amountValue : transactionAmountValue);
  var statusValue = String(firstValue_(values, FEE_HEADER_ALIASES.status) || '').trim().toLowerCase();
  var paidStatuses = ['paid', 'complete', 'completed', 'received', 'success', 'successful'];
  var status = paidStatuses.indexOf(statusValue) >= 0
    ? 'Paid'
    : statusValue
      ? 'Pending'
      : amount > 0 ? 'Paid' : 'Pending';

  var result = Object.assign({}, record);
  result.id = String(firstValue_(values, FEE_HEADER_ALIASES.id) || '');
  result.studentId = String(firstValue_(values, FEE_HEADER_ALIASES.studentId) ||
    (composite && composite.studentId) || '').trim();
  result.studentName = String(firstValue_(values, FEE_HEADER_ALIASES.studentName) || '');
  result.batch = String(firstValue_(values, FEE_HEADER_ALIASES.batch) || '');
  result.month = normalizeMonth_(monthValue);
  result.amount = amount;
  result.transactionAmount = parseAmount_(transactionAmountValue);
  result.baseAmount = parseAmount_(firstValue_(values, FEE_HEADER_ALIASES.baseAmount));
  result.expectedAmount = parseAmount_(firstValue_(values, FEE_HEADER_ALIASES.expectedAmount));
  result.date = normalizeDate_(dateValue);
  result.paymentMode = String(firstValue_(values, FEE_HEADER_ALIASES.paymentMode) || 'Cash');
  result.status = status;
  return result;
}

function getSheetRecords_(type) {
  var sheet = getSheet_(type, true);
  var headers = ensureHeaders_(sheet, SHEET_CONFIG[type].headers);
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];
  return sheet.getRange(2, 1, lastRow - 1, headers.length).getValues()
    .map(function(row) { return rowToObject_(headers, row); })
    .filter(function(record) {
      return Object.keys(record).some(function(key) { return record[key] !== '' && record[key] !== null; });
    });
}

function getExamMarksData_() {
  var records = getSheetRecords_('examMarks');
  var result = {};
  records.forEach(function(record) {
    if (!record.examId || record.studentId) return;
    var marks = record.marks;
    if (typeof marks === 'string') {
      try {
        marks = JSON.parse(marks);
      } catch (error) {
        marks = {};
      }
    }
    if (!marks || typeof marks !== 'object' || Array.isArray(marks)) return;
    result[record.examId] = Object.assign(result[record.examId] || {}, marks);
  });
  records.forEach(function(record) {
    if (!record.examId || !record.studentId) return;
    if (!result[record.examId]) result[record.examId] = {};
    result[record.examId][record.studentId] = record.marks;
  });
  return result;
}

function getSettingsData_() {
  var records = getSheetRecords_('settings');
  var settings = { tuitionLogo: '' };
  var hasTuitionLogo = false;
  records.forEach(function(record) {
    var key = valueForHeader_(record, 'key') || record.name;
    if (!key) return;
    var value = valueForHeader_(record, 'value');
    if (typeof value === 'string') {
      try {
        value = JSON.parse(value);
      } catch (error) {
        // Keep plain text setting values as strings.
      }
    }
    settings[key] = value;
    if (String(key).toLowerCase() === 'tuitionlogo') hasTuitionLogo = true;
  });
  if (!hasTuitionLogo) saveSettings({ tuitionLogo: '' });
  return settings;
}

function saveStudent(student) {
  return upsertRecord_('students', student, ['studentId'], ['phone']);
}

function deleteStudent(studentId) {
  if (!studentId) throw new Error('studentId is required.');
  var sheet = getSheet_('students', true);
  var headers = ensureHeaders_(sheet, SHEET_CONFIG.students.headers);
  var column = findHeaderColumn_(headers, 'studentId');
  if (column < 0) throw new Error('Student ID column is missing.');
  var lastRow = sheet.getLastRow();
  for (var row = lastRow; row >= 2; row--) {
    if (String(sheet.getRange(row, column + 1).getValue()) === String(studentId)) {
      sheet.deleteRow(row);
    }
  }
  return { success: true, studentId: studentId };
}

function saveAttendance(payload) {
  var records = Array.isArray(payload.records) ? payload.records : payload.record ? [payload.record] : [];
  var saved = records.map(function(record) {
    var normalized = Object.assign({}, record);
    normalized.date = normalizeDate_(normalized.date || payload.date);
    return upsertRecord_('attendance', normalized, ['studentId', 'date']);
  });
  return { success: true, count: saved.length };
}

function saveExam(exam) {
  return upsertRecord_('exams', exam, ['id']);
}

function saveExamMarks(payload) {
  if (!payload.examId) throw new Error('examId is required.');
  var marks = payload.marks || {};
  var examId = String(payload.examId);
  var existing = getSheetRecords_('examMarks');
  existing.forEach(function(record) {
    if (String(record.examId) !== examId || !record.studentId) return;
    if (!Object.prototype.hasOwnProperty.call(marks, record.studentId)) {
      upsertRecord_('examMarks', { examId: examId, studentId: String(record.studentId), marks: '' },
        ['examId', 'studentId']);
    }
  });
  Object.keys(marks).forEach(function(studentId) {
    if (!String(studentId).trim()) return;
    upsertRecord_('examMarks', {
      examId: examId,
      studentId: String(studentId),
      marks: marks[studentId]
    }, ['examId', 'studentId']);
  });
  return { success: true, examId: examId, count: Object.keys(marks).length };
}

function saveNotices(payload) {
  if (Array.isArray(payload.notices)) {
    var sheet = getSheet_('notices', true);
    var headers = ensureHeaders_(sheet, SHEET_CONFIG.notices.headers);
    replaceSheetRecords_(sheet, headers, payload.notices);
    return { success: true, count: payload.notices.length };
  }
  return upsertRecord_('notices', payload.notice || payload, ['id']);
}

function saveSchedule(payload) {
  if (!Array.isArray(payload.schedule)) throw new Error('schedule must be an array.');
  var sheet = getSheet_('schedule', true);
  var headers = ensureHeaders_(sheet, SHEET_CONFIG.schedule.headers);
  replaceSheetRecords_(sheet, headers, payload.schedule);
  return { success: true, count: payload.schedule.length };
}

function saveSettings(settings) {
  var sheet = getSheet_('settings', true);
  var headers = ensureHeaders_(sheet, SHEET_CONFIG.settings.headers);
  var keyColumn = findHeaderColumn_(headers, 'key');
  var valueColumn = findHeaderColumn_(headers, 'value');
  Object.keys(settings || {}).forEach(function(key) {
    var value = JSON.stringify(settings[key]);
    var lastRow = sheet.getLastRow();
    var values = lastRow > 1
      ? sheet.getRange(2, keyColumn + 1, lastRow - 1, 1).getDisplayValues()
      : [];
    var match = values.findIndex(function(row) { return row[0] === key; });
    var rowNumber = match >= 0 ? match + 2 : sheet.getLastRow() + 1;
    var row = rowNumber <= sheet.getLastRow()
      ? sheet.getRange(rowNumber, 1, 1, headers.length).getValues()[0]
      : headers.map(function() { return ''; });
    row[keyColumn] = key;
    row[valueColumn] = value;
    sheet.getRange(rowNumber, 1, 1, headers.length).setValues([row]);
  });
  return { success: true };
}

function upsertRecord_(type, record, primaryKeys, alternateKeys) {
  if (!record || typeof record !== 'object') throw new Error('Record is required.');
  var hasKeyGroup = function(keys) {
    return keys && keys.length && keys.every(function(key) {
      return uniqueKeyValue_(key, valueForHeader_(record, key)) !== '';
    });
  };
  if (!hasKeyGroup(primaryKeys) && !hasKeyGroup(alternateKeys)) {
    throw new Error('Record is missing the unique identifier required for ' + type + '.');
  }
  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    var sheet = getSheet_(type, true);
    var headers = ensureHeaders_(sheet, SHEET_CONFIG[type].headers.concat(Object.keys(record)));
    var lastRow = sheet.getLastRow();
    var rows = lastRow > 1 ? sheet.getRange(2, 1, lastRow - 1, headers.length).getValues() : [];
    var match = -1;
    for (var rowIndex = 0; rowIndex < rows.length; rowIndex++) {
      var existing = rowToObject_(headers, rows[rowIndex]);
      var matchesKeyGroup = function(keys) {
        return keys && keys.length && keys.every(function(key) {
          var current = uniqueKeyValue_(key, valueForHeader_(existing, key));
          var incoming = uniqueKeyValue_(key, valueForHeader_(record, key));
          return current !== '' && incoming !== '' && current === incoming;
        });
      };
      if (matchesKeyGroup(primaryKeys) || matchesKeyGroup(alternateKeys)) {
        match = rowIndex;
        break;
      }
    }
    var rowNumber = match >= 0 ? match + 2 : lastRow + 1;
    var current = match >= 0 ? rows[match] : [];
    var output = headers.map(function(header, index) {
      var value = valueForHeader_(record, header);
      return value !== undefined ? normalizeSheetWriteValue_(value, canonicalFeeField_(header)) : current[index];
    });
    sheet.getRange(rowNumber, 1, 1, headers.length).setValues([output]);
    return { success: true, data: rowToObject_(headers, output) };
  } finally {
    lock.releaseLock();
  }
}

function uniqueKeyValue_(key, value) {
  if (value === undefined || value === null || String(value).trim() === '') return '';
  var canonical = canonicalFeeField_(key);
  if (canonical === 'month') return feeMonthKey_(value);
  if (canonical === 'date') return normalizeDate_(value);
  var normalized = String(value).trim().toLowerCase();
  if (canonical === 'phone') return normalized.replace(/\D/g, '') || normalized;
  return normalized;
}

function replaceSheetRecords_(sheet, headers, records) {
  var lastRow = sheet.getLastRow();
  if (lastRow > 1) sheet.getRange(2, 1, lastRow - 1, headers.length).clearContent();
  if (!records.length) return;
  var values = records.map(function(record) {
    return headers.map(function(header) {
      var value = valueForHeader_(record, header);
      return value === undefined ? '' : normalizeSheetWriteValue_(value, canonicalFeeField_(header));
    });
  });
  sheet.getRange(2, 1, values.length, headers.length).setValues(values);
}

function getSheet_(type, createIfMissing) {
  var config = SHEET_CONFIG[type];
  if (!config) throw new Error('Unknown sheet type: ' + type);
  var spreadsheet = getSpreadsheet_();
  for (var i = 0; i < config.names.length; i++) {
    var existing = spreadsheet.getSheetByName(config.names[i]);
    if (existing) return existing;
  }
  if (!createIfMissing) return null;
  return spreadsheet.insertSheet(config.names[0]);
}

function getSpreadsheet_() {
  var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  if (spreadsheet) return spreadsheet;
  var id = SPREADSHEET_ID || PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
  if (id) return SpreadsheetApp.openById(id);
  throw new Error('No active spreadsheet. Bind this script to the TuitionHub spreadsheet or set SPREADSHEET_ID in Script Properties.');
}

function ensureHeaders_(sheet, requiredHeaders) {
  var lastColumn = sheet.getLastColumn();
  var headers = lastColumn > 0
    ? sheet.getRange(1, 1, 1, lastColumn).getDisplayValues()[0].map(function(value) { return String(value).trim(); })
    : [];
  while (headers.length && !headers[headers.length - 1]) headers.pop();
  if (!headers.length) {
    headers = requiredHeaders.slice();
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.setFrozenRows(1);
    return headers;
  }

  requiredHeaders.forEach(function(required) {
    var normalized = normalizeHeader_(required);
    var exists = headers.some(function(header) {
      return normalizeHeader_(header) === normalized || canonicalFeeField_(header) === canonicalFeeField_(required);
    });
    if (!exists) headers.push(required);
  });
  if (headers.length > lastColumn) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  }
  sheet.setFrozenRows(1);
  return headers;
}

function rowToObject_(headers, row) {
  var result = {};
  headers.forEach(function(header, index) {
    if (!header) return;
    var value = row[index] === undefined || row[index] === null ? '' : row[index];
    result[header] = value;
    var canonical = canonicalFeeField_(header);
    if (canonical && canonical !== normalizeHeader_(header) && result[canonical] === undefined) {
      result[canonical] = value;
    }
    if (canonical === 'date' && value) result.date = normalizeDate_(value);
    if (canonical === 'month' && value) result.month = normalizeMonth_(value);
  });
  if (result.marks && typeof result.marks === 'string') {
    try {
      result.marks = JSON.parse(result.marks);
    } catch (error) {
      // Preserve malformed legacy values for diagnostics rather than dropping the row.
    }
  }
  return result;
}

function normalizeObjectKeys_(record) {
  var result = {};
  Object.keys(record || {}).forEach(function(key) {
    result[normalizeHeader_(key)] = record[key];
  });
  return result;
}

function firstValue_(normalizedObject, aliases) {
  for (var i = 0; i < aliases.length; i++) {
    var key = normalizeHeader_(aliases[i]);
    if (normalizedObject[key] !== undefined && normalizedObject[key] !== null && normalizedObject[key] !== '') {
      return normalizedObject[key];
    }
  }
  return '';
}

function canonicalFeeField_(header) {
  var normalized = normalizeHeader_(header);
  var keys = Object.keys(FEE_HEADER_ALIASES);
  for (var i = 0; i < keys.length; i++) {
    if (FEE_HEADER_ALIASES[keys[i]].indexOf(normalized) >= 0) return keys[i];
  }
  keys = Object.keys(GENERAL_HEADER_ALIASES);
  for (var j = 0; j < keys.length; j++) {
    if (GENERAL_HEADER_ALIASES[keys[j]].indexOf(normalized) >= 0) return keys[j];
  }
  return normalized;
}

function valueForHeader_(record, header) {
  var target = canonicalFeeField_(header);
  var keys = Object.keys(record || {});
  for (var i = 0; i < keys.length; i++) {
    if (canonicalFeeField_(keys[i]) === target) return record[keys[i]];
    if (normalizeHeader_(keys[i]) === normalizeHeader_(header)) return record[keys[i]];
  }
  return undefined;
}

function findHeaderColumn_(headers, field) {
  var canonical = canonicalFeeField_(field);
  for (var i = 0; i < headers.length; i++) {
    if (canonicalFeeField_(headers[i]) === canonical) return i;
  }
  return -1;
}

function normalizeHeader_(value) {
  return String(value || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

function parseFeeKey_(value) {
  var match = String(value || '').trim().match(/^(.+?)[_|:](.+)$/);
  if (!match) return null;
  return { studentId: match[1].trim(), month: normalizeMonth_(match[2]) };
}

function feeMonthKey_(value) {
  return normalizeMonth_(value).toLowerCase().replace(/\s+/g, ' ').trim();
}

function parseAmount_(value) {
  if (typeof value === 'number') return isFinite(value) ? value : 0;
  var parsed = Number(String(value || '').replace(/[^0-9.-]/g, ''));
  return isFinite(parsed) ? parsed : 0;
}

function normalizeMonth_(value) {
  if (value instanceof Date && !isNaN(value.getTime())) {
    return Utilities.formatDate(value, getTimeZone_(), 'MMMM yyyy');
  }
  if (typeof value === 'number' && isFinite(value) && value >= 20000 && value <= 80000) {
    var serialDate = new Date(Date.UTC(1899, 11, 30) + value * 86400000);
    return Utilities.formatDate(serialDate, 'UTC', 'MMMM yyyy');
  }
  var text = String(value || '').trim();
  if (!text) return '';
  var iso = text.match(/^(\d{4})[-/](\d{1,2})(?:[-/]\d{1,2})?(?:T.*)?$/);
  if (iso) return monthName_(Number(iso[1]), Number(iso[2]));
  var slash = text.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (slash) {
    var first = Number(slash[1]), second = Number(slash[2]);
    return monthName_(Number(slash[3]), first > 12 ? second : second > 12 ? first : second);
  }
  var named = text.match(/^([a-z]+)[\s,._/-]+(\d{4})$/i);
  if (named) {
    var monthNames = ['january', 'february', 'march', 'april', 'may', 'june',
      'july', 'august', 'september', 'october', 'november', 'december'];
    var namedMonth = named[1].toLowerCase();
    for (var i = 0; i < monthNames.length; i++) {
      if (monthNames[i] === namedMonth || monthNames[i].slice(0, 3) === namedMonth) {
        return monthName_(Number(named[2]), i + 1);
      }
    }
  }
  return text;
}

function monthName_(year, month) {
  if (month < 1 || month > 12) return '';
  var date = new Date(Date.UTC(year, month - 1, 1));
  return Utilities.formatDate(date, 'UTC', 'MMMM yyyy');
}

function normalizeDate_(value) {
  if (!value) return '';
  if (value instanceof Date && !isNaN(value.getTime())) {
    return Utilities.formatDate(value, getTimeZone_(), 'yyyy-MM-dd');
  }
  if (typeof value === 'number' && isFinite(value) && value >= 20000 && value <= 80000) {
    var serialDate = new Date(Date.UTC(1899, 11, 30) + value * 86400000);
    return Utilities.formatDate(serialDate, 'UTC', 'yyyy-MM-dd');
  }
  var text = String(value).trim();
  var iso = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (iso) return iso[1] + '-' + pad2_(iso[2]) + '-' + pad2_(iso[3]);
  var slash = text.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (slash) {
    var first = Number(slash[1]), second = Number(slash[2]);
    var month = first > 12 ? second : second > 12 ? first : second;
    var day = first > 12 ? first : second > 12 ? second : first;
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return slash[3] + '-' + pad2_(month) + '-' + pad2_(day);
    }
  }
  return text;
}

function normalizeSheetWriteValue_(value, field) {
  if (field === 'month') return normalizeMonth_(value);
  if (field === 'date') return normalizeDate_(value);
  if (value instanceof Date && !isNaN(value.getTime())) return normalizeDate_(value);
  if (value === undefined || value === null) return '';
  if (typeof value === 'object') return JSON.stringify(value);
  return value;
}

function formatFeeDateColumns_(sheet, headers) {
  ['month', 'date'].forEach(function(field) {
    var column = findHeaderColumn_(headers, field);
    if (column >= 0) sheet.getRange(1, column + 1, Math.max(sheet.getLastRow(), 1), 1).setNumberFormat('@');
  });
}

function getTimeZone_() {
  try {
    return getSpreadsheet_().getSpreadsheetTimeZone();
  } catch (error) {
    return Session.getScriptTimeZone();
  }
}

function pad2_(value) {
  return ('0' + value).slice(-2);
}

function jsonResponse(value) {
  return ContentService.createTextOutput(JSON.stringify(value))
    .setMimeType(ContentService.MimeType.JSON);
}
