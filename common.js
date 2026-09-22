/* ==========================================================================
   TuitionHub — Common Utilities & Shared Engine (common.js)
   State management, LocalStorage, theme, layout builder, modals & toasts
   ========================================================================== */

const LS_KEYS = {
  SETTINGS: 'th_settings',
  SCHEDULE: 'th_schedule',
  NOTICES: 'th_notices',
  EXAMS: 'th_exams',
  EXAM_MARKS: 'th_exam_marks',
  THEME: 'th_theme',
  STUDENTS: 'th_students',
  ATTENDANCE: 'th_attendance',
  FEES: 'th_fees',
  STUDENT_SESSION: 'th_student_session'
};

const DEFAULT_SETTINGS = {
  gasUrl: 'https://script.google.com/macros/s/AKfycbxwQ6DxfQYFTfraO5XtrLrT1IpsvRQv3jHlkmeDmLadMErSbfxJI2pQf_lLmlST8uA/exec',
  tuitionName: 'TuitionHub Center',
  logoUrl: '',
  teacherName: 'Prof. Sharma',
  currency: '₹',
  dateFormat: 'DD/MM/YYYY',
  defaultBatch: 'Grade 10',
  defaultMonthlyFee: 1000,
  idPrefix: 'ST',
  startingId: 1001,
  availableBatches: ['Grade 7', 'Grade 8', 'Grade 9', 'Grade 10', 'Grade 11', 'Grade 12'],
  feeDueDay: 5,
  lateFee: 0,
  receiptPrefix: 'REC-',
  email: 'contact@tuitionhub.edu',
  address: '123 Education Hub, Knowledge Park',
  website: '',
  footerText: 'Empowering students with quality guidance & tuition.',
  connected: false,
  lastSync: null,
  liveClassLink: 'https://meet.google.com',
  teacherPhone: '9876543210',
  teacherWhatsapp: '9876543210',

  // Customization preferences
  appearance: {
    theme: 'light', // 'light' | 'dark' | 'system'
    accentColor: '#2563EB',
    presetTheme: 'blue',
    density: 'comfortable' // 'comfortable' | 'compact'
  },
  receiptSettings: {
    title: 'FEE PAYMENT RECEIPT',
    footerMessage: 'Thank you for your payment!',
    showLogo: true,
    showStudentId: true,
    showParentDetails: true,
    showPaymentDate: true,
    prefix: 'REC-'
  },
  whatsappTemplates: {
    absent: 'Dear Parent, your child {studentName} was marked ABSENT for tuition on {date}. Please inform us if there is an issue. - {centerName}',
    feeReminder: 'Dear Parent, gentle reminder that tuition fee for {studentName} for the month of {date} ({amount}) is pending. Kindly clear the dues at your earliest convenience. Thank you - {centerName}',
    paymentConfirmation: 'Dear Parent, fee payment of {amount} for {studentName} for the month of {date} has been successfully received. Thank you - {centerName}'
  },
  dashboardWidgets: {
    studentCount: true,
    attendanceStats: true,
    feeStats: true,
    pendingFees: true,
    recentExams: true,
    timetable: true,
    notices: true
  },
  academicSettings: {
    academicYear: '2026-2027',
    workingDays: 'Mon, Tue, Wed, Thu, Fri, Sat',
    weekStart: 'Monday',
    holidays: 'National & State Public Holidays'
  }
};

const DEFAULT_SCHEDULE = [
  { 
    id: 'sc1', 
    subject: 'Mathematics', 
    batch: 'Grade 10', 
    time: '04:00 PM - 05:30 PM', 
    days: 'Mon, Wed, Fri', 
    teacher: 'Prof. Sharma', 
    room: 'https://meet.google.com/abc-defg-hij'
  },
  { 
    id: 'sc2', 
    subject: 'Physics & Science', 
    batch: 'Grade 10', 
    time: '05:30 PM - 07:00 PM', 
    days: 'Mon, Wed, Fri', 
    teacher: 'Dr. Verma', 
    room: 'https://zoom.us/physics-class'
  },
  { 
    id: 'sc3', 
    subject: 'Chemistry', 
    batch: 'Grade 12', 
    time: '04:00 PM - 05:30 PM', 
    days: 'Tue, Thu, Sat', 
    teacher: 'Mrs. Anita', 
    room: ''
  }
];

