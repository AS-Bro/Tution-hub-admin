/* ==========================================================================
   TuitionHub — Dashboard Script (dashboard.js)
   ========================================================================== */

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
  const todayAttendance = STATE.attendance.filter(a => a.date === todayStr);
  const presentCount = todayAttendance.filter(a => a.status === 'Present').length;
  const attendanceRate = todayAttendance.length > 0 ? Math.round((presentCount / todayAttendance.length) * 100) : 100;

  const totalPendingFees = STATE.students.reduce((acc, s) => {
    const stats = computeStudentStats(s.studentId);
    return acc + (stats.pendingCount * (Number(s.monthlyFee) || 1000));
  }, 0);

  const teacherName = STATE.settings.teacherName || 'Tutor';
  const liveClassUrl = STATE.settings.liveClassLink || '#';
  const w = (STATE.settings.dashboardWidgets) || {};

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
  `;

  if (window.lucide) lucide.createIcons();
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
