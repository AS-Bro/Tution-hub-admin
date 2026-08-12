/* ==========================================================================
   TuitionHub — Attendance Script (attendance.js)
   ========================================================================== */

let attState = {
  date: todayISO(),
  selectedBatch: '',
  localMarks: {} // studentId -> status ('Present' | 'Absent' | 'Late')
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

  const batches = Array.from(new Set(STATE.students.map(s => s.batch).filter(Boolean)));
  if (!attState.selectedBatch && batches.length > 0) attState.selectedBatch = batches[0];

  let filteredStudents = STATE.students.filter(s => {
    return s.status === 'Active' && (!attState.selectedBatch || s.batch === attState.selectedBatch);
  });

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
      <div class="badge badge-blue" style="padding:8px 14px;font-size:13px">Total in Batch: ${filteredStudents.length}</div>
    </div>

    <!-- STUDENT ATTENDANCE REGISTER TABLE -->
    ${filteredStudents.length === 0 ? `
      <div class="card empty-state">
        <div class="emoji">📋</div>
        <h4>No active students in this batch</h4>
        <p>Select another batch or add new students to this grade.</p>
      </div>
    ` : `
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Student Name</th>
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
        showToast('info', 'No absent students in this batch!');
        return;
      }
      absentees.forEach(s => {
        const msg = `Dear Parent, your child ${s.studentName} was marked ABSENT for tuition on ${formatDate(attState.date)}. Please inform us if there is an issue. - ${STATE.settings.tuitionName || 'Tuition Center'}`;
        openWhatsApp(s.phone, msg);
      });
    };
  }

  $all('.send-absent-wa-btn').forEach(btn => {
    btn.onclick = () => {
      const msg = `Dear Parent, this is an update regarding ${btn.dataset.name}'s attendance at ${STATE.settings.tuitionName || 'Tuition Center'} on ${formatDate(attState.date)}.`;
      openWhatsApp(btn.dataset.phone, msg);
    };
  });
}
