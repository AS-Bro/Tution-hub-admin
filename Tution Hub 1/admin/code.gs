/**
 * ============================================================================
 * TuitionHub — Unified Google Apps Script Backend (code.gs)
 * Handles both GET and POST requests cleanly to guarantee Google Sheet updates.
 * ============================================================================
 */

function getActiveSs() {
  var ss = null;
  try {
    ss = SpreadsheetApp.getActiveSpreadsheet();
  } catch (e) {}

  if (!ss) {
    try {
      var prop = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
      if (prop) {
        ss = SpreadsheetApp.openById(prop);
      }
    } catch (e) {}
  }
  return ss;
}

function doGet(e) {
  try {
    var action = (e && e.parameter) ? e.parameter.action : null;
    var payload = {};

    if (e && e.parameter && e.parameter.payload) {
      try {
        payload = JSON.parse(e.parameter.payload);
      } catch (pErr) {}
    } else if (e && e.parameter) {
      payload = e.parameter;
    }

    if (action) {
      var resData = handleAction(action, payload);
      return ContentService.createTextOutput(JSON.stringify(resData))
        .setMimeType(ContentService.MimeType.JSON);
    }

    return ContentService.createTextOutput(JSON.stringify({
      status: 'success',
      success: true,
      message: "TuitionHub Google Apps Script API is active and ready."
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      status: 'error',
      success: false,
      error: err.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function doPost(e) {
  try {
    var postData = {};
    if (e && e.postData && e.postData.contents) {
      try {
        postData = JSON.parse(e.postData.contents);
      } catch (parseErr) {
        postData = {};
      }
    }

    var action = postData.action || (e && e.parameter ? e.parameter.action : '');

    // Auto-detect action if action field is missing but payload object is present
    if (!action) {
      if (postData.student) action = 'saveStudent';
      else if (postData.records) action = 'saveAttendance';
      else if (postData.record) action = 'saveFee';
      else if (postData.exam) action = 'saveExam';
      else if (postData.marks) action = 'saveMarks';
      else if (postData.notices) action = 'saveNotice';
      else if (postData.schedule) action = 'saveSchedule';
      else if (postData.settings) action = 'saveSettings';
      else action = 'getInitialData';
    }

    var resData = handleAction(action, postData);
    return ContentService.createTextOutput(JSON.stringify(resData))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      status: 'error',
      success: false,
      error: err.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function handleAction(action, postData) {
  var ss = getActiveSs();
  if (!ss) {
    throw new Error("CRITICAL ERROR: SpreadsheetApp.getActiveSpreadsheet() returned null. Please open your Google Sheet, click Extensions > Apps Script, paste code.gs, and deploy as Web App.");
  }

  var result = { status: 'success', success: true };

  switch (action) {
    case 'getAllData':
    case 'getInitialData':
      result.data = {
        students: getSheetData(ss, 'Students'),
        attendance: getSheetData(ss, 'Attendance'),
        fees: getSheetData(ss, 'Fees'),
        exams: getSheetData(ss, 'Exams'),
        examMarks: getExamMarksData(ss),
        notices: getSheetData(ss, 'Notices'),
        schedule: getSheetData(ss, 'Schedule'),
        settings: getSettingsData(ss)
      };
      break;

    case 'getStudents':
      result.data = getSheetData(ss, 'Students');
      break;

    case 'saveStudent':
      result.data = saveStudentRow(ss, postData.student || postData);
      break;

    case 'deleteStudent':
      result.data = deleteStudentRow(ss, postData.studentId || postData.id);
      break;

    case 'getAttendance':
      result.data = getSheetData(ss, 'Attendance');
      break;

    case 'saveAttendance':
      result.data = saveAttendanceRecords(ss, postData.date, postData.records);
      break;

    case 'getFees':
      result.data = getSheetData(ss, 'Fees');
      break;

    case 'saveFee':
      result.data = saveFeeRecord(ss, postData.record || postData);
      break;

    case 'getExams':
      result.data = getSheetData(ss, 'Exams');
      break;

    case 'saveExam':
      result.data = saveExamRecord(ss, postData.exam || postData);
      break;

    case 'saveMarks':
      result.data = saveMarksData(ss, postData.examId, postData.marks);
      break;

    case 'getNotices':
      result.data = getSheetData(ss, 'Notices');
      break;

    case 'saveNotice':
      result.data = saveNoticesData(ss, postData.notices);
      break;

    case 'getSchedule':
      result.data = getSheetData(ss, 'Schedule');
      break;

    case 'saveSchedule':
      result.data = saveScheduleData(ss, postData.schedule);
      break;

    case 'saveSettings':
      result.data = saveSettingsData(ss, postData.settings);
      break;

    default:
      result = { status: 'error', success: false, error: 'Unknown action: ' + action };
  }

  return result;
}

function getOrCreateSheet(ss, sheetName, headers) {
  if (!ss) ss = getActiveSs();
  if (!ss) {
    throw new Error("CRITICAL ERROR: SpreadsheetApp.getActiveSpreadsheet() returned null. Make sure this script is bound to a Google Sheet via Extensions > Apps Script.");
  }

  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    if (headers && headers.length > 0) {
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      sheet.getRange(1, 1, 1, headers.length).setFontWeight("bold").setBackground("#E2E8F0");
    }
  }
  return sheet;
}

function getSheetData(ss, sheetName) {
  if (!ss) ss = getActiveSs();
  if (!ss) return [];

  var sheetHeadersMap = {
    'Students': ['studentId', 'studentName', 'batch', 'monthlyFee', 'parentName', 'phone', 'joiningDate', 'status', 'password'],
    'Attendance': ['id', 'studentId', 'studentName', 'batch', 'date', 'status'],
    'Fees': ['id', 'studentId', 'studentName', 'batch', 'month', 'amount', 'date', 'paymentMode', 'status'],
    'Exams': ['id', 'testName', 'batch', 'totalMarks', 'date'],
    'Notices': ['id', 'title', 'category', 'batch', 'content', 'date'],
    'Schedule': ['id', 'subject', 'batch', 'time', 'days', 'teacher', 'room']
  };

  var headers = sheetHeadersMap[sheetName];
  var sheet = headers ? getOrCreateSheet(ss, sheetName, headers) : ss.getSheetByName(sheetName);

  if (!sheet) return [];
  var data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];

  var currentHeaders = data[0];
  var result = [];

  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    var obj = {};
    for (var j = 0; j < currentHeaders.length; j++) {
      obj[currentHeaders[j]] = row[j];
    }
    result.push(obj);
  }
  return result;
}

function saveStudentRow(ss, student) {
  if (!student) return false;
  var headers = ['studentId', 'studentName', 'batch', 'monthlyFee', 'parentName', 'phone', 'joiningDate', 'status', 'password'];
  var sheet = getOrCreateSheet(ss, 'Students', headers);
  var data = sheet.getDataRange().getValues();
  var foundIndex = -1;

  for (var i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(student.studentId)) {
      foundIndex = i + 1;
      break;
    }
  }

  var rowValues = [
    student.studentId || '',
    student.studentName || '',
    student.batch || '',
    student.monthlyFee !== undefined ? student.monthlyFee : 1000,
    student.parentName || '',
    student.phone || '',
    student.joiningDate || '',
    student.status || 'Active',
    student.password || 'Pass123'
  ];

  if (foundIndex > 0) {
    sheet.getRange(foundIndex, 1, 1, rowValues.length).setValues([rowValues]);
  } else {
    sheet.appendRow(rowValues);
  }
  return true;
}

function deleteStudentRow(ss, studentId) {
  if (!ss) ss = getActiveSs();
  var sheet = ss.getSheetByName('Students');
  if (!sheet) return false;
  var data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(studentId)) {
      sheet.deleteRow(i + 1);
      return true;
    }
  }
  return false;
}

function saveAttendanceRecords(ss, date, records) {
  var headers = ['id', 'studentId', 'studentName', 'batch', 'date', 'status'];
  var sheet = getOrCreateSheet(ss, 'Attendance', headers);
  if (!records || records.length === 0) return true;

  var data = sheet.getDataRange().getValues();
  var recMap = {};
  for (var k = 0; k < records.length; k++) {
    recMap[records[k].studentId] = records[k];
  }

  for (var i = data.length - 1; i >= 1; i--) {
    var rowDate = data[i][4];
    var rowStudentId = String(data[i][1]);
    if (String(rowDate) === String(date) && recMap[rowStudentId]) {
      var r = recMap[rowStudentId];
      sheet.getRange(i + 1, 1, 1, headers.length).setValues([[r.id, r.studentId, r.studentName, r.batch, r.date, r.status]]);
      delete recMap[rowStudentId];
    }
  }

  for (var sid in recMap) {
    var rec = recMap[sid];
    sheet.appendRow([rec.id, rec.studentId, rec.studentName, rec.batch, rec.date, rec.status]);
  }
  return true;
}

function saveFeeRecord(ss, record) {
  if (!record) return false;
  var headers = ['id', 'studentId', 'studentName', 'batch', 'month', 'amount', 'date', 'paymentMode', 'status'];
  var sheet = getOrCreateSheet(ss, 'Fees', headers);
  var data = sheet.getDataRange().getValues();
  var foundIndex = -1;

  for (var i = 1; i < data.length; i++) {
    if (String(data[i][1]) === String(record.studentId) && String(data[i][4]) === String(record.month)) {
      foundIndex = i + 1;
      break;
    }
  }

  var rowValues = [
    record.id || '',
    record.studentId || '',
    record.studentName || '',
    record.batch || '',
    record.month || '',
    record.amount || 0,
    record.date || '',
    record.paymentMode || 'Cash',
    record.status || 'Paid'
  ];

  if (foundIndex > 0) {
    sheet.getRange(foundIndex, 1, 1, rowValues.length).setValues([rowValues]);
  } else {
    sheet.appendRow(rowValues);
  }
  return true;
}

function saveExamRecord(ss, exam) {
  if (!exam) return false;
  var headers = ['id', 'testName', 'batch', 'totalMarks', 'date'];
  var sheet = getOrCreateSheet(ss, 'Exams', headers);
  var data = sheet.getDataRange().getValues();
  var foundIndex = -1;

  for (var i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(exam.id)) {
      foundIndex = i + 1;
      break;
    }
  }

  var rowValues = [exam.id || '', exam.testName || '', exam.batch || '', exam.totalMarks || 50, exam.date || ''];

  if (foundIndex > 0) {
    sheet.getRange(foundIndex, 1, 1, rowValues.length).setValues([rowValues]);
  } else {
    sheet.appendRow(rowValues);
  }
  return true;
}

