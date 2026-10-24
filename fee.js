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
    const feeMatch = STATE.fees.find(f =>
      String(f.studentId) === String(s.studentId) &&
      String(f.month || '').trim().toLowerCase() === feeState.month.trim().toLowerCase()
    );
    const amountPaid = feeMatch ? Number(feeMatch.amount) || 0 : 0;
    const status = feeMatch && String(feeMatch.status || '').trim().toLowerCase() === 'paid' ? 'Paid' : 'Pending';
    const expectedAmount = Number(s.monthlyFee) || 1000;

    if (status === 'Paid') totalCollected += amountPaid;
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
      <div class="table-wrap fee-management-table">
        <table>
          <thead>
            <tr>
              <th class="fee-col-id">ID</th>
              <th class="fee-col-name">Student Name</th>
              <th class="fee-col-batch">Batch</th>
              <th class="fee-col-amount">Monthly Fee</th>
              <th class="fee-col-status">Status</th>
              <th class="fee-col-date">Date Paid</th>
              <th class="fee-col-actions" style="text-align:right">Actions</th>
            </tr>
          </thead>
          <tbody>
            ${records.map(r => `
              <tr>
                <td class="fee-col-id"><span style="font-weight:700;color:var(--primary)">${escapeHtml(r.student.studentId)}</span></td>
                <td class="fee-col-name">
                  <div style="font-weight:700">${escapeHtml(r.student.studentName)}</div>
                  <div class="fee-parent-summary" style="font-size:12px;color:var(--text-secondary)">Parent: ${escapeHtml(r.student.parentName || '—')}</div>
                  <button class="btn btn-outline btn-sm fee-mobile-details-btn" data-id="${escapeHtml(r.student.studentId)}">Info</button>
                </td>
                <td class="fee-col-batch"><span class="badge badge-blue">${escapeHtml(r.student.batch)}</span></td>
                <td class="fee-col-amount" style="font-weight:700">${formatCurrency(r.status === 'Paid' ? r.amountPaid : r.expectedAmount)}</td>
                <td class="fee-col-status">
                  <span class="badge ${r.status === 'Paid' ? 'badge-green' : 'badge-red'}">${escapeHtml(r.status)}</span>
                </td>
                <td class="fee-col-date" style="font-size:13px">${r.datePaid ? formatDate(r.datePaid) : '—'}</td>
                <td class="fee-col-actions" style="text-align:right">
                  <div style="display:inline-flex;gap:6px">
                    <button class="btn btn-sm ${r.status === 'Paid' ? 'btn-outline' : 'btn-success'} collect-single-btn" data-id="${escapeHtml(r.student.studentId)}">
                      ${r.status === 'Paid' ? 'Mark Paid' : 'Collect Fee'}
                    </button>
                    ${r.status === 'Paid' ? `
                      <button class="icon-btn generate-receipt-btn" data-id="${escapeHtml(r.student.studentId)}" title="Print / Save Receipt">
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
      const feeRecord = STATE.fees.find(f => f.studentId === btn.dataset.id && f.month === feeState.month);
      if (student) openFeeReceiptPrint(student, feeRecord ? feeRecord.amount : student.monthlyFee, feeState.month, feeRecord);
    };
  });

  $all('.fee-mobile-details-btn').forEach(btn => {
    btn.onclick = () => openFeeStudentDetails(btn.dataset.id);
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

function openFeeStudentDetails(studentId) {
  const student = STATE.students.find(s => String(s.studentId) === String(studentId));
  if (!student) return;
  const history = STATE.fees
    .filter(record => String(record.studentId) === String(studentId))
    .sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));
  const currentPayment = history.find(record =>
    String(record.month || '').trim().toLowerCase() === feeState.month.trim().toLowerCase()
  );
  const historyHtml = history.length
    ? history.map(record => `
        <div style="display:flex;justify-content:space-between;gap:12px;padding:8px 0;border-bottom:1px solid var(--border)">
          <span>${escapeHtml(record.month || '—')} · ${record.date ? formatDate(record.date) : '—'} · ${escapeHtml(record.paymentMode || 'Cash')}</span>
          <strong>${formatCurrency(Number(record.amount) || 0)}</strong>
        </div>
      `).join('')
    : '<div style="color:var(--text-secondary)">No payment history recorded.</div>';
  const html = `
    <div class="modal-header">
      <h3>Fee Details</h3>
      <button class="icon-btn" data-modal-close><i data-lucide="x" class="icon"></i></button>
    </div>
    <div class="modal-body">
      <h4>${escapeHtml(student.studentName)} <span style="font-weight:400;color:var(--text-secondary)">(${escapeHtml(student.studentId)})</span></h4>
      <div><strong>Batch:</strong> ${escapeHtml(student.batch || '—')}</div>
      <div><strong>Parent Contact:</strong> ${escapeHtml(student.parentName || '—')} · ${escapeHtml(student.phone || '—')}</div>
      <div><strong>Fee Status (${escapeHtml(feeState.month)}):</strong> <span class="badge ${currentPayment && currentPayment.status === 'Paid' ? 'badge-green' : 'badge-red'}">${currentPayment && currentPayment.status === 'Paid' ? 'Paid' : 'Pending'}</span></div>
      <div><strong>Date Paid:</strong> ${currentPayment && currentPayment.date ? formatDate(currentPayment.date) : '—'}</div>
      <div>
        <strong>Payment History</strong>
        <div style="max-height:240px;overflow-y:auto;margin-top:6px">${historyHtml}</div>
      </div>
    </div>
    <div class="modal-footer" style="flex-wrap:wrap">
      <button class="btn btn-outline" data-modal-close>Close</button>
      <button class="btn btn-outline" id="fee-detail-reminder-btn"><i data-lucide="message-square" class="icon"></i> WhatsApp Reminder</button>
      <button class="btn btn-primary" id="fee-detail-collect-btn"><i data-lucide="wallet" class="icon"></i> Collect Fee</button>
    </div>
  `;
  const { overlay, close } = ModalManager.open(html);
  const reminderBtn = $('#fee-detail-reminder-btn', overlay);
  if (reminderBtn) reminderBtn.onclick = () => sendFeeReminder(student, Number(student.monthlyFee) || 1000);
  const collectBtn = $('#fee-detail-collect-btn', overlay);
  if (collectBtn) collectBtn.onclick = () => {
    close();
    openPaymentModal(student);
  };
  if (window.lucide) lucide.createIcons();
}

