/* ==========================================================================
   TuitionHub — Dashboard Script (dashboard.js)
   ========================================================================== */

let dashboardAttendanceMarks = {};

document.addEventListener('DOMContentLoaded', () => {
  injectShellLayout('dashboard', 'Dashboard Overview');
  renderDashboard();
});

window.onSyncComplete = function () {
  renderDashboard();
};

function renderDashboard() {
  const container = $('#page-content');
  if (!container) return;

  const totalStudents = STATE.students.length;
  const todayStr = todayISO();
  const attendanceRecords = Array.isArray(STATE.attendance) ? STATE.attendance : [];
  const todayAttendance = attendanceRecords.filter(a => normalizeDashboardDate(a.date) === todayStr);
  const presentCount = todayAttendance.filter(a => a.status === 'Present').length;
  const attendanceRate = todayAttendance.length > 0 ? Math.round((presentCount / todayAttendance.length) * 100) : 100;

  const outstandingDues = getDashboardOutstandingDues();
  const totalPendingFees = outstandingDues.reduce((sum, item) => sum + item.balance, 0);

  const teacherName = STATE.settings.teacherName || 'Tutor';
  const liveClassUrl = STATE.settings.liveClassLink || '#';
  const w = (STATE.settings.dashboardWidgets) || {};
  const todaySchedule = getTodaySchedule(new Date());
  const attendanceStudents = STATE.students.filter(student => student.status === 'Active');
  const todayMarks = attendanceRecords.filter(record => normalizeDashboardDate(record.date) === todayStr);
  dashboardAttendanceMarks = Object.fromEntries(attendanceStudents.map(student => {
    const saved = todayMarks.find(record => String(record.studentId) === String(student.studentId));
    return [student.studentId, dashboardAttendanceMarks[student.studentId] || (saved && saved.status) || ''];
  }));
  const recentExamSpotlight = getRecentExamSpotlight();

  /* Build stat cards conditionally */
  const statCards = [
    w.studentCount !== false ? `
      <div class="card stat-card">
        <div class="stat-top">
          <span class="stat-title">Total Enrolled</span>
          <div class="stat-icon" style="background:var(--primary-container);color:var(--primary)"><i data-lucide="users" class="icon"></i></div>
        </div>
        <div class="stat-value">${totalStudents}</div>
        <div style="font-size:12px;color:var(--text-secondary)">Active students</div>
      </div>` : '',

    w.attendanceStats !== false ? `
      <div class="card stat-card">
        <div class="stat-top">
          <span class="stat-title">Today's Attendance</span>
          <div class="stat-icon" style="background:var(--success-light);color:var(--success)"><i data-lucide="check-circle" class="icon"></i></div>
        </div>
        <div class="stat-value">${presentCount} <span style="font-size:14px;color:var(--text-secondary);font-weight:600">/ ${totalStudents}</span></div>
        <div style="font-size:12px;color:var(--text-secondary)">Attendance Rate: ${attendanceRate}%</div>
      </div>` : '',

    w.pendingFees !== false ? `
      <div class="card stat-card">
        <div class="stat-top">
          <span class="stat-title">Pending Dues</span>
          <div class="stat-icon" style="background:var(--danger-light);color:var(--danger)"><i data-lucide="alert-circle" class="icon"></i></div>
        </div>
        <div class="stat-value" style="color:var(--danger)">${formatCurrency(totalPendingFees)}</div>
        <div style="font-size:12px;color:var(--text-secondary)">Total outstanding</div>
        <div class="dashboard-overdue-list">
          ${outstandingDues.length ? outstandingDues.slice(0, 5).map(item => `
            <div class="dashboard-overdue-item">
              <span><strong>${escapeHtml(item.student.studentName)}</strong><small>${escapeHtml(item.student.batch || '—')} · ${formatCurrency(item.balance)}</small></span>
              <button type="button" class="btn btn-outline btn-sm dashboard-fee-reminder-btn" data-student-id="${escapeHtml(item.student.studentId)}" aria-label="WhatsApp reminder for ${escapeHtml(item.student.studentName)}"><i data-lucide="message-circle" class="icon"></i><span>Remind</span></button>
            </div>
          `).join('') : '<div class="section-sub">No outstanding student balances.</div>'}
          ${outstandingDues.length > 5 ? `<a class="dashboard-more-dues" href="fee.html">View all ${outstandingDues.length} students</a>` : ''}
        </div>
      </div>` : '',

    w.recentExams !== false ? `
      <div class="card stat-card">
        <div class="stat-top">
          <span class="stat-title">Exams Scheduled</span>
          <div class="stat-icon" style="background:var(--warning-light);color:var(--warning)"><i data-lucide="file-text" class="icon"></i></div>
        </div>
        <div class="stat-value">${STATE.exams.length}</div>
        <div style="font-size:12px;color:var(--text-secondary)">Active evaluation tests</div>
      </div>` : ''
  ].filter(Boolean).join('');

  const timetablePanel = w.timetable !== false ? `
      <div class="card panel">
        <h3><i data-lucide="clock" class="icon" style="color:var(--primary)"></i> Class Timetable</h3>
        ${renderScheduleWidget()}
      </div>` : '';

  const noticesPanel = w.notices !== false ? `
      <div class="card panel">
        <h3><i data-lucide="bell" class="icon" style="color:var(--warning)"></i> Latest Notice Board</h3>
        ${renderNoticesWidget()}
      </div>` : '';

  container.innerHTML = `
    ${renderTodayScheduleBanner(todayStr, todaySchedule)}

    <!-- GREETING BANNER -->
    <div class="greeting-banner">
      <div>
        <h1>Welcome Back, ${escapeHtml(teacherName)}! 👋</h1>
        <p>Here is your tuition center summary for today (${formatDate(todayStr)}).</p>
      </div>
      <div class="greeting-stats">
        <a href="${escapeHtml(liveClassUrl)}" target="_blank" class="btn btn-secondary btn-sm" style="background:#fff;color:var(--primary);font-weight:700">
          <i data-lucide="video" class="icon"></i> Launch Online Class
        </a>
      </div>
    </div>

    <!-- QUICK ACTIONS -->
    <div class="section-head">
      <h2>Quick Operations</h2>
      <span class="section-sub">1-click shortcuts</span>
    </div>
    <div class="quick-actions-grid">
      <a href="attendance.html" class="action-card">
        <div class="action-icon" style="background:var(--primary-container);color:var(--primary)"><i data-lucide="calendar-check" class="icon"></i></div>
        <div class="action-label">Mark Attendance</div>
      </a>
      <a href="fee.html" class="action-card">
        <div class="action-icon" style="background:var(--success-light);color:var(--success)"><i data-lucide="wallet" class="icon"></i></div>
        <div class="action-label">Collect Fees</div>
      </a>
      <a href="student.html" class="action-card">
        <div class="action-icon" style="background:var(--secondary-container);color:var(--secondary)"><i data-lucide="user-plus" class="icon"></i></div>
        <div class="action-label">Add Student</div>
      </a>
      <a href="notice.html" class="action-card">
        <div class="action-icon" style="background:var(--warning-light);color:var(--warning)"><i data-lucide="megaphone" class="icon"></i></div>
        <div class="action-label">Send Notice</div>
      </a>
      <a href="timetable.html" class="action-card">
        <div class="action-icon" style="background:var(--border-subtle);color:var(--text)"><i data-lucide="calendar" class="icon"></i></div>
        <div class="action-label">View Timetable</div>
      </a>
      <a href="exams-and-marks.html" class="action-card">
        <div class="action-icon" style="background:var(--primary-container);color:var(--primary)"><i data-lucide="award" class="icon"></i></div>
        <div class="action-label">Enter Marks</div>
      </a>
    </div>

    <!-- METRIC CARDS -->
    ${statCards ? `<div class="stat-grid">${statCards}</div>` : ''}

    <!-- DASHBOARD TWO-COLUMN LAYOUT -->
    ${(timetablePanel || noticesPanel) ? `
    <div class="dash-grid">
      ${timetablePanel}
      ${noticesPanel}
    </div>` : ''}

    <div class="dash-grid dashboard-productivity-grid">
      <section class="card panel dashboard-attendance-widget">
        <div class="dashboard-widget-heading">
          <h3><i data-lucide="calendar-check" class="icon" style="color:#334155"></i> Quick Attendance Taker</h3>
          <span>${formatDate(todayStr)}</span>
        </div>
        ${renderQuickAttendanceWidget(attendanceStudents)}
      </section>
      <section class="card panel dashboard-exam-spotlight">
        <h3><i data-lucide="trophy" class="icon" style="color:#334155"></i> Recent Exam Toppers</h3>
        ${renderRecentExamSpotlight(recentExamSpotlight)}
      </section>
    </div>
  `;

  if (window.lucide) lucide.createIcons();
  bindDashboardActions(todayStr, attendanceStudents);
}

