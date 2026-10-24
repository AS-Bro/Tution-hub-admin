/* ==========================================================================
   TuitionHub — Student Management Script (student.js)
   ========================================================================== */

let studentFilters = { search: '', batch: '', status: '' };

document.addEventListener('DOMContentLoaded', () => {
  injectShellLayout('students', 'Student Directory');
  renderStudentsPage();
});

window.onSyncComplete = function () {
  renderStudentsPage();
};

function renderStudentsPage() {
  const container = $('#page-content');
  if (!container) return;

  const batches = Array.from(new Set(STATE.students.map(s => s.batch).filter(Boolean)));

  let filtered = STATE.students.filter(s => {
    const matchSearch = !studentFilters.search ||
      (s.studentName && s.studentName.toLowerCase().includes(studentFilters.search.toLowerCase())) ||
      (s.studentId && s.studentId.toLowerCase().includes(studentFilters.search.toLowerCase())) ||
      (s.phone && s.phone.includes(studentFilters.search));
    const matchBatch = !studentFilters.batch || s.batch === studentFilters.batch;
    const matchStatus = !studentFilters.status || s.status === studentFilters.status;
    return matchSearch && matchBatch && matchStatus;
  });

  container.innerHTML = `
    <div class="section-head">
      <div>
        <h2>Student Directory</h2>
        <div class="section-sub">Total ${STATE.students.length} students registered</div>
      </div>
      <div style="display:flex;gap:10px">
        <button class="btn btn-outline" id="export-all-pdf-btn">
          <i data-lucide="download" class="icon"></i> Export PDF Report
        </button>
        <button class="btn btn-primary" id="add-student-btn">
          <i data-lucide="user-plus" class="icon"></i> Add New Student
        </button>
      </div>
    </div>

    <!-- TOOLBAR & FILTERS -->
    <div class="toolbar">
      <div class="search-box">
        <i data-lucide="search" class="icon"></i>
        <input type="text" id="student-search-input" placeholder="Search by name, ID, or phone..." value="${escapeHtml(studentFilters.search)}">
      </div>
      <select class="select-filter" id="batch-filter">
        <option value="">All Batches</option>
        ${batches.map(b => `<option value="${escapeHtml(b)}" ${studentFilters.batch === b ? 'selected' : ''}>${escapeHtml(b)}</option>`).join('')}
      </select>
      <select class="select-filter" id="status-filter">
        <option value="">All Statuses</option>
        <option value="Active" ${studentFilters.status === 'Active' ? 'selected' : ''}>Active</option>
        <option value="Inactive" ${studentFilters.status === 'Inactive' ? 'selected' : ''}>Inactive</option>
      </select>
    </div>

    <!-- TABLE -->
    ${filtered.length === 0 ? `
      <div class="card empty-state">
        <div class="emoji">🎓</div>
        <h4>No students found</h4>
        <p>Try clearing filters or add a new student to your directory.</p>
        <button class="btn btn-primary btn-sm" id="empty-add-btn">Add Student</button>
      </div>
    ` : `
      <div class="table-wrap student-directory-table">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Student Name</th>
              <th>Batch</th>
              <th class="student-mobile-info-heading">Details</th>
              <th>Parent / Contact</th>
              <th>Monthly Fee</th>
              <th>Attendance %</th>
              <th>Status</th>
              <th style="text-align:right">Actions</th>
            </tr>
          </thead>
          <tbody>
            ${filtered.map(s => {
    const stats = computeStudentStats(s.studentId);
    const initials = (s.studentName || 'ST').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
    return `
                <tr>
                  <td><span style="font-weight:700;font-size:13px;color:var(--primary)">${escapeHtml(s.studentId)}</span></td>
                  <td>
                    <div style="display:flex;align-items:center;gap:12px">
                      <div class="student-avatar">${escapeHtml(initials)}</div>
                      <div>
                        <div style="font-weight:700">${escapeHtml(s.studentName)}</div>
                        <div style="font-size:12px;color:var(--text-secondary)">Joined: ${formatDate(s.joiningDate)}</div>
                      </div>
                    </div>
                  </td>
                  <td><span class="badge badge-blue">${escapeHtml(s.batch || 'Unassigned')}</span></td>
                  <td class="student-mobile-info-cell">
                    <button class="btn btn-outline btn-sm student-info-btn" data-id="${escapeHtml(s.studentId)}">Info</button>
                  </td>
                  <td>
                    <div style="font-weight:600">${escapeHtml(s.parentName || '—')}</div>
                    <div style="font-size:12px;color:var(--text-secondary)">${escapeHtml(s.phone || '—')}</div>
                  </td>
                  <td style="font-weight:700">${formatCurrency(s.monthlyFee)}</td>
                  <td>
                    <div style="display:flex;align-items:center;gap:8px">
                      <div class="progress-bar" style="width:60px">
                        <div class="progress-fill" style="width:${stats.pct}%;background:${stats.pct < 75 ? 'var(--danger)' : 'var(--success)'}"></div>
                      </div>
                      <span style="font-size:12px;font-weight:700">${stats.pct}%</span>
                    </div>
                  </td>
                  <td>
                    <span class="badge ${s.status === 'Active' ? 'badge-green' : 'badge-gray'}">${escapeHtml(s.status || 'Active')}</span>
                  </td>
                  <td style="text-align:right">
                    <div style="display:inline-flex;gap:6px">
                      <button class="icon-btn action-view-btn" data-id="${escapeHtml(s.studentId)}" title="View Profile"><i data-lucide="eye" class="icon"></i></button>
                      <button class="icon-btn action-idcard-btn" data-id="${escapeHtml(s.studentId)}" title="Generate ID Card"><i data-lucide="id-card" class="icon"></i></button>
                      <button class="icon-btn action-edit-btn" data-id="${escapeHtml(s.studentId)}" title="Edit Student"><i data-lucide="edit-2" class="icon"></i></button>
                      <button class="icon-btn action-wa-btn" data-phone="${escapeHtml(s.phone || '')}" data-name="${escapeHtml(s.studentName)}" title="Message via WhatsApp"><i data-lucide="message-square" class="icon" style="color:var(--success)"></i></button>
                    </div>
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
  bindStudentEvents();
}

function bindStudentEvents() {
  const searchInput = $('#student-search-input');
  if (searchInput) {
    searchInput.oninput = (e) => {
      studentFilters.search = e.target.value;
      renderStudentsPage();
    };
  }

  const batchFilter = $('#batch-filter');
  if (batchFilter) {
    batchFilter.onchange = (e) => {
      studentFilters.batch = e.target.value;
      renderStudentsPage();
    };
  }

  const statusFilter = $('#status-filter');
  if (statusFilter) {
    statusFilter.onchange = (e) => {
      studentFilters.status = e.target.value;
      renderStudentsPage();
    };
  }

  const addBtn = $('#add-student-btn') || $('#empty-add-btn');
  if (addBtn) addBtn.onclick = () => openStudentModal();

  const exportAllBtn = $('#export-all-pdf-btn');
  if (exportAllBtn) exportAllBtn.onclick = () => exportAllStudentsPDF();

  $all('.action-view-btn').forEach(b => b.onclick = () => openProfileModal(b.dataset.id));
  $all('.student-info-btn').forEach(b => b.onclick = () => openStudentDetailsModal(b.dataset.id));
  $all('.action-idcard-btn').forEach(b => b.onclick = () => openIDCardModal(b.dataset.id));
  $all('.action-edit-btn').forEach(b => b.onclick = () => {
    const student = STATE.students.find(s => s.studentId === b.dataset.id);
    openStudentModal(student);
  });
  $all('.action-wa-btn').forEach(b => b.onclick = () => {
    openWhatsApp(b.dataset.phone, `Hello, this is regarding student ${b.dataset.name} at ${STATE.settings.tuitionName || 'Tuition Center'}.`);
  });
}

function openStudentDetailsModal(studentId) {
  const student = STATE.students.find(s => s.studentId === studentId);
  if (!student) return;

  const stats = computeStudentStats(studentId);
  const month = new Date().toLocaleString('default', { month: 'long', year: 'numeric' });
  const feeRecord = STATE.fees.find(f =>
    String(f.studentId) === String(studentId) &&
    String(f.month || '').trim().toLowerCase() === month.toLowerCase()
  );
  const feeStatus = feeRecord && String(feeRecord.status || '').toLowerCase() === 'paid' ? 'Paid' : 'Pending';
  const html = `
    <div class="modal-header">
      <h3>Student Details</h3>
      <button class="icon-btn" data-modal-close><i data-lucide="x" class="icon"></i></button>
    </div>
    <div class="modal-body">
      <div style="display:flex;align-items:center;gap:12px;padding-bottom:14px;border-bottom:1px solid var(--border)">
        <div class="student-avatar">${escapeHtml((student.studentName || 'S').slice(0, 2).toUpperCase())}</div>
        <div>
          <h2 style="font-size:18px">${escapeHtml(student.studentName)}</h2>
          <div style="font-size:13px;color:var(--text-secondary)">${escapeHtml(student.studentId)} · ${escapeHtml(student.batch || 'Unassigned')}</div>
        </div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
        <div><strong>Parent</strong><div>${escapeHtml(student.parentName || '—')}</div></div>
        <div><strong>Contact</strong><div>${escapeHtml(student.phone || '—')}</div></div>
        <div><strong>Monthly Fee</strong><div>${formatCurrency(student.monthlyFee)}</div></div>
        <div><strong>Fee Status (${escapeHtml(month)})</strong><div><span class="badge ${feeStatus === 'Paid' ? 'badge-green' : 'badge-red'}">${feeStatus}</span></div></div>
        <div><strong>Attendance</strong><div>${stats.pct}% (${stats.present} present, ${stats.absent} absent)</div></div>
        <div><strong>Status</strong><div><span class="badge ${student.status === 'Active' ? 'badge-green' : 'badge-gray'}">${escapeHtml(student.status || 'Active')}</span></div></div>
        <div><strong>Joined</strong><div>${formatDate(student.joiningDate)}</div></div>
      </div>
    </div>
    <div class="modal-footer" style="flex-wrap:wrap">
      <button class="btn btn-outline" id="student-details-view-btn"><i data-lucide="eye" class="icon"></i> View</button>
      <button class="btn btn-outline" id="student-details-edit-btn"><i data-lucide="edit-2" class="icon"></i> Edit</button>
      <button class="btn btn-outline" id="student-details-id-btn"><i data-lucide="id-card" class="icon"></i> ID Card</button>
      <button class="btn btn-outline" id="student-details-pdf-btn"><i data-lucide="file-text" class="icon"></i> Export PDF</button>
      <button class="btn btn-primary" id="student-details-wa-btn"><i data-lucide="message-square" class="icon"></i> WhatsApp</button>
    </div>
  `;

  const { overlay, close } = ModalManager.open(html);
  const viewBtn = $('#student-details-view-btn', overlay);
  if (viewBtn) viewBtn.onclick = () => { close(); openProfileModal(studentId); };
  const editBtn = $('#student-details-edit-btn', overlay);
  if (editBtn) editBtn.onclick = () => { close(); openStudentModal(student); };
  const idBtn = $('#student-details-id-btn', overlay);
  if (idBtn) idBtn.onclick = () => { close(); openIDCardModal(studentId); };
  const pdfBtn = $('#student-details-pdf-btn', overlay);
  if (pdfBtn) pdfBtn.onclick = () => exportStudentPDF(studentId);
  const whatsappBtn = $('#student-details-wa-btn', overlay);
  if (whatsappBtn) whatsappBtn.onclick = () => openWhatsApp(
    student.phone,
    `Hello, this is regarding student ${student.studentName} at ${STATE.settings.tuitionName || 'Tuition Center'}.`
  );
  if (window.lucide) lucide.createIcons();
}

function openStudentModal(student = null) {
  const isEdit = !!student;
  const nextId = isEdit ? student.studentId : `${STATE.settings.idPrefix || 'ST'}-${1000 + STATE.students.length + 1}`;

  const html = `
    <div class="modal-header">
      <h3>${isEdit ? 'Edit Student Details' : 'Register New Student'}</h3>
      <button class="icon-btn" data-modal-close><i data-lucide="x" class="icon"></i></button>
    </div>
    <form id="student-form" class="modal-body">
      <div class="form-grid-2">
        <div class="form-row">
          <label>Student ID</label>
          <input type="text" id="m-student-id" value="${escapeHtml(nextId)}" ${isEdit ? 'readonly' : ''} required>
        </div>
        <div class="form-row">
          <label>Full Name</label>
          <input type="text" id="m-student-name" value="${escapeHtml(student ? student.studentName : '')}" placeholder="e.g. Rahul Sharma" required>
        </div>
      </div>

      <div class="form-grid-2">
        <div class="form-row">
          <label>Batch / Grade</label>
          <input type="text" id="m-batch" value="${escapeHtml(student ? student.batch : STATE.settings.defaultBatch || 'Grade 10')}" placeholder="e.g. Grade 10" required>
        </div>
        <div class="form-row">
          <label>Monthly Fee (${STATE.settings.currency || '₹'})</label>
          <input type="number" id="m-monthly-fee" value="${student ? student.monthlyFee : STATE.settings.defaultMonthlyFee || 1000}" required>
        </div>
      </div>

      <div class="form-grid-2">
        <div class="form-row">
          <label>Parent / Guardian Name</label>
          <input type="text" id="m-parent-name" value="${escapeHtml(student ? student.parentName : '')}" placeholder="e.g. Suresh Sharma">
        </div>
        <div class="form-row">
          <label>Contact Phone Number</label>
          <input type="tel" id="m-phone" value="${escapeHtml(student ? student.phone : '')}" placeholder="e.g. 9876543210" required>
        </div>
      </div>

      <div class="form-grid-2">
        <div class="form-row">
          <label>Joining Date</label>
          <input type="date" id="m-joining-date" value="${student && student.joiningDate ? student.joiningDate : todayISO()}">
        </div>
        <div class="form-row">
          <label>Enrollment Status</label>
          <select id="m-status">
            <option value="Active" ${!student || student.status === 'Active' ? 'selected' : ''}>Active</option>
            <option value="Inactive" ${student && student.status === 'Inactive' ? 'selected' : ''}>Inactive</option>
          </select>
        </div>
      </div>

      <div class="form-row" style="background:var(--border-subtle);padding:12px;border-radius:var(--radius-md);border:1px dashed var(--border);margin-top:4px">
        <label style="color:var(--primary);font-weight:700">🔑 Student Portal Login Password</label>
        <div style="display:flex;gap:8px">
          <input type="text" id="m-password" value="${escapeHtml(student ? (student.password || 'Pass123') : 'Pass123')}" placeholder="e.g. Pass123" required style="font-family:monospace">
          <button type="button" class="btn btn-outline btn-sm" id="gen-pass-btn" title="Generate Random Password">Auto-Gen</button>
        </div>
        <div style="font-size:11.5px;color:var(--text-muted)">Student will use Student ID (${student ? student.studentId : 'ST-xxxx'}) and this password to log in.</div>
      </div>
    </form>
    <div class="modal-footer">
      ${isEdit ? `<button class="btn btn-danger btn-sm" id="delete-student-btn" style="margin-right:auto">Delete Record</button>` : ''}
      <button class="btn btn-outline" data-modal-close>Cancel</button>
      <button class="btn btn-primary" id="save-student-btn">${isEdit ? 'Update Details' : 'Save Student'}</button>
    </div>
  `;

  const { overlay, close } = ModalManager.open(html, { wide: true });

  const genPassBtn = $('#gen-pass-btn', overlay);
  if (genPassBtn) {
    genPassBtn.onclick = () => {
      const randPass = 'St' + Math.floor(100000 + Math.random() * 900000);
      $('#m-password', overlay).value = randPass;
      showToast('info', 'Generated password: ' + randPass);
    };
  }

  const form = $('#student-form', overlay);
  const saveBtn = $('#save-student-btn', overlay);

  saveBtn.onclick = async () => {
    if (!form.checkValidity()) { form.reportValidity(); return; }

    const sData = {
      studentId: $('#m-student-id', overlay).value.trim(),
      studentName: $('#m-student-name', overlay).value.trim(),
      batch: $('#m-batch', overlay).value.trim(),
      monthlyFee: Number($('#m-monthly-fee', overlay).value) || 0,
      parentName: $('#m-parent-name', overlay).value.trim(),
      phone: $('#m-phone', overlay).value.trim(),
      joiningDate: $('#m-joining-date', overlay).value,
      status: $('#m-status', overlay).value,
      password: $('#m-password', overlay).value.trim() || 'Pass123'
    };

    if (isEdit) {
      const idx = STATE.students.findIndex(s => s.studentId === sData.studentId);
      if (idx !== -1) STATE.students[idx] = sData;
    } else {
      STATE.students.unshift(sData);
    }

    saveStorage(LS_KEYS.STUDENTS, STATE.students);
    showToast('success', isEdit ? 'Student updated' : 'Student registered successfully');
    close();
    renderStudentsPage();

    /* Background sync if Google Sheets is connected */
    if (STATE.settings.gasUrl && window.apiRequest) {
      try {
        await window.apiRequest('saveStudent', { student: sData });
      } catch (e) {
        showToast('warning', 'Saved locally, but Google Sheets sync failed');
      }
    }
  };

  const deleteBtn = $('#delete-student-btn', overlay);
  if (deleteBtn) {
    deleteBtn.onclick = async () => {
      if (confirm(`Are you sure you want to delete ${student.studentName}?`)) {
        STATE.students = STATE.students.filter(s => s.studentId !== student.studentId);
        saveStorage(LS_KEYS.STUDENTS, STATE.students);
        showToast('info', 'Student deleted');
        close();
        renderStudentsPage();
        if (STATE.settings.gasUrl && window.apiRequest) {
          try {
            await window.apiRequest('deleteStudent', { studentId: student.studentId });
          } catch (e) {
            showToast('warning', 'Deleted locally, but Google Sheets sync failed');
          }
        }
      }
    };
  }
}

function openProfileModal(studentId) {
  const student = STATE.students.find(s => s.studentId === studentId);
  if (!student) return;

  const stats = computeStudentStats(studentId);
  const html = `
    <div class="modal-header">
      <h3>Student Profile</h3>
      <button class="icon-btn" data-modal-close><i data-lucide="x" class="icon"></i></button>
    </div>
    <div class="modal-body">
      <div style="display:flex;align-items:center;gap:16px;padding-bottom:16px;border-bottom:1px solid var(--border)">
        <div class="student-avatar" style="width:56px;height:56px;font-size:20px">${escapeHtml((student.studentName || 'S').slice(0, 2).toUpperCase())}</div>
        <div>
          <h2 style="font-size:20px">${escapeHtml(student.studentName)}</h2>
          <div style="font-size:13px;color:var(--text-secondary)">ID: ${escapeHtml(student.studentId)} | Batch: ${escapeHtml(student.batch)}</div>
        </div>
      </div>

      <div class="stat-grid" style="grid-template-columns:1fr 1fr;gap:12px;margin:16px 0">
        <div class="card" style="padding:14px">
          <div style="font-size:12px;color:var(--text-secondary)">Attendance Record</div>
          <div style="font-size:20px;font-weight:800;color:${stats.pct < 75 ? 'var(--danger)' : 'var(--success)'}">${stats.pct}%</div>
          <div style="font-size:11px;color:var(--text-muted)">Present: ${stats.present} / Absent: ${stats.absent}</div>
        </div>
        <div class="card" style="padding:14px">
          <div style="font-size:12px;color:var(--text-secondary)">Monthly Fee</div>
          <div style="font-size:20px;font-weight:800;color:var(--primary)">${formatCurrency(student.monthlyFee)}</div>
          <div style="font-size:11px;color:var(--text-muted)">Pending months: ${stats.pendingCount}</div>
        </div>
      </div>

      <div style="display:flex;flex-direction:column;gap:10px;font-size:14px">
        <div><strong>Parent Name:</strong> ${escapeHtml(student.parentName || '—')}</div>
        <div><strong>Contact Phone:</strong> ${escapeHtml(student.phone || '—')}</div>
        <div><strong>Joining Date:</strong> ${formatDate(student.joiningDate)}</div>
        <div><strong>Status:</strong> <span class="badge ${student.status === 'Active' ? 'badge-green' : 'badge-gray'}">${escapeHtml(student.status)}</span></div>
      </div>

      <div style="background:var(--border-subtle);padding:14px;border-radius:var(--radius-md);border:1px solid var(--border);margin-top:8px">
        <div style="font-weight:700;font-size:13px;color:var(--primary);margin-bottom:6px;display:flex;align-items:center;justify-content:space-between">
          <span>🔐 Student Portal Login Credentials</span>
          <button class="btn btn-outline btn-sm" id="share-creds-wa-btn" style="padding:4px 8px;font-size:11px"><i data-lucide="share-2" class="icon" style="width:12px;height:12px"></i> Share Credentials</button>
        </div>
        <div style="font-size:13px;display:flex;gap:16px;font-family:monospace">
          <div><strong>Student ID:</strong> ${escapeHtml(student.studentId)}</div>
          <div><strong>Password:</strong> ${escapeHtml(student.password || 'Pass123')}</div>
        </div>
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-outline" id="export-single-pdf-btn"><i data-lucide="file-text" class="icon"></i> Export PDF</button>
      <button class="btn btn-primary" data-modal-close>Close</button>
    </div>
  `;

  const { overlay } = ModalManager.open(html);
  const pdfBtn = $('#export-single-pdf-btn', overlay);
  if (pdfBtn) {
    pdfBtn.onclick = () => exportStudentPDF(studentId);
  }

  const shareCredsBtn = $('#share-creds-wa-btn', overlay);
  if (shareCredsBtn) {
    shareCredsBtn.onclick = () => {
      const msg = `Hello ${student.studentName},\nHere are your Student Portal Login Credentials for ${STATE.settings.tuitionName}:\n\n🆔 Student ID: ${student.studentId}\n🔑 Password: ${student.password || 'Pass123'}\n\nYou can log in to view your attendance, fees, exam marks, timetable & notices.`;
      openWhatsApp(student.phone, msg);
    };
  }
}

function openIDCardModal(studentId) {
  const student = STATE.students.find(s => s.studentId === studentId);
  if (!student) return;

  const tuitionName = STATE.settings.tuitionName || 'Tuition Center';
  const logoUrl = STATE.settings.logoUrl;
  const html = `
    <div class="modal-header">
      <h3>Student Identification Card</h3>
      <button class="icon-btn" data-modal-close><i data-lucide="x" class="icon"></i></button>
    </div>
    <div class="modal-body">
      <div class="id-card">
        <div style="display:flex;justify-content:space-between;align-items:center;gap:12px">
          <div style="display:flex;align-items:center;gap:10px">
            ${logoUrl ? `<img src="${escapeHtml(logoUrl)}" alt="Logo" style="height:38px;max-width:54px;object-fit:contain;border-radius:6px" />` : ''}
            <div>
              <div style="font-size:17px;font-weight:800;color:var(--primary);line-height:1.2">${escapeHtml(tuitionName)}</div>
              <div style="font-size:11px;color:var(--text-secondary)">STUDENT IDENTITY CARD</div>
            </div>
          </div>
          <div class="student-avatar" style="width:48px;height:48px;flex-shrink:0">${escapeHtml((student.studentName || 'ST').slice(0, 2).toUpperCase())}</div>
        </div>
        <div style="margin-top:10px;display:flex;flex-direction:column;gap:6px;font-size:13.5px">
          <div><strong>Student Name:</strong> ${escapeHtml(student.studentName)}</div>
          <div><strong>Student ID:</strong> ${escapeHtml(student.studentId)}</div>
          <div><strong>Batch:</strong> ${escapeHtml(student.batch)}</div>
          <div><strong>Phone:</strong> ${escapeHtml(student.phone || '—')}</div>
        </div>
        <div style="margin-top:8px;padding-top:8px;border-top:1px dashed var(--border);font-size:11px;color:var(--text-muted);display:flex;justify-content:space-between">
          <span>Authorized Student Pass</span>
          <span>Valid Academic Year</span>
        </div>
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-outline" onclick="window.print()"><i data-lucide="printer" class="icon"></i> Print ID Card</button>
      <button class="btn btn-primary" data-modal-close>Done</button>
    </div>
  `;

  ModalManager.open(html);
}

async function exportStudentPDF(studentId) {
  const student = STATE.students.find(s => s.studentId === studentId);
  if (!student) return;
  if (!window.jspdf) { showToast('error', 'PDF engine loading...'); return; }
  try {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    doc.setFontSize(20);
    doc.text(STATE.settings.tuitionName || 'Tuition Center', 20, 20);
    doc.setFontSize(14);
    doc.text(`Student Profile: ${student.studentName}`, 20, 32);
    doc.setFontSize(11);
    doc.text(`Student ID: ${student.studentId}`, 20, 42);
    doc.text(`Batch: ${student.batch}`, 20, 48);
    doc.text(`Phone: ${student.phone}`, 20, 54);
    doc.text(`Monthly Fee: ${formatCurrency(student.monthlyFee)}`, 20, 60);

    triggerPdfDownload(doc, `student_${student.studentId}.pdf`);
  } catch (e) {
    showToast('error', 'PDF export failed');
  }
}

async function exportAllStudentsPDF() {
  const students = STATE.students.filter(s => {
    const matchSearch = !studentFilters.search ||
      (s.studentName && s.studentName.toLowerCase().includes(studentFilters.search.toLowerCase())) ||
      (s.studentId && s.studentId.toLowerCase().includes(studentFilters.search.toLowerCase())) ||
      (s.phone && s.phone.includes(studentFilters.search));
    const matchBatch = !studentFilters.batch || s.batch === studentFilters.batch;
    const matchStatus = !studentFilters.status || s.status === studentFilters.status;
    return matchSearch && matchBatch && matchStatus;
  });
  if (students.length === 0) {
    showToast('warning', 'No students match the current filters');
    return;
  }
  if (!window.jspdf) { showToast('error', 'PDF engine loading...'); return; }
  try {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 12;
    const tableWidth = pageWidth - margin * 2;
    const columns = [
      { title: 'Sl. No', width: 13 },
      { title: 'Student ID', width: 32 },
      { title: 'Full Name', width: 46 },
      { title: 'Grade / Batch', width: 34 },
      { title: 'Parent Name & Contact', width: 72 },
      { title: 'Joining Date', width: 34 },
      { title: 'Status', width: 28 }
    ];
    columns[columns.length - 1].width += tableWidth - columns.reduce((sum, column) => sum + column.width, 0);

    const batchCounts = students.reduce((counts, student) => {
      const batch = student.batch || 'Unassigned';
      counts[batch] = (counts[batch] || 0) + 1;
      return counts;
    }, {});
    const batchSummary = Object.entries(batchCounts).map(([batch, count]) => `${batch}: ${count}`).join(' | ');
    const activeCount = students.filter(student => (student.status || 'Active') === 'Active').length;
    const filterSummary = [
      studentFilters.search ? `Search: ${studentFilters.search}` : '',
      studentFilters.batch ? `Batch: ${studentFilters.batch}` : '',
      studentFilters.status ? `Status: ${studentFilters.status}` : ''
    ].filter(Boolean).join(' | ') || 'All students';

    const drawTableHeader = y => {
      let x = margin;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      columns.forEach(column => {
        doc.setFillColor(51, 65, 85);
        doc.setDrawColor(203, 213, 225);
        doc.setTextColor(255, 255, 255);
        doc.rect(x, y, column.width, 9, 'FD');
        doc.text(doc.splitTextToSize(column.title, column.width - 4), x + 2, y + 5.8);
        x += column.width;
      });
      doc.setTextColor(15, 23, 42);
      return y + 9;
    };

    const drawReportHeader = () => {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(16);
      doc.setTextColor(51, 65, 85);
      doc.text('Tution Hub', margin, 18);
      doc.setFontSize(13);
      doc.setTextColor(15, 23, 42);
      doc.text('STUDENT DIRECTORY REPORT', pageWidth - margin, 18, { align: 'right' });
      doc.setDrawColor(51, 65, 85);
      doc.setLineWidth(0.6);
      doc.line(margin, 22, pageWidth - margin, 22);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(71, 85, 105);
      doc.text(`Generated Date: ${new Date().toLocaleDateString()}`, margin, 28);
      doc.text(`Total Students: ${students.length}`, margin + 75, 28);
      doc.text(doc.splitTextToSize(`Batch / Filter Applied: ${filterSummary}`, tableWidth), margin, 33);

      const summaryY = 38;
      const summaryGap = 4;
      const summaryWidth = (tableWidth - summaryGap * 2) / 3;
      const summaryItems = [
        { title: 'TOTAL STUDENTS', value: String(students.length) },
        { title: 'BATCH BREAKDOWN', value: batchSummary || '—' },
        { title: 'ACTIVE STUDENTS', value: `${activeCount} of ${students.length}` }
      ];
      summaryItems.forEach((item, index) => {
        const x = margin + index * (summaryWidth + summaryGap);
        doc.setFillColor(248, 250, 252);
        doc.setDrawColor(203, 213, 225);
        doc.roundedRect(x, summaryY, summaryWidth, 16, 1.5, 1.5, 'FD');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7);
        doc.setTextColor(71, 85, 105);
        doc.text(item.title, x + 3, summaryY + 5);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(index === 1 ? 7 : 9);
        doc.setTextColor(15, 23, 42);
        const lines = doc.splitTextToSize(item.value, summaryWidth - 6).slice(0, 2);
        doc.text(lines, x + 3, summaryY + 10);
      });
    };

    drawReportHeader();
    let y = drawTableHeader(58);
    const rowBottom = pageHeight - 18;

    students.forEach((student, index) => {
      const values = [
        String(index + 1),
        String(student.studentId || ''),
        String(student.studentName || ''),
        String(student.batch || 'Unassigned'),
        `${student.parentName || '—'}${student.phone ? `\n${student.phone}` : ''}`,
        formatDate(student.joiningDate),
        String(student.status || 'Active')
      ];
      const cellLines = values.map((value, cellIndex) =>
        doc.splitTextToSize(value, columns[cellIndex].width - 4)
      );
      const rowHeight = Math.max(9, ...cellLines.map(lines => lines.length * 3.8 + 4));

      if (y + rowHeight > rowBottom) {
        doc.addPage();
        y = drawTableHeader(18);
      }

      let x = margin;
      cellLines.forEach((lines, cellIndex) => {
        doc.setFillColor(index % 2 === 0 ? 248 : 255, index % 2 === 0 ? 250 : 255, index % 2 === 0 ? 252 : 255);
        doc.setDrawColor(203, 213, 225);
        doc.rect(x, y, columns[cellIndex].width, rowHeight, 'FD');
        doc.setFont('helvetica', cellIndex === 6 && values[cellIndex] === 'Active' ? 'bold' : 'normal');
        doc.setFontSize(8);
        doc.setTextColor(15, 23, 42);
        doc.text(lines, x + 2, y + 4.5);
        x += columns[cellIndex].width;
      });
      y += rowHeight;
    });

    const totalPages = doc.internal.getNumberOfPages();
    for (let page = 1; page <= totalPages; page++) {
      doc.setPage(page);
      doc.setDrawColor(203, 213, 225);
      doc.setLineWidth(0.4);
      doc.line(margin, pageHeight - 13, pageWidth - margin, pageHeight - 13);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(71, 85, 105);
      doc.text('Confidential Student Directory Report — Tution Hub System', pageWidth / 2, pageHeight - 8, { align: 'center' });
      doc.text(`Page ${page} of ${totalPages}`, pageWidth - margin, pageHeight - 8, { align: 'right' });
    }

    triggerPdfDownload(doc, `student_directory_${todayISO()}.pdf`);
  } catch (e) {
    console.error('Student directory PDF export failed:', e);
    showToast('error', 'PDF export failed');
  }
}