const DEFAULT_NOTICES = [
  { id: 'n1', title: 'Upcoming Monthly Evaluation Exam', category: 'Exam', content: 'Monthly evaluation test for Grade 10 & 12 will take place this Saturday. Please ensure thorough revision of Chapters 1 to 4.', batch: 'All Batches', date: todayISO() },
  { id: 'n2', title: 'Holiday Announcement', category: 'Holiday', content: 'Tuition center will remain closed on Monday for upcoming festival celebrations.', batch: 'All Batches', date: todayISO() }
];

const DEFAULT_EXAMS = [
  { id: 'ex1', testName: 'Unit Test 1 - Algebra & Geometry', batch: 'Grade 10', totalMarks: 50, date: todayISO() }
];

const DEFAULT_STUDENTS = [
  { studentId: 'ST-1001', studentName: 'Demo Student', batch: 'Grade 10', phone: '**********', parentName: 'Demo Parent', monthlyFee: 1000, status: 'Active', joiningDate: '2026-01-10', password: 'Pass123' }
];

function loadStorage(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (key === LS_KEYS.SETTINGS && typeof parsed === 'object' && parsed !== null) {
        return Object.assign({}, fallback, parsed, {
          appearance: Object.assign({}, fallback.appearance, parsed.appearance || {}),
          receiptSettings: Object.assign({}, fallback.receiptSettings, parsed.receiptSettings || {}),
          whatsappTemplates: Object.assign({}, fallback.whatsappTemplates, parsed.whatsappTemplates || {}),
          dashboardWidgets: Object.assign({}, fallback.dashboardWidgets, parsed.dashboardWidgets || {}),
          academicSettings: Object.assign({}, fallback.academicSettings, parsed.academicSettings || {})
        });
      }
      return parsed;
    }
  } catch (e) { }
  return fallback;
}

const STATE = {
  settings: loadStorage(LS_KEYS.SETTINGS, DEFAULT_SETTINGS),
  schedule: loadStorage(LS_KEYS.SCHEDULE, DEFAULT_SCHEDULE),
  notices: loadStorage(LS_KEYS.NOTICES, DEFAULT_NOTICES),
  exams: loadStorage(LS_KEYS.EXAMS, DEFAULT_EXAMS),
  examMarks: loadStorage(LS_KEYS.EXAM_MARKS, {}),
  students: loadStorage(LS_KEYS.STUDENTS, DEFAULT_STUDENTS),
  attendance: loadStorage(LS_KEYS.ATTENDANCE, []),
  fees: loadStorage(LS_KEYS.FEES, []),
  syncStatus: 'offline',
  theme: localStorage.getItem(LS_KEYS.THEME) || 'light'
};

function saveStorage(key, data) {
  try { localStorage.setItem(key, JSON.stringify(data)); } catch (e) { }
}

function saveAllState() {
  saveStorage(LS_KEYS.SETTINGS, STATE.settings);
  saveStorage(LS_KEYS.SCHEDULE, STATE.schedule);
  saveStorage(LS_KEYS.NOTICES, STATE.notices);
  saveStorage(LS_KEYS.EXAMS, STATE.exams);
  saveStorage(LS_KEYS.EXAM_MARKS, STATE.examMarks);
  saveStorage(LS_KEYS.STUDENTS, STATE.students);
  saveStorage(LS_KEYS.ATTENDANCE, STATE.attendance);
  saveStorage(LS_KEYS.FEES, STATE.fees);
}

/* Helper Utility Functions */
function $(sel, ctx) { return (ctx || document).querySelector(sel); }
function $all(sel, ctx) { return Array.from((ctx || document).querySelectorAll(sel)); }

function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function todayISO() { return dateToISO(new Date()); }