function renderQuickAttendanceWidget(students) {
  if (!students.length) return '<div class="dashboard-widget-empty">No active students are available.</div>';
  return `
    <div class="dashboard-attendance-list">
      ${students.map(student => `
        <div class="dashboard-attendance-row">
          <div class="dashboard-attendance-student"><strong>${escapeHtml(student.studentName)}</strong><small>${escapeHtml(student.batch || '—')}</small></div>
          <div class="dashboard-attendance-actions" role="group" aria-label="Attendance for ${escapeHtml(student.studentName)}">
            ${['Present', 'Absent', 'Late'].map(status => `
              <button type="button" class="btn btn-sm dashboard-attendance-mark ${dashboardAttendanceMarks[student.studentId] === status ? 'is-selected' : ''}" data-student-id="${escapeHtml(student.studentId)}" data-status="${status}" aria-pressed="${dashboardAttendanceMarks[student.studentId] === status}">
                ${status}
              </button>
            `).join('')}
          </div>
        </div>
      `).join('')}
    </div>
    <div class="dashboard-attendance-footer">
      <span id="dashboard-attendance-status" role="status" aria-live="polite"></span>
      <button type="button" class="btn btn-primary btn-sm" id="dashboard-save-attendance-btn"><i data-lucide="save" class="icon"></i> Save Today's Attendance</button>
    </div>
  `;
}

