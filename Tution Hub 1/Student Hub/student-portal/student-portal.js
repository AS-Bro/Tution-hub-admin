/* ==========================================================================
   TuitionHub — Student Portal Standalone Engine (student-portal.js)
   Self-contained read-only portal logic with login verification, Google Sheets
   read sync, and personal student records view (Attendance, Fees, Exams, Schedule, Notices).
   ========================================================================== */

const LS_KEYS = {
  SETTINGS: 'th_settings',
  THEME: 'th_theme',
  STUDENTS: 'th_students',
  ATTENDANCE: 'th_attendance',
  FEES: 'th_fees',
  EXAMS: 'th_exams',
  EXAM_MARKS: 'th_exam_marks',
  SCHEDULE: 'th_schedule',
  NOTICES: 'th_notices',
  STUDENT_SESSION: 'th_student_session'
};

const DEFAULT_SETTINGS = {
  gasUrl: 'https://script.google.com/macros/s/AKfycbxwQ6DxfQYFTfraO5XtrLrT1IpsvRQv3jHlkmeDmLadMErSbfxJI2pQf_lLmlST8uA/exec',
  tuitionName: 'TuitionHub Center',
  logoUrl: '',
  teacherName: 'Prof. Sharma',
  currency: '₹',
  dateFormat: 'DD/MM/YYYY'
};

const DEFAULT_STUDENTS = [
  { studentId: 'ST-1000', studentName: 'Demo Student', batch: 'Grade 10', phone: '0000000000', parentName: 'Rajesh Patel', monthlyFee: 1000, status: 'Active', joiningDate: '2026-01-10', password: 'Pass123' },
  { studentId: 'ST-1001', studentName: 'Aarav Patel', batch: 'Grade 10', phone: '9876543210', parentName: 'Rajesh Patel', monthlyFee: 1000, status: 'Active', joiningDate: '2026-01-10', password: 'Pass123' }
];

let STATE = {
  settings: loadStorage(LS_KEYS.SETTINGS, DEFAULT_SETTINGS),
  theme: loadStorage(LS_KEYS.THEME, 'light'),
  students: loadStorage(LS_KEYS.STUDENTS, DEFAULT_STUDENTS),
  attendance: loadStorage(LS_KEYS.ATTENDANCE, []),
  fees: loadStorage(LS_KEYS.FEES, []),
  exams: loadStorage(LS_KEYS.EXAMS, []),
  examMarks: loadStorage(LS_KEYS.EXAM_MARKS, {}),
  schedule: loadStorage(LS_KEYS.SCHEDULE, []),
  notices: loadStorage(LS_KEYS.NOTICES, [])
};

let currentStudentTab = 'overview';
let activeStudentSession = null;

/* DOM Helpers */
const $ = (sel, scope = document) => scope.querySelector(sel);
const $all = (sel, scope = document) => scope.querySelectorAll(sel);

function loadStorage(key, fallback) {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : fallback;
  } catch (e) {
    return fallback;
  }
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function formatDate(isoStr) {
  if (!isoStr) return '—';
  try {
    const parts = String(isoStr).split('-');
    if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
  } catch (e) {}
  return String(isoStr);
}

function formatCurrency(amount) {
  const sym = STATE.settings.currency || '₹';
  const val = Number(amount) || 0;
  return `${sym} ${val.toLocaleString('en-IN')}`;
}

function showToast(type, msg) {
  let container = $('#toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    document.body.appendChild(container);
  }
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.innerHTML = `<span>${escapeHtml(msg)}</span>`;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  STATE.theme = theme;
  localStorage.setItem(LS_KEYS.THEME, theme);
}

/* Initialization */
document.addEventListener('DOMContentLoaded', async () => {
  applyTheme(STATE.theme);
  // Attempt read-only sync from Google Sheets if gasUrl is configured
  await tryFetchLatestFromSheets();

  const savedSessionId = localStorage.getItem(LS_KEYS.STUDENT_SESSION);
  if (savedSessionId) {
    const studentList = Array.isArray(STATE.students) ? STATE.students : [];
    const student = studentList.find(s => s && String(s.studentId).trim().toUpperCase() === String(savedSessionId).trim().toUpperCase());
    if (student) {
      activeStudentSession = student;
      renderStudentDashboard();
      return;
    }
  }
  renderStudentLoginScreen();
});

/* Read-Only Google Sheets Sync */
async function tryFetchLatestFromSheets() {
  const gasUrl = STATE.settings.gasUrl;
  if (!gasUrl) return;

  try {
    const syncUrl = `${gasUrl}${gasUrl.includes('?') ? '&' : '?'}action=getInitialData`;
    const res = await fetch(syncUrl, { method: 'GET', redirect: 'follow' });
    const json = await res.json();
    if (json && (json.status === 'success' || json.success)) {
      const d = json.data || json;
      if (d) {
        if (Array.isArray(d.students) && d.students.length) {
          STATE.students = d.students;
          localStorage.setItem(LS_KEYS.STUDENTS, JSON.stringify(d.students));
        }
        if (Array.isArray(d.attendance)) {
          STATE.attendance = d.attendance;
          localStorage.setItem(LS_KEYS.ATTENDANCE, JSON.stringify(d.attendance));
        }
        if (Array.isArray(d.fees)) {
          STATE.fees = d.fees;
          localStorage.setItem(LS_KEYS.FEES, JSON.stringify(d.fees));
        }
        if (Array.isArray(d.exams)) {
          STATE.exams = d.exams;
          localStorage.setItem(LS_KEYS.EXAMS, JSON.stringify(d.exams));
        }
        if (d.examMarks && typeof d.examMarks === 'object') {
          STATE.examMarks = d.examMarks;
          localStorage.setItem(LS_KEYS.EXAM_MARKS, JSON.stringify(d.examMarks));
        }
        if (Array.isArray(d.schedule)) {
          STATE.schedule = d.schedule;
          localStorage.setItem(LS_KEYS.SCHEDULE, JSON.stringify(d.schedule));
        }
        if (Array.isArray(d.notices)) {
          STATE.notices = d.notices;
          localStorage.setItem(LS_KEYS.NOTICES, JSON.stringify(d.notices));
        }
        if (d.settings && typeof d.settings === 'object') {
          STATE.settings = { ...STATE.settings, ...d.settings };
          localStorage.setItem(LS_KEYS.SETTINGS, JSON.stringify(STATE.settings));
        }
      }
    }
  } catch (e) {
    // Fail silently to local storage cache if network unavailable
  }
}