function dateToISO(d) {
  const y = d.getFullYear(), m = String(d.getMonth() + 1).padStart(2, '0'), day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function parseISO(str) {
  if (!str) return null;
  const parts = String(str).split('-');
  if (parts.length !== 3) return null;
  return new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
}

function formatDate(isoStr) {
  const d = parseISO(isoStr);
  if (!d) return '—';
  const dd = String(d.getDate()).padStart(2, '0'), mm = String(d.getMonth() + 1).padStart(2, '0'), yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

function formatCurrency(n) {
  n = Number(n) || 0;
  return `${STATE.settings.currency || '₹'}${n.toLocaleString('en-IN')}`;
}

function uid() { return 'x' + Math.random().toString(36).slice(2, 10); }

/* Theme & Appearance Management */
function applyTheme(theme) {
  let effectiveTheme = theme;
  if (theme === 'system') {
    effectiveTheme = (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) ? 'dark' : 'light';
  }
  STATE.theme = theme;
  document.documentElement.setAttribute('data-theme', effectiveTheme);
  localStorage.setItem(LS_KEYS.THEME, theme);
  const themeIcon = $('#theme-icon');
  if (themeIcon) {
    themeIcon.setAttribute('data-lucide', effectiveTheme === 'dark' ? 'sun' : 'moon');
    if (window.lucide) lucide.createIcons();
  }
  applyAppearanceSettings();
}

function applyAppearanceSettings() {
  const app = (STATE.settings && STATE.settings.appearance) || {};
  const root = document.documentElement;

  if (app.accentColor) {
    root.style.setProperty('--primary', app.accentColor);
    root.style.setProperty('--primary-dark', app.accentColor);
  } else {
    root.style.removeProperty('--primary');
    root.style.removeProperty('--primary-dark');
  }

  if (app.density === 'compact') {
    document.body.classList.add('density-compact');
  } else {
    document.body.classList.remove('density-compact');
  }
}

/* System Theme Listener */
if (window.matchMedia) {
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    if (STATE.theme === 'system' || (STATE.settings.appearance && STATE.settings.appearance.theme === 'system')) {
      applyTheme('system');
    }
  });
}

/* Template Formatter */
function formatMessageTemplate(template, vars = {}) {
  if (!template) return '';
  return template.replace(/\{(\w+)}/g, (match, key) => {
    return vars[key] !== undefined && vars[key] !== null ? vars[key] : match;
  });
}

/* Toast Notification Manager */
const ToastManager = {
  icons: { success: 'check-circle', error: 'x-circle', warning: 'alert-triangle', info: 'info' },
  show(type, message, timeout = 3800) {
    let container = $('#toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toast-container';
      document.body.appendChild(container);
    }
    const el = document.createElement('div');
    el.className = `toast ${type}`;
    el.innerHTML = `<span class="toast-icon"><i data-lucide="${this.icons[type] || 'info'}" style="width:16px;height:16px"></i></span>
      <span style="flex:1">${escapeHtml(message)}</span>
      <button class="toast-close" style="cursor:pointer;background:none;border:none"><i data-lucide="x" style="width:14px;height:14px"></i></button>`;
    container.appendChild(el);
    if (window.lucide) lucide.createIcons();
    const remove = () => { el.classList.add('hide'); setTimeout(() => el.remove(), 200); };
    el.querySelector('.toast-close').onclick = remove;
    if (timeout) setTimeout(remove, timeout);
  }
};
function showToast(type, msg) { ToastManager.show(type, msg); }

/* Modal Manager */
const ModalManager = {
  open(html, opts = {}) {
    let root = $('#modal-root');
    if (!root) {
      root = document.createElement('div');
      root.id = 'modal-root';
      document.body.appendChild(root);
    }
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `<div class="modal-box ${opts.wide ? 'wide' : ''}">${html}</div>`;
    root.appendChild(overlay);
    requestAnimationFrame(() => overlay.classList.add('open'));
    if (window.lucide) lucide.createIcons();
    const close = () => {
      overlay.classList.remove('open');
      setTimeout(() => overlay.remove(), 200);
    };
    overlay.querySelectorAll('[data-modal-close]').forEach(b => b.onclick = close);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
    return { overlay, close };
  }
};

