/* ==========================================================================
   TuitionHub — Study Materials
   ========================================================================== */

const MATERIAL_TYPES = ['note', 'pdf', 'text', 'class', 'other'];
let materialFilters = { subject: '', batch: '', type: '', search: '' };

document.addEventListener('DOMContentLoaded', () => {
  injectShellLayout('materials', 'Study Materials');
  renderMaterialsPage();
});

window.onSyncComplete = function () {
  renderMaterialsPage();
};

function renderMaterialsPage() {
  const container = $('#page-content');
  if (!container) return;
  if (!Array.isArray(STATE.materials)) STATE.materials = [];

  const subjects = [...new Set(STATE.materials.map(material => material.subject).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b));
  const batches = getUniqueBatches();
  const visibleMaterials = STATE.materials.filter(material =>
    (!materialFilters.subject || normalizeMaterialFilterValue(material.subject) === normalizeMaterialFilterValue(materialFilters.subject)) &&
    (!materialFilters.batch || normalizeMaterialFilterValue(material.batch) === normalizeMaterialFilterValue(materialFilters.batch)) &&
    (!materialFilters.type || normalizeMaterialFilterValue(material.type) === normalizeMaterialFilterValue(materialFilters.type)) &&
    matchesMaterialSearch(material, materialFilters.search)
  );

  container.innerHTML = `
    <section id="view-materials">
      <div class="section-head">
        <div>
          <h2>Study Materials</h2>
          <div class="section-sub">Learning resources, notes, and class links for your batches.</div>
        </div>
        <button type="button" class="btn btn-primary" id="add-material-btn">
          <i data-lucide="plus" class="icon"></i> Add Material
        </button>
      </div>

      <div class="toolbar">
        <div class="search-box">
          <i data-lucide="search" class="icon"></i>
          <input type="search" id="materials-search-input" placeholder="Search title, description, or subject..." value="${escapeHtml(materialFilters.search)}" aria-label="Search study materials">
        </div>
        <select class="select-filter" id="materials-subject-filter" aria-label="Filter by subject">
          <option value="">All Subjects</option>
          ${subjects.map(subject => `<option value="${escapeHtml(subject)}" ${materialFilters.subject === subject ? 'selected' : ''}>${escapeHtml(subject)}</option>`).join('')}
        </select>
        <select class="select-filter" id="materials-batch-filter" aria-label="Filter by batch">
          <option value="">All Batches</option>
          ${batches.map(batch => `<option value="${escapeHtml(batch)}" ${materialFilters.batch === batch ? 'selected' : ''}>${escapeHtml(batch)}</option>`).join('')}
        </select>
        <select class="select-filter" id="materials-type-filter" aria-label="Filter by file type">
          <option value="">All File Types</option>
          ${MATERIAL_TYPES.map(type => `<option value="${type}" ${materialFilters.type === type ? 'selected' : ''}>${formatMaterialType(type)}</option>`).join('')}
        </select>
      </div>

      ${visibleMaterials.length ? `
        <div class="materials-grid">
          ${visibleMaterials.map(material => renderMaterialCard(material)).join('')}
        </div>
      ` : `
        <div class="card empty-state">
          <div class="emoji">📚</div>
          <h4>${STATE.materials.length ? 'No materials match these filters' : 'No study materials yet'}</h4>
          <p>${STATE.materials.length ? 'Try another search or filter.' : 'Add a resource to share it with your students.'}</p>
        </div>
      `}
    </section>
  `;

  if (window.lucide) lucide.createIcons();
  bindMaterialsPageEvents();
}