function getExamMarksData(ss) {
  var headers = ['examId', 'studentId', 'score', 'remarks'];
  var sheet = getOrCreateSheet(ss, 'ExamMarks', headers);
  var data = sheet.getDataRange().getValues();
  if (data.length <= 1) return {};

  var result = {};
  for (var i = 1; i < data.length; i++) {
    var examId = data[i][0];
    var studentId = data[i][1];
    var score = data[i][2];
    var remarks = data[i][3] || '';
    if (!result[examId]) result[examId] = {};
    if (typeof score === 'object' && score !== null && score.marksObtained !== undefined) {
      result[examId][studentId] = score;
    } else {
      result[examId][studentId] = { marksObtained: score, remarks: remarks };
    }
  }
  return result;
}

function saveMarksData(ss, examId, marks) {
  if (!marks) return true;
  var headers = ['examId', 'studentId', 'score', 'remarks'];
  var sheet = getOrCreateSheet(ss, 'ExamMarks', headers);
  var data = sheet.getDataRange().getValues();

  var existingMap = {};
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(examId)) {
      existingMap[String(data[i][1])] = i + 1;
    }
  }

  for (var studentId in marks) {
    var item = marks[studentId];
    var obtained = (typeof item === 'object' && item !== null) ? item.marksObtained : item;
    var rem = (typeof item === 'object' && item !== null) ? (item.remarks || '') : '';

    if (existingMap[String(studentId)]) {
      sheet.getRange(existingMap[String(studentId)], 1, 1, 4).setValues([[examId, studentId, obtained, rem]]);
    } else {
      sheet.appendRow([examId, studentId, obtained, rem]);
    }
  }
  return true;
}