/* ==========================================================================
   1. STUDENT LOGIN SCREEN
   ========================================================================== */
function renderStudentLoginScreen(errorMsg = '') {
  const app = $('#app');
  if (!app) return;

  const tuitionName = STATE.settings.tuitionName || 'TuitionHub Center';
  const logoUrl = STATE.settings.logoUrl;

  app.innerHTML = `
    <div class="student-login-wrap">
      <div class="student-login-card">
        <div class="student-login-header">
          <div class="student-login-logo">
            ${logoUrl ? `<img src="${escapeHtml(logoUrl)}" alt="Logo">` : `<span>${escapeHtml(tuitionName.slice(0,2).toUpperCase())}</span>`}
          </div>
          <h2 style="font-size:22px;font-family:'Poppins',sans-serif;color:var(--text);margin-top:4px">${escapeHtml(tuitionName)}</h2>
          <div style="font-size:13.5px;color:var(--text-secondary)">Student Self-Service Portal</div>
        </div>

        ${errorMsg ? `
          <div style="background:var(--danger-light);color:var(--danger);padding:10px 14px;border-radius:var(--radius-md);font-size:13px;display:flex;align-items:center;gap:8px">
            <i data-lucide="alert-circle" class="icon"></i>
            <span>${escapeHtml(errorMsg)}</span>
          </div>
        ` : ''}

        <form id="student-login-form" style="display:flex;flex-direction:column;gap:16px">
          <div class="form-row">
            <label>Student ID</label>
            <div style="position:relative">
              <input type="text" id="sp-student-id" placeholder="e.g. ST-1001" required style="text-transform:uppercase;font-weight:600;padding-left:38px">
              <i data-lucide="user" class="icon" style="position:absolute;left:12px;top:12px;color:var(--text-muted)"></i>
            </div>
          </div>

          <div class="form-row">
            <label>Password</label>
            <div style="position:relative">
              <input type="password" id="sp-password" placeholder="Enter your portal password" required style="padding-left:38px">
              <i data-lucide="lock" class="icon" style="position:absolute;left:12px;top:12px;color:var(--text-muted)"></i>
            </div>
          </div>

          <button type="submit" class="btn btn-primary" style="width:100%;padding:12px;font-size:15px;margin-top:4px">
            <i data-lucide="log-in" class="icon"></i> Login to Portal
          </button>
        </form>

        <div class="demo-hint-box">
          <div style="font-weight:700;color:var(--text);margin-bottom:4px">💡 Portal Credentials</div>
          <div>Use your <strong>Student ID</strong> and assigned <strong>Password</strong> to log in.</div>
        </div>
      </div>
    </div>
  `;

  if (window.lucide) lucide.createIcons();

  const form = $('#student-login-form');
  if (form) {
    form.onsubmit = (e) => {
      e.preventDefault();
      const idInput = $('#sp-student-id').value.trim().toUpperCase();
      const passInput = $('#sp-password').value.trim();

      const studentList = Array.isArray(STATE.students) ? STATE.students : [];
      const student = studentList.find(s => s && String(s.studentId).trim().toUpperCase() === idInput);

      if (!student) {
        renderStudentLoginScreen('Student ID not found. Please contact your tuition center administrator.');
        return;
      }

      const validPass = String(student.password || 'Pass123').trim();
      if (passInput !== validPass) {
        renderStudentLoginScreen('Incorrect password. Please verify your portal credentials.');
        return;
      }

      activeStudentSession = student;
      localStorage.setItem(LS_KEYS.STUDENT_SESSION, student.studentId);
      showToast('success', `Welcome back, ${student.studentName}!`);
      renderStudentDashboard();
    };
  }
}

/* ==========================================================================
   2. MAIN LOGGED-IN STUDENT DASHBOARD
   ========================================================================== */