function bindDashboardActions(todayStr, students) {
  $all('.dashboard-attendance-mark').forEach(button => {
    button.onclick = () => {
      dashboardAttendanceMarks[button.dataset.studentId] = button.dataset.status;
      const row = button.closest('.dashboard-attendance-row');
      if (row) {
        row.querySelectorAll('.dashboard-attendance-mark').forEach(option => {
          const selected = option.dataset.status === button.dataset.status;
          option.classList.toggle('is-selected', selected);
          option.setAttribute('aria-pressed', String(selected));
        });
      }
      const status = $('#dashboard-attendance-status');
      if (status) status.textContent = 'Unsaved attendance changes.';
    };
  });

  const saveButton = $('#dashboard-save-attendance-btn');
  if (saveButton) {
    saveButton.onclick = async () => {
      const markedStudents = students.filter(student => dashboardAttendanceMarks[student.studentId]);
      if (!markedStudents.length) {
        showToast('warning', 'Mark at least one student before saving attendance.');
        return;
      }
      const studentIds = new Set(markedStudents.map(student => String(student.studentId)));
      STATE.attendance = (Array.isArray(STATE.attendance) ? STATE.attendance : []).filter(record =>
        !(normalizeDashboardDate(record.date) === todayStr && studentIds.has(String(record.studentId)))
      );
      const newRecords = markedStudents.map(student => ({
        id: uid(),
        studentId: student.studentId,
        studentName: student.studentName,
        batch: student.batch,
        date: todayStr,
        status: dashboardAttendanceMarks[student.studentId]
      }));
      STATE.attendance.push(...newRecords);
      saveStorage(LS_KEYS.ATTENDANCE, STATE.attendance);
      showToast('success', `Attendance saved for ${formatDate(todayStr)}`);
      renderDashboard();
      if (window.getGoogleSheetsUrl && window.getGoogleSheetsUrl() && window.apiRequest) {
        try {
          await window.apiRequest('saveAttendance', { date: todayStr, records: newRecords });
        } catch (error) {
          console.error('Dashboard attendance Google Sheets sync failed:', error);
          showToast('warning', 'Attendance saved locally, but Google Sheets sync failed.');
        }
      }
    };
  }

  $all('.dashboard-fee-reminder-btn').forEach(button => {
    button.onclick = () => {
      const due = getDashboardOutstandingDues().find(item =>
        String(item.student.studentId) === String(button.dataset.studentId)
      );
      if (!due) {
        showToast('info', 'This student has no outstanding balance.');
        return;
      }
      const template = (STATE.settings.whatsappTemplates && STATE.settings.whatsappTemplates.feeReminder) ||
        'Dear Parent, gentle reminder that tuition fee for {studentName} for {date} ({amount}) is pending. Kindly clear the dues at your earliest convenience. Thank you - {centerName}';
      const message = window.formatMessageTemplate
        ? formatMessageTemplate(template, {
          studentName: due.student.studentName,
          amount: formatCurrency(due.balance),
          date: new Date().toLocaleString(undefined, { month: 'long', year: 'numeric' }),
          centerName: STATE.settings.tuitionName || 'Tuition Center'
        })
        : template;
      openWhatsApp(due.student.phone, message);
    };
  });
}

