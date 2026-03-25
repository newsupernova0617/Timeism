/**
 * Admin Dashboard Frontend
 */

let currentTable = 'users';
let currentDataTable = null;
let restoreFilename = null;

// Extract token from URL
const urlParams = new URLSearchParams(window.location.search);
const adminToken = urlParams.get('token');

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
  loadTableData('users');
  loadBackupList();

  // Table navigation
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', function() {
      const table = this.dataset.table;
      loadTableData(table);
    });
  });

  // Search input
  document.getElementById('search-input').addEventListener('input', function() {
    if (currentDataTable) {
      currentDataTable.search(this.value).draw();
    }
  });

  // Page size
  document.getElementById('page-size-select').addEventListener('change', function() {
    loadTableData(currentTable);
  });
});

function loadTableData(tableName) {
  currentTable = tableName;
  const pageSize = parseInt(document.getElementById('page-size-select').value) || 25;

  fetch(`/api/admin/tables/${tableName}?page=1&limit=${pageSize}&token=${adminToken}`)
    .then(res => res.json())
    .then(data => {
      renderTable(tableName, data.data);
      showToast(`Loaded ${tableName}`, 'success');
    })
    .catch(err => {
      console.error('Load failed:', err);
      showToast(`Failed to load ${tableName}`, 'error');
    });
}

function renderTable(tableName, records) {
  const table = document.getElementById('admin-table');
  const thead = document.getElementById('table-headers');
  const tbody = table.querySelector('tbody');

  // Clear existing
  thead.innerHTML = '';
  tbody.innerHTML = '';

  if (records.length === 0) {
    tbody.innerHTML = '<tr><td colspan="10">No records found</td></tr>';
    return;
  }

  // Get columns from first record
  const columns = Object.keys(records[0]);

  // Render headers
  const headerHtml = columns.map(col => `<th>${col}</th>`).join('') + '<th>Actions</th>';
  thead.innerHTML = `<tr>${headerHtml}</tr>`;

  // Render rows
  records.forEach(record => {
    const id = record.userId || record.sessionId || record.eventId || record.commentId || record.responseId;
    const rowHtml = columns.map(col => `<td>${record[col] || '-'}</td>`).join('') +
      `<td class="actions">
        <button onclick="editRecord('${tableName}', '${id}')" class="btn-small">Edit</button>
        <button onclick="deleteRecord('${tableName}', '${id}')" class="btn-small danger">Delete</button>
      </td>`;

    tbody.innerHTML += `<tr>${rowHtml}</tr>`;
  });
}

function editRecord(tableName, id) {
  fetch(`/api/admin/${tableName}/${id}?token=${adminToken}`)
    .then(res => res.json())
    .then(record => {
      showEditModal(tableName, id, record);
    })
    .catch(err => showToast('Failed to load record', 'error'));
}

function showEditModal(tableName, id, record) {
  const modal = document.getElementById('edit-modal');
  const formFields = document.getElementById('form-fields');

  formFields.innerHTML = Object.entries(record)
    .map(([key, value]) => `
      <div class="form-group">
        <label>${key}</label>
        <input type="text" name="${key}" value="${value || ''}" />
      </div>
    `).join('');

  modal.dataset.table = tableName;
  modal.dataset.id = id;
  modal.style.display = 'block';
}

function closeEditModal() {
  document.getElementById('edit-modal').style.display = 'none';
}

function saveRecord(event) {
  event.preventDefault();

  const modal = document.getElementById('edit-modal');
  const tableName = modal.dataset.table;
  const id = modal.dataset.id;

  const form = document.getElementById('edit-form');
  const formData = new FormData(form);
  const data = Object.fromEntries(formData);

  fetch(`/api/admin/${tableName}/${id}?token=${adminToken}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  })
    .then(res => res.json())
    .then(result => {
      showToast('Record saved', 'success');
      closeEditModal();
      loadTableData(tableName);
    })
    .catch(err => showToast('Save failed', 'error'));
}

function deleteRecord(tableName, id) {
  if (!confirm('Delete this record?')) return;

  const softDelete = tableName === 'comments';

  fetch(`/api/admin/${tableName}/${id}?softDelete=${softDelete}&token=${adminToken}`, {
    method: 'DELETE'
  })
    .then(res => res.json())
    .then(result => {
      showToast('Record deleted', 'success');
      loadTableData(tableName);
    })
    .catch(err => showToast('Delete failed', 'error'));
}

function showAddModal() {
  document.getElementById('add-modal').style.display = 'block';
}

function closeAddModal() {
  document.getElementById('add-modal').style.display = 'none';
}

function addRecord(event) {
  event.preventDefault();

  const form = document.getElementById('add-form');
  const formData = new FormData(form);
  const data = Object.fromEntries(formData);

  fetch(`/api/admin/${currentTable}?token=${adminToken}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  })
    .then(res => res.json())
    .then(result => {
      showToast('Record created', 'success');
      closeAddModal();
      loadTableData(currentTable);
    })
    .catch(err => showToast('Create failed', 'error'));
}

