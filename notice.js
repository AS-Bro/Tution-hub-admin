/* ==========================================================================
   TuitionHub — Notice Board Script (notice.js)
   ========================================================================== */

let noticeCategoryFilter = '';

document.addEventListener('DOMContentLoaded', () => {
  injectShellLayout('notice', 'Notice Board');
  renderNoticePage();
});

window.onSyncComplete = function () {
  renderNoticePage();
};

function renderNoticePage() {
  const container = $('#page-content');
  if (!container) return;

  const categories = ['Exam', 'Holiday', 'General', 'Fees'];

  let filtered = STATE.notices.filter(n => {
    return !noticeCategoryFilter || n.category === noticeCategoryFilter;
  });

  container.innerHTML = `
    <div class="section-head">
      <div>
        <h2>Announcement & Notice Board</h2>
        <div class="section-sub">Publish notices and broadcast updates to parents & students</div>
      </div>
      <div style="display:flex;gap:10px">
        <button class="btn btn-primary btn-sm" id="create-notice-btn">
          <i data-lucide="plus" class="icon"></i> Publish New Notice
        </button>
      </div>
    </div>

    <!-- FILTER CHIPS -->
    <div class="filter-chips">
      <div class="chip ${!noticeCategoryFilter ? 'active' : ''}" data-category="">All Categories</div>
      ${categories.map(c => `<div class="chip ${noticeCategoryFilter === c ? 'active' : ''}" data-category="${c}">${c}</div>`).join('')}
    </div>

    <!-- NOTICES GRID -->
    ${filtered.length === 0 ? `
      <div class="card empty-state">
        <div class="emoji">📢</div>
        <h4>No announcements found</h4>
        <p>Publish a notice to share updates on exams, holidays, or fee alerts.</p>
        <button class="btn btn-primary btn-sm" id="empty-notice-btn">Publish Notice</button>
      </div>
    ` : `
      <div style="display:grid;grid-template-columns:repeat(auto-fill, minmax(320px, 1fr));gap:16px">
        ${filtered.map(n => `
          <div class="card" style="display:flex;flex-direction:column;gap:12px">
            <div style="display:flex;justify-content:space-between;align-items:flex-start">
              <span class="badge ${n.category === 'Exam' ? 'badge-blue' : n.category === 'Holiday' ? 'badge-yellow' : 'badge-gray'}">${escapeHtml(n.category || 'General')}</span>
              <div style="display:flex;gap:4px">
                <button class="icon-btn broadcast-notice-btn" data-id="${escapeHtml(n.id)}" title="Share on WhatsApp"><i data-lucide="share-2" class="icon" style="color:var(--primary)"></i></button>
                <button class="icon-btn delete-notice-btn" data-id="${escapeHtml(n.id)}" title="Delete Notice"><i data-lucide="trash-2" class="icon" style="color:var(--danger)"></i></button>
              </div>
            </div>

            <h3 style="font-size:16px">${escapeHtml(n.title)}</h3>
            <div style="font-size:13.5px;color:var(--text-secondary);line-height:1.5">${escapeHtml(n.content)}</div>

            <div style="font-size:12px;color:var(--text-muted);display:flex;justify-content:space-between;padding-top:8px;border-top:1px solid var(--border)">
              <span>Batch: <strong>${escapeHtml(n.batch || 'All')}</strong></span>
              <span>${formatDate(n.date)}</span>
            </div>
          </div>
        `).join('')}
      </div>
    `}
  `;

  if (window.lucide) lucide.createIcons();
  bindNoticeEvents();
}

function bindNoticeEvents() {
  $all('.chip').forEach(chip => {
    chip.onclick = () => {
      noticeCategoryFilter = chip.dataset.category;
      renderNoticePage();
    };
  });

  const createBtn = $('#create-notice-btn') || $('#empty-notice-btn');
  if (createBtn) createBtn.onclick = () => openNoticeModal();

  $all('.delete-notice-btn').forEach(btn => {
    btn.onclick = async () => {
      if (confirm('Delete this notice?')) {
        STATE.notices = STATE.notices.filter(n => n.id !== btn.dataset.id);
        saveStorage(LS_KEYS.NOTICES, STATE.notices);
        showToast('info', 'Notice deleted');
        renderNoticePage();
        if (STATE.settings.gasUrl && window.apiRequest) {
          try {
            await window.apiRequest('saveNotice', { notices: STATE.notices });
          } catch (e) {
            showToast('warning', 'Deleted locally, but Google Sheets sync failed');
          }
        }
      }
    };
  });

  $all('.broadcast-notice-btn').forEach(btn => {
    btn.onclick = () => {
      const notice = STATE.notices.find(n => n.id === btn.dataset.id);
      if (!notice) return;
      const msg = `📢 *NOTICE from ${STATE.settings.tuitionName || 'Tuition Center'}*\n\n*${notice.title}*\n${notice.content}\n\nTarget Batch: ${notice.batch || 'All'}\nDate: ${formatDate(notice.date)}`;
      openWhatsApp(STATE.settings.teacherWhatsapp || STATE.settings.teacherPhone, msg);
    };
  });
}

function openNoticeModal() {
  const html = `
    <div class="modal-header">
      <h3>Publish Announcement / Notice</h3>
      <button class="icon-btn" data-modal-close><i data-lucide="x" class="icon"></i></button>
    </div>
    <form id="notice-modal-form" class="modal-body">
      <div class="form-row">
        <label>Notice Headline / Title</label>
        <input type="text" id="nm-title" placeholder="e.g. Monthly Progress Test Schedule" required>
      </div>

      <div class="form-grid-2">
        <div class="form-row">
          <label>Category</label>
          <select id="nm-category">
            <option value="General">General</option>
            <option value="Exam">Exam</option>
            <option value="Holiday">Holiday</option>
            <option value="Fees">Fees Alert</option>
          </select>
        </div>
        <div class="form-row">
          <label>Target Batch</label>
          <input type="text" id="nm-batch" value="All Batches" placeholder="e.g. Grade 10 or All Batches">
        </div>
      </div>

      <div class="form-row">
        <label>Notice Content</label>
        <textarea id="nm-content" rows="4" placeholder="Write the complete details of the announcement..." required></textarea>
      </div>

      <div class="form-row">
        <label>Date</label>
        <input type="date" id="nm-date" value="${todayISO()}">
      </div>
    </form>
    <div class="modal-footer">
      <button class="btn btn-outline" data-modal-close>Cancel</button>
      <button class="btn btn-primary" id="save-notice-btn">Publish Notice</button>
    </div>
  `;

  const { overlay, close } = ModalManager.open(html);
  const saveBtn = $('#save-notice-btn', overlay);

  saveBtn.onclick = async () => {
    const title = $('#nm-title', overlay).value.trim();
    const category = $('#nm-category', overlay).value;
    const batch = $('#nm-batch', overlay).value.trim();
    const content = $('#nm-content', overlay).value.trim();
    const date = $('#nm-date', overlay).value;

    if (!title || !content) { showToast('warning', 'Title and content required'); return; }

    const noticeObj = {
      id: uid(),
      title,
      category,
      batch: batch || 'All Batches',
      content,
      date
    };

    STATE.notices.unshift(noticeObj);
    saveStorage(LS_KEYS.NOTICES, STATE.notices);
    showToast('success', 'Announcement published');
    close();
    renderNoticePage();

    if (STATE.settings.gasUrl && window.apiRequest) {
      try {
        await window.apiRequest('saveNotice', { notices: STATE.notices });
      } catch (e) {
        showToast('warning', 'Published locally, but Google Sheets sync failed');
      }
    }
  };
}
