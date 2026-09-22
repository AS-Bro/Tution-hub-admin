/* ==========================================================================
   TuitionHub — Attendance Script (attendance.js)
   ========================================================================== */

let attState = {
  date: todayISO(),
  selectedBatch: 'ALL',
  selectedStudentId: null, // For calendar view - specific student to display
  localMarks: {}, // studentId -> status ('Present' | 'Absent' | 'Late')
  viewMode: 'daily' // 'daily' or 'calendar'
};

document.addEventListener('DOMContentLoaded', () => {
  injectShellLayout('attendance', 'Attendance Tracker');
  initAttendanceMarks();
  renderAttendancePage();
});

window.onSyncComplete = function () {
  initAttendanceMarks();
  renderAttendancePage();
};

function initAttendanceMarks() {
  attState.localMarks = {};
  const existingForDate = STATE.attendance.filter(a => a.date === attState.date);
  existingForDate.forEach(a => {
    attState.localMarks[a.studentId] = a.status;
  });
}

function renderAttendancePage() {
  const container = $('#page-content');
  if (!container) return;

  if (attState.viewMode === 'calendar') {
    renderCalendarView();
  } else {
    renderDailyView();
  }
}

function renderDailyView() {
  const container = $('#page-content');
  if (!container) return;

  const batches = Array.from(new Set(STATE.students.map(s => s.batch).filter(Boolean)));
  if (!attState.selectedBatch) attState.selectedBatch = 'ALL';

  const isAllStudents = attState.selectedBatch === 'ALL';

  let filteredStudents = STATE.students.filter(s => {
    return s.status === 'Active' && (isAllStudents || s.batch === attState.selectedBatch);
  });

  // If this date is a holiday (Sunday or configured notice), show holiday UI and disable marking
  if (isHoliday(attState.date)) {
    const note = Array.isArray(STATE.notices) && STATE.notices.find(n => n.category === 'Holiday' && n.date === attState.date);
    const title = note && note.title ? note.title : 'Holiday (Sunday)';
    container.innerHTML = `
      <div class="section-head">
        <div>
          <h2>Daily Attendance Register</h2>
          <div class="section-sub">Attendance marking is disabled for holidays</div>
        </div>
        <div style="display:flex;gap:10px">
          <div style="display:flex;gap:6px;background:var(--border-subtle);padding:4px;border-radius:var(--radius-md)">
            <button class="btn btn-sm att-view-btn ${attState.viewMode === 'daily' ? 'btn-primary' : 'btn-outline'}" data-view="daily">
              <i data-lucide="list" class="icon"></i> Daily
            </button>
            <button class="btn btn-sm att-view-btn ${attState.viewMode === 'calendar' ? 'btn-primary' : 'btn-outline'}" data-view="calendar">
              <i data-lucide="calendar" class="icon"></i> Calendar
            </button>
          </div>
        </div>
      </div>

      <div class="toolbar">
        <div class="form-row" style="width:200px">
          <input type="date" id="att-date-picker" value="${attState.date}">
        </div>
        <select class="select-filter" id="att-batch-filter">
          <option value="ALL" ${isAllStudents ? 'selected' : ''}>All Students</option>
          ${batches.map(b => `<option value="${escapeHtml(b)}" ${attState.selectedBatch === b ? 'selected' : ''}>${escapeHtml(b)}</option>`).join('')}
        </select>
      </div>

      <div class="card" style="padding:20px;margin-top:16px">
        <h3 style="margin:0 0 8px 0">${escapeHtml(title)}</h3>
        <p style="margin:0;color:var(--text-secondary)">This date is marked as a holiday. Attendance marking is disabled.</p>
      </div>
    `;
    if (window.lucide) lucide.createIcons();
    bindAttendanceEvents(filteredStudents);
    return;
  }

  /* Calculate counts */
  let presentCount = 0, absentCount = 0, lateCount = 0;
  filteredStudents.forEach(s => {
    const st = attState.localMarks[s.studentId] || 'Present';
    if (st === 'Present') presentCount++;
    else if (st === 'Absent') absentCount++;
    else if (st === 'Late') lateCount++;
  });

   container.innerHTML = `
     <div class="section-head">
       <div>
         <h2>Daily Attendance Register</h2>
         <div class="section-sub">Mark student presence for selected date</div>
       </div>
       <div style="display:flex;gap:10px">
         <div style="display:flex;gap:6px;background:var(--border-subtle);padding:4px;border-radius:var(--radius-md)">
           <button class="btn btn-sm att-view-btn ${attState.viewMode === 'daily' ? 'btn-primary' : 'btn-outline'}" data-view="daily">
             <i data-lucide="list" class="icon"></i> Daily
           </button>
           <button class="btn btn-sm att-view-btn ${attState.viewMode === 'calendar' ? 'btn-primary' : 'btn-outline'}" data-view="calendar">
             <i data-lucide="calendar" class="icon"></i> Calendar
           </button>
         </div>
         <button class="btn btn-outline btn-sm" id="notify-absentees-btn">
           <i data-lucide="message-square" class="icon" style="color:var(--warning)"></i> Notify Absentees (WhatsApp)
         </button>
         <button class="btn btn-primary btn-sm" id="save-att-btn">
           <i data-lucide="save" class="icon"></i> Save Attendance
         </button>
       </div>
     </div>

    <!-- TOOLBAR & FILTERS -->
    <div class="toolbar">
      <div class="form-row" style="width:200px">
        <input type="date" id="att-date-picker" value="${attState.date}">
      </div>
      <select class="select-filter" id="att-batch-filter">
        <option value="ALL" ${isAllStudents ? 'selected' : ''}>All Students</option>
        ${batches.map(b => `<option value="${escapeHtml(b)}" ${attState.selectedBatch === b ? 'selected' : ''}>${escapeHtml(b)}</option>`).join('')}
      </select>
      <div style="margin-left:auto;display:flex;gap:8px">
        <button class="btn btn-secondary btn-sm" id="bulk-present-btn"><i data-lucide="check-check" class="icon"></i> Mark All Present</button>
        <button class="btn btn-outline btn-sm" id="bulk-absent-btn"><i data-lucide="x" class="icon"></i> Mark All Absent</button>
      </div>
    </div>

    <!-- SUMMARY CHIPS -->
    <div style="display:flex;gap:12px;margin-bottom:20px;flex-wrap:wrap">
      <div class="badge badge-green" style="padding:8px 14px;font-size:13px"><i data-lucide="check" class="icon"></i> Present: ${presentCount}</div>
      <div class="badge badge-red" style="padding:8px 14px;font-size:13px"><i data-lucide="x" class="icon"></i> Absent: ${absentCount}</div>
      <div class="badge badge-yellow" style="padding:8px 14px;font-size:13px"><i data-lucide="clock" class="icon"></i> Late: ${lateCount}</div>
      <div class="badge badge-blue" style="padding:8px 14px;font-size:13px">${isAllStudents ? 'Total Students' : 'Total in Batch'}: ${filteredStudents.length}</div>
    </div>

    <!-- STUDENT ATTENDANCE REGISTER TABLE -->
    ${filteredStudents.length === 0 ? `
      <div class="card empty-state">
        <div class="emoji">📋</div>
        <h4>${isAllStudents ? 'No active students found' : 'No active students in this batch'}</h4>
        <p>${isAllStudents ? 'Add new students to your directory to start tracking attendance.' : 'Select another batch or add new students to this grade.'}</p>
      </div>
    ` : `
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Student Name</th>
              ${isAllStudents ? '<th>Grade</th>' : ''}
              <th>Parent Contact</th>
              <th style="text-align:center">Mark Status</th>
              <th style="text-align:right">History & Notice</th>
            </tr>
          </thead>
          <tbody>
            ${filteredStudents.map(s => {
    const currentMark = attState.localMarks[s.studentId] || 'Present';
    const stats = computeStudentStats(s.studentId);
    return `
                <tr>
                  <td><span style="font-weight:700;color:var(--primary)">${escapeHtml(s.studentId)}</span></td>
                  <td>
                    <div style="font-weight:700">${escapeHtml(s.studentName)}</div>
                    <div style="font-size:12px;color:var(--text-secondary)">Overall Rate: ${stats.pct}%</div>
                  </td>
                  ${isAllStudents ? `<td><span class="badge badge-blue">${escapeHtml(s.batch || '—')}</span></td>` : ''}
                  <td>
                    <div style="font-size:13px">${escapeHtml(s.parentName || '—')}</div>
                    <div style="font-size:12px;color:var(--text-secondary)">${escapeHtml(s.phone || '—')}</div>
                  </td>
                  <td style="text-align:center">
                    <div style="display:inline-flex;gap:6px;background:var(--border-subtle);padding:4px;border-radius:var(--radius-md)">
                      <button class="btn btn-sm att-status-btn ${currentMark === 'Present' ? 'btn-success' : 'btn-outline'}" data-id="${escapeHtml(s.studentId)}" data-status="Present">Present</button>
                      <button class="btn btn-sm att-status-btn ${currentMark === 'Absent' ? 'btn-danger' : 'btn-outline'}" data-id="${escapeHtml(s.studentId)}" data-status="Absent">Absent</button>
                      <button class="btn btn-sm att-status-btn ${currentMark === 'Late' ? 'btn-warning' : 'btn-outline'}" data-id="${escapeHtml(s.studentId)}" data-status="Late">Late</button>
                    </div>
                  </td>
                  <td style="text-align:right">
                    <button class="btn btn-outline btn-sm send-absent-wa-btn" data-phone="${escapeHtml(s.phone || '')}" data-name="${escapeHtml(s.studentName)}" title="Notify Parent">
                      <i data-lucide="message-circle" class="icon" style="color:var(--success)"></i> Notice
                    </button>
                  </td>
                </tr>
              `;
  }).join('')}
          </tbody>
        </table>
      </div>
    `}
  `;

  if (window.lucide) lucide.createIcons();
  bindAttendanceEvents(filteredStudents);
}