function renderMaterialCard(material) {
  const safeUrl = validateMaterialUrl(material.url);
  const typeClass = material.type === 'pdf' ? 'badge-red'
    : material.type === 'class' ? 'badge-yellow'
      : material.type === 'note' ? 'badge-blue'
        : material.type === 'text' ? 'badge-green' : 'badge-gray';
  const typeIcon = ({ note: 'sticky-note', pdf: 'file-text', text: 'align-left', class: 'video', other: 'paperclip' })[material.type] || 'paperclip';
  return `
    <article class="card material-card">
      <div class="material-card-heading">
        <div class="material-card-title">
          <span class="material-type-icon ${typeClass}"><i data-lucide="${typeIcon}" class="icon"></i></span>
          <h3>${escapeHtml(material.title || 'Untitled material')}</h3>
        </div>
        <div class="material-card-actions">
          <button type="button" class="icon-btn edit-material-btn" data-id="${escapeHtml(material.id)}" title="Edit material" aria-label="Edit ${escapeHtml(material.title || 'material')}">
            <i data-lucide="pencil" class="icon"></i>
          </button>
          <button type="button" class="icon-btn delete-material-btn" data-id="${escapeHtml(material.id)}" title="Delete material" aria-label="Delete ${escapeHtml(material.title || 'material')}">
            <i data-lucide="trash-2" class="icon"></i>
          </button>
        </div>
      </div>
      <div class="material-badges">
        <span class="badge badge-blue">${escapeHtml(material.subject || 'Subject')}</span>
        <span class="badge badge-blue material-batch-badge"><i data-lucide="users" class="icon"></i>${escapeHtml(material.batch || 'All Batches')}</span>
        <span class="badge ${typeClass} material-type-badge"><i data-lucide="${typeIcon}" class="icon"></i>${escapeHtml(formatMaterialType(material.type))}</span>
      </div>
      <div class="material-description-block">
        <span class="material-metadata-label">Description</span>
        <p class="material-description">${escapeHtml(material.description || 'No description provided.')}</p>
      </div>
      <div class="material-card-footer">
        <div class="material-publish-date"><i data-lucide="calendar-days" class="icon"></i><span>Published ${escapeHtml(formatDate(material.createdDate) || '—')}</span></div>
        ${safeUrl ? `<a class="btn btn-primary btn-sm material-open-link" href="${escapeHtml(safeUrl)}" target="_blank" rel="noopener noreferrer">
          <i data-lucide="external-link" class="icon"></i> Open
        </a>` : '<span class="badge badge-red">Invalid resource link</span>'}
      </div>
    </article>
  `;
}

function formatMaterialType(type) {
  const normalized = String(type || 'other').toLowerCase();
  return ({ note: 'Note', pdf: 'PDF', text: 'Text', class: 'Class', other: 'Other' })[normalized] || 'Other';
}

function isSelectedMaterialOption(value, selectedValue) {
  return String(value || '').toLowerCase() === String(selectedValue || '').toLowerCase();
}

function getUniqueBatches() {
  const batchNames = [];
  const addBatchNames = value => {
    if (Array.isArray(value)) {
      value.forEach(addBatchNames);
      return;
    }
    if (value === undefined || value === null) return;
    const batch = String(value).trim();
    if (batch) batchNames.push(batch);
  };

  (Array.isArray(STATE.schedule) ? STATE.schedule : []).forEach(slot => addBatchNames(slot && slot.batch));
  (Array.isArray(STATE.students) ? STATE.students : []).forEach(student => addBatchNames(student && student.batch));
  (Array.isArray(STATE.materials) ? STATE.materials : []).forEach(material => addBatchNames(material && material.batch));

  const uniqueBatches = new Map();
  batchNames.forEach(batch => {
    const key = normalizeMaterialFilterValue(batch);
    if (!uniqueBatches.has(key)) uniqueBatches.set(key, batch);
  });
  return [...uniqueBatches.values()].sort((a, b) => a.localeCompare(b));
}

function normalizeMaterialFilterValue(value) {
  return String(value || '').trim().toLocaleLowerCase();
}

function matchesMaterialSearch(material, query) {
  const normalizedQuery = normalizeMaterialFilterValue(query);
  if (!normalizedQuery) return true;
  return [material.title, material.description, material.subject]
    .some(value => String(value || '').toLocaleLowerCase().includes(normalizedQuery));
}