function saveNoticesData(ss, notices) {
  var headers = ['id', 'title', 'category', 'batch', 'content', 'date'];
  var sheet = getOrCreateSheet(ss, 'Notices', headers);
  sheet.clearContents();
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  if (notices && notices.length > 0) {
    var rows = notices.map(function(n) { return [n.id, n.title, n.category, n.batch, n.content, n.date]; });
    sheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
  }
  return true;
}

function saveScheduleData(ss, schedule) {
  var headers = ['id', 'subject', 'batch', 'time', 'days', 'teacher', 'room'];
  var sheet = getOrCreateSheet(ss, 'Schedule', headers);
  sheet.clearContents();
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  if (schedule && schedule.length > 0) {
    var rows = schedule.map(function(s) { return [s.id, s.subject, s.batch, s.time, s.days, s.teacher, s.room]; });
    sheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
  }
  return true;
}

function getSettingsData(ss) {
  var headers = ['key', 'value'];
  var sheet = getOrCreateSheet(ss, 'Settings', headers);
  var data = sheet.getDataRange().getValues();
  var settings = {};
  for (var i = 1; i < data.length; i++) {
    if (data[i][0]) settings[data[i][0]] = data[i][1];
  }
  return settings;
}

function saveSettingsData(ss, settings) {
  var headers = ['key', 'value'];
  var sheet = getOrCreateSheet(ss, 'Settings', headers);
  sheet.clearContents();
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  var rows = [];
  for (var key in settings) {
    rows.push([key, settings[key]]);
  }
  if (rows.length > 0) {
    sheet.getRange(2, 1, rows.length, 2).setValues(rows);
  }
  return true;
}