/* ======================================================================
   CALENDAR VIEW FUNCTIONS
   ====================================================================== */

let calendarState = {
  displayMonth: new Date(),
  studentsListCache: [] // Cache of active students for search
};

// Holiday helpers
function isHoliday(dateStr) {
  // Sunday is default weekly holiday
  const d = parseISO(dateStr);
  if (!d) return false;
  if (d.getDay() === 0) return true; // Sunday

  // Check notices for explicit holiday entries (category === 'Holiday')
  if (Array.isArray(STATE.notices)) {
    if (STATE.notices.some(n => n.category === 'Holiday' && n.date === dateStr)) return true;
  }

  // Future: check STATE.settings.academicSettings for structured holidays if available
  return false;
}

function getHolidaysInMonth(date) {
  const y = date.getFullYear();
  const m = date.getMonth();
  const daysInMonth = new Date(y, m + 1, 0).getDate();
  const result = new Set();
  for (let d = 1; d <= daysInMonth; d++) {
    const iso = dateToISO(new Date(y, m, d));
    if (isHoliday(iso)) result.add(iso);
  }
  return Array.from(result);
}

function getActiveStudents() {
  return STATE.students.filter(s => s.status === 'Active');
}

function getStudentAttendanceForMonth(studentId, date) {
  const firstDay = new Date(date.getFullYear(), date.getMonth(), 1);
  const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0);

  const records = STATE.attendance.filter(a => {
    const aDate = parseISO(a.date);
    return a.studentId === studentId && aDate >= firstDay && aDate <= lastDay;
  });

  return records;
}