/* Common Navigation Shell Layout Builder */
function injectShellLayout(activePageKey, pageTitle) {
  const app = $('#app');
  if (!app) return;

  const tuitionName = STATE.settings.tuitionName || 'TuitionHub Center';
  const logoText = tuitionName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || 'TH';
  const logoMarkup = STATE.settings.logoUrl
    ? `<img src="${escapeHtml(STATE.settings.logoUrl)}" alt="Logo" class="sidebar-custom-logo" />`
    : `<span>${escapeHtml(logoText)}</span>`;

  app.innerHTML = `
    <div id="pull-refresh-bar"><i data-lucide="refresh-cw" class="icon spinning"></i> Syncing with Google Sheets...</div>

    <!-- SIDEBAR -->
    <aside id="sidebar">
      <div class="sidebar-brand">
        <div class="logo-mark" id="sidebar-logo-mark" style="${STATE.settings.logoUrl ? 'background:transparent;padding:0;' : ''}">${logoMarkup}</div>
        <span class="brand-text" id="sidebar-brand-name">${escapeHtml(tuitionName)}</span>
        <button class="collapse-btn" id="collapse-btn" title="Collapse"><i data-lucide="panel-left-close" class="icon"></i></button>
      </div>
      <nav class="sidebar-nav scroll-thin">
        <a class="nav-item ${activePageKey === 'dashboard' ? 'active' : ''}" href="index.html"><i data-lucide="layout-dashboard" class="icon"></i><span class="nav-label">Dashboard</span></a>
        <a class="nav-item ${activePageKey === 'students' ? 'active' : ''}" href="student.html"><i data-lucide="users" class="icon"></i><span class="nav-label">Student Directory</span></a>
        <a class="nav-item ${activePageKey === 'attendance' ? 'active' : ''}" href="attendance.html"><i data-lucide="calendar-check" class="icon"></i><span class="nav-label">Attendance</span></a>
        <a class="nav-item ${activePageKey === 'fee' ? 'active' : ''}" href="fee.html"><i data-lucide="wallet" class="icon"></i><span class="nav-label">Fee Management</span></a>
        <a class="nav-item ${activePageKey === 'exams' ? 'active' : ''}" href="exams-and-marks.html"><i data-lucide="award" class="icon"></i><span class="nav-label">Exams & Marks</span></a>
        <a class="nav-item ${activePageKey === 'timetable' ? 'active' : ''}" href="timetable.html"><i data-lucide="calendar-clock" class="icon"></i><span class="nav-label">Schedule & Timetable</span></a>
        <a class="nav-item ${activePageKey === 'notice' ? 'active' : ''}" href="notice.html"><i data-lucide="megaphone" class="icon"></i><span class="nav-label">Notice Board</span></a>
        <a class="nav-item ${activePageKey === 'settings' ? 'active' : ''}" href="settings.html"><i data-lucide="settings" class="icon"></i><span class="nav-label">Settings</span></a>
      </nav>
    </aside>

    <div id="sidebar-backdrop"></div>

    <!-- MAIN WRAPPER -->
    <div class="main-wrap" id="main-wrap">
      <!-- HEADER -->
      <header id="header">
        <div class="header-left">
          <button class="mobile-menu-btn" id="mobile-menu-btn"><i data-lucide="menu" class="icon"></i></button>
          <div class="header-titles">
            <div class="tuition-name">${escapeHtml(tuitionName)}</div>
            <div class="page-title">${escapeHtml(pageTitle)}</div>
          </div>
        </div>
        <div class="header-right">
          <button class="icon-btn" id="theme-toggle-btn" title="Toggle Theme"><i data-lucide="${STATE.theme === 'dark' ? 'sun' : 'moon'}" class="icon" id="theme-icon"></i></button>
          <div class="sync-badge">
            <span class="sync-dot ${STATE.syncStatus}" id="sync-dot"></span>
            <span id="sync-text">${STATE.syncStatus === 'synced' ? 'Synced' : STATE.syncStatus === 'saving' ? 'Saving...' : 'Offline'}</span>
          </div>
          <button class="icon-btn" id="refresh-btn" title="Sync Data"><i data-lucide="refresh-cw" class="icon"></i></button>
        </div>
      </header>

      <!-- PAGE CONTENT PLACEHOLDER -->
      <main id="page-content" class="fade-in"></main>
    </div>

    <!-- BOTTOM NAV FOR MOBILE -->
    <nav id="bottom-nav">
      <a class="bottom-nav-item ${activePageKey === 'dashboard' ? 'active' : ''}" href="index.html">
        <div class="nav-pill"><i data-lucide="layout-dashboard" class="icon"></i></div>
        <span>Home</span>
      </a>
      <a class="bottom-nav-item ${activePageKey === 'students' ? 'active' : ''}" href="student.html">
        <div class="nav-pill"><i data-lucide="users" class="icon"></i></div>
        <span>Students</span>
      </a>
      <a class="bottom-nav-item ${activePageKey === 'attendance' ? 'active' : ''}" href="attendance.html">
        <div class="nav-pill"><i data-lucide="calendar-check" class="icon"></i></div>
        <span>Attendance</span>
      </a>
      <a class="bottom-nav-item ${activePageKey === 'fee' ? 'active' : ''}" href="fee.html">
        <div class="nav-pill"><i data-lucide="wallet" class="icon"></i></div>
        <span>Fees</span>
      </a>
      <a class="bottom-nav-item ${activePageKey === 'exams' ? 'active' : ''}" href="exams-and-marks.html">
        <div class="nav-pill"><i data-lucide="award" class="icon"></i></div>
        <span>Exams</span>
      </a>
    </nav>
  `;

  const currentTheme = (STATE.settings && STATE.settings.appearance && STATE.settings.appearance.theme) || STATE.theme || 'light';
  applyTheme(currentTheme);
  bindShellEvents();
}