function bindMaterialsPageEvents() {
  const addButton = $('#add-material-btn');
  if (addButton) addButton.onclick = () => openMaterialModal();

  const searchInput = $('#materials-search-input');
  if (searchInput) {
    searchInput.oninput = event => {
      materialFilters.search = event.target.value;
      const cursorPosition = event.target.selectionStart;
      renderMaterialsPage();
      const updatedInput = $('#materials-search-input');
      if (updatedInput) {
        updatedInput.focus();
        updatedInput.setSelectionRange(cursorPosition, cursorPosition);
      }
    };
  }

  [
    ['materials-subject-filter', 'subject'],
    ['materials-batch-filter', 'batch'],
    ['materials-type-filter', 'type']
  ].forEach(([id, filter]) => {
    const select = $('#' + id);
    if (select) select.onchange = event => {
      materialFilters[filter] = event.target.value;
      renderMaterialsPage();
    };
  });

  $all('.delete-material-btn').forEach(button => {
    button.onclick = () => deleteStudyMaterial(button.dataset.id);
  });
  $all('.edit-material-btn').forEach(button => {
    button.onclick = () => {
      const material = STATE.materials.find(item => String(item.id) === String(button.dataset.id));
      if (material) openMaterialModal(material);
    };
  });
}

function getMaterialScheduleOptions(field, currentValue = '') {
  if (field === 'batch') {
    const batches = getUniqueBatches();
    if (currentValue && !batches.some(value =>
      normalizeMaterialFilterValue(value) === normalizeMaterialFilterValue(currentValue)
    )) {
      batches.push(String(currentValue).trim());
    }
    return batches.sort((a, b) => a.localeCompare(b));
  }

  const scheduled = (Array.isArray(STATE.schedule) ? STATE.schedule : [])
    .map(slot => String(slot[field] || '').trim())
    .filter(Boolean);
  if (currentValue && !scheduled.some(value => value.toLowerCase() === currentValue.toLowerCase())) {
    scheduled.push(currentValue);
  }
  return [...new Map(scheduled.map(value => [value.toLowerCase(), value])).values()]
    .sort((a, b) => a.localeCompare(b));
}