function getStudentMonthlyStats(studentId, date) {
  let records = getStudentAttendanceForMonth(studentId, date);
  // Exclude any attendance records that fall on holidays (Sundays / configured)
  records = records.filter(r => !isHoliday(r.date));

  // Count raw statuses
  const present = records.filter(r => r.status === 'Present').length;
  const absent = records.filter(r => r.status === 'Absent').length;
  const late = records.filter(r => r.status === 'Late').length;

  // Compute applicable days (exclude Sundays and other holidays)
  const y = date.getFullYear();
  const m = date.getMonth();
  const daysInMonth = new Date(y, m + 1, 0).getDate();
  const holidaySet = new Set(getHolidaysInMonth(date));
  const applicableDays = daysInMonth - holidaySet.size;

  const totalMarked = present + absent + late;
  const notMarked = Math.max(0, applicableDays - totalMarked);
  const percentage = totalMarked > 0 ? Math.round((present / totalMarked) * 100) : 0;

  return { present, absent, late, notMarked, percentage, total: totalMarked };
}

function renderCalendarView() {
  const container = $('#page-content');
  if (!container) return;

  const activeStudents = getActiveStudents();
  const monthName = calendarState.displayMonth.toLocaleString('default', { month: 'long', year: 'numeric' });

  // Use existing selectedStudentId or select first active student
  if (!attState.selectedStudentId && activeStudents.length > 0) {
    attState.selectedStudentId = activeStudents[0].studentId;
  }

  const selectedStudent = attState.selectedStudentId
    ? STATE.students.find(s => s.studentId === attState.selectedStudentId)
    : null;

  const studentSearchList = activeStudents.map(s => `
    <div class="student-option" data-student-id="${escapeHtml(s.studentId)}">
      <div style="font-weight:600">${escapeHtml(s.studentName)}</div>
      <div style="font-size:12px;color:var(--text-secondary)">${escapeHtml(s.studentId)} • ${escapeHtml(s.batch || 'N/A')}</div>
    </div>
  `).join('');

  const stats = selectedStudent ? getStudentMonthlyStats(selectedStudent.studentId, calendarState.displayMonth) : null;
  const calendarHtml = selectedStudent ? buildCalendarGridCompact(calendarState.displayMonth, selectedStudent.studentId) : '<div class="empty-state">No student selected</div>';

  container.innerHTML = `
    <div class="section-head">
      <div>
        <h2>Attendance Calendar</h2>
        <div class="section-sub">View individual student attendance by month</div>
      </div>
      <div style="display:flex;gap:10px">
        <div style="display:flex;gap:6px;background:var(--border-subtle);padding:4px;border-radius:var(--radius-md)">
          <button class="btn btn-sm att-view-btn ${attState.viewMode === 'daily' ? 'btn-primary' : 'btn-outline'}" data-view="daily">
            <i data-lucide="list" class="icon"></i> Daily
          </button>
          <button class="btn btn-sm att-view-btn ${attState.viewMode === 'calendar' ? 'btn-primary' : 'btn-outline'}" data-view="calendar">
            <i data-lucide="calendar" class="icon"></i> Calendar
          </button>
        </div>
      </div>
    </div>

    <!-- STUDENT SELECTOR -->
    <div class="card" style="padding:16px;margin-bottom:16px">
      <div style="display:flex;gap:12px;align-items:flex-end;flex-wrap:wrap">
        <div style="flex:1;min-width:250px">
          <label style="font-size:13px;font-weight:600;color:var(--text-secondary);display:block;margin-bottom:6px">
            <i data-lucide="search" class="icon" style="width:14px;height:14px;display:inline;margin-right:4px"></i>
            Search Student
          </label>
          <div style="position:relative">
            <input 
              type="text" 
              id="student-search-input" 
              placeholder="Search by name or ID..." 
              class="form-input"
              style="width:100%;padding:8px 12px;border:1px solid var(--border);border-radius:var(--radius-md);font-size:13px"
            >
            <div id="student-search-dropdown" style="position:absolute;top:100%;left:0;right:0;background:var(--card);border:1px solid var(--border);border-top:none;border-radius:0 0 var(--radius-md) var(--radius-md);max-height:240px;overflow-y:auto;z-index:100;display:none;box-shadow:var(--shadow-md)">
              ${studentSearchList}
            </div>
          </div>
        </div>
        
        <div>
          <label style="font-size:13px;font-weight:600;color:var(--text-secondary);display:block;margin-bottom:6px">Student</label>
          <select id="student-select" class="select-filter" style="min-width:200px">
            <option value="">— Select Student —</option>
            ${activeStudents.map(s => `<option value="${escapeHtml(s.studentId)}" ${attState.selectedStudentId === s.studentId ? 'selected' : ''}>${escapeHtml(s.studentName)}</option>`).join('')}
          </select>
        </div>
        
        ${selectedStudent ? `
          <button id="clear-student-btn" class="btn btn-outline btn-sm" title="Clear selection">
            <i data-lucide="x" class="icon"></i> Clear
          </button>
        ` : ''}
      </div>
    </div>

    <!-- STUDENT SUMMARY -->
    ${selectedStudent ? `
      <div class="card" style="padding:16px;margin-bottom:16px">
        <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(120px, 1fr));gap:12px">
          <div style="text-align:center">
            <div style="font-weight:700;color:var(--text);font-size:20px">${stats.present}</div>
            <div style="font-size:12px;color:var(--text-secondary);margin-top:4px"><i data-lucide="check" class="icon" style="width:12px;height:12px;display:inline;color:var(--success)"></i> Present</div>
          </div>
          <div style="text-align:center">
            <div style="font-weight:700;color:var(--text);font-size:20px">${stats.absent}</div>
            <div style="font-size:12px;color:var(--text-secondary);margin-top:4px"><i data-lucide="x" class="icon" style="width:12px;height:12px;display:inline;color:var(--danger)"></i> Absent</div>
          </div>
          <div style="text-align:center">
            <div style="font-weight:700;color:var(--text);font-size:20px">${stats.late}</div>
            <div style="font-size:12px;color:var(--text-secondary);margin-top:4px"><i data-lucide="clock" class="icon" style="width:12px;height:12px;display:inline;color:var(--warning)"></i> Late</div>
          </div>
          <div style="text-align:center">
            <div style="font-weight:700;color:var(--text);font-size:20px">${stats.notMarked}</div>
            <div style="font-size:12px;color:var(--text-secondary);margin-top:4px"><i data-lucide="circle" class="icon" style="width:12px;height:12px;display:inline;color:var(--border)"></i> Not Marked</div>
          </div>
          <div style="text-align:center">
            <div style="font-weight:700;color:var(--primary);font-size:20px">${stats.percentage}%</div>
            <div style="font-size:12px;color:var(--text-secondary);margin-top:4px">Attendance Rate</div>
          </div>
        </div>
      </div>
    ` : ''}

    <!-- MONTH NAVIGATION -->
    <div class="toolbar" style="justify-content:center;gap:16px;margin-bottom:16px">
      <button class="btn btn-outline btn-sm" id="cal-prev-btn">
        <i data-lucide="chevron-left" class="icon"></i>
      </button>
      <div style="font-weight:600;color:var(--text);min-width:140px;text-align:center">${monthName}</div>
      <button class="btn btn-outline btn-sm" id="cal-next-btn">
        <i data-lucide="chevron-right" class="icon"></i>
      </button>
    </div>

    <!-- CALENDAR GRID -->
    <div class="card" style="padding:16px">
      ${calendarHtml}
    </div>

    <!-- LEGEND -->
    <div style="margin-top:24px">
      <div class="card" style="padding:16px">
        <h4 style="font-size:13px;font-weight:700;margin-bottom:12px">Attendance Status</h4>
        <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(150px, 1fr));gap:12px;font-size:12px">
          <div style="display:flex;align-items:center;gap:8px">
            <div style="width:16px;height:16px;border-radius:50%;background:var(--success)"></div>
            <span>Present</span>
          </div>
          <div style="display:flex;align-items:center;gap:8px">
            <div style="width:16px;height:16px;border-radius:50%;background:var(--danger)"></div>
            <span>Absent</span>
          </div>
          <div style="display:flex;align-items:center;gap:8px">
            <div style="width:16px;height:16px;border-radius:50%;background:var(--warning)"></div>
            <span>Late</span>
          </div>
          <div style="display:flex;align-items:center;gap:8px">
            <div style="width:16px;height:16px;border-radius:50%;background:var(--border)"></div>
            <span>Not Marked</span>
          </div>
        </div>
      </div>
    </div>
  `;

  if (window.lucide) lucide.createIcons();
  bindCalendarEvents();
}

