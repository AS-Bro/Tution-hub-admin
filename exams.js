/* ==========================================================================
   TuitionHub — Exams & Marks Script (exams.js)
   ========================================================================== */

let examState = {
  selectedExamId: '',
  subjectFilter: '',
  renderedExamId: '',
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

  const subjects = getExamSubjects();
  const filteredExams = examState.subjectFilter
    ? STATE.exams.filter(exam => String(exam.subject || '').trim() === examState.subjectFilter)
    : STATE.exams;
  const allMode = examState.selectedExamId === 'ALL';
  const selectedExam = STATE.exams.find(e => String(e.id) === String(examState.selectedExamId));
  const selectedMatchesFilter = selectedExam && (!examState.subjectFilter ||
    String(selectedExam.subject || '').trim() === examState.subjectFilter);
  if (!allMode && !selectedMatchesFilter) {
    examState.selectedExamId = filteredExams.length ? filteredExams[0].id : '';
  }
  const currentExam = allMode ? null : STATE.exams.find(e => String(e.id) === String(examState.selectedExamId)) || null;
  const currentMarksObj = currentExam ? getExamMarks(currentExam) : {};

  const batchStudents = currentExam ? STATE.students.filter(s => s.batch === currentExam.batch && s.status === 'Active') : [];
  const evaluated = currentExam ? getEvaluatedStudents(currentExam, batchStudents) : [];
  const rankByStudent = new Map();
  evaluated.forEach((result, index) => {
    rankByStudent.set(result.student.studentId, index > 0 && result.score === evaluated[index - 1].score
      ? rankByStudent.get(evaluated[index - 1].student.studentId)
      : index + 1);
  });

  /* Calculate class metrics using only valid marks for the active test. */
  const countScored = evaluated.length;
  const totalScoreSum = evaluated.reduce((sum, result) => sum + result.score, 0);
  const highestMark = countScored > 0 ? evaluated[0].score : 0;

  const avgScore = countScored > 0 ? (totalScoreSum / countScored).toFixed(1) : 0;
  const allStudents = STATE.students;
  const cumulativeResults = allStudents.map(student => ({ student, result: getStudentCumulativeResult(student) }));
  const cumulativeEvaluated = cumulativeResults.filter(item => item.result);
  cumulativeEvaluated.sort((a, b) => b.result.percentage - a.result.percentage ||
    b.result.score - a.result.score || String(a.student.studentName).localeCompare(String(b.student.studentName)));
  const cumulativeRankByStudent = new Map();
  cumulativeEvaluated.forEach((item, index) => {
    const previous = cumulativeEvaluated[index - 1];
    cumulativeRankByStudent.set(String(item.student.studentId),
      previous && item.result.percentage === previous.result.percentage
        ? cumulativeRankByStudent.get(String(previous.student.studentId))
        : index + 1);
  });
  const institutionAnalysis = getInstitutionExamAnalysis();

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
        <option value="ALL" ${allMode ? 'selected' : ''}>All Tests / Cumulative Summary</option>
        ${filteredExams.length === 0 ? '<option value="">No Exams Available</option>' : ''}
        ${filteredExams.map(e => `<option value="${escapeHtml(e.id)}" ${String(e.id) === String(examState.selectedExamId) ? 'selected' : ''}>${escapeHtml(getExamDisplayTitle(e))} (${escapeHtml(e.batch)} - Total: ${e.totalMarks} marks)</option>`).join('')}
      </select>
      <label for="exam-subject-filter" style="font-weight:700;font-size:14px">Subject:</label>
      <select class="select-filter" id="exam-subject-filter">
        <option value="">All Subjects</option>
        ${subjects.map(subject => `<option value="${escapeHtml(subject)}" ${subject === examState.subjectFilter ? 'selected' : ''}>${escapeHtml(subject)}</option>`).join('')}
      </select>
      <button class="btn btn-outline btn-sm" id="exam-message-templates-btn">
        <i data-lucide="message-square-text" class="icon"></i> Message Templates
      </button>
      ${currentExam ? `
        <button class="btn btn-outline btn-sm" id="save-marks-btn"><i data-lucide="save" class="icon"></i> Save All Marks</button>
        <span id="exam-marks-save-status" class="exam-marks-save-status" role="status" aria-live="polite"></span>
        <button class="btn btn-primary btn-sm" id="broadcast-exam-results-btn"><i data-lucide="send" class="icon"></i> Broadcast Marks to All Parents</button>
      ` : ''}
    </div>

    ${!currentExam && !allMode ? `
      <div class="card empty-state">
        <div class="emoji">📝</div>
        <h4>No Exam Selected</h4>
        <p>Create a test to log marks and track student progress.</p>
        <button class="btn btn-primary btn-sm" id="empty-exam-btn">Create Test</button>
      </div>
    ` : `
      <!-- METRICS -->
      <div class="stat-grid" style="grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));margin-bottom:20px">
        ${allMode ? `
        <div class="card stat-card">
          <div class="stat-top"><span class="stat-title">Cumulative Students</span><div class="stat-icon" style="background:var(--primary-container);color:var(--primary)"><i data-lucide="users" class="icon"></i></div></div>
          <div class="stat-value">${cumulativeEvaluated.length}<span style="font-size:13px;color:var(--text-secondary)"> / ${allStudents.length} students</span></div>
        </div>
        <div class="card stat-card">
          <div class="stat-top"><span class="stat-title">Institution Pass Rate</span><div class="stat-icon" style="background:var(--success-light);color:var(--success)"><i data-lucide="bar-chart-3" class="icon"></i></div></div>
          <div class="stat-value">${institutionAnalysis.passRate}%</div>
        </div>
        <div class="card stat-card">
          <div class="stat-top"><span class="stat-title">Top Overall Score</span><div class="stat-icon" style="background:var(--warning-light);color:var(--warning)"><i data-lucide="trophy" class="icon"></i></div></div>
          <div class="stat-value">${cumulativeEvaluated.length ? `${cumulativeEvaluated[0].result.percentage}%` : '—'}</div>
        </div>
        <div class="card stat-card">
          <div class="stat-top"><span class="stat-title">Grades Across All Tests</span><div class="stat-icon" style="background:var(--secondary-container);color:var(--secondary)"><i data-lucide="bar-chart-3" class="icon"></i></div></div>
          <div class="exam-institution-grades"><span class="stat-title">Grade Distribution (all evaluations)</span><div class="exam-grade-distribution">
            ${['A+', 'A', 'B', 'C', 'D', 'F'].map(grade => `<span><strong>${grade}</strong><span>${institutionAnalysis.gradeCounts[grade]}</span></span>`).join('')}
          </div></div>
        </div>
        ` : `
        <div class="card stat-card">
          <div class="stat-top">
            <span class="stat-title">Class Average</span>
            <div class="stat-icon" style="background:var(--primary-container);color:var(--primary)"><i data-lucide="bar-chart-2" class="icon"></i></div>
          </div>
          <div class="stat-value"><span id="exam-class-average">${avgScore}</span> <span style="font-size:13px;color:var(--text-secondary)">/ ${currentExam.totalMarks}</span></div>
        </div>

        <div class="card stat-card">
          <div class="stat-top">
            <span class="stat-title">Highest Score</span>
            <div class="stat-icon" style="background:var(--success-light);color:var(--success)"><i data-lucide="trophy" class="icon"></i></div>
          </div>
          <div class="stat-value" style="color:var(--success)"><span id="exam-class-highest">${highestMark}</span> <span style="font-size:13px;color:var(--text-secondary)">/ ${currentExam.totalMarks}</span></div>
        </div>

        <div class="card stat-card">
          <div class="stat-top">
            <span class="stat-title">Evaluated Students</span>
            <div class="stat-icon" style="background:var(--secondary-container);color:var(--secondary)"><i data-lucide="check-square" class="icon"></i></div>
          </div>
          <div class="stat-value"><span id="exam-evaluated-count">${countScored}</span> <span style="font-size:13px;color:var(--text-secondary)">/ ${batchStudents.length}</span></div>
        </div>
        <div class="card stat-card">
          <div class="stat-top">
            <span class="stat-title">Grade Distribution</span>
            <div class="stat-icon" style="background:var(--warning-light);color:var(--warning)"><i data-lucide="bar-chart-3" class="icon"></i></div>
          </div>
          <div class="exam-grade-distribution">
            ${['A+', 'A', 'B', 'C', 'D', 'F'].map(grade => `
              <span><strong>${grade}</strong><span data-exam-grade-count="${grade}">${evaluated.filter(result => result.grade === grade).length}</span></span>
            `).join('')}
          </div>
        </div>
        `}
      </div>

      <!-- MARKS REGISTER TABLE -->
      <div class="table-wrap exam-marks-table">
        <table>
          <thead>
            <tr>
              <th class="exam-col-id">ID</th>
              <th class="exam-col-name">Student Name</th>
              <th class="exam-col-batch">Batch</th>
              <th class="exam-col-rank">Class Rank</th>
              ${allMode ? `
                <th class="exam-col-marks">Cumulative Score</th>
                <th class="exam-col-percentage">Overall Percentage</th>
              ` : `
                <th class="exam-col-marks">Marks Obtained (Max: ${currentExam.totalMarks})</th>
                <th class="exam-col-percentage">Percentage</th>
              `}
              <th class="exam-col-actions" style="text-align:right">Report & Parent Notification</th>
            </tr>
          </thead>
          <tbody>
            ${allMode ? allStudents.map(s => {
    const result = cumulativeResults.find(item => String(item.student.studentId) === String(s.studentId)).result;
    return `
                <tr>
                  <td class="exam-col-id"><span style="font-weight:700;color:var(--primary)">${escapeHtml(s.studentId)}</span></td>
                  <td class="exam-col-name">
                    <div style="font-weight:700">${escapeHtml(s.studentName)}</div>
                    <button class="btn btn-outline btn-sm exam-mobile-details-btn" data-student-id="${escapeHtml(s.studentId)}">Details</button>
                    <button class="btn btn-outline btn-sm exam-mobile-report-btn" data-student-id="${escapeHtml(s.studentId)}" ${result ? '' : 'disabled'}><i data-lucide="printer" class="icon"></i> Print Report Card</button>
                  </td>
                  <td class="exam-col-batch"><span class="badge badge-blue">${escapeHtml(s.batch || '—')}</span></td>
                  <td class="exam-col-rank">${result ? `#${cumulativeRankByStudent.get(String(s.studentId))}` : '—'}</td>
                  <td class="exam-col-marks">${result ? `${result.score} / ${result.totalPossible}` : '—'}</td>
                  <td class="exam-col-percentage"><span class="badge ${result ? result.percentage >= 40 ? 'badge-green' : 'badge-red' : 'badge-gray'}">${result ? `${result.percentage}%` : '—'}</span></td>
                  <td class="exam-col-actions" style="text-align:right">
                    <button class="btn btn-outline btn-sm print-exam-report-btn" data-student-id="${escapeHtml(s.studentId)}" ${result ? '' : 'disabled'}><i data-lucide="printer" class="icon"></i> Print Report Card</button>
                  </td>
                </tr>`;
  }).join('') : batchStudents.map(s => {
    const currentScore = currentMarksObj[s.studentId] !== undefined ? currentMarksObj[s.studentId] : '';
    const rawScore = currentScore === '' ? null : Number(currentScore);
    const pct = rawScore !== null && Number.isFinite(rawScore) && rawScore >= 0 && rawScore <= Number(currentExam.totalMarks)
      ? Math.round((rawScore / Number(currentExam.totalMarks)) * 100)
      : null;
    return `
                <tr>
                  <td class="exam-col-id"><span style="font-weight:700;color:var(--primary)">${escapeHtml(s.studentId)}</span></td>
                  <td class="exam-col-name">
                    <div style="font-weight:700">${escapeHtml(s.studentName)}</div>
                    <button class="btn btn-outline btn-sm exam-mobile-details-btn" data-student-id="${escapeHtml(s.studentId)}">Details</button>
                    <button class="btn btn-outline btn-sm exam-mobile-report-btn" data-student-id="${escapeHtml(s.studentId)}"><i data-lucide="printer" class="icon"></i> Print Report Card</button>
                  </td>
                  <td class="exam-col-batch"><span class="badge badge-blue">${escapeHtml(s.batch)}</span></td>
                  <td class="exam-col-rank"><span class="exam-rank-value" data-rank-student="${escapeHtml(s.studentId)}">${rankByStudent.has(s.studentId) ? `#${rankByStudent.get(s.studentId)}` : '—'}</span></td>
                  <td class="exam-col-marks">
                    <input type="number" class="mark-input" data-student-id="${escapeHtml(s.studentId)}" value="${currentScore}" placeholder="0 - ${currentExam.totalMarks}" style="width:110px;padding:8px 12px;border:1px solid var(--border);border-radius:var(--radius-sm);font-weight:700;background:var(--card);color:var(--text)" max="${currentExam.totalMarks}" min="0">
                  </td>
                  <td class="exam-col-percentage">
                    <span class="badge exam-percentage-value ${pct === null ? 'badge-gray' : pct >= 40 ? 'badge-green' : 'badge-red'}">${pct === null ? '—' : `${pct}%`}</span>
                  </td>
                  <td class="exam-col-actions" style="text-align:right">
                    <div class="exam-row-actions">
                      <button class="btn btn-outline btn-sm print-exam-report-btn" data-student-id="${escapeHtml(s.studentId)}" ${pct === null ? 'disabled' : ''}>
                        <i data-lucide="printer" class="icon"></i> Print Report Card
                      </button>
                      <button class="btn btn-outline btn-sm send-mark-wa-btn" data-student-id="${escapeHtml(s.studentId)}" ${pct === null ? 'disabled' : ''}>
                        <i data-lucide="message-square" class="icon" style="color:var(--success)"></i> Send Mark
                      </button>
                    </div>
                  </td>
                </tr>
              `;
  }).join('')}
          </tbody>
        </table>
      </div>
      <section class="card exam-institution-analysis">
        <div class="stat-top"><div><h3 style="margin:0">All-Student Exam Analysis</h3><div class="section-sub">All students and evaluated tests across every batch</div></div><i data-lucide="school" class="icon" style="color:var(--primary)"></i></div>
        <div class="exam-analysis-grid">
          <div><span class="stat-title">Overall Pass Rate</span><strong>${institutionAnalysis.passRate}%</strong></div>
          <div><span class="stat-title">Evaluations</span><strong>${institutionAnalysis.evaluationCount}</strong></div>
          <div class="exam-top-scorers"><span class="stat-title">Institution-wide Top Scorers</span>
            ${institutionAnalysis.topScorers.length ? institutionAnalysis.topScorers.map((item, index) => `
              <div><span>#${index + 1} ${escapeHtml(item.student.studentName)} <span class="badge badge-blue">${escapeHtml(item.student.batch || '—')}</span></span><strong>${item.result.percentage}% · ${item.result.evaluatedTests} tests</strong></div>`).join('') : '<p class="section-sub">No marks evaluated yet.</p>'}
          </div>
          <div class="exam-institution-grades"><span class="stat-title">Grade Distribution (all evaluations)</span><div class="exam-grade-distribution">
            ${['A+', 'A', 'B', 'C', 'D', 'F'].map(grade => `<span><strong>${grade}</strong><span>${institutionAnalysis.gradeCounts[grade]}</span></span>`).join('')}
          </div></div>
        </div>
      </section>
    `}
  `;

  if (window.lucide) lucide.createIcons();
  examState.renderedExamId = currentExam ? currentExam.id : '';
  bindExamEvents(currentExam, allMode);
}

function bindExamEvents(currentExam, allMode = false) {
  const createBtn = $('#create-exam-btn') || $('#empty-exam-btn');
  if (createBtn) createBtn.onclick = () => openCreateExamModal();
  const templatesBtn = $('#exam-message-templates-btn');
  if (templatesBtn) templatesBtn.onclick = () => openExamMessageTemplateModal();

  const examSelector = $('#exam-selector');
  if (examSelector) {
    examSelector.onchange = (e) => {
      examState.selectedExamId = e.target.value;
      renderExamsPage();
    };
  }
  const subjectFilter = $('#exam-subject-filter');
  if (subjectFilter) {
    subjectFilter.onchange = (e) => {
      examState.subjectFilter = e.target.value;
      if (examState.selectedExamId !== 'ALL') {
        const selected = STATE.exams.find(exam => String(exam.id) === String(examState.selectedExamId));
        if (!selected || (examState.subjectFilter && String(selected.subject || '').trim() !== examState.subjectFilter)) {
          const nextExam = STATE.exams.find(exam => !examState.subjectFilter ||
            String(exam.subject || '').trim() === examState.subjectFilter);
          examState.selectedExamId = nextExam ? nextExam.id : '';
        }
      }
      renderExamsPage();
    };
  }

  const saveMarksBtn = $('#save-marks-btn');
  if (saveMarksBtn && currentExam) {
    saveMarksBtn.onclick = async () => {
      const markInputs = $all('.mark-input');
      const newMarks = { ...(STATE.examMarks[currentExam.id] || {}) };
      for (const input of markInputs) {
        const value = input.value.trim();
        if (value === '') {
          delete newMarks[input.dataset.studentId];
          continue;
        }
        const score = Number(value);
        if (!Number.isFinite(score) || score < 0 || score > Number(currentExam.totalMarks)) {
          showToast('warning', `Enter a valid mark from 0 to ${currentExam.totalMarks} for ${input.dataset.studentId}`);
          input.focus();
          return;
        }
        newMarks[input.dataset.studentId] = score;
      }

      saveMarksBtn.disabled = true;
      saveMarksBtn.innerHTML = '<i data-lucide="loader-circle" class="icon"></i> Saving Marks...';
      let saveStatus = $('#exam-marks-save-status');
      if (saveStatus) saveStatus.textContent = 'Saving all student marks...';
      if (window.lucide) lucide.createIcons();
      STATE.examMarks[currentExam.id] = newMarks;
      saveStorage(LS_KEYS.EXAM_MARKS, STATE.examMarks);
      renderExamsPage();
      saveStatus = $('#exam-marks-save-status');
      if (saveStatus) saveStatus.textContent = 'Marks saved on this device. Syncing...';
      showToast('success', 'All student marks saved on this device');

      let syncFailed = false;
      if (STATE.settings.gasUrl && window.apiRequest) {
        try {
          await window.apiRequest('saveMarks', { examId: currentExam.id, marks: STATE.examMarks[currentExam.id] });
        } catch (e) {
          syncFailed = true;
          console.error('Exam marks Google Sheets sync failed:', e);
          showToast('warning', 'Marks saved locally, but Google Sheets sync failed');
        }
      }
      const finalStatus = $('#exam-marks-save-status');
      if (finalStatus) finalStatus.textContent = syncFailed
        ? 'Saved locally; Google Sheets sync failed.'
        : 'All marks saved successfully.';
    };
  }

  $all('.send-mark-wa-btn').forEach(btn => {
    btn.onclick = () => {
      const student = STATE.students.find(s => String(s.studentId) === String(btn.dataset.studentId));
      const result = student && getStudentExamResult(student, currentExam);
      if (!student || !result) {
        showToast('warning', 'Please enter and save marks first!');
        return;
      }
      openWhatsApp(student.phone, formatExamResultMessage(student, currentExam, result));
    };
  });

  $all('.mark-input').forEach(input => {
    input.oninput = () => {
      input.classList.add('exam-mark-input-dirty');
      const row = input.closest('tr');
      if (row) row.classList.add('exam-mark-row-dirty');
      const saveStatus = $('#exam-marks-save-status');
      if (saveStatus) saveStatus.textContent = 'Unsaved mark changes';
      updateExamPreview(currentExam);
    };
  });

  $all('.exam-mobile-details-btn').forEach(btn => {
    btn.onclick = () => openExamStudentDetails(btn.dataset.studentId, allMode ? 'ALL' : currentExam);
  });

  $all('.print-exam-report-btn, .exam-mobile-report-btn').forEach(btn => {
    btn.onclick = () => {
      const student = STATE.students.find(s => String(s.studentId) === String(btn.dataset.studentId));
      if (student) printExamReportCard(student, allMode ? 'ALL' : currentExam);
    };
  });

  const broadcastBtn = $('#broadcast-exam-results-btn');
  if (broadcastBtn && currentExam) {
    broadcastBtn.onclick = () => openExamResultsQueue(currentExam);
  }
}

function openExamStudentDetails(studentId, exam) {
  const student = STATE.students.find(s => String(s.studentId) === String(studentId));
  if (!student || !exam) return;
  const allMode = exam === 'ALL';
  const currentResult = allMode ? getStudentCumulativeResult(student) : getStudentExamResult(student, exam);
  const history = getStudentExamHistory(student);
  const historyHtml = history.length ? history.map((entry, index) => {
    const previous = history[index + 1];
    const trend = !previous ? '—' : entry.percentage > previous.percentage ? '↑' :
      entry.percentage < previous.percentage ? '↓' : '→';
    const trendColor = trend === '↑' ? 'var(--success)' : trend === '↓' ? 'var(--danger)' : 'var(--text-secondary)';
    return `
      <tr>
        <td>${escapeHtml(entry.exam.testName)}</td>
        <td>${entry.exam.date ? escapeHtml(formatDate(entry.exam.date)) : '—'}</td>
        <td>${entry.score} / ${Number(entry.exam.totalMarks)}</td>
        <td>${entry.percentage}%</td>
        <td style="font-weight:700;color:${trendColor}">${trend}</td>
      </tr>
    `;
  }).join('') : '<tr><td colspan="5" style="text-align:center;color:var(--text-secondary)">No evaluated tests yet.</td></tr>';
  const html = `
    <div class="modal-header">
      <h3>Exam Details</h3>
      <button class="icon-btn" data-modal-close><i data-lucide="x" class="icon"></i></button>
    </div>
    <div class="modal-body">
      <h4>${escapeHtml(student.studentName)} <span style="font-weight:400;color:var(--text-secondary)">(${escapeHtml(student.studentId)})</span></h4>
      <div><strong>Batch:</strong> ${escapeHtml(student.batch || '—')}</div>
      <div><strong>${allMode ? 'Summary' : 'Test'}:</strong> ${allMode ? 'All Tests / Cumulative Summary' : escapeHtml(exam.testName)}</div>
      <div><strong>${allMode ? 'Cumulative Score' : 'Marks'}:</strong> ${currentResult ? `${currentResult.score} / ${currentResult.totalPossible}` : 'Not entered'}</div>
      <div><strong>Percentage:</strong> ${currentResult ? `${currentResult.percentage}%` : '—'}</div>
      <div><strong>Grade:</strong> ${currentResult ? currentResult.grade : 'Not graded'}</div>
      ${allMode && currentResult ? `<div><strong>Evaluated Tests:</strong> ${currentResult.evaluatedTests}</div>` : ''}
      <div>
        <strong>Test History & Percentage Trend</strong>
        <div class="table-wrap exam-history-table" style="margin-top:8px">
          <table>
            <thead><tr><th>Test</th><th>Date</th><th>Score</th><th>Percentage</th><th>Trend</th></tr></thead>
            <tbody>${historyHtml}</tbody>
          </table>
        </div>
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-outline" data-modal-close>Close</button>
      <button class="btn btn-outline" id="exam-detail-report-btn" ${currentResult ? '' : 'disabled'}><i data-lucide="printer" class="icon"></i> Print Report Card</button>
      ${allMode ? '' : '<button class="btn btn-primary" id="exam-detail-whatsapp-btn"><i data-lucide="message-square" class="icon"></i> Send Mark on WhatsApp</button>'}
    </div>
  `;
  const { overlay } = ModalManager.open(html);
  const reportBtn = $('#exam-detail-report-btn', overlay);
  if (reportBtn) reportBtn.onclick = () => {
    if (currentResult) printExamReportCard(student, allMode ? 'ALL' : exam);
  };
  const whatsappBtn = $('#exam-detail-whatsapp-btn', overlay);
  if (whatsappBtn) {
    whatsappBtn.onclick = () => {
      if (!currentResult) {
        showToast('warning', 'Please enter and save marks first!');
        return;
      }
      openWhatsApp(student.phone, formatExamResultMessage(student, exam, currentResult));
    };
  }
  if (window.lucide) lucide.createIcons();
}

function getExamMarks(exam) {
  const marks = { ...((STATE.examMarks && STATE.examMarks[exam.id]) || {}) };
  if (exam.id === examState.renderedExamId) {
    $all('.mark-input').forEach(input => {
      const value = input.value.trim();
      if (value !== '') marks[input.dataset.studentId] = value;
    });
  }
  return marks;
}

function getGradeFromPercentage(percentage) {
  if (percentage >= 90) return 'A+';
  if (percentage >= 80) return 'A';
  if (percentage >= 70) return 'B';
  if (percentage >= 60) return 'C';
  if (percentage >= 40) return 'D';
  return 'F';
}

function getStudentExamResult(student, exam, marks = getExamMarks(exam)) {
  const rawScore = marks[student.studentId];
  if (rawScore === undefined || rawScore === null || String(rawScore).trim() === '') return null;
  const score = Number(rawScore);
  const maximum = Number(exam.totalMarks);
  if (!Number.isFinite(score) || !Number.isFinite(maximum) || maximum <= 0 || score < 0 || score > maximum) return null;
  const percentage = Math.round(score / maximum * 100);
  return { score, totalPossible: maximum, percentage, grade: getGradeFromPercentage(percentage) };
}

function getStudentCumulativeResult(student) {
  const results = STATE.exams
    .filter(exam => String(exam.batch) === String(student.batch))
    .map(exam => {
      const result = getStudentExamResult(student, exam, (STATE.examMarks && STATE.examMarks[exam.id]) || {});
      return result ? { exam, ...result } : null;
    })
    .filter(Boolean);
  if (!results.length) return null;
  const score = results.reduce((sum, result) => sum + result.score, 0);
  const totalPossible = results.reduce((sum, result) => sum + result.totalPossible, 0);
  const percentage = totalPossible > 0 ? Math.round(score / totalPossible * 100) : 0;
  return {
    score,
    totalPossible,
    percentage,
    grade: getGradeFromPercentage(percentage),
    evaluatedTests: results.length,
    tests: results
  };
}

function getInstitutionExamAnalysis() {
  const evaluations = [];
  STATE.exams.forEach(exam => {
    const students = STATE.students.filter(student => String(student.batch) === String(exam.batch));
    getEvaluatedStudents(exam, students, (STATE.examMarks && STATE.examMarks[exam.id]) || {})
      .forEach(result => evaluations.push({ ...result, exam }));
  });
  const gradeCounts = { 'A+': 0, A: 0, B: 0, C: 0, D: 0, F: 0 };
  evaluations.forEach(result => { gradeCounts[result.grade] += 1; });
  const passCount = evaluations.filter(result => result.percentage >= 40).length;
  const topScorers = STATE.students
    .map(student => ({ student, result: getStudentCumulativeResult(student) }))
    .filter(item => item.result)
    .sort((a, b) => b.result.percentage - a.result.percentage ||
      b.result.score - a.result.score || String(a.student.studentName).localeCompare(String(b.student.studentName)))
    .slice(0, 5);
  return {
    evaluationCount: evaluations.length,
    passRate: evaluations.length ? Math.round(passCount / evaluations.length * 100) : 0,
    gradeCounts,
    topScorers
  };
}

function getEvaluatedStudents(exam, students, marks = getExamMarks(exam)) {
  return students
    .map(student => {
      const result = getStudentExamResult(student, exam, marks);
      return result ? { student, ...result } : null;
    })
    .filter(Boolean)
    .sort((a, b) => b.score - a.score || String(a.student.studentName).localeCompare(String(b.student.studentName)));
}

function updateExamPreview(exam) {
  const students = STATE.students.filter(student =>
    student.status === 'Active' && String(student.batch) === String(exam.batch)
  );
  const evaluated = getEvaluatedStudents(exam, students);
  const marks = getExamMarks(exam);
  const rankByStudent = new Map();
  evaluated.forEach((result, index) => {
    rankByStudent.set(String(result.student.studentId), index > 0 && result.score === evaluated[index - 1].score
      ? rankByStudent.get(String(evaluated[index - 1].student.studentId))
      : index + 1);
  });
  $all('.exam-rank-value').forEach(element => {
    const rank = rankByStudent.get(element.dataset.rankStudent);
    element.textContent = rank ? `#${rank}` : '—';
  });

  const total = evaluated.reduce((sum, result) => sum + result.score, 0);
  const average = $('#exam-class-average');
  const highest = $('#exam-class-highest');
  const count = $('#exam-evaluated-count');
  if (average) average.textContent = evaluated.length ? (total / evaluated.length).toFixed(1) : '0';
  if (highest) highest.textContent = evaluated.length ? String(evaluated[0].score) : '0';
  if (count) count.textContent = String(evaluated.length);

  ['A+', 'A', 'B', 'C', 'D', 'F'].forEach(grade => {
    const gradeCount = $(`[data-exam-grade-count="${grade}"]`);
    if (gradeCount) gradeCount.textContent = String(evaluated.filter(result => result.grade === grade).length);
  });

  $all('.mark-input').forEach(input => {
    const row = input.closest('tr');
    if (!row) return;
    const student = students.find(item => String(item.studentId) === input.dataset.studentId);
    const result = student && getStudentExamResult(student, exam, marks);
    const percent = row.querySelector('.exam-percentage-value');
    const reportButtons = row.querySelectorAll('.print-exam-report-btn, .exam-mobile-report-btn');
    const sendButton = row.querySelector('.send-mark-wa-btn');
    if (percent) {
      percent.textContent = result ? `${result.percentage}%` : '—';
      percent.className = `badge exam-percentage-value ${result ? result.percentage >= 40 ? 'badge-green' : 'badge-red' : 'badge-gray'}`;
    }
    reportButtons.forEach(button => { button.disabled = !result; });
    if (sendButton) sendButton.disabled = !result;
  });
}

function getStudentExamHistory(student) {
  return STATE.exams
    .filter(exam => String(exam.batch) === String(student.batch))
    .map(exam => {
      const result = getStudentExamResult(student, exam);
      return result ? { exam, ...result } : null;
    })
    .filter(Boolean)
    .sort((a, b) => String(b.exam.date || '').localeCompare(String(a.exam.date || '')));
}

function formatExamResultMessage(student, exam, result) {
  const template = (STATE.settings.whatsappTemplates && STATE.settings.whatsappTemplates.examResults) ||
    'Dear Parent, {student_name} scored {score}/{max_marks} ({percentage}%) in {test_name}. Grade: {grade}. - {tuition_name}';
  const values = {
    student_name: student.studentName || '',
    test_name: exam.testName || '',
    score: result.score,
    max_marks: result.totalPossible || Number(exam.totalMarks) || 0,
    percentage: result.percentage,
    grade: result.grade,
    tuition_name: STATE.settings.tuitionName || 'Tuition Center'
  };
  return String(template).replace(/\{(student_name|test_name|score|max_marks|percentage|grade|tuition_name)\}/g,
    (tag, key) => String(values[key]));
}

function openExamMessageTemplateModal() {
  const defaultTemplate = 'Dear Parent, {student_name} scored {score}/{max_marks} ({percentage}%) in {test_name}. Grade: {grade}. - {tuition_name}';
  const template = (STATE.settings.whatsappTemplates && STATE.settings.whatsappTemplates.examResults) || defaultTemplate;
  const html = `
    <div class="modal-header">
      <h3>Exam Result Message Template</h3>
      <button class="icon-btn" data-modal-close><i data-lucide="x" class="icon"></i></button>
    </div>
    <div class="modal-body">
      <div class="form-row">
        <label for="exam-message-template">WhatsApp message</label>
        <textarea id="exam-message-template" rows="6" style="width:100%;resize:vertical">${escapeHtml(template)}</textarea>
      </div>
      <p class="section-sub">Available tags: {student_name}, {test_name}, {score}, {max_marks}, {percentage}, {grade}, {tuition_name}</p>
    </div>
    <div class="modal-footer">
      <button class="btn btn-outline" data-modal-close>Cancel</button>
      <button class="btn btn-primary" id="save-exam-message-template-btn"><i data-lucide="save" class="icon"></i> Save Template</button>
    </div>
  `;
  const { overlay, close } = ModalManager.open(html);
  const saveButton = $('#save-exam-message-template-btn', overlay);
  saveButton.onclick = async () => {
    const updatedTemplate = $('#exam-message-template', overlay).value.trim();
    if (!updatedTemplate) {
      showToast('warning', 'Message template cannot be empty.');
      return;
    }
    STATE.settings.whatsappTemplates = Object.assign({}, STATE.settings.whatsappTemplates || {}, {
      examResults: updatedTemplate
    });
    saveStorage(LS_KEYS.SETTINGS, STATE.settings);
    close();
    showToast('success', 'Exam message template saved.');
    if (window.apiRequest && (!window.getGoogleSheetsUrl || window.getGoogleSheetsUrl())) {
      try {
        await window.apiRequest('saveSettings', { settings: STATE.settings });
      } catch (error) {
        console.error('Exam message template sync failed:', error);
        showToast('warning', 'Template saved locally, but Google Sheets sync failed.');
      }
    }
  };
  if (window.lucide) lucide.createIcons();
}

function printExamReportCard(student, exam) {
  const allMode = exam === 'ALL';
  const result = allMode ? getStudentCumulativeResult(student) : getStudentExamResult(student, exam);
  if (!result) {
    showToast('warning', 'Save a valid mark before printing this report card.');
    return;
  }

  const classmates = allMode
    ? STATE.students
      .map(item => ({ student: item, result: getStudentCumulativeResult(item) }))
      .filter(item => item.result)
      .sort((a, b) => b.result.percentage - a.result.percentage)
    : getEvaluatedStudents(exam, STATE.students.filter(item =>
      item.status === 'Active' && String(item.batch) === String(exam.batch)
    )).map(item => ({ student: item.student, result: item }));
  const classAverage = classmates.length
    ? (classmates.reduce((sum, item) => sum + item.result.percentage, 0) / classmates.length).toFixed(1)
    : '—';
  const classHighest = classmates.length ? classmates[0].result.percentage : '—';
  const classRank = allMode
    ? classmates.filter(item => item.result.percentage > result.percentage).length + 1
    : classmates.findIndex(item => String(item.student.studentId) === String(student.studentId)) + 1;
  const reportTitle = allMode ? 'All Tests / Cumulative Summary' : exam.testName;
  const totalPossible = result.totalPossible || Number(exam.totalMarks);
  const tuitionName = escapeHtml(STATE.settings.tuitionName || 'Tuition Hub');
  const logo = STATE.settings.logoUrl
    ? `<img class="brand-logo" src="${escapeHtml(STATE.settings.logoUrl)}" alt="${tuitionName} logo">`
    : `<div class="brand-mark">${escapeHtml(tuitionName.split(/\s+/).map(word => word[0]).join('').slice(0, 3))}</div>`;
  const reportWindow = window.open('', '_blank');
  if (!reportWindow) {
    showToast('warning', 'Please allow pop-ups to print or save the report card.');
    return;
  }

  reportWindow.document.open();
  reportWindow.document.write(`<!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Report Card - ${escapeHtml(student.studentName)} - ${escapeHtml(reportTitle)}</title>
      <style>
        * { box-sizing: border-box; }
        body { margin: 0; padding: 24px; color: #0f172a; font: 14px Arial, sans-serif; background: #f8fafc; }
        .report { width: 100%; max-width: 190mm; min-height: 250mm; margin: 0 auto; padding: 28px; border: 1px solid #334155; background: #fff; }
        .brand { display:flex; align-items:center; gap:14px; padding-bottom:18px; border-bottom:2px solid #334155; }
        .brand-logo,.brand-mark { width:52px; height:52px; object-fit:contain; }
        .brand-mark { display:flex; align-items:center; justify-content:center; border-radius:12px; background:#334155; color:#fff; font-size:18px; font-weight:700; }
        h1 { margin:0; color:#334155; font-size:22px; }
        .subtitle { margin-top:5px; color:#64748b; font-size:12px; }
        h2 { margin:26px 0 18px; padding:11px; background:#334155; color:#fff; text-align:center; font-size:17px; letter-spacing:1px; }
        .test-name { margin:0 0 18px; text-align:center; font-size:18px; }
        .metadata { display:grid; grid-template-columns:1fr 1fr; gap:12px 20px; padding:16px; border:1px solid #cbd5e1; }
        .metadata div { display:flex; gap:8px; overflow-wrap:anywhere; }
        .label { color:#334155; font-weight:700; }
        .score { margin:24px 0; padding:22px; border:2px solid #334155; text-align:center; }
        .score-value { color:#334155; font-size:32px; font-weight:700; }
        .score-caption { margin-top:6px; color:#64748b; }
        .grade { display:inline-block; margin-top:14px; padding:7px 18px; border-radius:20px; background:#e2e8f0; color:#334155; font-size:18px; font-weight:700; }
        .class-stats { display:grid; grid-template-columns:1fr 1fr; gap:14px; }
        .stat { padding:16px; border:1px solid #cbd5e1; text-align:center; }
        .stat strong { display:block; margin-top:6px; color:#334155; font-size:22px; }
        .footer { margin-top:36px; padding-top:14px; border-top:1px solid #cbd5e1; color:#64748b; text-align:center; font-size:11px; }
        @page { size:A4; margin:12mm; }
        @media print { body { padding:0; background:#fff; print-color-adjust:exact; -webkit-print-color-adjust:exact; } .report { max-width:none; min-height:0; border:1px solid #334155; } }
        @media (max-width:480px) { body { padding:8px; } .report { padding:16px; } .metadata { grid-template-columns:1fr; } }
      </style>
    </head>
    <body>
      <main class="report">
        <header class="brand">
          ${logo}
          <div><h1>${tuitionName}</h1><div class="subtitle">Academic Performance Report</div></div>
        </header>
        <h2>STUDENT REPORT CARD</h2>
        <h3 class="test-name">${escapeHtml(reportTitle)}</h3>
        <section class="metadata">
          <div><span class="label">Student:</span><span>${escapeHtml(student.studentName)}</span></div>
          <div><span class="label">Student ID:</span><span>${escapeHtml(student.studentId)}</span></div>
          <div><span class="label">Batch:</span><span>${escapeHtml(student.batch || '—')}</span></div>
          <div><span class="label">${allMode ? 'Tests Evaluated:' : 'Test Date:'}</span><span>${allMode ? result.evaluatedTests : exam.date ? escapeHtml(formatDate(exam.date)) : '—'}</span></div>
        </section>
        <section class="score">
          <div class="score-value">${result.score} / ${totalPossible}</div>
          <div class="score-caption">${result.percentage}%</div>
          <div class="grade">Grade ${result.grade}</div>
          ${allMode ? `<div class="score-caption">Overall Class Rank: #${classRank}</div>` : ''}
        </section>
        <section class="class-stats">
          <div class="stat">Class Average<strong>${classAverage}%</strong></div>
          <div class="stat">Class Highest<strong>${classHighest}%</strong></div>
        </section>
        <footer class="footer">Generated by ${tuitionName} · ${escapeHtml(formatDate(todayISO()))}</footer>
      </main>
    </body>
    </html>`);
  reportWindow.document.close();
  reportWindow.setTimeout(() => {
    reportWindow.focus();
    reportWindow.print();
  }, 300);
}

function openExamResultsQueue(exam) {
  const students = STATE.students.filter(student =>
    student.status === 'Active' && String(student.batch) === String(exam.batch)
  );
  const queue = getEvaluatedStudents(exam, students)
    .filter(result => String(result.student.phone || '').replace(/[^0-9]/g, '').length >= 7)
    .map(result => ({
      student: result.student,
      message: formatExamResultMessage(result.student, exam, result)
    }));

  if (queue.length === 0) {
    showToast('info', 'No evaluated students with parent phone numbers are available for this test.');
    return;
  }

  let nextIndex = 0;
  const html = `
    <div class="modal-header">
      <h3>Broadcast Marks to All Parents</h3>
      <button class="icon-btn" data-modal-close><i data-lucide="x" class="icon"></i></button>
    </div>
    <div class="modal-body">
      <p>Sequential WhatsApp queue for <strong>${escapeHtml(exam.testName)}</strong>. Review and send each message in WhatsApp before opening the next one.</p>
      <div id="exam-results-queue-status" role="status" aria-live="polite">Ready: ${queue.length} evaluated student${queue.length === 1 ? '' : 's'} with parent phone numbers.</div>
      <div class="table-wrap exam-queue-table">
        <table>
          <thead><tr><th>Student</th><th>Parent Phone</th><th>Queue Status</th></tr></thead>
          <tbody>${queue.map(item => `
            <tr>
              <td>${escapeHtml(item.student.studentName)}</td>
              <td>${escapeHtml(item.student.phone)}</td>
              <td class="exam-queue-item-status">Waiting</td>
            </tr>
          `).join('')}</tbody>
        </table>
      </div>
    </div>
    <div class="modal-footer exam-queue-footer">
      <button class="btn btn-outline" data-modal-close>Close Queue</button>
      <button class="btn btn-primary" id="exam-queue-next-btn"><i data-lucide="message-circle" class="icon"></i> Open First Message</button>
    </div>
  `;
  const { overlay } = ModalManager.open(html);
  const nextBtn = $('#exam-queue-next-btn', overlay);
  const status = $('#exam-results-queue-status', overlay);
  const rowStatuses = $all('.exam-queue-item-status', overlay);
  nextBtn.onclick = () => {
    const item = queue[nextIndex];
    if (!item) return;
    const whatsappUrl = `https://wa.me/${String(item.student.phone).replace(/[^0-9]/g, '')}?text=${encodeURIComponent(item.message)}`;
    const messageWindow = window.open(whatsappUrl, '_blank');
    if (!messageWindow) {
      status.textContent = 'The WhatsApp window was blocked. Allow pop-ups and retry this message.';
      return;
    }
    rowStatuses[nextIndex].textContent = 'Opened';
    nextIndex++;
    if (nextIndex < queue.length) {
      status.textContent = `Opened ${nextIndex} of ${queue.length}. Send or review the WhatsApp message, then continue.`;
      nextBtn.innerHTML = '<i data-lucide="message-circle" class="icon"></i> Open Next Message';
    } else {
      status.textContent = `Queue complete: all ${queue.length} messages opened.`;
      nextBtn.disabled = true;
      nextBtn.textContent = 'Queue Complete';
    }
    if (window.lucide) lucide.createIcons();
  };
  if (window.lucide) lucide.createIcons();
}

function openCreateExamModal() {
  const batches = Array.from(new Set(STATE.students.map(s => s.batch).filter(Boolean)));
  const subjects = getScheduleSubjects();
  const html = `
    <div class="modal-header">
      <h3>Create New Exam / Evaluation</h3>
      <button class="icon-btn" data-modal-close><i data-lucide="x" class="icon"></i></button>
    </div>
    <form id="create-exam-form" class="modal-body">
      <div class="form-row">
        <label for="em-subject">Subject Name</label>
        <select id="em-subject" required>
          ${subjects.map(subject => `<option value="${escapeHtml(subject)}">${escapeHtml(subject)}</option>`).join('')}
          <option value="OTHER">Other / Custom Subject</option>
        </select>
      </div>
      <div class="form-row" id="custom-subject-row" style="display: none;">
        <label for="em-custom-subject">Custom Subject Name</label>
        <input type="text" id="em-custom-subject" placeholder="Enter subject name">
      </div>
      <div class="form-row">
        <label for="em-chapter">Title / Chapter</label>
        <input type="text" id="em-chapter" placeholder="e.g. Unit Test 1 or Chapter 3: Fractions" required>
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
  const subjectSelect = $('#em-subject', overlay);
  const customSubjectRow = $('#custom-subject-row', overlay);
  const customSubjectInput = $('#em-custom-subject', overlay);
  subjectSelect.onchange = () => {
    const showCustomSubject = subjectSelect.value === 'OTHER';
    customSubjectRow.style.display = showCustomSubject ? 'flex' : 'none';
    customSubjectInput.required = showCustomSubject;
    if (showCustomSubject) customSubjectInput.focus();
    else customSubjectInput.value = '';
  };
  subjectSelect.onchange();
  if (window.lucide) lucide.createIcons();

  saveBtn.onclick = async () => {
    const subject = subjectSelect.value === 'OTHER'
      ? customSubjectInput.value.trim()
      : subjectSelect.value.trim();
    const chapter = $('#em-chapter', overlay).value.trim();
    const batch = $('#em-batch', overlay).value;
    const totalMarks = Number($('#em-total-marks', overlay).value) || 50;
    const date = $('#em-date', overlay).value;

    if (!subject) { showToast('warning', 'Subject name is required'); return; }
    if (!chapter) { showToast('warning', 'Title or chapter is required'); return; }
    if (!Number.isFinite(totalMarks) || totalMarks <= 0) { showToast('warning', 'Total marks must be greater than zero.'); return; }

    const examObj = {
      id: uid(),
      subject,
      chapter,
      testTitle: chapter,
      testName: `${subject} — ${chapter}`,
      batch,
      totalMarks,
      date
    };

    STATE.exams.unshift(examObj);
    saveStorage(LS_KEYS.EXAMS, STATE.exams);
    examState.subjectFilter = '';
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

function getScheduleSubjects() {
  return Array.from(new Set((Array.isArray(STATE.schedule) ? STATE.schedule : [])
    .map(item => String(item.subject || '').trim())
    .filter(Boolean)))
    .sort((a, b) => a.localeCompare(b));
}

function getExamSubjects() {
  return Array.from(new Set([
    ...getScheduleSubjects(),
    ...(Array.isArray(STATE.exams) ? STATE.exams : [])
      .map(exam => String(exam.subject || '').trim())
      .filter(Boolean)
  ])).sort((a, b) => a.localeCompare(b));
}

function getExamDisplayTitle(exam) {
  const subject = String(exam.subject || '').trim();
  const chapter = String(exam.chapter || exam.testTitle || '').trim();
  return subject && chapter ? `${subject} — ${chapter}` : String(exam.testName || chapter || subject || 'Untitled Test');
}