function openMaterialModal(material = null) {
  const isEdit = Boolean(material);
  const subjects = getMaterialScheduleOptions('subject', material && material.subject);
  const batches = getMaterialScheduleOptions('batch', material && material.batch);
  const html = `
    <div class="modal-header">
      <h3>${isEdit ? 'Edit Study Material' : 'Add Study Material'}</h3>
      <button type="button" class="icon-btn" data-modal-close aria-label="Close"><i data-lucide="x" class="icon"></i></button>
    </div>
    <form class="modal-body" id="material-form">
      <div class="form-row">
        <label for="material-title">Title</label>
        <input id="material-title" name="title" type="text" maxlength="160" value="${escapeHtml(material ? material.title : '')}" placeholder="e.g. Algebra revision notes" required>
      </div>
      <div class="form-grid-2">
        <div class="form-row">
          <label for="material-subject">Subject</label>
          <select id="material-subject" name="subject" required ${subjects.length ? '' : 'disabled'}>
            <option value="">${subjects.length ? 'Select subject' : 'Add subjects to the timetable first'}</option>
            ${subjects.map(subject => `<option value="${escapeHtml(subject)}" ${material && isSelectedMaterialOption(material.subject, subject) ? 'selected' : ''}>${escapeHtml(subject)}</option>`).join('')}
          </select>
        </div>
        <div class="form-row">
          <label for="material-batch">Batch / Grade</label>
          <select id="material-batch" name="batch" required ${batches.length ? '' : 'disabled'}>
            <option value="">${batches.length ? 'Select grade' : 'Add grades to the timetable first'}</option>
            ${batches.map(batch => `<option value="${escapeHtml(batch)}" ${material && isSelectedMaterialOption(material.batch, batch) ? 'selected' : ''}>${escapeHtml(batch)}</option>`).join('')}
          </select>
        </div>
      </div>
      <div class="form-grid-2">
        <div class="form-row">
          <label for="material-type">File Type</label>
          <select id="material-type" name="type" required>
            ${MATERIAL_TYPES.map(type => `<option value="${type}" ${material && String(material.type).toLowerCase() === type ? 'selected' : ''}>${formatMaterialType(type)}</option>`).join('')}
          </select>
        </div>
        <div class="form-row">
          <label for="material-url">Resource URL</label>
          <input id="material-url" name="url" type="url" inputmode="url" value="${escapeHtml(material ? material.url : '')}" placeholder="https://..." required>
        </div>
      </div>
      <div class="form-row">
        <label for="material-description">Description / Instructions</label>
        <textarea id="material-description" name="description" rows="3" maxlength="1000" placeholder="What should students review or complete?">${escapeHtml(material ? material.description : '')}</textarea>
      </div>
    </form>
    <div class="modal-footer">
      <button type="button" class="btn btn-outline" data-modal-close>Cancel</button>
      <button type="submit" class="btn btn-primary" id="save-material-btn" form="material-form">
        <i data-lucide="save" class="icon"></i> ${isEdit ? 'Update Material' : 'Save Material'}
      </button>
    </div>
  `;
  const { overlay, close } = ModalManager.open(html, { wide: true });
  const form = $('#material-form', overlay);
  form.onsubmit = async event => {
    event.preventDefault();
    const url = validateMaterialUrl($('#material-url', overlay).value);
    if (!url) {
      showToast('error', 'Enter a valid http or https resource URL.');
      return;
    }

    const button = $('#save-material-btn', overlay);
    button.disabled = true;
    const updatedMaterial = {
      id: isEdit ? material.id : `mat-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      title: $('#material-title', overlay).value.trim(),
      subject: $('#material-subject', overlay).value.trim(),
      batch: $('#material-batch', overlay).value.trim(),
      type: $('#material-type', overlay).value,
      url,
      description: $('#material-description', overlay).value.trim(),
      createdDate: isEdit ? (material.createdDate || todayISO()) : todayISO()
    };
    if (!updatedMaterial.title || !updatedMaterial.subject || !updatedMaterial.batch) {
      button.disabled = false;
      showToast('error', 'Select a scheduled subject and batch, and complete the title.');
      return;
    }

    const existingIndex = STATE.materials.findIndex(item => String(item.id) === String(updatedMaterial.id));
    if (existingIndex >= 0) STATE.materials[existingIndex] = updatedMaterial;
    else STATE.materials.unshift(updatedMaterial);
    saveStorage(LS_KEYS.MATERIALS, STATE.materials);
    close();
    renderMaterialsPage();
    try {
      if (window.apiRequest) await window.apiRequest('saveMaterial', { material: updatedMaterial });
      showToast('success', isEdit ? 'Study material updated.' : 'Study material saved.');
    } catch (error) {
      console.error('Material saved locally but backend sync failed:', error);
      showToast('warning', 'Material saved locally, but Google Sheets sync failed.');
    }
  };
}

function validateMaterialUrl(value) {
  try {
    const url = new URL(String(value || '').trim());
    return ['http:', 'https:'].includes(url.protocol) ? url.href : '';
  } catch (error) {
    return '';
  }
}

async function deleteStudyMaterial(id) {
  const material = STATE.materials.find(item => String(item.id) === String(id));
  if (!material || !confirm(`Delete "${material.title}"?`)) return;
  STATE.materials = STATE.materials.filter(item => String(item.id) !== String(id));
  saveStorage(LS_KEYS.MATERIALS, STATE.materials);
  renderMaterialsPage();
  try {
    if (window.apiRequest) await window.apiRequest('deleteMaterial', { id });
    showToast('info', 'Study material deleted.');
  } catch (error) {
    console.error('Material deleted locally but backend sync failed:', error);
    showToast('warning', 'Material deleted locally, but Google Sheets sync failed.');
  }
}