function getDashboardOutstandingDues() {
  const today = new Date();
  const currentMonth = today.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const currentIndex = dashboardMonthIndex(currentMonth);
  const fees = getDashboardFeeRecords();
  return STATE.students
    .filter(student => student.status === 'Active')
    .map(student => {
      const studentFees = fees.filter(record =>
        String(record.studentId || '').trim().toLowerCase() === String(student.studentId).trim().toLowerCase()
      );
      const byMonth = new Map();
      studentFees.forEach(record => {
        const index = dashboardMonthIndex(record.month || record.period || record.feeMonth);
        if (index === null) return;
        const entry = byMonth.get(index) || { baseAmount: 0, expectedAmount: 0, paid: 0, settled: false };
        entry.baseAmount = Math.max(entry.baseAmount,
          Number(record.baseAmount || student.monthlyFee || record.expectedAmount) || 1000);
        entry.expectedAmount = Math.max(entry.expectedAmount, Number(record.expectedAmount) || 0);
        entry.paid += Math.max(0, Number(record.amount || record.amountPaid || 0));
        entry.settled = entry.settled || String(record.status || '').toLowerCase() === 'paid';
        byMonth.set(index, entry);
      });
      const current = byMonth.get(currentIndex) || {
        baseAmount: Number(student.monthlyFee) || 1000,
        expectedAmount: 0,
        paid: 0,
        settled: false
      };
      byMonth.set(currentIndex, current);
      const carryOver = Array.from(byMonth.entries())
        .filter(([index]) => index < currentIndex)
        .reduce((sum, [, entry]) => sum + Math.max(0,
          entry.baseAmount - (entry.settled ? Math.max(entry.baseAmount, entry.paid) : entry.paid)), 0);
      const amountDue = Math.max(current.baseAmount + carryOver, current.expectedAmount, current.paid);
      const balance = current.settled ? 0 : Math.max(0, amountDue - current.paid);
      return balance > 0 ? { student, balance } : null;
    })
    .filter(Boolean)
    .sort((a, b) => b.balance - a.balance || String(a.student.studentName).localeCompare(String(b.student.studentName)));
}

