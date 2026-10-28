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
  normalizeFeeLedgerState();
  renderFeesPage();
};

function renderFeesPage() {
  const container = $('#page-content');
  if (!container) return;

  normalizeFeeLedgerState();
  const batches = Array.from(new Set(STATE.students.map(s => s.batch).filter(Boolean)));
  const monthOptions = getFeeMonthOptions();

  let filteredStudents = STATE.students.filter(s => {
    return s.status === 'Active' && (!feeState.batch || s.batch === feeState.batch);
  });

  /* Include recorded unpaid balances from earlier fee periods in this month's dues. */
  let totalCollected = 0;
  let totalDue = 0;

  let records = filteredStudents.map(student => {
    const record = getStudentFeeSummary(student, feeState.month);
    totalCollected += record.amountPaid;
    totalDue += record.amountDue;
    return record;
  });
  const totalBalance = records.reduce((sum, record) => sum + record.balanceDue, 0);
  const collectionPercent = totalDue > 0 ? Math.min(100, Math.round(totalCollected / totalDue * 100)) : 0;

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
        <div class="fee-progress-track" role="progressbar" aria-label="Collection progress" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${collectionPercent}">
          <div class="fee-progress-fill" style="width:${collectionPercent}%"></div>
        </div>
        <div class="fee-progress-label">${collectionPercent}% Collected <span>of ${formatCurrency(totalDue)}</span></div>
      </div>

      <div class="card stat-card">
        <div class="stat-top">
          <span class="stat-title">Pending Dues</span>
          <div class="stat-icon" style="background:var(--danger-light);color:var(--danger)"><i data-lucide="alert-circle" class="icon"></i></div>
        </div>
        <div class="stat-value" style="color:var(--danger)">${formatCurrency(totalBalance)}</div>
      </div>
    </div>

    <!-- TOOLBAR -->
    <div class="toolbar">
      <select class="select-filter" id="fee-month-input" aria-label="Fee month">
        ${monthOptions.map(month => `<option value="${escapeHtml(month)}" ${sameFeeMonth(feeState.month, month) ? 'selected' : ''}>${escapeHtml(month)}</option>`).join('')}
      </select>
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
              <th class="fee-col-amount">Total Due</th>
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
                <td class="fee-col-amount" style="font-weight:700">
                  ${formatCurrency(r.amountDue)}
                  ${r.amountPaid > 0 ? `<div style="font-size:11px;color:var(--text-secondary);font-weight:500">Paid: ${formatCurrency(r.amountPaid)}</div>` : ''}
                </td>
                <td class="fee-col-status">
                  <span class="badge ${r.status === 'Paid' ? 'badge-green' : 'badge-red'}">${escapeHtml(r.status)}</span>
                  ${r.feeRecord ? `<span class="fee-payment-mode-tag">${escapeHtml(r.paymentMode)}</span>` : ''}
                </td>
                <td class="fee-col-date" style="font-size:13px">${r.datePaid ? formatDate(r.datePaid) : '—'}</td>
                <td class="fee-col-actions" style="text-align:right">
                  <div style="display:inline-flex;gap:6px">
                    <button class="btn btn-sm ${r.status === 'Paid' ? 'btn-outline' : 'btn-success'} collect-single-btn" data-id="${escapeHtml(r.student.studentId)}">
                      ${r.status === 'Paid' ? '<i data-lucide="message-circle" class="icon"></i> Send WhatsApp Receipt' : 'Collect Fee'}
                    </button>
                    ${r.status === 'Paid' ? `
                      <button class="icon-btn generate-receipt-btn" data-id="${escapeHtml(r.student.studentId)}" title="Print / Save Receipt">
                        <i data-lucide="receipt" class="icon"></i>
                      </button>
                    ` : `
                      <button class="icon-btn fee-remind-wa-btn" data-id="${escapeHtml(r.student.studentId)}" title="Send Reminder">
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

function getFeeMonthOptions() {
  const options = new Map();
  const currentDate = new Date();
  for (let offset = 0; offset < 12; offset++) {
    const monthDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - offset, 1);
    const label = monthDate.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
    options.set(getFeeMonthIndex(label), label);
  }
  getFeeLedgerRecords().forEach(record => {
    const monthIndex = getFeeMonthIndex(record.month);
    if (monthIndex !== null && !options.has(monthIndex)) options.set(monthIndex, String(record.month).trim());
  });
  const selectedIndex = getFeeMonthIndex(feeState.month);
  if (selectedIndex !== null && !options.has(selectedIndex)) options.set(selectedIndex, feeState.month);
  return Array.from(options.entries())
    .sort((a, b) => b[0] - a[0])
    .map(entry => entry[1]);
}

function normalizeFeeLedgerState() {
  STATE.fees = loadStorage(LS_KEYS.FEES, STATE.fees);
  const normalized = getFeeLedgerRecords();
  STATE.fees = normalized;
  saveStorage(LS_KEYS.FEES, normalized);
}

function getFeeLedgerRecords() {
  const ledger = STATE.fees;
  const nestedRecords = ledger && typeof ledger === 'object' && !Array.isArray(ledger)
    ? [ledger.records, ledger.rows, ledger.items, ledger.values, ledger.data].find(value => Array.isArray(value))
    : null;
  const explicitHeaders = ledger && typeof ledger === 'object' && !Array.isArray(ledger)
    ? (Array.isArray(ledger.headers) ? ledger.headers : Array.isArray(ledger.columns) ? ledger.columns : null)
    : null;
  const ledgerFields = ledger && typeof ledger === 'object' && !Array.isArray(ledger)
    ? Object.keys(ledger).map(key => key.toLowerCase().replace(/[^a-z0-9]/g, ''))
    : [];
  const isSingleRecord = ledgerFields.some(key =>
    ['studentid', 'student', 'admissionid', 'admissionnumber', 'studentmonth', 'studentmonthkey',
      'studentperiod', 'studentperiodkey', 'compositekey', 'paymentkey'].includes(key)
  );
  let rowHeaders = explicitHeaders;
  let rowRecords = Array.isArray(ledger) ? ledger : nestedRecords;
  if (rowRecords && rowRecords.length && Array.isArray(rowRecords[0]) && !rowHeaders) {
    const headerNames = rowRecords[0].map(value => String(value || '').toLowerCase().replace(/[^a-z0-9]/g, ''));
    const hasStudent = headerNames.some(value => ['studentid', 'student', 'admissionid', 'admissionnumber'].includes(value));
    const hasPeriod = headerNames.some(value => ['month', 'feemonth', 'paymentmonth', 'period', 'feeperiod', 'monthyear'].includes(value));
    if (hasStudent && hasPeriod) {
      rowHeaders = rowRecords[0];
      rowRecords = rowRecords.slice(1);
    }
  }
  const entries = rowRecords
    ? rowRecords.map(record => [null, Array.isArray(record) && rowHeaders
      ? rowHeaders.reduce((mapped, header, index) => {
        mapped[String(header || `column${index + 1}`)] = record[index];
        return mapped;
      }, {})
      : record])
    : ledger && typeof ledger === 'object' && isSingleRecord
      ? [[null, ledger]]
      : ledger && typeof ledger === 'object'
        ? Object.entries(ledger)
        : [];

  return entries.map(([sourceKey, record]) => {
    if (!record || typeof record !== 'object') return null;
    const fields = Object.keys(record).reduce((map, key) => {
      map[key.toLowerCase().replace(/[^a-z0-9]/g, '')] = record[key];
      return map;
    }, {});
    const getValue = (...names) => {
      for (const name of names) {
        const value = fields[name.toLowerCase().replace(/[^a-z0-9]/g, '')];
        if (value !== undefined && value !== null && value !== '') return value;
      }
      return '';
    };
    const compositeValue = getValue('compositeKey', 'paymentKey', 'ledgerKey', 'studentMonthKey',
      'studentPeriodKey', 'studentMonth', 'studentPeriod', 'key', 'recordKey') || sourceKey || '';
    const composite = parseFeeCompositeKey(compositeValue);
    const studentId = String(getValue('studentId', 'student', 'admissionId', 'admissionNumber') ||
      (composite && composite.studentId) || '').trim();
    const dateValue = getValue('date', 'datePaid', 'paymentDate', 'paidDate', 'transactionDate');
    const month = normalizeFeeMonth(getValue('month', 'feeMonth', 'paymentMonth', 'period',
      'selectedPeriod', 'feePeriod', 'periodKey', 'billingPeriod', 'monthYear') ||
      (composite && composite.month) || dateValue);
    const amountValue = getValue('amount', 'amountPaid', 'paidAmount', 'feeAmountPaid', 'collectedAmount', 'amountCollected', 'paymentAmount') || 0;
    const amount = typeof amountValue === 'number'
      ? amountValue
      : Number(String(amountValue).replace(/[^0-9.-]/g, '')) || 0;
    const rawStatus = String(getValue('status', 'paymentStatus', 'feeStatus')).trim().toLowerCase();
    const status = ['paid', 'complete', 'completed', 'received', 'success', 'successful'].includes(rawStatus)
      ? 'Paid'
      : ['pending', 'partial', 'partially paid', 'unpaid', 'due'].some(value => rawStatus.includes(value))
        ? 'Pending'
        : amount > 0 ? 'Paid' : 'Pending';
    const normalizedDate = normalizeFeeDate(dateValue);

    return studentId && month ? {
      ...record,
      studentId,
      month,
      amount,
      date: normalizedDate,
      paymentMode: getValue('paymentMode', 'mode', 'paymentMethod') || 'Cash',
      status
    } : null;
  }).filter(Boolean);
}

function parseFeeCompositeKey(value) {
  const key = String(value || '').trim();
  const match = key.match(/^(.+?)[_|:](.+)$/);
  if (!match) return null;
  return { studentId: match[1].trim(), month: normalizeFeeMonth(match[2]) };
}

function normalizeFeeDate(value) {
  if (!value) return '';
  if (value instanceof Date && !Number.isNaN(value.getTime())) return dateToISO(value);
  if (typeof value === 'number' && Number.isFinite(value) && value >= 20000 && value <= 80000) {
    const date = new Date(Date.UTC(1899, 11, 30) + value * 86400000);
    return [date.getUTCFullYear(), String(date.getUTCMonth() + 1).padStart(2, '0'),
      String(date.getUTCDate()).padStart(2, '0')].join('-');
  }
  const text = String(value).trim();
  const isoMatch = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (isoMatch) {
    const [, year, month, day] = isoMatch;
    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }
  const slashDate = text.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (slashDate) {
    const first = Number(slashDate[1]), second = Number(slashDate[2]), year = Number(slashDate[3]);
    const month = first > 12 ? second : first;
    const day = first > 12 ? first : second;
    const parsed = new Date(year, month - 1, day);
    if (parsed.getFullYear() === year && parsed.getMonth() === month - 1 && parsed.getDate() === day) return dateToISO(parsed);
  }
  return value;
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
      if (!student) return;
      const summary = getStudentFeeSummary(student, feeState.month);
      if (summary.status === 'Paid' && summary.feeRecord) {
        sendFeeWhatsAppReceipt(student, summary.feeRecord, Number(summary.feeRecord.transactionAmount || summary.amountPaid));
      } else {
        openPaymentModal(student);
      }
    };
  });

  $all('.generate-receipt-btn').forEach(btn => {
    btn.onclick = () => {
      const student = STATE.students.find(s => s.studentId === btn.dataset.id);
      const feeRecord = student ? getStudentFeeSummary(student, feeState.month).feeRecord : null;
      if (student) openFeeReceiptPrint(student, feeRecord ? (feeRecord.transactionAmount || feeRecord.amount) : student.monthlyFee, feeState.month, feeRecord);
    };
  });

  $all('.fee-mobile-details-btn').forEach(btn => {
    btn.onclick = () => openFeeStudentDetails(btn.dataset.id);
  });

  $all('.fee-remind-wa-btn').forEach(btn => {
    btn.onclick = () => {
      const student = STATE.students.find(s => String(s.studentId) === String(btn.dataset.id));
      if (student) sendFeeReminder(student, getStudentFeeSummary(student, feeState.month).balanceDue);
    };
  });

  const remindersBtn = $('#send-fee-reminders-btn');
  if (remindersBtn) {
    remindersBtn.onclick = () => {
      const pending = STATE.students
        .filter(student => student.status === 'Active')
        .map(student => ({ student, summary: getStudentFeeSummary(student, feeState.month) }))
        .filter(item => item.summary.balanceDue > 0);
      if (pending.length === 0) {
        showToast('info', `No pending fees for ${feeState.month}`);
        return;
      }
      pending.forEach(({ student, summary }) => sendFeeReminder(student, summary.balanceDue));
    };
  }
}

function getFeeMonthIndex(value) {
  const month = normalizeFeeMonth(value);
  if (!month) return null;
  let match = month.match(/^(\d{4})[-/](\d{1,2})$/);
  if (match) {
    const monthNumber = Number(match[2]);
    return monthNumber >= 1 && monthNumber <= 12 ? Number(match[1]) * 12 + monthNumber - 1 : null;
  }
  match = month.match(/^(\d{1,2})[-/](\d{4})$/);
  if (match) {
    const monthNumber = Number(match[1]);
    return monthNumber >= 1 && monthNumber <= 12 ? Number(match[2]) * 12 + monthNumber - 1 : null;
  }
  match = month.match(/^([a-z]+)[\s,._/-]+(\d{4})$/i);
  const parsed = new Date(match ? `${match[1]} 1, ${match[2]}` : `${month} 1`);
  return Number.isNaN(parsed.getTime()) ? null : parsed.getFullYear() * 12 + parsed.getMonth();
}

function normalizeFeeMonth(value) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  }
  if (typeof value === 'number' && Number.isFinite(value) && value >= 20000 && value <= 80000) {
    const sheetDate = new Date(Date.UTC(1899, 11, 30) + value * 86400000);
    return sheetDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' });
  }
  const month = String(value || '').trim();
  if (!month) return '';

  let match = month.match(/^(\d{4})[-/](\d{1,2})(?:[-/]\d{1,2})?(?:T.*)?$/);
  if (match) {
    const year = Number(match[1]), monthNumber = Number(match[2]);
    if (monthNumber >= 1 && monthNumber <= 12) {
      return new Date(year, monthNumber - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    }
  }
  match = month.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (match) {
    const first = Number(match[1]), second = Number(match[2]), year = Number(match[3]);
    const monthNumber = first > 12 ? second : first;
    if (monthNumber >= 1 && monthNumber <= 12) {
      return new Date(year, monthNumber - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    }
  }
  match = month.match(/^([a-z]+)[\s,._/-]+(\d{4})$/i);
  if (match) {
    const date = new Date(`${match[1]} 1, ${match[2]}`);
    if (!Number.isNaN(date.getTime())) return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  }
  return month;
}

function sameFeeMonth(first, second) {
  const firstIndex = getFeeMonthIndex(first);
  const secondIndex = getFeeMonthIndex(second);
  if (firstIndex !== null && secondIndex !== null) return firstIndex === secondIndex;
  return String(first || '').trim().toLowerCase() === String(second || '').trim().toLowerCase();
}

function getStudentFeeSummary(student, month) {
  if (!student) return { status: 'Pending', amountPaid: 0, amountDue: 0, balanceDue: 0, feeRecord: null };
  const monthIndex = getFeeMonthIndex(month);
  const records = getFeeLedgerRecords();
  const studentRecords = records.filter(record => String(record.studentId).trim().toLowerCase() === String(student.studentId).trim().toLowerCase());
  const monthRecords = studentRecords.filter(record => sameFeeMonth(record.month, month));
  const latestMonthRecord = monthRecords[monthRecords.length - 1] || null;
  const feeRecord = latestMonthRecord
    ? { ...latestMonthRecord, amount: monthRecords.reduce((sum, record) => sum + (Number(record.amount) || 0), 0) }
    : null;
  const monthlyAmount = Number(feeRecord && feeRecord.baseAmount) || Number(student.monthlyFee) || 1000;
  const amountPaid = Math.max(0, Number(feeRecord && feeRecord.amount) || 0);
  const earlierRecords = studentRecords.filter(record => {
    if (!record.month) return false;
    const recordMonthIndex = getFeeMonthIndex(record.month);
    return monthIndex !== null && recordMonthIndex !== null && recordMonthIndex < monthIndex;
  });
  const earlierByMonth = new Map();
  earlierRecords.forEach(record => {
    const recordMonthIndex = getFeeMonthIndex(record.month);
    const previous = earlierByMonth.get(recordMonthIndex) || { baseAmount: 0, payments: 0, settled: false };
    previous.baseAmount = Number(record.baseAmount || record.expectedAmount) || previous.baseAmount || Number(student.monthlyFee) || 1000;
    previous.payments += Math.max(0, Number(record.amount) || 0);
    previous.settled = previous.settled || record.status === 'Paid';
    earlierByMonth.set(recordMonthIndex, previous);
  });
  const pastObligations = Array.from(earlierByMonth.values()).reduce((sum, record) => sum + record.baseAmount, 0);
  const pastPayments = Array.from(earlierByMonth.values()).reduce((sum, record) =>
    sum + (record.settled ? Math.max(record.baseAmount, record.payments) : record.payments), 0);
  const carryOver = Math.max(0, pastObligations - pastPayments);
  const amountDue = Math.max(monthlyAmount + carryOver, Number(feeRecord && feeRecord.expectedAmount) || 0, amountPaid);
  const storedPaid = feeRecord && feeRecord.status === 'Paid';
  const balanceDue = storedPaid ? 0 : Math.max(0, amountDue - amountPaid);
  const status = storedPaid || balanceDue <= 0 ? 'Paid' : 'Pending';

  return {
    student,
    status,
    amountPaid,
    amountDue,
    balanceDue,
    feeRecord,
    baseAmount: monthlyAmount,
    datePaid: feeRecord ? feeRecord.date : null,
    paymentMode: feeRecord ? (feeRecord.paymentMode || 'Cash') : ''
  };
}

function openFeeStudentDetails(studentId) {
  const student = STATE.students.find(s => String(s.studentId) === String(studentId));
  if (!student) return;
  const history = getFeeLedgerRecords()
    .filter(record => String(record.studentId) === String(studentId))
    .sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));
  const currentSummary = getStudentFeeSummary(student, feeState.month);
  const currentPayment = currentSummary.feeRecord;
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
      <div><strong>Fee Status (${escapeHtml(feeState.month)}):</strong> <span class="badge ${currentSummary.status === 'Paid' ? 'badge-green' : 'badge-red'}">${currentSummary.status}</span></div>
      <div><strong>Outstanding Balance:</strong> ${formatCurrency(currentSummary.balanceDue)}</div>
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
  if (reminderBtn) reminderBtn.onclick = () => sendFeeReminder(student, currentSummary.balanceDue);
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

function sendFeeWhatsAppReceipt(student, payment, amount) {
  const msg = [
    `Payment receipt — ${STATE.settings.tuitionName || 'Tuition Center'}`,
    `Student: ${student.studentName}`,
    `Month: ${payment.month || feeState.month}`,
    `Amount paid: ${formatCurrency(amount)}`,
    `Payment date: ${payment.date ? formatDate(payment.date) : formatDate(todayISO())}`,
    `Payment mode: ${payment.paymentMode || 'Cash'}`,
    'Thank you.'
  ].join('\n');
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
          <label>Amount Type</label>
          <select id="fm-payment-type">
            <option value="Full">Full payment</option>
            <option value="Partial">Partial payment</option>
          </select>
        </div>
        <div class="form-row">
          <label>Amount Paid (${STATE.settings.currency || '₹'})</label>
          <input type="number" id="fm-amount" min="0.01" step="0.01" value="${student ? escapeHtml(getStudentFeeSummary(student, feeState.month).balanceDue) : '1000'}" required>
          <div id="fm-balance" style="font-size:12px;color:var(--text-secondary);margin-top:4px"></div>
        </div>
      </div>

      <div class="form-grid-2">
        <div class="form-row">
          <label>Payment Date</label>
          <input type="date" id="fm-date" value="${todayISO()}" required>
        </div>
        <div class="form-row">
          <label>Payment Method</label>
          <select id="fm-mode" required>
            <option value="Cash">Cash</option>
            <option value="UPI">UPI</option>
            <option value="Bank Transfer">Bank Transfer</option>
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
  const monthInput = $('#fm-month', overlay);
  const paymentTypeSelect = $('#fm-payment-type', overlay);
  const amountInput = $('#fm-amount', overlay);
  const balanceLabel = $('#fm-balance', overlay);
  const updatePaymentAmount = (resetPartial = false) => {
    const selected = STATE.students.find(s => s.studentId === studentSelect.value);
    const month = monthInput.value.trim();
    const balance = selected ? getStudentFeeSummary(selected, month).balanceDue : 0;
    if (balanceLabel) balanceLabel.textContent = `Remaining balance for ${month || 'selected month'}: ${formatCurrency(balance)}`;
    if (paymentTypeSelect.value === 'Full') amountInput.value = String(balance);
    else if (resetPartial) amountInput.value = '';
    amountInput.max = String(balance);
  };
  if (studentSelect && monthInput && paymentTypeSelect && amountInput) {
    updatePaymentAmount();
    studentSelect.onchange = () => updatePaymentAmount(true);
    monthInput.onchange = () => updatePaymentAmount(true);
    paymentTypeSelect.onchange = () => updatePaymentAmount(paymentTypeSelect.value === 'Partial');
    amountInput.oninput = () => {
      if (paymentTypeSelect.value === 'Full') paymentTypeSelect.value = 'Partial';
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
    if (!date) {
      showToast('error', 'Please select the payment date');
      return;
    }
    const summary = getStudentFeeSummary(stObj, month);
    const transactionAmount = paymentTypeSelect.value === 'Full' ? summary.balanceDue : amount;
    if (transactionAmount <= 0) {
      showToast('error', 'Please enter a valid payment amount');
      return;
    }
    if (transactionAmount > summary.balanceDue) {
      showToast('error', `Payment cannot exceed the remaining balance of ${formatCurrency(summary.balanceDue)}`);
      return;
    }

    showFeeProcessingState(overlay);
    await new Promise(resolve => setTimeout(resolve, 350));

    const previousRecord = summary.feeRecord;
    const cumulativeAmount = summary.amountPaid + transactionAmount;
    const record = {
      ...(previousRecord || {}),
      id: previousRecord ? previousRecord.id : uid(),
      studentId,
      studentName: stObj ? stObj.studentName : '',
      batch: stObj ? stObj.batch : '',
      month,
      amount: cumulativeAmount,
      transactionAmount,
      baseAmount: summary.baseAmount,
      expectedAmount: summary.amountDue,
      date,
      paymentMode: mode,
      status: cumulativeAmount >= summary.amountDue ? 'Paid' : 'Pending'
    };

    /* Keep one accumulated record for this student and fee month. */
    const previousFees = STATE.fees;
    STATE.fees = STATE.fees.filter(f => !(
      String(f.studentId) === String(studentId) &&
      sameFeeMonth(f.month, month)
    ));
    STATE.fees.push(record);

    saveStorage(LS_KEYS.FEES, STATE.fees);
    const persistedFees = loadStorage(LS_KEYS.FEES, null);
    const persistedRecord = Array.isArray(persistedFees) && persistedFees.find(f =>
      String(f.id) === String(record.id) &&
      String(f.studentId) === String(record.studentId) &&
      sameFeeMonth(f.month, record.month) &&
      Number(f.amount) === Number(record.amount)
    );
    if (!persistedRecord) {
      STATE.fees = previousFees;
      showToast('error', 'Payment could not be saved to this device. Please check storage and try again.');
      renderFeesPage();
      showFeeSaveError(overlay);
      return;
    }

    feeState.month = month;
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
            Payment of <strong>${formatCurrency(transactionAmount)}</strong> via <strong>${escapeHtml(mode)}</strong> for <strong>${escapeHtml(stObj.studentName)}</strong> (${escapeHtml(month)}) has been saved.
          </p>
        </div>
        <div class="modal-footer fee-payment-modal-footer">
          <button class="btn btn-outline fee-modal-action" data-modal-close>Close</button>
          <button class="btn btn-outline fee-modal-action" id="send-wa-receipt-modal-btn"><i data-lucide="message-circle" class="icon"></i> Send WhatsApp Receipt</button>
          <button class="btn btn-primary fee-modal-action" id="download-receipt-modal-btn">
            <i data-lucide="printer" class="icon"></i> Print / Save Receipt
          </button>
        </div>
      `;
      if (window.lucide) lucide.createIcons();
      modalBox.querySelectorAll('[data-modal-close]').forEach(b => b.onclick = close);

      const whatsAppBtn = $('#send-wa-receipt-modal-btn', modalBox);
      if (whatsAppBtn) whatsAppBtn.onclick = () => sendFeeWhatsAppReceipt(stObj, record, transactionAmount);
      const dlBtn = $('#download-receipt-modal-btn', modalBox);
      if (dlBtn) {
        dlBtn.onclick = () => {
          openFeeReceiptPrint(stObj, transactionAmount, month, record);
        };
      }
    } else {
      close();
    }
  };
}