function sendFeeReminder(student, amount) {
  const tpl = (STATE.settings.whatsappTemplates && STATE.settings.whatsappTemplates.feeReminder)
    || 'Dear Parent, gentle reminder that tuition fee for {studentName} for the month of {date} ({amount}) is pending. Kindly clear the dues at your earliest convenience. Thank you - {centerName}';
  const msg = formatMessageTemplate ? formatMessageTemplate(tpl, {
    studentName: student.studentName,
    amount: formatCurrency(amount),
    date: feeState.month,
    centerName: STATE.settings.tuitionName || 'Tuition Center'
  }) : tpl;
  openWhatsApp(student.phone, msg);
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

    if (window.apiRequest && (!window.getGoogleSheetsUrl || window.getGoogleSheetsUrl())) {
      try {
        const result = await window.apiRequest('saveFee', { record });
        if (!result || result.success === false) {
          throw new Error('Google Sheets did not confirm the fee payment save.');
        }
      } catch (e) {
        console.error('Google Sheets fee payment save failed:', e);
        showToast('warning', 'Saved locally, but Google Sheets sync failed');
      }
    }

    /* Show success state in modal with print/save receipt option */
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
                <i data-lucide="printer" class="icon"></i> Print / Save Receipt
          </button>
        </div>
      `;
      if (window.lucide) lucide.createIcons();
      modalBox.querySelectorAll('[data-modal-close]').forEach(b => b.onclick = close);

      const dlBtn = $('#download-receipt-modal-btn', modalBox);
      if (dlBtn) {
        dlBtn.onclick = () => {
          openFeeReceiptPrint(stObj, amount, month, record);
        };
      }
    } else {
      close();
    }
  };
}

function openFeeReceiptPrint(student, amount, month, payment = {}) {
  const settings = STATE.settings || {};
  const receiptPrefix = (settings.receiptSettings && settings.receiptSettings.prefix) || settings.receiptPrefix || 'REC-';
  const receiptNo = receiptPrefix + Math.floor(100000 + Math.random() * 900000);
  const paymentDate = payment.date ? formatDate(payment.date) : formatDate(todayISO());
  const safeStudentName = escapeHtml(student.studentName || '');
  const safeStudentId = escapeHtml(student.studentId || '');
  const safeBatch = escapeHtml(student.batch || '—');
  const safeMonth = escapeHtml(month || '');
  const safeParent = escapeHtml(student.parentName || '—');
  const safeReceiptNo = escapeHtml(receiptNo);
  const safePaymentDate = escapeHtml(paymentDate);
  const safePaymentMode = escapeHtml(payment.paymentMode || 'Cash');
  const safeAmount = escapeHtml(formatCurrency(amount));
  const safeDescription = escapeHtml(`Tuition Fee - ${month || ''}`);
  const safeFilename = `receipt_${String(student.studentId || 'student').replace(/[^a-zA-Z0-9_-]/g, '_')}_${receiptNo}`;
  const printWindow = window.open('', '_blank');

  if (!printWindow) {
    showToast('warning', 'Please allow pop-ups to print or save the receipt');
    return;
  }

  printWindow.document.open();
  printWindow.document.write(`<!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Fee Receipt ${safeReceiptNo}</title>
      <style>
        * { box-sizing: border-box; }
        body { margin: 0; padding: 24px; color: #111827; font: 13px Arial, sans-serif; }
        .receipt { width: 100%; max-width: 148mm; margin: 0 auto; border: 1px solid #334155; padding: 18px; }
        .institute { margin: 0 0 14px; text-align: center; font-size: 20px; font-weight: 700; }
        .title { margin: 0 0 16px; padding: 9px; background: #334155; color: #fff; text-align: center; font-size: 15px; letter-spacing: 1px; }
        .details { display: grid; grid-template-columns: 1fr 1fr; gap: 10px 20px; padding: 12px; border: 1px solid #64748b; }
        .detail { display: grid; grid-template-columns: minmax(82px, auto) 1fr; gap: 6px; overflow-wrap: anywhere; }
        .label { color: #334155; font-weight: 700; }
        table { width: 100%; margin-top: 18px; border-collapse: collapse; }
        th, td { padding: 9px 10px; border: 1px solid #475569; text-align: left; }
        th { background: #e2e8f0; color: #111827; }
        .amount { text-align: right; }
        .total td { background: #f1f5f9; font-weight: 700; }
        .payment-mode { margin-top: 16px; padding: 10px; border: 1px solid #64748b; }
        .footer { margin-top: 24px; text-align: center; }
        .footer p { margin: 5px 0; }
        @media print {
          @page { size: auto; margin: 10mm; }
          body { padding: 0; print-color-adjust: exact; -webkit-print-color-adjust: exact; }
          .receipt { max-width: 100%; break-inside: avoid; }
        }
        @media (max-width: 480px) {
          body { padding: 10px; }
          .receipt { padding: 12px; }
          .details { grid-template-columns: 1fr; }
        }
      </style>
    </head>
    <body>
      <main class="receipt">
        <h1 class="institute">Tution Hub</h1>
        <h2 class="title">FEE RECEIPT</h2>
        <section class="details">
          <div class="detail"><span class="label">Receipt No</span><span>${safeReceiptNo}</span></div>
          <div class="detail"><span class="label">Payment Date</span><span>${safePaymentDate}</span></div>
          <div class="detail"><span class="label">Student ID</span><span>${safeStudentId}</span></div>
          <div class="detail"><span class="label">Fee Month</span><span>${safeMonth}</span></div>
          <div class="detail"><span class="label">Student Name</span><span>${safeStudentName}</span></div>
          <div class="detail"><span class="label">Parent</span><span>${safeParent}</span></div>
          <div class="detail"><span class="label">Batch / Class</span><span>${safeBatch}</span></div>
        </section>
        <table>
          <thead>
            <tr><th>Sl.No</th><th>Description</th><th class="amount">Amount Paid</th></tr>
          </thead>
          <tbody>
            <tr><td>1</td><td>${safeDescription}</td><td class="amount">${safeAmount}</td></tr>
            <tr class="total"><td colspan="2">Total</td><td class="amount">${safeAmount}</td></tr>
          </tbody>
        </table>
        <div class="payment-mode"><span class="label">Payment Mode:</span> ${safePaymentMode}</div>
        <footer class="footer">
          <p><strong>Thank you for your payment!</strong></p>
          <p>This is a computer-generated receipt.</p>
        </footer>
      </main>
    </body>
    </html>`);
  printWindow.document.close();
  printWindow.document.title = safeFilename;
  printWindow.setTimeout(() => {
    printWindow.focus();
    printWindow.print();
  }, 250);
}