function getDashboardFeeRecords() {
  const ledger = STATE.fees;
  if (Array.isArray(ledger)) return ledger;
  if (!ledger || typeof ledger !== 'object') return [];
  const nested = [ledger.records, ledger.rows, ledger.items, ledger.values, ledger.data].find(Array.isArray);
  const entries = nested
    ? nested.map(record => ['', record])
    : Object.entries(ledger);
  return entries.map(([key, record]) => {
    if (!record || typeof record !== 'object') return null;
    const composite = String(record.compositeKey || record.paymentKey || record.studentMonthKey ||
      record.studentPeriodKey || key || '').match(/^(.+?)[_|:](.+)$/);
    return {
      ...record,
      studentId: record.studentId || record.studentID || record.student_id || (composite && composite[1]),
      month: record.month || record.feeMonth || record.paymentMonth || record.period || (composite && composite[2])
    };
  }).filter(Boolean);
}

function dashboardMonthIndex(value) {
  const month = String(value || '').trim();
  if (!month) return null;
  const namedMonth = month.match(/^([a-z]+)[\s,._/-]+(\d{4})$/i);
  const yearFirst = month.match(/^(\d{4})[-/](\d{1,2})(?:[-/]\d{1,2})?(?:T.*)?$/);
  const dayFirst = month.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  const match = namedMonth || yearFirst || dayFirst;
  const date = match
    ? namedMonth
      ? new Date(`${match[1]} 1, ${match[2]}`)
      : yearFirst
        ? new Date(`${match[1]}-${match[2]}-01`)
        : (() => {
          const first = Number(match[1]), second = Number(match[2]);
          const monthNumber = first <= 12 && second > 12 ? first : second;
          return new Date(Number(match[3]), monthNumber - 1, 1);
        })()
    : new Date(`${month} 1`);
  return Number.isNaN(date.getTime()) ? null : date.getFullYear() * 12 + date.getMonth();
}

function normalizeDashboardDate(value) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return dateToISO(value);
  const text = String(value || '').trim();
  const iso = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (iso) return `${iso[1]}-${String(iso[2]).padStart(2, '0')}-${String(iso[3]).padStart(2, '0')}`;
  const slash = text.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (!slash) return text;
  const first = Number(slash[1]), second = Number(slash[2]);
  const month = first <= 12 && second > 12 ? first : second;
  const day = first <= 12 && second > 12 ? second : first;
  return [slash[3], String(month).padStart(2, '0'), String(day).padStart(2, '0')].join('-');
}

function getRecentExamSpotlight() {
  const exam = Array.isArray(STATE.exams) ? STATE.exams[0] : null;
  if (!exam) return null;
  const marks = (STATE.examMarks && STATE.examMarks[exam.id]) || {};
  const students = STATE.students.filter(student =>
    student.status === 'Active' && String(student.batch) === String(exam.batch)
  );
  const results = students.map(student => {
    const score = Number(marks[student.studentId]);
    const maximum = Number(exam.totalMarks);
    if (!Number.isFinite(score) || !Number.isFinite(maximum) || maximum <= 0 || score < 0 || score > maximum) return null;
    return { student, score, percentage: Math.round(score / maximum * 100) };
  }).filter(Boolean).sort((a, b) => b.score - a.score || String(a.student.studentName).localeCompare(String(b.student.studentName)));
  return {
    exam,
    count: results.length,
    average: results.length ? (results.reduce((sum, result) => sum + result.score, 0) / results.length).toFixed(1) : '—',
    highest: results.length ? results[0].score : '—',
    toppers: results.filter(result => results.length && result.score === results[0].score)
  };
}