function renderStudentDashboard() {
  const app = $('#app');
  if (!app || !activeStudentSession) return;

  const s = activeStudentSession;
  const tuitionName = STATE.settings.tuitionName || 'TuitionHub Center';
  const logoUrl = STATE.settings.logoUrl;

  app.innerHTML = `
    <!-- TOP NAVIGATION BAR -->
    <header class="portal-top-bar">
      <div style="display:flex;align-items:center;gap:12px">
        ${logoUrl ? `<img src="${escapeHtml(logoUrl)}" alt="Logo" style="height:36px;width:36px;object-fit:contain;border-radius:8px">` : ''}
        <div>
          <div style="font-size:16px;font-weight:800;color:var(--primary);font-family:'Poppins',sans-serif;line-height:1.2">${escapeHtml(tuitionName)}</div>
          <div style="font-size:11px;color:var(--text-secondary);font-weight:600">STUDENT PORTAL</div>
        </div>
      </div>

      <div style="display:flex;align-items:center;gap:12px">
        <button class="icon-btn" id="sp-theme-toggle" title="Toggle Dark/Light Mode">
          <i data-lucide="${STATE.theme === 'dark' ? 'sun' : 'moon'}" class="icon"></i>
        </button>

        <div style="display:flex;align-items:center;gap:10px;padding-left:12px;border-left:1px solid var(--border)">
          <div class="student-avatar" style="width:36px;height:36px;font-size:13px">${escapeHtml((s.studentName || 'ST').slice(0, 2).toUpperCase())}</div>
          <div style="display:flex;flex-direction:column;gap:1px">
            <span style="font-weight:700;font-size:13.5px">${escapeHtml(s.studentName)}</span>
            <span style="font-size:11px;color:var(--text-secondary)">ID: ${escapeHtml(s.studentId)}</span>
          </div>
        </div>

        <button class="btn btn-outline btn-sm" id="sp-logout-btn" style="color:var(--danger);border-color:rgba(239,68,68,0.3)">
          <i data-lucide="log-out" class="icon"></i> Logout
        </button>
      </div>
    </header>

    <!-- MAIN BODY -->
    <div style="max-width:1100px;width:100%;margin:0 auto;padding:24px 16px;display:flex;flex-direction:column;gap:20px">

      <!-- TAB NAVIGATION -->
      <div class="student-tab-bar scroll-thin">
        <div class="student-tab-item ${currentStudentTab === 'overview' ? 'active' : ''}" data-tab="overview">
          <i data-lucide="layout-dashboard" class="icon"></i> Overview & Profile
        </div>
        <div class="student-tab-item ${currentStudentTab === 'attendance' ? 'active' : ''}" data-tab="attendance">
          <i data-lucide="calendar-check" class="icon"></i> Attendance
        </div>
        <div class="student-tab-item ${currentStudentTab === 'fees' ? 'active' : ''}" data-tab="fees">
          <i data-lucide="wallet" class="icon"></i> Fees & Receipts
        </div>
        <div class="student-tab-item ${currentStudentTab === 'exams' ? 'active' : ''}" data-tab="exams">
          <i data-lucide="award" class="icon"></i> Exams & Marks
        </div>
        <div class="student-tab-item ${currentStudentTab === 'timetable' ? 'active' : ''}" data-tab="timetable">
          <i data-lucide="calendar-clock" class="icon"></i> Schedule
        </div>
        <div class="student-tab-item ${currentStudentTab === 'notices' ? 'active' : ''}" data-tab="notices">
          <i data-lucide="megaphone" class="icon"></i> Notices
        </div>
      </div>

      <!-- TAB CONTENT CONTAINER -->
      <div id="sp-tab-content"></div>

    </div>
  `;

  if (window.lucide) lucide.createIcons();

  $('#sp-theme-toggle').onclick = () => {
    const next = STATE.theme === 'dark' ? 'light' : 'dark';
    applyTheme(next);
    renderStudentDashboard();
  };

  $('#sp-logout-btn').onclick = () => {
    localStorage.removeItem(LS_KEYS.STUDENT_SESSION);
    activeStudentSession = null;
    showToast('info', 'Logged out successfully');
    renderStudentLoginScreen();
  };

  $all('.student-tab-item').forEach(el => {
    el.onclick = () => {
      currentStudentTab = el.getAttribute('data-tab');
      renderStudentDashboard();
    };
  });

  renderActiveTabContent();
}

function renderActiveTabContent() {
  const container = $('#sp-tab-content');
  if (!container || !activeStudentSession) return;

  const s = activeStudentSession;

  switch (currentStudentTab) {
    case 'overview':
      renderOverviewTab(container, s);
      break;
    case 'attendance':
      renderAttendanceTab(container, s);
      break;
    case 'fees':
      renderFeesTab(container, s);
      break;
    case 'exams':
      renderExamsTab(container, s);
      break;
    case 'timetable':
      renderTimetableTab(container, s);
      break;
    case 'notices':
      renderNoticesTab(container, s);
      break;
    default:
      renderOverviewTab(container, s);
  }

  if (window.lucide) lucide.createIcons();
}

/* ==========================================================================
   TAB 1: OVERVIEW & PROFILE
   ========================================================================== */