function downloadBackupNow() {
  showToast('Creating backup...', 'info');

  fetch(`/api/admin/backup/download?token=${adminToken}`, { method: 'POST' })
    .then(res => {
      if (res.ok) {
        return res.blob().then(blob => {
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `synctime-backup-${new Date().toISOString().split('T')[0]}.db`;
          a.click();
          showToast('Backup downloaded', 'success');
          loadBackupList();
        });
      }
      return res.json().then(err => { throw err; });
    })
    .catch(err => showToast('Backup failed: ' + err.message, 'error'));
}

function triggerManualBackup() {
  showToast('Triggering backup...', 'info');

  fetch(`/api/admin/backup/trigger?token=${adminToken}`)
    .then(res => res.json())
    .then(result => {
      showToast(`Backup created: ${result.filename}`, 'success');
      loadBackupList();
    })
    .catch(err => showToast('Trigger failed', 'error'));
}

function loadBackupList() {
  fetch(`/api/admin/backup/list?token=${adminToken}`)
    .then(res => res.json())
    .then(backups => {
      const container = document.getElementById('backup-list');

      if (backups.length === 0) {
        container.innerHTML = '<p>No backups yet</p>';
        return;
      }

      const html = backups.map(backup => `
        <div class="backup-item">
          <span class="backup-name">${backup.filename}</span>
          <span class="backup-size">${(backup.size / 1024 / 1024).toFixed(2)} MB</span>
          <span class="backup-date">${new Date(backup.createdAt).toLocaleString()}</span>
          <div class="backup-actions">
            <button onclick="downloadBackup('${backup.filename}')" class="btn-small">Download</button>
            <button onclick="showRestoreModal('${backup.filename}')" class="btn-small">Restore</button>
          </div>
        </div>
      `).join('');

      container.innerHTML = html;
    })
    .catch(err => console.error('Load backups failed:', err));
}

function downloadBackup(filename) {
  window.location.href = `/backups/${filename}`;
}

function showRestoreModal(filename) {
  restoreFilename = filename;
  document.getElementById('restore-warning').textContent = `Restoring from: ${filename}`;
  document.getElementById('restore-modal').style.display = 'block';
}

function closeRestoreModal() {
  document.getElementById('restore-modal').style.display = 'none';
}

function confirmRestore() {
  if (!restoreFilename) return;

  showToast('Restoring...', 'info');

  fetch(`/api/admin/backup/restore?token=${adminToken}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ filename: restoreFilename })
  })
    .then(res => res.json())
    .then(result => {
      showToast('Restore complete. Please restart the app.', 'success');
      closeRestoreModal();
    })
    .catch(err => showToast('Restore failed: ' + err.message, 'error'));
}

function logout() {
  window.location.href = '/';
}

function showToast(message, type = 'info') {
  const toast = document.getElementById('toast');
  if (!toast) {
    console.error('Toast element not found!');
    return;
  }
  toast.textContent = message;
  toast.className = `toast show ${type}`;

  setTimeout(() => {
    toast.className = 'toast';
  }, 3000);
}

// Close modals on outside click
window.onclick = function(event) {
  const editModal = document.getElementById('edit-modal');
  const addModal = document.getElementById('add-modal');
  const restoreModal = document.getElementById('restore-modal');

  if (event.target === editModal) editModal.style.display = 'none';
  if (event.target === addModal) addModal.style.display = 'none';
  if (event.target === restoreModal) restoreModal.style.display = 'none';
};