function buildCalendarGridCompact(displayMonth, studentId) {
  const year = displayMonth.getFullYear();
  const month = displayMonth.getMonth();
  const monthStart = new Date(year, month, 1);
  const firstDay = monthStart.getDay(); // 0 = Sunday
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const weeks = [];
  let dayCounter = 1;

  // Build weeks until we've placed all days
  while (dayCounter <= daysInMonth) {
    const week = new Array(7).fill(null);
    for (let weekday = 0; weekday < 7; weekday++) {
      // For the first week, skip days before the firstDay
      if (weeks.length === 0 && weekday < firstDay) continue;
      if (dayCounter > daysInMonth) break;
      week[weekday] = dayCounter++;
    }
    weeks.push(week);
  }

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  let html = `
    <div class="calendar-grid-compact">
      ${dayNames.map(d => `<div class="calendar-header-compact">${d}</div>`).join('')}
  `;

  weeks.forEach(week => {
    week.forEach(day => {
      if (!day) {
        html += `<div class="calendar-cell-compact empty"></div>`;
      } else {
        const dateStr = dateToISO(new Date(year, month, day));
        // Holiday handling: Sundays and notices
        if (isHoliday(dateStr)) {
          let title = 'Holiday';
          const note = Array.isArray(STATE.notices) && STATE.notices.find(n => n.category === 'Holiday' && n.date === dateStr);
          if (note && note.title) title = `${note.title} — Holiday`;
          html += `
            <div class="calendar-cell-compact holiday" data-date="${dateStr}" title="${title}">
              <div class="calendar-date-compact">${day}</div>
              <div class="calendar-status-compact holiday"></div>
            </div>
          `;
        } else {
          const statusObj = getStudentAttendanceStatusCompact(studentId, dateStr);
          html += `
            <div class="calendar-cell-compact ${statusObj.class}" data-date="${dateStr}" title="${statusObj.tooltip}">
              <div class="calendar-date-compact">${day}</div>
              <div class="calendar-status-compact ${statusObj.class}"></div>
            </div>
          `;
        }
      }
    });
  });

  html += `</div>`;
  return html;
}