function renderOverviewTab(container, s) {
  const stats = computeStudentStats(s.studentId);
  const examStats = computeStudentExamStats(s.studentId);
  const tuitionName = STATE.settings.tuitionName || 'Tuition Center';
  const logoUrl = STATE.settings.logoUrl;

  container.innerHTML = `
    <!-- WELCOME BANNER -->
    <div class="card" style="background:linear-gradient(135deg, var(--primary), var(--primary-dark));color:#fff;padding:24px;border:none">
      <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:16px">
        <div>
          <span style="background:rgba(255,255,255,0.2);padding:4px 12px;border-radius:var(--radius-full);font-size:12px;font-weight:700">BATCH: ${escapeHtml(s.batch)}</span>
          <h2 style="font-size:24px;margin-top:8px">Welcome back, ${escapeHtml(s.studentName)}! 👋</h2>
          <p style="opacity:0.9;font-size:14px;margin-top:4px">Student ID: <strong>${escapeHtml(s.studentId)}</strong> &nbsp;|&nbsp; Enrolled since ${formatDate(s.joiningDate)}</p>
        </div>
        <div style="display:flex;gap:10px;flex-wrap:wrap">
          ${STATE.settings.liveClassLink ? `
            <a href="${escapeHtml(STATE.settings.liveClassLink)}" target="_blank" class="btn" style="background:#fff;color:var(--primary);font-weight:700">
              <i data-lucide="video" class="icon"></i> Join Live Online Class
            </a>
          ` : ''}
          <button class="btn" id="download-id-card-btn" style="background:rgba(255,255,255,0.2);color:#fff;border:1px solid rgba(255,255,255,0.4)">
            <i data-lucide="id-card" class="icon"></i> Download ID Card
          </button>
        </div>
      </div>
    </div>

    <!-- QUICK STATS GRID -->
    <div class="stat-grid" style="margin-top:20px">
      <div class="card">
        <div style="display:flex;align-items:center;gap:12px">
          <div style="width:44px;height:44px;border-radius:var(--radius-md);background:${stats.pct < 75 ? 'var(--danger-light)' : 'var(--success-light)'};color:${stats.pct < 75 ? 'var(--danger)' : 'var(--success)'};display:flex;align-items:center;justify-content:center">
            <i data-lucide="calendar-check" class="icon" style="width:22px;height:22px"></i>
          </div>
          <div>
            <div style="font-size:12px;color:var(--text-secondary);font-weight:600">Attendance Rate</div>
            <div style="font-size:22px;font-weight:800;color:${stats.pct < 75 ? 'var(--danger)' : 'var(--success)'}">${stats.pct}%</div>
          </div>
        </div>
        <div style="font-size:12px;color:var(--text-muted);margin-top:8px">Present: ${stats.present} days | Absent: ${stats.absent} days</div>
      </div>

      <div class="card">
        <div style="display:flex;align-items:center;gap:12px">
          <div style="width:44px;height:44px;border-radius:var(--radius-md);background:var(--primary-container);color:var(--primary);display:flex;align-items:center;justify-content:center">
            <i data-lucide="wallet" class="icon" style="width:22px;height:22px"></i>
          </div>
          <div>
            <div style="font-size:12px;color:var(--text-secondary);font-weight:600">Monthly Fee Rate</div>
            <div style="font-size:22px;font-weight:800;color:var(--primary)">${formatCurrency(s.monthlyFee)}</div>
          </div>
        </div>
        <div style="font-size:12px;color:var(--text-muted);margin-top:8px">${stats.pendingCount > 0 ? `<span style="color:var(--warning);font-weight:700">⚠️ ${stats.pendingCount} Month Fee Due</span>` : `<span style="color:var(--success);font-weight:700">✓ Up to date</span>`}</div>
      </div>

      <div class="card">
        <div style="display:flex;align-items:center;gap:12px">
          <div style="width:44px;height:44px;border-radius:var(--radius-md);background:var(--secondary-container);color:var(--secondary);display:flex;align-items:center;justify-content:center">
            <i data-lucide="award" class="icon" style="width:22px;height:22px"></i>
          </div>
          <div>
            <div style="font-size:12px;color:var(--text-secondary);font-weight:600">Exam Performance</div>
            <div style="font-size:22px;font-weight:800;color:var(--text)">${examStats.avgPct}%</div>
          </div>
        </div>
        <div style="font-size:12px;color:var(--text-muted);margin-top:8px">Grade: <span class="score-badge ${examStats.gradeClass}">${examStats.gradeLabel}</span></div>
      </div>
    </div>

    <!-- PROFILE & DIGITAL ID CARD ROW -->
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-top:20px">
      
      <!-- PERSONAL PROFILE CARD -->
      <div class="card" style="display:flex;flex-direction:column;gap:16px">
        <div style="font-family:'Poppins',sans-serif;font-weight:700;font-size:16px;border-bottom:1px solid var(--border);padding-bottom:10px">
          Personal Profile Details
        </div>
        <div style="display:flex;flex-direction:column;gap:12px;font-size:14px">
          <div style="display:flex;justify-content:space-between">
            <span style="color:var(--text-secondary)">Student Name:</span>
            <strong>${escapeHtml(s.studentName)}</strong>
          </div>
          <div style="display:flex;justify-content:space-between">
            <span style="color:var(--text-secondary)">Student ID:</span>
            <strong style="color:var(--primary);font-family:monospace">${escapeHtml(s.studentId)}</strong>
          </div>
          <div style="display:flex;justify-content:space-between">
            <span style="color:var(--text-secondary)">Batch / Grade:</span>
            <strong class="badge badge-blue">${escapeHtml(s.batch)}</strong>
          </div>
          <div style="display:flex;justify-content:space-between">
            <span style="color:var(--text-secondary)">Parent / Guardian:</span>
            <strong>${escapeHtml(s.parentName || '—')}</strong>
          </div>
          <div style="display:flex;justify-content:space-between">
            <span style="color:var(--text-secondary)">Contact Phone:</span>
            <strong>${escapeHtml(s.phone || '—')}</strong>
          </div>
          <div style="display:flex;justify-content:space-between">
            <span style="color:var(--text-secondary)">Account Status:</span>
            <span class="badge ${s.status === 'Active' ? 'badge-green' : 'badge-gray'}">${escapeHtml(s.status)}</span>
          </div>
        </div>
      </div>

      <!-- DIGITAL ID CARD PREVIEW -->
      <div class="card" style="display:flex;flex-direction:column;gap:14px">
        <div style="font-family:'Poppins',sans-serif;font-weight:700;font-size:16px;border-bottom:1px solid var(--border);padding-bottom:10px">
          Digital Identity Card Preview
        </div>
        
        <div class="id-card">
          <div style="display:flex;justify-content:space-between;align-items:center;gap:12px">
            <div style="display:flex;align-items:center;gap:10px">
              ${logoUrl ? `<img src="${escapeHtml(logoUrl)}" alt="Logo" style="height:38px;max-width:54px;object-fit:contain;border-radius:6px" />` : ''}
              <div>
                <div style="font-size:16px;font-weight:800;color:var(--primary);line-height:1.2">${escapeHtml(tuitionName)}</div>
                <div style="font-size:10.5px;color:var(--text-secondary)">OFFICIAL STUDENT IDENTITY CARD</div>
              </div>
            </div>
            <div class="student-avatar" style="width:46px;height:46px;font-size:18px;flex-shrink:0">${escapeHtml((s.studentName || 'ST').slice(0, 2).toUpperCase())}</div>
          </div>

          <div style="margin-top:12px;display:flex;flex-direction:column;gap:5px;font-size:13px">
            <div><strong>Student Name:</strong> ${escapeHtml(s.studentName)}</div>
            <div><strong>ID Number:</strong> <span style="font-family:monospace;color:var(--primary);font-weight:700">${escapeHtml(s.studentId)}</span></div>
            <div><strong>Batch / Grade:</strong> ${escapeHtml(s.batch)}</div>
            <div><strong>Parent Contact:</strong> ${escapeHtml(s.phone || '—')}</div>
          </div>
        </div>

        <button class="btn btn-primary" id="download-id-card-btn-2" style="width:100%;justify-content:center;margin-top:auto">
          <i data-lucide="download" class="icon"></i> Save Digital ID Card (PDF)
        </button>
      </div>

    </div>
  `;

  $('#download-id-card-btn').onclick = () => exportStudentIDCardPDF(s);
  const btn2 = $('#download-id-card-btn-2');
  if (btn2) btn2.onclick = () => exportStudentIDCardPDF(s);
}

