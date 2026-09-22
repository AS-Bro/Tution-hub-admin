/* ==========================================================================
   TuitionHub — Fee Management Script (fee.js)
   ========================================================================== */

let feeState = {
  month: new Date().toLocaleString('default', { month: 'long', year: 'numeric' }),
  batch: '',
  statusFilter: ''
};

document.addEventListener('DOMContentLoaded', () => {
  injectShellLayout('fee', 'Fee Management');
  renderFeesPage();
});

window.onSyncComplete = function () {
  renderFeesPage();
};

function renderFeesPage() {
  const container = $('#page-content');
  if (!container) return;

  const batches = Array.from(new Set(STATE.students.map(s => s.batch).filter(Boolean)));

  let filteredStudents = STATE.students.filter(s => {
    return s.status === 'Active' && (!feeState.batch || s.batch === feeState.batch);
  });

  /* Map fee status per student for selected month */
  let totalCollected = 0;
  let totalPending = 0;

  let records = filteredStudents.map(s => {
    const feeMatch = STATE.fees.find(f => f.studentId === s.studentId && f.month === feeState.month);
    const status = feeMatch ? feeMatch.status : 'Pending';
    const amountPaid = feeMatch ? Number(feeMatch.amount) : 0;
    const expectedAmount = Number(s.monthlyFee) || 1000;

    if (status === 'Paid') totalCollected += expectedAmount;
    else totalPending += expectedAmount;

    return {
      student: s,
      status,
      amountPaid,
      expectedAmount,
      datePaid: feeMatch ? feeMatch.date : null,
      paymentMode: feeMatch ? feeMatch.paymentMode : 'Cash'
    };
  });

  if (feeState.statusFilter) {
    records = records.filter(r => r.status === feeState.statusFilter);
  }

  container.innerHTML = `
    <div class="section-head">
      <div>
        <h2>Fee Collection & Dues Tracker</h2>
        <div class="section-sub">Period: <strong>${escapeHtml(feeState.month)}</strong></div>
      </div>
      <div style="display:flex;gap:10px">
        <button class="btn btn-outline btn-sm" id="send-fee-reminders-btn">
          <i data-lucide="bell" class="icon" style="color:var(--danger)"></i> WhatsApp Fee Reminders
        </button>
        <button class="btn btn-primary btn-sm" id="record-payment-btn">
          <i data-lucide="plus-circle" class="icon"></i> Collect Fee Payment
        </button>
      </div>
    </div>

    <!-- METRICS SUMMARY -->
    <div class="stat-grid" style="grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));margin-bottom:20px">
      <div class="card stat-card">
        <div class="stat-top">
          <span class="stat-title">Collected (${escapeHtml(feeState.month)})</span>
          <div class="stat-icon" style="background:var(--success-light);color:var(--success)"><i data-lucide="check-circle" class="icon"></i></div>
        </div>
        <div class="stat-value" style="color:var(--success)">${formatCurrency(totalCollected)}</div>
      </div>

      <div class="card stat-card">
        <div class="stat-top">
          <span class="stat-title">Pending Dues</span>
          <div class="stat-icon" style="background:var(--danger-light);color:var(--danger)"><i data-lucide="alert-circle" class="icon"></i></div>
        </div>
        <div class="stat-value" style="color:var(--danger)">${formatCurrency(totalPending)}</div>
      </div>
    </div>

    <!-- TOOLBAR -->
    <div class="toolbar">
      <div class="form-row" style="width:220px">
        <input type="text" id="fee-month-input" value="${escapeHtml(feeState.month)}" placeholder="e.g. August 2026">
      </div>
      <select class="select-filter" id="fee-batch-filter">
        <option value="">All Batches</option>
        ${batches.map(b => `<option value="${escapeHtml(b)}" ${feeState.batch === b ? 'selected' : ''}>${escapeHtml(b)}</option>`).join('')}
      </select>
      <select class="select-filter" id="fee-status-filter">
        <option value="">All Statuses</option>
        <option value="Paid" ${feeState.statusFilter === 'Paid' ? 'selected' : ''}>Paid Only</option>
        <option value="Pending" ${feeState.statusFilter === 'Pending' ? 'selected' : ''}>Pending Only</option>
      </select>
    </div>

    <!-- FEE TABLE -->
    ${records.length === 0 ? `
      <div class="card empty-state">
        <div class="emoji">💳</div>
        <h4>No fee records found</h4>
        <p>Try changing your month or batch filters.</p>
      </div>
    ` : `
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Student Name</th>
              <th>Batch</th>
              <th>Monthly Fee</th>
              <th>Status</th>
              <th>Date Paid</th>
              <th style="text-align:right">Actions</th>
            </tr>
          </thead>
          <tbody>
            ${records.map(r => `
              <tr>
                <td><span style="font-weight:700;color:var(--primary)">${escapeHtml(r.student.studentId)}</span></td>
                <td>
                  <div style="font-weight:700">${escapeHtml(r.student.studentName)}</div>
                  <div style="font-size:12px;color:var(--text-secondary)">Parent: ${escapeHtml(r.student.parentName || '—')}</div>
                </td>
                <td><span class="badge badge-blue">${escapeHtml(r.student.batch)}</span></td>
                <td style="font-weight:700">${formatCurrency(r.expectedAmount)}</td>
                <td>
                  <span class="badge ${r.status === 'Paid' ? 'badge-green' : 'badge-red'}">${escapeHtml(r.status)}</span>
                </td>
                <td style="font-size:13px">${r.datePaid ? formatDate(r.datePaid) : '—'}</td>
                <td style="text-align:right">
                  <div style="display:inline-flex;gap:6px">
                    <button class="btn btn-sm ${r.status === 'Paid' ? 'btn-outline' : 'btn-success'} collect-single-btn" data-id="${escapeHtml(r.student.studentId)}">
                      ${r.status === 'Paid' ? 'Mark Paid' : 'Collect Fee'}
                    </button>
                    ${r.status === 'Paid' ? `
                      <button class="icon-btn generate-receipt-btn" data-id="${escapeHtml(r.student.studentId)}" title="Download Receipt">
                        <i data-lucide="receipt" class="icon"></i>
                      </button>
                    ` : `
                      <button class="icon-btn fee-remind-wa-btn" data-phone="${escapeHtml(r.student.phone || '')}" data-name="${escapeHtml(r.student.studentName)}" data-fee="${r.expectedAmount}" title="Send Reminder">
                        <i data-lucide="message-square" class="icon" style="color:var(--danger)"></i>
                      </button>
                    `}
                  </div>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `}
  `;

  if (window.lucide) lucide.createIcons();
  bindFeeEvents();
}

function bindFeeEvents() {
  const monthInput = $('#fee-month-input');
  if (monthInput) {
    monthInput.onchange = (e) => {
      feeState.month = e.target.value.trim();
      renderFeesPage();
    };
  }

  const batchFilter = $('#fee-batch-filter');
  if (batchFilter) {
    batchFilter.onchange = (e) => {
      feeState.batch = e.target.value;
      renderFeesPage();
    };
  }

  const statusFilter = $('#fee-status-filter');
  if (statusFilter) {
    statusFilter.onchange = (e) => {
      feeState.statusFilter = e.target.value;
      renderFeesPage();
    };
  }

  const collectBtn = $('#record-payment-btn');
  if (collectBtn) collectBtn.onclick = () => openPaymentModal();

  $all('.collect-single-btn').forEach(btn => {
    btn.onclick = () => {
      const student = STATE.students.find(s => s.studentId === btn.dataset.id);
      openPaymentModal(student);
    };
  });

  $all('.generate-receipt-btn').forEach(btn => {
    btn.onclick = () => {
      const student = STATE.students.find(s => s.studentId === btn.dataset.id);
      generateFeeReceiptPDF(student, student.monthlyFee, feeState.month);
    };
  });

  $all('.fee-remind-wa-btn').forEach(btn => {
    btn.onclick = () => {
      const tpl = (STATE.settings.whatsappTemplates && STATE.settings.whatsappTemplates.feeReminder)
        || 'Dear Parent, gentle reminder that tuition fee for {studentName} for the month of {date} ({amount}) is pending. Kindly clear the dues at your earliest convenience. Thank you - {centerName}';
      const msg = formatMessageTemplate ? formatMessageTemplate(tpl, {
        studentName: btn.dataset.name,
        amount: formatCurrency(btn.dataset.fee),
        date: feeState.month,
        centerName: STATE.settings.tuitionName || 'Tuition Center'
      }) : tpl;
      openWhatsApp(btn.dataset.phone, msg);
    };
  });
}

function openPaymentModal(student = null) {
  const html = `
    <div class="modal-header">
      <h3>Record Fee Payment</h3>
      <button class="icon-btn" data-modal-close><i data-lucide="x" class="icon"></i></button>
    </div>
    <form id="fee-modal-form" class="modal-body">
      <div class="form-row">
        <label>Select Student</label>
        <select id="fm-student-id" required>
          ${STATE.students.map(s => `<option value="${escapeHtml(s.studentId)}" ${student && student.studentId === s.studentId ? 'selected' : ''}>${escapeHtml(s.studentName)} (${escapeHtml(s.studentId)} - ${escapeHtml(s.batch)})</option>`).join('')}
        </select>
      </div>

      <div class="form-grid-2">
        <div class="form-row">
          <label>Fee Month</label>
          <input type="text" id="fm-month" value="${escapeHtml(feeState.month)}" placeholder="e.g. August 2026" required>
        </div>
        <div class="form-row">
          <label>Amount Paid (${STATE.settings.currency || '₹'})</label>
          <input type="number" id="fm-amount" value="${student ? student.monthlyFee : 1000}" required>
        </div>
      </div>

      <div class="form-grid-2">
        <div class="form-row">
          <label>Payment Date</label>
          <input type="date" id="fm-date" value="${todayISO()}">
        </div>
        <div class="form-row">
          <label>Payment Method</label>
          <select id="fm-mode">
            <option value="Cash">Cash</option>
            <option value="UPI / Online">UPI / Online Transfer</option>
            <option value="Bank Transfer">Bank Transfer</option>
            <option value="Cheque">Cheque</option>
          </select>
        </div>
      </div>
    </form>
    <div class="modal-footer">
      <button class="btn btn-outline" data-modal-close>Cancel</button>
      <button class="btn btn-primary" id="save-fee-modal-btn">Record Payment</button>
    </div>
  `;

  const { overlay, close } = ModalManager.open(html);

  const studentSelect = $('#fm-student-id', overlay);
  if (studentSelect) {
    studentSelect.onchange = (e) => {
      const selected = STATE.students.find(s => s.studentId === e.target.value);
      if (selected && selected.monthlyFee) {
        const amtInput = $('#fm-amount', overlay);
        if (amtInput) amtInput.value = selected.monthlyFee;
      }
    };
  }

  const saveBtn = $('#save-fee-modal-btn', overlay);
  saveBtn.onclick = async () => {
    const studentId = $('#fm-student-id', overlay).value;
    const stObj = STATE.students.find(s => s.studentId === studentId);
    const month = $('#fm-month', overlay).value.trim();
    const amount = Number($('#fm-amount', overlay).value) || 0;
    const date = $('#fm-date', overlay).value;
    const mode = $('#fm-mode', overlay).value;

    if (!studentId || !stObj) {
      showToast('error', 'Please select a valid student');
      return;
    }
    if (!month) {
      showToast('error', 'Please enter fee month');
      return;
    }
    if (amount <= 0) {
      showToast('error', 'Please enter a valid payment amount');
      return;
    }

    const record = {
      id: uid(),
      studentId,
      studentName: stObj ? stObj.studentName : '',
      batch: stObj ? stObj.batch : '',
      month,
      amount,
      date,
      paymentMode: mode,
      status: 'Paid'
    };

    /* Remove previous payment for same student & month if any */
    STATE.fees = STATE.fees.filter(f => !(f.studentId === studentId && f.month === month));
    STATE.fees.push(record);

    saveStorage(LS_KEYS.FEES, STATE.fees);
    showToast('success', 'Fee payment recorded successfully');
    renderFeesPage();

    if (STATE.settings.gasUrl && window.apiRequest) {
      try {
        await window.apiRequest('saveFee', { record });
      } catch (e) {
        showToast('warning', 'Saved locally, but Google Sheets sync failed');
      }
    }

    /* Show success state in modal with Download Receipt option */
    const modalBox = overlay.querySelector('.modal-box');
    if (modalBox) {
      modalBox.innerHTML = `
        <div class="modal-header">
          <h3>Payment Recorded</h3>
          <button class="icon-btn" data-modal-close><i data-lucide="x" class="icon"></i></button>
        </div>
        <div class="modal-body" style="text-align:center;padding:32px 24px;display:flex;flex-direction:column;align-items:center;gap:12px;">
          <div style="width:56px;height:56px;border-radius:50%;background:var(--success-light);color:var(--success);display:flex;align-items:center;justify-content:center;">
            <i data-lucide="check" style="width:32px;height:32px"></i>
          </div>
          <h4 style="font-size:18px;font-family:'Poppins',sans-serif;margin:0;color:var(--text)">✓ Payment Recorded Successfully</h4>
          <p style="color:var(--text-secondary);font-size:14px;margin:0;max-width:360px">
            Payment of <strong>${formatCurrency(amount)}</strong> for <strong>${escapeHtml(stObj.studentName)}</strong> (${escapeHtml(month)}) has been saved.
          </p>
        </div>
        <div class="modal-footer" style="justify-content:space-between">
          <button class="btn btn-outline" data-modal-close>Close</button>
          <button class="btn btn-primary" id="download-receipt-modal-btn">
            <i data-lucide="download" class="icon"></i> Download Receipt
          </button>
        </div>
      `;
      if (window.lucide) lucide.createIcons();
      modalBox.querySelectorAll('[data-modal-close]').forEach(b => b.onclick = close);

      const dlBtn = $('#download-receipt-modal-btn', modalBox);
      if (dlBtn) {
        dlBtn.onclick = () => {
          generateFeeReceiptPDF(stObj, amount, month);
        };
      }
    } else {
      close();
    }
  };
}

function generateFeeReceiptPDF(student, amount, month) {
  if (!window.jspdf) { showToast('error', 'PDF library loading...'); return; }
  try {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a5' });
    const s = STATE.settings;
    const rec = (s && s.receiptSettings) || {};
    const receiptPrefix = rec.prefix || s.receiptPrefix || 'REC-';
    const receiptTitle = rec.title || 'FEE PAYMENT RECEIPT';
    const receiptFooter = rec.footerMessage || 'Thank you for your payment!';
    const showLogo = rec.showLogo !== false;
    const showStudentId = rec.showStudentId !== false;
    const showParentDetails = rec.showParentDetails !== false;
    const showPaymentDate = rec.showPaymentDate !== false;
    const receiptNo = receiptPrefix + Math.floor(100000 + Math.random() * 900000);

    doc.setFillColor(37, 99, 235);
    doc.rect(0, 0, 148, 18, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text(s.tuitionName || 'Tuition Center', 12, 12);

    if (showLogo && s.logoUrl && s.logoUrl.startsWith('data:image/')) {
      try {
        const format = s.logoUrl.includes('png') ? 'PNG' : 'JPEG';
        doc.addImage(s.logoUrl, format, 115, 2, 22, 14);
      } catch (e) { }
    }

    doc.setTextColor(17, 24, 39);
    doc.setFontSize(16);
    doc.text(receiptTitle, 12, 32);

    doc.setFontSize(9); doc.setTextColor(107, 114, 128);
    doc.text(`Receipt No: ${receiptNo}`, 12, 40);
    if (showPaymentDate) {
      doc.text(`Date: ${new Date().toLocaleDateString()}`, 12, 45);
    }

    doc.setFillColor(248, 250, 252);
    doc.roundedRect(12, 52, 124, 45, 2, 2, 'F');

    let yPos = 60;
    doc.setFont('helvetica', 'bold'); doc.setTextColor(107, 114, 128);
    if (showStudentId) { doc.text('Student ID:', 16, yPos); }
    doc.text('Student Name:', 16, showStudentId ? yPos + 8 : yPos);
    doc.text('Batch:', 16, showStudentId ? yPos + 16 : yPos + 8);
    doc.text('For Month:', 16, showStudentId ? yPos + 24 : yPos + 16);

    doc.setTextColor(17, 24, 39);
    if (showStudentId) { doc.text(student.studentId || '', 56, yPos); }
    doc.text(student.studentName || '', 56, showStudentId ? yPos + 8 : yPos);
    doc.text(student.batch || '—', 56, showStudentId ? yPos + 16 : yPos + 8);
    doc.text(month || 'Current Month', 56, showStudentId ? yPos + 24 : yPos + 16);

    if (showParentDetails && student.parentName) {
      doc.setTextColor(107, 114, 128);
      doc.setFontSize(8);
      doc.text('Parent: ' + student.parentName, 16, 100);
      if (student.phone) doc.text('Contact: ' + student.phone, 16, 104);
    }

    doc.setFillColor(236, 253, 245);
    doc.roundedRect(12, 108, 124, 20, 2, 2, 'F');
    doc.setFontSize(12); doc.setTextColor(16, 185, 129);
    doc.text('Amount Paid:', 16, 121);
    doc.setFontSize(14);
    doc.text(formatCurrency(amount), 80, 121);

    doc.setFontSize(8); doc.setTextColor(156, 163, 175);
    doc.text(receiptFooter, 12, 140);

    triggerPdfDownload(doc, `receipt_${student.studentId}_${receiptNo}.pdf`);
  } catch (e) {
    showToast('error', 'Failed to generate receipt PDF');
  }
}