function getStudentAttendanceStatusCompact(studentId, dateStr) {
  // If date is holiday, always show holiday marker
  if (isHoliday(dateStr)) {
    return { class: 'holiday', tooltip: 'Holiday' };
  }

  const record = STATE.attendance.find(a => a.studentId === studentId && a.date === dateStr);
  if (!record) {
    return { class: 'not-marked', tooltip: 'Not marked' };
  }

  if (record.status === 'Present') return { class: 'present', tooltip: 'Present' };
  if (record.status === 'Absent') return { class: 'absent', tooltip: 'Absent' };
  if (record.status === 'Late') return { class: 'late', tooltip: 'Late' };

  return { class: 'not-marked', tooltip: 'Not marked' };
}

function bindAttendanceEvents(filteredStudents) {
  const datePicker = $('#att-date-picker');
  if (datePicker) {
    datePicker.onchange = (e) => {
      attState.date = e.target.value;
      initAttendanceMarks();
      renderAttendancePage();
    };
  }

  const batchFilter = $('#att-batch-filter');
  if (batchFilter) {
    batchFilter.onchange = (e) => {
      attState.selectedBatch = e.target.value;
      renderAttendancePage();
    };
  }

  const bulkPresentBtn = $('#bulk-present-btn');
  if (bulkPresentBtn) {
    bulkPresentBtn.onclick = () => {
      filteredStudents.forEach(s => { attState.localMarks[s.studentId] = 'Present'; });
      renderAttendancePage();
    };
  }

  const bulkAbsentBtn = $('#bulk-absent-btn');
  if (bulkAbsentBtn) {
    bulkAbsentBtn.onclick = () => {
      filteredStudents.forEach(s => { attState.localMarks[s.studentId] = 'Absent'; });
      renderAttendancePage();
    };
  }

  $all('.att-status-btn').forEach(btn => {
    btn.onclick = () => {
      const id = btn.dataset.id;
      const status = btn.dataset.status;
      attState.localMarks[id] = status;
      renderAttendancePage();
    };
  });

  const saveBtn = $('#save-att-btn');
  if (saveBtn) {
    saveBtn.onclick = async () => {
      /* Filter out old records for this date and batch, then append new ones */
      const studentIdsInBatch = new Set(filteredStudents.map(s => s.studentId));
      STATE.attendance = STATE.attendance.filter(a => !(a.date === attState.date && studentIdsInBatch.has(a.studentId)));

      const newRecords = [];
      filteredStudents.forEach(s => {
        const mark = attState.localMarks[s.studentId] || 'Present';
        const record = {
          id: uid(),
          studentId: s.studentId,
          studentName: s.studentName,
          batch: s.batch,
          date: attState.date,
          status: mark
        };
        STATE.attendance.push(record);
        newRecords.push(record);
      });

      saveStorage(LS_KEYS.ATTENDANCE, STATE.attendance);
      showToast('success', `Attendance saved for ${formatDate(attState.date)}`);

      if (STATE.settings.gasUrl && window.apiRequest) {
        try {
          await window.apiRequest('saveAttendance', { date: attState.date, records: newRecords });
        } catch (e) {
          showToast('warning', 'Saved locally, but Google Sheets sync failed');
        }
      }
    };
  }

  const notifyAbsenteesBtn = $('#notify-absentees-btn');
  if (notifyAbsenteesBtn) {
    notifyAbsenteesBtn.onclick = () => {
      const absentees = filteredStudents.filter(s => (attState.localMarks[s.studentId] || 'Present') === 'Absent');
      if (absentees.length === 0) {
        showToast('info', attState.selectedBatch === 'ALL' ? 'No absent students!' : 'No absent students in this batch!');
        return;
      }
      const tpl = (STATE.settings.whatsappTemplates && STATE.settings.whatsappTemplates.absent)
        || 'Dear Parent, your child {studentName} was marked ABSENT for tuition on {date}. Please inform us if there is an issue. - {centerName}';
      absentees.forEach(s => {
        const msg = window.formatMessageTemplate ? formatMessageTemplate(tpl, {
          studentName: s.studentName,
          date: formatDate(attState.date),
          centerName: STATE.settings.tuitionName || 'Tuition Center'
        }) : tpl;
        openWhatsApp(s.phone, msg);
      });
    };
  }

   $all('.send-absent-wa-btn').forEach(btn => {
     btn.onclick = () => {
       const tpl = (STATE.settings.whatsappTemplates && STATE.settings.whatsappTemplates.absent)
         || 'Dear Parent, your child {studentName} was marked ABSENT for tuition on {date}. Please inform us if there is an issue. - {centerName}';
       const msg = window.formatMessageTemplate ? formatMessageTemplate(tpl, {
         studentName: btn.dataset.name,
         date: formatDate(attState.date),
         centerName: STATE.settings.tuitionName || 'Tuition Center'
       }) : tpl;
       openWhatsApp(btn.dataset.phone, msg);
     };
   });

   // View mode toggle
   $all('.att-view-btn').forEach(btn => {
     btn.onclick = () => {
       attState.viewMode = btn.dataset.view;
       renderAttendancePage();
     };
   });
}