/* ==========================================================================
   TAB 2: ATTENDANCE HISTORY
   ========================================================================== */
function renderAttendanceTab(container, s) {
  const attList = Array.isArray(STATE.attendance) ? STATE.attendance : [];
  const atts = attList.filter(a => a && String(a.studentId) === String(s.studentId)).sort((a,b) => String(b.date || '').localeCompare(String(a.date || '')));
  const stats = computeStudentStats(s.studentId);

  container.innerHTML = `
    <div class="card" style="margin-bottom:20px">
      <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:16px">
        <div>
          <h3 style="font-size:18px;font-family:'Poppins',sans-serif">Attendance Overview</h3>
          <div style="font-size:13px;color:var(--text-secondary)">Your official attendance records logged by tutors</div>
        </div>
        <div style="display:flex;align-items:center;gap:12px">
          <div style="text-align:right">
            <div style="font-size:24px;font-weight:800;color:${stats.pct < 75 ? 'var(--danger)' : 'var(--success)'}">${stats.pct}%</div>
            <div style="font-size:11px;color:var(--text-muted)">Overall Attendance Rate</div>
          </div>
        </div>
      </div>

      <div style="margin-top:16px">
        <div class="progress-bar" style="height:12px">
          <div class="progress-fill" style="width:${stats.pct}%;background:${stats.pct < 75 ? 'var(--danger)' : 'var(--success)'}"></div>
        </div>
      </div>
    </div>

    <!-- ATTENDANCE TABLE -->
    <div class="card" style="padding:0;overflow:hidden">
      <div style="padding:16px 20px;border-bottom:1px solid var(--border);display:flex;justify-content:space-between;align-items:center">
        <h4 style="font-size:15px;font-family:'Poppins',sans-serif">Daily Attendance Log</h4>
        <span style="font-size:12px;color:var(--text-muted)">Total ${atts.length} classes recorded</span>
      </div>

      ${atts.length === 0 ? `
        <div class="empty-state">
          <div class="emoji">📅</div>
          <h4>No Attendance Records Yet</h4>
          <p>Your tutor has not logged attendance entries for your account yet.</p>
        </div>
      ` : `
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Day / Date</th>
                <th>Status</th>
                <th>Remarks / Notes</th>
              </tr>
            </thead>
            <tbody>
              ${atts.map(a => {
                const isPresent = a.status === 'Present';
                return `
                  <tr>
                    <td style="font-weight:600">${formatDate(a.date)}</td>
                    <td style="color:var(--text-secondary)">${escapeHtml(a.date || '—')}</td>
                    <td>
                      <span class="badge ${isPresent ? 'badge-green' : 'badge-red'}" style="font-weight:700">
                        ${isPresent ? '✓ Present' : '✗ Absent'}
                      </span>
                    </td>
                    <td style="color:var(--text-secondary)">${escapeHtml(a.remarks || 'Standard Class')}</td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      `}
    </div>
  `;
}

/* ==========================================================================
   TAB 3: FEES & RECEIPTS
   ========================================================================== */
function renderFeesTab(container, s) {
  const feesList = Array.isArray(STATE.fees) ? STATE.fees : [];
  const studentFees = feesList.filter(f => f && String(f.studentId) === String(s.studentId)).sort((a,b) => String(b.date || '').localeCompare(String(a.date || '')));
  const stats = computeStudentStats(s.studentId);
  const totalPaid = studentFees.filter(f => f.status === 'Paid').reduce((sum, f) => sum + (Number(f.amount) || 0), 0);

  container.innerHTML = `
    <div class="stat-grid" style="margin-bottom:20px">
      <div class="card">
        <div style="font-size:12px;color:var(--text-secondary)">Monthly Tuition Fee</div>
        <div style="font-size:24px;font-weight:800;color:var(--primary)">${formatCurrency(s.monthlyFee)}</div>
        <div style="font-size:12px;color:var(--text-muted)">Assigned Rate</div>
      </div>

      <div class="card">
        <div style="font-size:12px;color:var(--text-secondary)">Total Fees Paid</div>
        <div style="font-size:24px;font-weight:800;color:var(--success)">${formatCurrency(totalPaid)}</div>
        <div style="font-size:12px;color:var(--text-muted)">Verified Receipts</div>
      </div>

      <div class="card">
        <div style="font-size:12px;color:var(--text-secondary)">Pending Due Months</div>
        <div style="font-size:24px;font-weight:800;color:${stats.pendingCount > 0 ? 'var(--warning)' : 'var(--success)'}">${stats.pendingCount}</div>
        <div style="font-size:12px;color:var(--text-muted)">Months Unpaid</div>
      </div>
    </div>

    <!-- FEE HISTORY TABLE -->
    <div class="card" style="padding:0;overflow:hidden">
      <div style="padding:16px 20px;border-bottom:1px solid var(--border);display:flex;justify-content:space-between;align-items:center">
        <h4 style="font-size:15px;font-family:'Poppins',sans-serif">Fee Payment History & Downloadable Receipts</h4>
      </div>

      ${studentFees.length === 0 ? `
        <div class="empty-state">
          <div class="emoji">💳</div>
          <h4>No Fee Receipts Recorded</h4>
          <p>Once fee payments are recorded, downloadable PDF receipts will appear here.</p>
        </div>
      ` : `
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Period / Month</th>
                <th>Amount</th>
                <th>Payment Date</th>
                <th>Method</th>
                <th>Status</th>
                <th style="text-align:right">Receipt</th>
              </tr>
            </thead>
            <tbody>
              ${studentFees.map(f => {
                const isPaid = f.status === 'Paid';
                return `
                  <tr>
                    <td style="font-weight:700">${escapeHtml(f.month || 'Monthly Fee')}</td>
                    <td style="font-weight:800;color:var(--primary)">${formatCurrency(f.amount)}</td>
                    <td style="color:var(--text-secondary)">${formatDate(f.date)}</td>
                    <td><span class="badge badge-gray">${escapeHtml(f.paymentMode || f.mode || 'Cash')}</span></td>
                    <td>
                      <span class="badge ${isPaid ? 'badge-green' : 'badge-yellow'}">
                        ${escapeHtml(f.status || 'Paid')}
                      </span>
                    </td>
                    <td style="text-align:right">
                      ${isPaid ? `
                        <button class="btn btn-outline btn-sm sp-receipt-btn" data-fee-id="${escapeHtml(f.id)}">
                          <i data-lucide="download" class="icon"></i> Receipt PDF
                        </button>
                      ` : `
                        <span style="font-size:12px;color:var(--text-muted)">Pending</span>
                      `}
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      `}
    </div>
  `;

  $all('.sp-receipt-btn').forEach(btn => {
    btn.onclick = () => {
      const feeId = btn.getAttribute('data-fee-id');
      const fee = STATE.fees.find(x => x.id === feeId);
      if (fee) exportFeeReceiptPDF(s, fee);
    };
  });
}

/* ==========================================================================
   TAB 4: EXAMS & MARKS
   ========================================================================== */
function renderExamsTab(container, s) {
  const examsList = Array.isArray(STATE.exams) ? STATE.exams : [];
  const batchExams = examsList.filter(e => e && (!e.batch || e.batch === 'All Batches' || String(e.batch).trim().toLowerCase() === String(s.batch).trim().toLowerCase()));
  const examStats = computeStudentExamStats(s.studentId);

  container.innerHTML = `
    <!-- PERFORMANCE BANNER -->
    <div class="card" style="margin-bottom:20px">
      <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:16px">
        <div>
          <h3 style="font-size:18px;font-family:'Poppins',sans-serif">Academic Performance & Marksheet</h3>
          <div style="font-size:13px;color:var(--text-secondary)">Evaluations and score cards for ${escapeHtml(s.batch)}</div>
        </div>
        <div style="display:flex;align-items:center;gap:16px">
          <div style="text-align:right">
            <div style="font-size:24px;font-weight:800;color:var(--primary)">${examStats.avgPct}%</div>
            <div style="font-size:11px;color:var(--text-muted)">Overall Average Score</div>
          </div>
          <div>
            <span class="score-badge ${examStats.gradeClass}" style="font-size:14px;padding:6px 14px">${examStats.gradeLabel}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- MARKS TABLE -->
    <div class="card" style="padding:0;overflow:hidden">
      <div style="padding:16px 20px;border-bottom:1px solid var(--border);display:flex;justify-content:space-between;align-items:center">
        <h4 style="font-size:15px;font-family:'Poppins',sans-serif">Exam Score Cards</h4>
        <button class="btn btn-outline btn-sm" id="download-marksheet-pdf-btn">
          <i data-lucide="download" class="icon"></i> Download Full Marksheet PDF
        </button>
      </div>

      ${batchExams.length === 0 ? `
        <div class="empty-state">
          <div class="emoji">📝</div>
          <h4>No Exams Conducted Yet</h4>
          <p>No exam evaluation sheets published for your batch yet.</p>
        </div>
      ` : `
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Test / Exam Title</th>
                <th>Exam Date</th>
                <th>Score Obtained</th>
                <th>Percentage</th>
                <th>Grade</th>
                <th>Teacher Remarks</th>
              </tr>
            </thead>
            <tbody>
              ${batchExams.map(ex => {
                const marksObj = (STATE.examMarks && STATE.examMarks[ex.id]) ? STATE.examMarks[ex.id] : {};
                const mData = marksObj[s.studentId];
                const marksObtained = mData && mData.marksObtained !== undefined ? Number(mData.marksObtained) : null;
                const totalMarks = Number(ex.totalMarks) || 50;
                const pct = marksObtained !== null ? Math.round((marksObtained / totalMarks) * 100) : null;
                const gradeInfo = getGradeFromPct(pct);

                return `
                  <tr>
                    <td>
                      <div style="font-weight:700">${escapeHtml(ex.testName)}</div>
                      <div style="font-size:12px;color:var(--text-secondary)">Max Marks: ${totalMarks}</div>
                    </td>
                    <td style="color:var(--text-secondary)">${formatDate(ex.date)}</td>
                    <td>
                      ${marksObtained !== null ? `
                        <span style="font-size:16px;font-weight:800;color:var(--primary)">${marksObtained}</span>
                        <span style="font-size:12px;color:var(--text-muted)">/ ${totalMarks}</span>
                      ` : `
                        <span style="color:var(--text-muted)">Pending / Unmarked</span>
                      `}
                    </td>
                    <td>${pct !== null ? `<strong>${pct}%</strong>` : '—'}</td>
                    <td>${pct !== null ? `<span class="score-badge ${gradeInfo.cls}">${gradeInfo.lbl}</span>` : '—'}</td>
                    <td style="font-size:12.5px;color:var(--text-secondary)">${escapeHtml((mData && mData.remarks) || '—')}</td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      `}
    </div>
  `;

  const downloadBtn = $('#download-marksheet-pdf-btn');
  if (downloadBtn) downloadBtn.onclick = () => exportStudentMarksheetPDF(s, batchExams);
}

/* ==========================================================================
   TAB 5: TIMETABLE & SCHEDULE
   ========================================================================== */
function renderTimetableTab(container, s) {
  const scheduleList = Array.isArray(STATE.schedule) ? STATE.schedule : [];
  const batchSchedule = scheduleList.filter(sc => sc && (!sc.batch || sc.batch === 'All Batches' || String(sc.batch).trim().toLowerCase() === String(s.batch).trim().toLowerCase()));

  container.innerHTML = `
    <div class="card" style="margin-bottom:20px">
      <h3 style="font-size:18px;font-family:'Poppins',sans-serif">Batch Class Schedule (${escapeHtml(s.batch)})</h3>
      <div style="font-size:13px;color:var(--text-secondary)">Weekly subject timetable and lecture room allocations</div>
    </div>

    ${batchSchedule.length === 0 ? `
      <div class="card empty-state">
        <div class="emoji">⏰</div>
        <h4>No Schedule Posted</h4>
        <p>No timetable entries available for ${escapeHtml(s.batch)} at this time.</p>
      </div>
    ` : `
      <div style="display:grid;grid-template-columns:repeat(auto-fill, minmax(300px, 1fr));gap:16px">
        ${batchSchedule.map(sc => `
          <div class="card" style="border-left:4px solid var(--primary);display:flex;flex-direction:column;gap:10px">
            <div style="display:flex;justify-content:space-between;align-items:flex-start">
              <div>
                <h4 style="font-size:16px;color:var(--primary);font-family:'Poppins',sans-serif">${escapeHtml(sc.subject)}</h4>
                <div style="font-size:12px;color:var(--text-secondary);margin-top:2px">${escapeHtml(sc.days)}</div>
              </div>
              <span class="badge badge-blue">${escapeHtml(sc.room || 'Classroom')}</span>
            </div>

            <div style="display:flex;align-items:center;gap:8px;font-size:13.5px;font-weight:600;color:var(--text)">
              <i data-lucide="clock" class="icon" style="color:var(--primary)"></i>
              <span>${escapeHtml(sc.time)}</span>
            </div>

            <div style="font-size:12.5px;color:var(--text-secondary);display:flex;align-items:center;gap:6px;border-top:1px solid var(--border);padding-top:8px">
              <i data-lucide="user-check" class="icon" style="width:14px;height:14px"></i>
              <span>Instructor: <strong>${escapeHtml(sc.teacher || 'Tutor')}</strong></span>
            </div>
          </div>
        `).join('')}
      </div>
    `}
  `;
}

/* ==========================================================================
   TAB 6: NOTICE BOARD
   ========================================================================== */
function renderNoticesTab(container, s) {
  const noticesList = Array.isArray(STATE.notices) ? STATE.notices : [];
  const batchNotices = noticesList
    .filter(n => n && (!n.batch || n.batch === 'All Batches' || String(n.batch).trim().toLowerCase() === String(s.batch).trim().toLowerCase()))
    .sort((a,b) => String(b.date || '').localeCompare(String(a.date || '')));

  container.innerHTML = `
    <div class="card" style="margin-bottom:20px">
      <h3 style="font-size:18px;font-family:'Poppins',sans-serif">Notice Board & Announcements</h3>
      <div style="font-size:13px;color:var(--text-secondary)">Important announcements from center management for Grade ${escapeHtml(s.batch)}</div>
    </div>

    ${batchNotices.length === 0 ? `
      <div class="card empty-state">
        <div class="emoji">📢</div>
        <h4>No Active Notices</h4>
        <p>No announcements or notice entries have been posted for your batch.</p>
      </div>
    ` : `
      <div style="display:flex;flex-direction:column;gap:14px">
        ${batchNotices.map(n => `
          <div class="card" style="display:flex;flex-direction:column;gap:8px">
            <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:8px">
              <h4 style="font-size:16px;font-family:'Poppins',sans-serif;color:var(--text)">${escapeHtml(n.title)}</h4>
              <div style="display:flex;gap:6px">
                <span class="badge badge-purple">${escapeHtml(n.category || 'General')}</span>
                <span class="badge badge-gray">${formatDate(n.date)}</span>
              </div>
            </div>
            <div style="font-size:14px;color:var(--text-secondary);line-height:1.5">${escapeHtml(n.content)}</div>
          </div>
        `).join('')}
      </div>
    `}
  `;
}

/* ==========================================================================
   STATS COMPONENT HELPERS
   ========================================================================== */
function computeStudentStats(studentId) {
  const attList = Array.isArray(STATE.attendance) ? STATE.attendance : [];
  const atts = attList.filter(a => a && String(a.studentId) === String(studentId));
  const total = atts.length;
  const present = atts.filter(a => a.status === 'Present').length;
  const absent = total - present;
  const pct = total > 0 ? Math.round((present / total) * 100) : 100;

  const feesList = Array.isArray(STATE.fees) ? STATE.fees : [];
  const paidMonths = feesList.filter(f => f && String(f.studentId) === String(studentId) && f.status === 'Paid').length;
  const pendingCount = Math.max(0, 1 - paidMonths);

  return { total, present, absent, pct, pendingCount };
}

function computeStudentExamStats(studentId) {
  let totalScore = 0, totalMax = 0, count = 0;
  const examsList = Array.isArray(STATE.exams) ? STATE.exams : [];
  const marksObjAll = STATE.examMarks || {};

  examsList.forEach(ex => {
    if (!ex) return;
    const marksObj = marksObjAll[ex.id] || {};
    const mData = marksObj[studentId];
    if (mData && mData.marksObtained !== undefined && mData.marksObtained !== null) {
      totalScore += Number(mData.marksObtained) || 0;
      totalMax += Number(ex.totalMarks) || 50;
      count++;
    }
  });

  const avgPct = totalMax > 0 ? Math.round((totalScore / totalMax) * 100) : 0;
  const gradeInfo = getGradeFromPct(avgPct);

  return { avgPct, gradeLabel: gradeInfo.lbl, gradeClass: gradeInfo.cls, count };
}

function getGradeFromPct(pct) {
  if (pct === null || pct === undefined) return { lbl: 'N/A', cls: 'average' };
  if (pct >= 90) return { lbl: 'Grade A+', cls: 'excellent' };
  if (pct >= 75) return { lbl: 'Grade A', cls: 'good' };
  if (pct >= 60) return { lbl: 'Grade B', cls: 'average' };
  if (pct >= 40) return { lbl: 'Grade C', cls: 'average' };
  return { lbl: 'Grade D (Needs Improvement)', cls: 'poor' };
}

/* ==========================================================================
   CLIENT PDF EXPORTERS
   ========================================================================== */
function triggerPdfDownload(doc, filename) {
  doc.save(filename);
  showToast('success', 'PDF downloaded successfully!');
}

function exportStudentIDCardPDF(s) {
  try {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: [86, 54] });

    const tuitionName = STATE.settings.tuitionName || 'Tuition Center';

    doc.setFillColor(37, 99, 235);
    doc.rect(0, 0, 86, 12, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text(String(tuitionName).slice(0, 28), 43, 7, { align: 'center' });

    doc.setTextColor(15, 23, 42);
    doc.setFontSize(7);
    doc.text("STUDENT IDENTITY CARD", 43, 11, { align: 'center' });

    doc.setFontSize(10);
    doc.text(`Name: ${s.studentName}`, 6, 20);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(`ID Number: ${s.studentId}`, 6, 26);
    doc.text(`Batch / Grade: ${s.batch}`, 6, 31);
    doc.text(`Parent Contact: ${s.phone || '—'}`, 6, 36);
    doc.text(`Joining Date: ${formatDate(s.joiningDate)}`, 6, 41);

    doc.setDrawColor(226, 232, 240);
    doc.line(6, 44, 80, 44);

    doc.setFontSize(6);
    doc.setTextColor(100, 116, 139);
    doc.text("Authorized Signature & Stamp", 43, 50, { align: 'center' });

    triggerPdfDownload(doc, `ID_Card_${s.studentId}.pdf`);
  } catch(e) {
    showToast('error', 'Failed to generate ID card PDF: ' + e.message);
  }
}

function exportFeeReceiptPDF(s, fee) {
  try {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text(STATE.settings.tuitionName || 'Tuition Center', 14, 15);

    doc.setFontSize(14);
    doc.text("OFFICIAL FEE PAYMENT RECEIPT", 14, 25);

    doc.autoTable({
      startY: 32,
      head: [['Field', 'Details']],
      body: [
        ['Receipt ID', fee.id || 'REC-101'],
        ['Student Name', s.studentName],
        ['Student ID', s.studentId],
        ['Batch', s.batch],
        ['Fee Period / Month', fee.month || 'Monthly Fee'],
        ['Amount Paid', formatCurrency(fee.amount)],
        ['Payment Date', formatDate(fee.date)],
        ['Payment Method', fee.paymentMode || fee.mode || 'Cash'],
        ['Payment Status', fee.status || 'Paid']
      ],
      theme: 'grid',
      headStyles: { fillColor: [37, 99, 235] }
    });

    doc.text("Thank you for your payment!", 14, doc.lastAutoTable.finalY + 15);
    triggerPdfDownload(doc, `Receipt_${s.studentId}_${fee.month || 'fee'}.pdf`);
  } catch(e) {
    showToast('error', 'PDF Error: ' + e.message);
  }
}

function exportStudentMarksheetPDF(s, exams) {
  try {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text(STATE.settings.tuitionName || 'Tuition Center', 14, 15);

    doc.setFontSize(13);
    doc.text(`STUDENT EVALUATION REPORT & MARKSHEET — ${s.studentName}`, 14, 24);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`ID: ${s.studentId} | Batch: ${s.batch}`, 14, 30);

    const tableBody = (exams || []).map(ex => {
      const marksObj = (STATE.examMarks && STATE.examMarks[ex.id]) ? STATE.examMarks[ex.id] : {};
      const mData = marksObj[s.studentId];
      const marksObtained = mData && mData.marksObtained !== undefined ? mData.marksObtained : 'N/A';
      const totalMarks = ex.totalMarks || 50;
      const pct = (marksObtained !== 'N/A' && totalMarks) ? Math.round((Number(marksObtained) / totalMarks) * 100) + '%' : 'N/A';

      return [ex.testName, formatDate(ex.date), `${marksObtained} / ${totalMarks}`, pct, (mData && mData.remarks) || '—'];
    });

    doc.autoTable({
      startY: 36,
      head: [['Exam Title', 'Date', 'Score', 'Percentage', 'Teacher Remarks']],
      body: tableBody,
      theme: 'striped',
      headStyles: { fillColor: [37, 99, 235] }
    });

    triggerPdfDownload(doc, `Marksheet_${s.studentId}.pdf`);
  } catch(e) {
    showToast('error', 'PDF Error: ' + e.message);
  }
}
