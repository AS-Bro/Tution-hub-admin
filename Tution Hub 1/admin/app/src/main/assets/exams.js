/* ==========================================================================
   TuitionHub — Exams & Marks Script (exams.js)
   ========================================================================== */

let examState = {
  selectedExamId: '',
  localMarks: {} // studentId -> mark value
};

document.addEventListener('DOMContentLoaded', () => {
  injectShellLayout('exams', 'Exams & Marks');
  if (STATE.exams.length > 0) examState.selectedExamId = STATE.exams[0].id;
  renderExamsPage();
});

window.onSyncComplete = function () {
  if (!examState.selectedExamId && STATE.exams.length > 0) {
    examState.selectedExamId = STATE.exams[0].id;
  }
  renderExamsPage();
};

function renderExamsPage() {
  const container = $('#page-content');
  if (!container) return;

  const currentExam = STATE.exams.find(e => e.id === examState.selectedExamId);
  const currentMarksObj = currentExam ? (STATE.examMarks[currentExam.id] || {}) : {};

  const batchStudents = currentExam ? STATE.students.filter(s => s.batch === currentExam.batch && s.status === 'Active') : [];

  /* Calculate metrics */
  let totalScoreSum = 0, countScored = 0, highestMark = 0, lowestMark = currentExam ? currentExam.totalMarks : 0;
  batchStudents.forEach(s => {
    const val = Number(currentMarksObj[s.studentId]);
    if (!isNaN(val) && currentMarksObj[s.studentId] !== undefined) {
      totalScoreSum += val;
      countScored++;
      if (val > highestMark) highestMark = val;
      if (val < lowestMark) lowestMark = val;
    }
  });

  const avgScore = countScored > 0 ? (totalScoreSum / countScored).toFixed(1) : 0;

  container.innerHTML = `
    <div class="section-head">
      <div>
        <h2>Exams & Marks Management</h2>
        <div class="section-sub">Create tests, log student marks, and view analytics</div>
      </div>
      <div style="display:flex;gap:10px">
        <button class="btn btn-primary btn-sm" id="create-exam-btn">
          <i data-lucide="plus" class="icon"></i> Create New Exam
        </button>
      </div>
    </div>

    <!-- SELECT EXAM TOOLBAR -->
    <div class="toolbar">
      <label style="font-weight:700;font-size:14px">Select Test:</label>
      <select class="select-filter" id="exam-selector" style="min-width:280px">
        ${STATE.exams.length === 0 ? '<option value="">No Exams Available</option>' : ''}
        ${STATE.exams.map(e => `<option value="${escapeHtml(e.id)}" ${e.id === examState.selectedExamId ? 'selected' : ''}>${escapeHtml(e.testName)} (${escapeHtml(e.batch)} - Total: ${e.totalMarks} marks)</option>`).join('')}
      </select>
      ${currentExam ? `
        <button class="btn btn-outline btn-sm" id="save-marks-btn"><i data-lucide="save" class="icon"></i> Save All Marks</button>
      ` : ''}
    </div>

    ${!currentExam ? `
      <div class="card empty-state">
        <div class="emoji">📝</div>
        <h4>No Exam Selected</h4>
        <p>Create a test to log marks and track student progress.</p>
        <button class="btn btn-primary btn-sm" id="empty-exam-btn">Create Test</button>
      </div>
    ` : `
      <!-- METRICS -->
      <div class="stat-grid" style="grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));margin-bottom:20px">
        <div class="card stat-card">
          <div class="stat-top">
            <span class="stat-title">Class Average</span>
            <div class="stat-icon" style="background:var(--primary-container);color:var(--primary)"><i data-lucide="bar-chart-2" class="icon"></i></div>
          </div>
          <div class="stat-value">${avgScore} <span style="font-size:13px;color:var(--text-secondary)">/ ${currentExam.totalMarks}</span></div>
        </div>

        <div class="card stat-card">
          <div class="stat-top">
            <span class="stat-title">Highest Score</span>
            <div class="stat-icon" style="background:var(--success-light);color:var(--success)"><i data-lucide="trophy" class="icon"></i></div>
          </div>
          <div class="stat-value" style="color:var(--success)">${highestMark} <span style="font-size:13px;color:var(--text-secondary)">/ ${currentExam.totalMarks}</span></div>
        </div>

        <div class="card stat-card">
          <div class="stat-top">
            <span class="stat-title">Evaluated Students</span>
            <div class="stat-icon" style="background:var(--secondary-container);color:var(--secondary)"><i data-lucide="check-square" class="icon"></i></div>
          </div>
          <div class="stat-value">${countScored} <span style="font-size:13px;color:var(--text-secondary)">/ ${batchStudents.length}</span></div>
        </div>
      </div>

      <!-- MARKS REGISTER TABLE -->
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Student Name</th>
              <th>Batch</th>
              <th>Marks Obtained (Max: ${currentExam.totalMarks})</th>
              <th>Percentage</th>
              <th style="text-align:right">Report & Parent Notification</th>
            </tr>
          </thead>
          <tbody>
            ${batchStudents.map(s => {
    const currentScore = currentMarksObj[s.studentId] !== undefined ? currentMarksObj[s.studentId] : '';
    const pct = (currentScore !== '' && !isNaN(currentScore)) ? Math.round((Number(currentScore) / currentExam.totalMarks) * 100) : null;
    return `
                <tr>
                  <td><span style="font-weight:700;color:var(--primary)">${escapeHtml(s.studentId)}</span></td>
                  <td>
                    <div style="font-weight:700">${escapeHtml(s.studentName)}</div>
                  </td>
                  <td><span class="badge badge-blue">${escapeHtml(s.batch)}</span></td>
                  <td>
                    <input type="number" class="mark-input" data-student-id="${escapeHtml(s.studentId)}" value="${currentScore}" placeholder="0 - ${currentExam.totalMarks}" style="width:110px;padding:8px 12px;border:1px solid var(--border);border-radius:var(--radius-sm);font-weight:700;background:var(--card);color:var(--text)" max="${currentExam.totalMarks}" min="0">
                  </td>
                  <td>
                    ${pct !== null ? `<span class="badge ${pct >= 40 ? 'badge-green' : 'badge-red'}">${pct}%</span>` : '—'}
                  </td>
                  <td style="text-align:right">
                    <button class="btn btn-outline btn-sm send-mark-wa-btn" data-phone="${escapeHtml(s.phone || '')}" data-name="${escapeHtml(s.studentName)}" data-score="${currentScore}" data-max="${currentExam.totalMarks}" data-test="${escapeHtml(currentExam.testName)}">
                      <i data-lucide="message-square" class="icon" style="color:var(--success)"></i> Send Mark
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
  bindExamEvents(currentExam);
}

function bindExamEvents(currentExam) {
  const createBtn = $('#create-exam-btn') || $('#empty-exam-btn');
  if (createBtn) createBtn.onclick = () => openCreateExamModal();

  const examSelector = $('#exam-selector');
  if (examSelector) {
    examSelector.onchange = (e) => {
      examState.selectedExamId = e.target.value;
      renderExamsPage();
    };
  }

  const saveMarksBtn = $('#save-marks-btn');
  if (saveMarksBtn && currentExam) {
    saveMarksBtn.onclick = async () => {
      const markInputs = $all('.mark-input');
      if (!STATE.examMarks[currentExam.id]) STATE.examMarks[currentExam.id] = {};

      markInputs.forEach(inp => {
        const sid = inp.dataset.studentId;
        const val = inp.value.trim();
        if (val !== '') {
          STATE.examMarks[currentExam.id][sid] = Number(val);
        }
      });

      saveStorage(LS_KEYS.EXAM_MARKS, STATE.examMarks);
      showToast('success', 'Exam marks saved successfully');
      renderExamsPage();

      if (STATE.settings.gasUrl && window.apiRequest) {
        try {
          await window.apiRequest('saveMarks', { examId: currentExam.id, marks: STATE.examMarks[currentExam.id] });
        } catch (e) {
          showToast('warning', 'Saved locally, but Google Sheets sync failed');
        }
      }
    };
  }

  $all('.send-mark-wa-btn').forEach(btn => {
    btn.onclick = () => {
      if (!btn.dataset.score) {
        showToast('warning', 'Please enter and save marks first!');
        return;
      }
      const msg = `Dear Parent, marks update for ${btn.dataset.name} in test "${btn.dataset.test}": Scored ${btn.dataset.score} / ${btn.dataset.max}. Keep encouraging your child! - ${STATE.settings.tuitionName || 'Tuition Center'}`;
      openWhatsApp(btn.dataset.phone, msg);
    };
  });
}

function openCreateExamModal() {
  const batches = Array.from(new Set(STATE.students.map(s => s.batch).filter(Boolean)));
  const html = `
    <div class="modal-header">
      <h3>Create New Exam / Evaluation</h3>
      <button class="icon-btn" data-modal-close><i data-lucide="x" class="icon"></i></button>
    </div>
    <form id="create-exam-form" class="modal-body">
      <div class="form-row">
        <label>Exam / Test Title</label>
        <input type="text" id="em-title" placeholder="e.g. Unit Test 1 - Mathematics" required>
      </div>

      <div class="form-grid-2">
        <div class="form-row">
          <label>Target Batch</label>
          <select id="em-batch" required>
            ${batches.map(b => `<option value="${escapeHtml(b)}">${escapeHtml(b)}</option>`).join('')}
          </select>
        </div>
        <div class="form-row">
          <label>Total Maximum Marks</label>
          <input type="number" id="em-total-marks" value="50" required>
        </div>
      </div>

      <div class="form-row">
        <label>Test Date</label>
        <input type="date" id="em-date" value="${todayISO()}">
      </div>
    </form>
    <div class="modal-footer">
      <button class="btn btn-outline" data-modal-close>Cancel</button>
      <button class="btn btn-primary" id="save-exam-modal-btn">Create Test</button>
    </div>
  `;

  const { overlay, close } = ModalManager.open(html);
  const saveBtn = $('#save-exam-modal-btn', overlay);

  saveBtn.onclick = async () => {
    const title = $('#em-title', overlay).value.trim();
    const batch = $('#em-batch', overlay).value;
    const totalMarks = Number($('#em-total-marks', overlay).value) || 50;
    const date = $('#em-date', overlay).value;

    if (!title) { showToast('warning', 'Title is required'); return; }

    const examObj = {
      id: uid(),
      testName: title,
      batch,
      totalMarks,
      date
    };

    STATE.exams.unshift(examObj);
    saveStorage(LS_KEYS.EXAMS, STATE.exams);
    examState.selectedExamId = examObj.id;

    showToast('success', 'Exam created successfully');
    close();
    renderExamsPage();

    if (STATE.settings.gasUrl && window.apiRequest) {
      try {
        await window.apiRequest('saveExam', { exam: examObj });
      } catch (e) {
        showToast('warning', 'Saved locally, but Google Sheets sync failed');
      }
    }
  };
}