function renderRecentExamSpotlight(spotlight) {
  if (!spotlight) return '<div class="dashboard-widget-empty">No exams have been created yet.</div>';
  return `
    <div class="dashboard-exam-title">${escapeHtml(spotlight.exam.subject || '')}${spotlight.exam.subject ? ' · ' : ''}${escapeHtml(spotlight.exam.chapter || spotlight.exam.testName || 'Exam')}</div>
    <div class="dashboard-exam-meta">${escapeHtml(spotlight.exam.batch || 'All batches')} · ${spotlight.exam.date ? formatDate(spotlight.exam.date) : 'Date not set'}</div>
    <div class="dashboard-exam-metrics">
      <div><small>Class Average</small><strong>${spotlight.average} / ${Number(spotlight.exam.totalMarks)}</strong></div>
      <div><small>Highest Score</small><strong>${spotlight.highest} / ${Number(spotlight.exam.totalMarks)}</strong></div>
    </div>
    <div class="dashboard-exam-toppers">
      <strong>Top achievers</strong>
      ${spotlight.toppers.length ? spotlight.toppers.map(result => `
        <div><span>${escapeHtml(result.student.studentName)} <small>${escapeHtml(result.student.batch || '')}</small></span><b>${result.score} · ${result.percentage}%</b></div>
      `).join('') : '<div class="section-sub">No marks recorded for this test yet.</div>'}
    </div>
    <a class="dashboard-exam-link" href="exams-and-marks.html">View exam results</a>
  `;
}

function getTodaySchedule(now) {
  const dayNames = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
  const dayAliases = {
    sun: ['sun', 'sunday'],
    mon: ['mon', 'monday'],
    tue: ['tue', 'tues', 'tuesday'],
    wed: ['wed', 'wednesday'],
    thu: ['thu', 'thur', 'thurs', 'thursday'],
    fri: ['fri', 'friday'],
    sat: ['sat', 'saturday']
  };
  const today = dayNames[now.getDay()];
  const minutesNow = now.getHours() * 60 + now.getMinutes();

  const classes = (Array.isArray(STATE.schedule) ? STATE.schedule : [])
    .filter(slot => {
      const days = String(slot.days || '').toLowerCase().match(/[a-z]+/g) || [];
      return days.some(day => dayAliases[today].includes(day));
    })
    .map(slot => ({ slot, range: parseScheduleTime(slot.time) }))
    .sort((a, b) => (a.range ? a.range.start : Number.MAX_SAFE_INTEGER) - (b.range ? b.range.start : Number.MAX_SAFE_INTEGER));

  const active = classes.find(item => item.range && minutesNow >= item.range.start && minutesNow < item.range.end);
  const upcoming = classes.find(item => item.range && item.range.start > minutesNow);
  const completed = [...classes].reverse().find(item => item.range && item.range.end <= minutesNow);
  const selected = active || upcoming || classes.find(item => !item.range) || completed || null;

  return {
    dayName: now.toLocaleDateString(undefined, { weekday: 'long' }),
    classItem: selected,
    status: active ? 'In progress' : upcoming ? 'Up next' : completed ? 'Completed' : selected ? 'Scheduled today' : ''
  };
}

function parseScheduleTime(value) {
  const parts = String(value || '').split(/\s*(?:-|–|to)\s*/i);
  if (parts.length < 2) return null;

  const parseClock = clock => {
    const match = String(clock).trim().match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/i);
    if (!match) return null;
    let hours = Number(match[1]);
    const minutes = Number(match[2] || 0);
    const meridiem = (match[3] || '').toLowerCase();
    if (hours > 23 || minutes > 59 || (meridiem && hours > 12) || (meridiem && hours === 0)) return null;
    if (meridiem === 'pm' && hours < 12) hours += 12;
    if (meridiem === 'am' && hours === 12) hours = 0;
    return hours * 60 + minutes;
  };

  const start = parseClock(parts[0]);
  const end = parseClock(parts[1]);
  return start === null || end === null ? null : { start, end };
}

