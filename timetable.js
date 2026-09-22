/* ==========================================================================
    TuitionHub — Timetable & Schedule Script (timetable.js)
    Simplified: Uses existing 'room' column for online class URLs
    ========================================================================== */

let timetableBatchFilter = '';

document.addEventListener('DOMContentLoaded', () => {
  injectShellLayout('timetable', 'Class & Timetable');
  renderTimetablePage();
});

window.onSyncComplete = function () {
  renderTimetablePage();
};

function renderTimetablePage() {
  const container = $('#page-content');
  if (!container) return;

  const batches = Array.from(new Set(STATE.schedule.map(s => s.batch).filter(Boolean)));

  let filtered = STATE.schedule.filter(sc => {
    return !timetableBatchFilter || sc.batch === timetableBatchFilter;
  });

  container.innerHTML = `
    <div class="section-head">
      <div>
        <h2>Class Timetable & Slot Matrix</h2>
        <div class="section-sub">Organize batch timings, subjects, online classes, and schedule</div>
      </div>
      <div style="display:flex;gap:10px">
        <button class="btn btn-secondary btn-sm" id="launch-online-class-btn">
          <i data-lucide="video" class="icon"></i> Launch Online Class
        </button>
        <button class="btn btn-primary btn-sm" id="add-slot-btn">
          <i data-lucide="plus" class="icon"></i> Add Time Slot
        </button>
      </div>
    </div>

    <!-- TOOLBAR -->
    <div class="toolbar">
      <select class="select-filter" id="tt-batch-filter">
        <option value="">All Batches</option>
        ${batches.map(b => `<option value="${escapeHtml(b)}" ${timetableBatchFilter === b ? 'selected' : ''}>${escapeHtml(b)}</option>`).join('')}
      </select>
      <button class="btn btn-outline btn-sm" id="broadcast-schedule-wa-btn">
        <i data-lucide="message-square" class="icon" style="color:var(--success)"></i> Broadcast Schedule via WhatsApp
      </button>
    </div>

    <!-- TIMETABLE LIST -->
    ${filtered.length === 0 ? `
      <div class="card empty-state">
        <div class="emoji">📅</div>
        <h4>No timetable entries found</h4>
        <p>Add class slots for your batches to build the weekly schedule.</p>
        <button class="btn btn-primary btn-sm" id="empty-slot-btn">Add First Slot</button>
      </div>
    ` : `
      <div style="display:grid;grid-template-columns:repeat(auto-fill, minmax(320px, 1fr));gap:16px">
        ${filtered.map(sc => {
          const hasUrl = sc.room && sc.room.startsWith('http');
          return `
            <div class="card" style="display:flex;flex-direction:column;gap:12px;position:relative">
              <div style="display:flex;justify-content:space-between;align-items:flex-start">
                <div>
                  <span class="badge badge-blue">${escapeHtml(sc.batch)}</span>
                  <h3 style="font-size:18px;margin-top:6px">${escapeHtml(sc.subject)}</h3>
                </div>
                <div style="display:flex;gap:4px">
                  <button class="icon-btn duplicate-slot-btn" data-id="${escapeHtml(sc.id)}" title="Duplicate Slot"><i data-lucide="copy" class="icon"></i></button>
                  <button class="icon-btn edit-slot-btn" data-id="${escapeHtml(sc.id)}" title="Edit Slot"><i data-lucide="edit-2" class="icon"></i></button>
                  <button class="icon-btn delete-slot-btn" data-id="${escapeHtml(sc.id)}" title="Delete Slot"><i data-lucide="trash-2" class="icon" style="color:var(--danger)"></i></button>
                </div>
              </div>

              <div style="display:flex;flex-direction:column;gap:6px;font-size:13.5px">
                <div style="display:flex;align-items:center;gap:8px;color:var(--primary);font-weight:700">
                  <i data-lucide="clock" class="icon"></i> ${escapeHtml(sc.time)}
                </div>
                <div style="display:flex;align-items:center;gap:8px;color:var(--text-secondary)">
                  <i data-lucide="calendar" class="icon"></i> Days: ${escapeHtml(sc.days)}
                </div>
                <div style="display:flex;align-items:center;gap:8px;color:var(--text-secondary)">
                  <i data-lucide="user" class="icon"></i> Tutor: ${escapeHtml(sc.teacher || 'Primary Teacher')}
                </div>
                <div style="display:flex;align-items:center;gap:8px;${hasUrl ? 'color:var(--primary);font-weight:600;cursor:pointer' : 'color:var(--text-secondary)'}">
                  <i data-lucide="${hasUrl ? 'video' : 'info'}" class="icon"></i> 
                  ${hasUrl ? `<span class="open-url-btn" data-url="${escapeHtml(sc.room)}" title="Click to open online class">Online Class Available</span>` : 'No online class link'}
                </div>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `}
  `;

  if (window.lucide) lucide.createIcons();
  bindTimetableEvents();
}

function bindTimetableEvents() {
  const batchFilter = $('#tt-batch-filter');
  if (batchFilter) {
    batchFilter.onchange = (e) => {
      timetableBatchFilter = e.target.value;
      renderTimetablePage();
    };
  }

  const launchBtn = $('#launch-online-class-btn');
  if (launchBtn) {
    launchBtn.onclick = () => launchFirstAvailableLink();
  }

  const addBtn = $('#add-slot-btn') || $('#empty-slot-btn');
  if (addBtn) addBtn.onclick = () => openSlotModal();

  $all('.duplicate-slot-btn').forEach(btn => {
    btn.onclick = () => {
      const slot = STATE.schedule.find(s => s.id === btn.dataset.id);
      if (slot) duplicateSlot(slot);
    };
  });

  $all('.edit-slot-btn').forEach(btn => {
    btn.onclick = () => {
      const slot = STATE.schedule.find(s => s.id === btn.dataset.id);
      openSlotModal(slot);
    };
  });

  $all('.delete-slot-btn').forEach(btn => {
    btn.onclick = async () => {
      if (confirm('Delete this timetable slot?')) {
        STATE.schedule = STATE.schedule.filter(s => s.id !== btn.dataset.id);
        saveStorage(LS_KEYS.SCHEDULE, STATE.schedule);
        showToast('info', 'Slot deleted');
        renderTimetablePage();
        if (STATE.settings.gasUrl && window.apiRequest) {
          try {
            await window.apiRequest('saveSchedule', { schedule: STATE.schedule });
          } catch (e) {
            showToast('warning', 'Deleted locally, but Google Sheets sync failed');
          }
        }
      }
    };
  });

  $all('.open-url-btn').forEach(btn => {
    btn.onclick = () => {
      const url = btn.dataset.url;
      if (url && url.startsWith('http')) {
        window.open(url, '_blank');
      }
    };
  });

  const broadcastBtn = $('#broadcast-schedule-wa-btn');
  if (broadcastBtn) {
    broadcastBtn.onclick = () => {
      let msg = `📅 *Tuition Class Timetable (${STATE.settings.tuitionName || 'Tuition Center'})*\n\n`;
      STATE.schedule.forEach(sc => {
        msg += `• *${sc.subject}* (${sc.batch})\n  ⏰ ${sc.time} | 🗓️ ${sc.days}\n  👨‍🏫 ${sc.teacher || 'Tutor'}\n`;
        if (sc.room && sc.room.startsWith('http')) {
          msg += `  🎥 Online Class Available\n`;
        }
        msg += '\n';
      });
      openWhatsApp(STATE.settings.teacherWhatsapp || STATE.settings.teacherPhone, msg);
    };
  }
}

function duplicateSlot(slot) {
  const newSlot = {
    ...slot,
    id: uid()
  };
  STATE.schedule.push(newSlot);
  saveStorage(LS_KEYS.SCHEDULE, STATE.schedule);
  showToast('success', 'Slot duplicated');
  renderTimetablePage();
  if (STATE.settings.gasUrl && window.apiRequest) {
    window.apiRequest('saveSchedule', { schedule: STATE.schedule }).catch(() => {
      showToast('warning', 'Duplicated locally, but Google Sheets sync failed');
    });
  }
}

function launchFirstAvailableLink() {
  const slotsWithLinks = STATE.schedule.filter(s => s.room && s.room.startsWith('http'));
  
  if (slotsWithLinks.length === 0) {
    showToast('info', 'No online class links configured yet');
    return;
  }

  const firstLink = slotsWithLinks[0].room;
  window.open(firstLink, '_blank');
}

function openSlotModal(slot = null) {
  const isEdit = !!slot;
  const batches = Array.from(new Set(STATE.students.map(s => s.batch).filter(Boolean)));
  if (batches.length === 0) batches.push('Grade 10', 'Grade 12');

  const html = `
    <div class="modal-header">
      <h3>${isEdit ? 'Edit Schedule Slot' : 'Add Timetable Slot'}</h3>
      <button class="icon-btn" data-modal-close><i data-lucide="x" class="icon"></i></button>
    </div>
    <form id="slot-modal-form" class="modal-body">
      <div class="form-grid-2">
        <div class="form-row">
          <label>Subject Name</label>
          <input type="text" id="sm-subject" value="${escapeHtml(slot ? slot.subject : '')}" placeholder="e.g. Mathematics" required>
        </div>
        <div class="form-row">
          <label>Batch / Grade</label>
          <input type="text" id="sm-batch" value="${escapeHtml(slot ? slot.batch : batches[0])}" placeholder="e.g. Grade 10" required>
        </div>
      </div>

      <div class="form-grid-2">
        <div class="form-row">
          <label>Time Slot</label>
          <input type="text" id="sm-time" value="${escapeHtml(slot ? slot.time : '04:00 PM - 05:30 PM')}" placeholder="e.g. 04:00 PM - 05:30 PM" required>
        </div>
        <div class="form-row">
          <label>Recurring Days</label>
          <input type="text" id="sm-days" value="${escapeHtml(slot ? slot.days : 'Mon, Wed, Fri')}" placeholder="e.g. Mon, Wed, Fri" required>
        </div>
      </div>

      <div class="form-grid-2">
        <div class="form-row">
          <label>Tutor / Teacher</label>
          <input type="text" id="sm-teacher" value="${escapeHtml(slot ? slot.teacher : STATE.settings.teacherName || '')}" placeholder="Tutor Name">
        </div>
        <div class="form-row">
          <label>Online Class URL</label>
          <input type="url" id="sm-room" value="${escapeHtml(slot ? slot.room : '')}" placeholder="https://meet.google.com/..." title="HTTPS URL for meeting link (optional)">
          <div style="font-size:11px;color:var(--text-secondary);margin-top:4px">Optional. Enter meeting URL (Google Meet, Zoom, Teams, etc)</div>
        </div>
      </div>
    </form>
    <div class="modal-footer">
      <button class="btn btn-outline" data-modal-close>Cancel</button>
      <button class="btn btn-primary" id="save-slot-btn">${isEdit ? 'Update Slot' : 'Save Slot'}</button>
    </div>
  `;

  const { overlay, close } = ModalManager.open(html);
  const saveBtn = $('#save-slot-btn', overlay);

  saveBtn.onclick = async () => {
    const subject = $('#sm-subject', overlay).value.trim();
    const batch = $('#sm-batch', overlay).value.trim();
    const time = $('#sm-time', overlay).value.trim();
    const days = $('#sm-days', overlay).value.trim();
    const teacher = $('#sm-teacher', overlay).value.trim();
    const room = $('#sm-room', overlay).value.trim();

    if (!subject || !batch) { 
      showToast('warning', 'Subject and batch required'); 
      return; 
    }

    if (room && !isValidUrl(room)) {
      showToast('warning', 'Please enter a valid HTTPS or HTTP URL, or leave blank');
      return;
    }

    const slotObj = {
      id: isEdit ? slot.id : uid(),
      subject,
      batch,
      time,
      days,
      teacher,
      room
    };

    if (isEdit) {
      const idx = STATE.schedule.findIndex(s => s.id === slot.id);
      if (idx !== -1) STATE.schedule[idx] = slotObj;
    } else {
      STATE.schedule.push(slotObj);
    }

    saveStorage(LS_KEYS.SCHEDULE, STATE.schedule);
    showToast('success', 'Schedule slot saved');
    close();
    renderTimetablePage();

    if (STATE.settings.gasUrl && window.apiRequest) {
      try {
        await window.apiRequest('saveSchedule', { schedule: STATE.schedule });
      } catch (e) {
        showToast('warning', 'Saved locally, but Google Sheets sync failed');
      }
    }
  };
}

function isValidUrl(urlStr) {
  try {
    const url = new URL(urlStr);
    return url.protocol === 'https:' || url.protocol === 'http:';
  } catch (e) {
    return false;
  }
}