function bindCalendarEvents() {
  const prevBtn = $('#cal-prev-btn');
  if (prevBtn) {
    prevBtn.onclick = () => {
      calendarState.displayMonth = new Date(calendarState.displayMonth.getFullYear(), calendarState.displayMonth.getMonth() - 1, 1);
      renderAttendancePage();
    };
  }

  const nextBtn = $('#cal-next-btn');
  if (nextBtn) {
    nextBtn.onclick = () => {
      calendarState.displayMonth = new Date(calendarState.displayMonth.getFullYear(), calendarState.displayMonth.getMonth() + 1, 1);
      renderAttendancePage();
    };
  }

  // Student search input
  const searchInput = $('#student-search-input');
  const searchDropdown = $('#student-search-dropdown');
  if (searchInput && searchDropdown) {
    searchInput.oninput = (e) => {
      const query = e.target.value.toLowerCase().trim();

      if (query.length === 0) {
        searchDropdown.style.display = 'none';
        return;
      }

      const activeStudents = getActiveStudents();
      const filtered = activeStudents.filter(s =>
        s.studentName.toLowerCase().includes(query) ||
        s.studentId.toLowerCase().includes(query)
      );

      if (filtered.length === 0) {
        searchDropdown.innerHTML = '<div style="padding:12px;text-align:center;color:var(--text-secondary);font-size:12px">No students found</div>';
      } else {
        searchDropdown.innerHTML = filtered.map(s => `
          <div class="student-option" data-student-id="${escapeHtml(s.studentId)}">
            <div style="font-weight:600">${escapeHtml(s.studentName)}</div>
            <div style="font-size:12px;color:var(--text-secondary)">${escapeHtml(s.studentId)} • ${escapeHtml(s.batch || 'N/A')}</div>
          </div>
        `).join('');
      }

      searchDropdown.style.display = 'block';

      // Bind click handlers for search results
      $all('.student-option', searchDropdown).forEach(opt => {
        opt.onclick = () => {
          const studentId = opt.dataset.studentId;
          attState.selectedStudentId = studentId;
          searchInput.value = '';
          searchDropdown.style.display = 'none';
          renderAttendancePage();
        };
      });
    };

    // Hide dropdown when clicking outside
    document.addEventListener('click', (e) => {
      if (e.target !== searchInput && !searchDropdown.contains(e.target)) {
        searchDropdown.style.display = 'none';
      }
    });
  }

  // Student select dropdown
  const studentSelect = $('#student-select');
  if (studentSelect) {
    studentSelect.onchange = (e) => {
      if (e.target.value) {
        attState.selectedStudentId = e.target.value;
        renderAttendancePage();
      }
    };
  }

  // Clear student button
  const clearBtn = $('#clear-student-btn');
  if (clearBtn) {
    clearBtn.onclick = () => {
      attState.selectedStudentId = null;
      renderAttendancePage();
    };
  }

  // Click on date cell to switch to daily view
  $all('.calendar-cell-compact:not(.empty)').forEach(cell => {
    cell.onclick = () => {
      const dateStr = cell.dataset.date;
      attState.date = dateStr;
      initAttendanceMarks();
      attState.viewMode = 'daily';
      renderAttendancePage();
    };
  });

  // View mode toggle
  $all('.att-view-btn').forEach(btn => {
    btn.onclick = () => {
      attState.viewMode = btn.dataset.view;
      renderAttendancePage();
    };
  });
}