function renderTodayScheduleBanner(todayStr, todaySchedule) {
  const date = parseISO(todayStr);
  const dateLabel = date ? date.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }) : todayStr;
  const item = todaySchedule.classItem;

  if (!item) {
    return `
      <section class="today-schedule-banner card" aria-label="Today's schedule">
        <div class="today-schedule-heading">
          <div class="today-schedule-icon"><i data-lucide="calendar-days" class="icon"></i></div>
          <div>
            <div class="today-schedule-eyebrow">Today's Schedule</div>
            <h2>${escapeHtml(todaySchedule.dayName)} <span>${escapeHtml(dateLabel)}</span></h2>
          </div>
        </div>
        <div class="today-schedule-empty">No classes scheduled for today</div>
        <a href="timetable.html" class="btn btn-outline btn-sm"><i data-lucide="calendar" class="icon"></i> View Full Timetable</a>
      </section>
    `;
  }

  const slot = item.slot;
  let joinUrl = '';
  try {
    const parsedUrl = new URL(slot.room || '');
    if (parsedUrl.protocol === 'https:' || parsedUrl.protocol === 'http:') joinUrl = parsedUrl.href;
  } catch (error) {
    // A schedule slot without a valid URL can still link to the timetable.
  }

  return `
    <section class="today-schedule-banner card" aria-label="Today's schedule">
      <div class="today-schedule-heading">
        <div class="today-schedule-icon"><i data-lucide="calendar-days" class="icon"></i></div>
        <div>
          <div class="today-schedule-eyebrow">Today's Schedule</div>
          <h2>${escapeHtml(todaySchedule.dayName)} <span>${escapeHtml(dateLabel)}</span></h2>
        </div>
      </div>
      <div class="today-schedule-class">
        <span class="badge badge-blue">${escapeHtml(item.status)}</span>
        <div>
          <div class="today-schedule-subject">${escapeHtml(slot.subject || 'Class')}</div>
          <div class="today-schedule-details">Batch: ${escapeHtml(slot.batch || '—')} <span>·</span> ${escapeHtml(slot.time || 'Time not set')}</div>
        </div>
      </div>
      <div class="today-schedule-actions">
        <a href="${joinUrl ? escapeHtml(joinUrl) : 'timetable.html'}" ${joinUrl ? 'target="_blank" rel="noopener noreferrer"' : ''} class="btn btn-primary btn-sm">
          <i data-lucide="${joinUrl ? 'video' : 'calendar'}" class="icon"></i> ${joinUrl ? 'Join Class' : 'View Timetable'}
        </a>
        <a href="timetable.html" class="btn btn-outline btn-sm">Full Timetable</a>
      </div>
    </section>
  `;
}

function renderScheduleWidget() {
  if (!STATE.schedule || STATE.schedule.length === 0) {
    return `<div style="text-align:center;padding:20px;color:var(--text-secondary);font-size:13.5px">No scheduled classes configured.</div>`;
  }
  return STATE.schedule.map(sc => `
    <div class="schedule-item">
      <div>
        <div style="font-weight:700;font-size:14px">${escapeHtml(sc.subject)}</div>
        <div style="font-size:12px;color:var(--text-secondary)">Batch: ${escapeHtml(sc.batch)} | ${escapeHtml(sc.room)}</div>
      </div>
      <div style="text-align:right">
        <span class="schedule-time">${escapeHtml(sc.time)}</span>
        <div style="font-size:11px;color:var(--text-muted);margin-top:2px">${escapeHtml(sc.days)}</div>
      </div>
    </div>
  `).join('');
}

function renderNoticesWidget() {
  if (!STATE.notices || STATE.notices.length === 0) {
    return `<div style="text-align:center;padding:20px;color:var(--text-secondary);font-size:13.5px">No recent announcements.</div>`;
  }
  return STATE.notices.slice(0, 3).map(n => `
    <div class="notice-card">
      <div class="notice-header">
        <span class="notice-title">${escapeHtml(n.title)}</span>
        <span class="badge badge-blue">${escapeHtml(n.category || 'General')}</span>
      </div>
      <div class="notice-body">${escapeHtml(n.content)}</div>
      <div style="font-size:11px;color:var(--text-muted);display:flex;justify-content:space-between;margin-top:4px">
        <span>Target: ${escapeHtml(n.batch || 'All')}</span>
        <span>${formatDate(n.date)}</span>
      </div>
    </div>
  `).join('');
}