function showFeeProcessingState(overlay) {
  const modalBox = overlay.querySelector('.modal-box');
  if (!modalBox) return;
  modalBox.innerHTML = `
    <div class="modal-header">
      <h3>Processing Payment</h3>
    </div>
    <div class="modal-body fee-processing-state" role="status" aria-live="polite">
      <span class="fee-processing-spinner"><i data-lucide="loader-circle" class="icon"></i></span>
      <strong>Processing Payment...</strong>
      <span>Please wait while the payment is saved.</span>
    </div>
  `;
  if (window.lucide) lucide.createIcons();
}

function showFeeSaveError(overlay) {
  const modalBox = overlay.querySelector('.modal-box');
  if (!modalBox) return;
  modalBox.innerHTML = `
    <div class="modal-header">
      <h3>Payment Not Saved</h3>
      <button class="icon-btn" data-modal-close><i data-lucide="x" class="icon"></i></button>
    </div>
    <div class="modal-body" role="alert">
      <p>The payment was not saved locally. No receipt was generated. Please close this message and try again.</p>
    </div>
    <div class="modal-footer">
      <button class="btn btn-outline" data-modal-close>Close</button>
    </div>
  `;
  modalBox.querySelectorAll('[data-modal-close]').forEach(button => {
    button.onclick = () => {
      overlay.classList.remove('open');
      setTimeout(() => overlay.remove(), 200);
    };
  });
  if (window.lucide) lucide.createIcons();
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