function bindShellEvents() {
  const collapseBtn = $('#collapse-btn');
  const sidebar = $('#sidebar');
  const mainWrap = $('#main-wrap');
  const mobileBtn = $('#mobile-menu-btn');
  const backdrop = $('#sidebar-backdrop');

  if (collapseBtn) {
    collapseBtn.onclick = () => {
      sidebar.classList.toggle('collapsed');
      mainWrap.classList.toggle('sidebar-collapsed');
    };
  }

  if (mobileBtn && backdrop) {
    mobileBtn.onclick = () => {
      sidebar.classList.add('mobile-open');
      backdrop.classList.add('show');
    };
    backdrop.onclick = () => {
      sidebar.classList.remove('mobile-open');
      backdrop.classList.remove('show');
    };
  }

   const themeBtn = $('#theme-toggle-btn');
   if (themeBtn) {
     themeBtn.onclick = () => {
       const nextTheme = STATE.theme === 'dark' ? 'light' : 'dark';
       if (!STATE.settings.appearance) STATE.settings.appearance = {};
       STATE.settings.appearance.theme = nextTheme;
       saveStorage(LS_KEYS.SETTINGS, STATE.settings);
       applyTheme(nextTheme);
     };
   }

  const refreshBtn = $('#refresh-btn');
  if (refreshBtn) {
    refreshBtn.onclick = () => {
      if (window.triggerGoogleSheetsSync) {
        window.triggerGoogleSheetsSync();
      } else {
        showToast('info', 'Data reloaded');
      }
    };
  }
}

/* Base64 PDF Saver for Android Bridge & Web Browsers */
function triggerPdfDownload(doc, filename) {
  try {
    const base64Data = doc.output('datauristring');
    if (window.AndroidBridge && typeof window.AndroidBridge.downloadBase64File === 'function') {
      window.AndroidBridge.downloadBase64File(base64Data, filename, 'application/pdf');
      showToast('success', 'PDF saved to Downloads/TuitionHub/' + filename);
    } else {
      doc.save(filename);
      showToast('success', 'PDF download initiated');
    }
  } catch (e) {
    showToast('error', 'Download error: ' + e.message);
  }
}

/* WhatsApp helper */
function openWhatsApp(phone, message) {
  if (!phone) { showToast('warning', 'No phone number provided'); return; }
  const cleanPhone = phone.replace(/[^0-9]/g, '');
  const encodedMsg = encodeURIComponent(message);
  const url = `https://wa.me/${cleanPhone}?text=${encodedMsg}`;
  window.open(url, '_blank');
}


/* Compute stats for a student */
function computeStudentStats(studentId) {
  const attendanceList = Array.isArray(STATE.attendance) ? STATE.attendance : [];
  const atts = attendanceList.filter(a => a.studentId === studentId);
  const present = atts.filter(a => a.status === 'Present').length;
  const absent = atts.filter(a => a.status === 'Absent').length;
  const total = present + absent;
  const pct = total > 0 ? Math.round((present / total) * 100) : 100;

  const feesList = Array.isArray(STATE.fees) ? STATE.fees : [];
  const fees = feesList.filter(f => f.studentId === studentId);
  const paidCount = fees.filter(f => f.status === 'Paid').length;
  const pendingCount = fees.filter(f => f.status !== 'Paid').length;

  return { present, absent, pct, paidCount, pendingCount };
}
