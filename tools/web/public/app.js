// ============================================================
// app.js — Lógica Client-Side da Dashboard VoxDB
// ============================================================

const state = {
  clientes: [],
  editingId: null,
  deletingId: null,
  searchQuery: '',
};

// Formatador de Moeda Brasileira
const brlFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});

// ── Inicialização ────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  setupEventListeners();
  loadData();
});

function setupEventListeners() {
  // Busca em tempo real com debounce
  const inputSearch = document.getElementById('input-search');
  const btnClearSearch = document.getElementById('btn-clear-search');

  let debounceTimer;
  inputSearch.addEventListener('input', (e) => {
    state.searchQuery = e.target.value.trim();
    btnClearSearch.style.display = state.searchQuery ? 'block' : 'none';
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      loadClientes();
    }, 250);
  });

  btnClearSearch.addEventListener('click', () => {
    inputSearch.value = '';
    state.searchQuery = '';
    btnClearSearch.style.display = 'none';
    loadClientes();
  });

  // Abertura de Modais
  document.getElementById('btn-open-create-modal').addEventListener('click', openCreateModal);
  document.getElementById('btn-empty-action').addEventListener('click', openCreateModal);
  document.getElementById('btn-close-modal').addEventListener('click', closeModal);
  document.getElementById('btn-cancel-modal').addEventListener('click', closeModal);

  // Modal de Exclusão
  document.getElementById('btn-close-delete-modal').addEventListener('click', closeDeleteModal);
  document.getElementById('btn-cancel-delete').addEventListener('click', closeDeleteModal);
  document.getElementById('btn-confirm-delete').addEventListener('click', handleDelete);

  // Envio de Formulário
  document.getElementById('client-form').addEventListener('submit', handleFormSubmit);

  // Ações da Barra Superior
  document.getElementById('btn-seed-data').addEventListener('click', handleSeed);
  document.getElementById('btn-export-csv').addEventListener('click', handleExportCSV);

  // Fechar modais ao clicar no backdrop ou ESC
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeModal();
      closeDeleteModal();
    }
  });

  document.getElementById('client-modal').addEventListener('click', (e) => {
    if (e.target.id === 'client-modal') closeModal();
  });

  document.getElementById('delete-modal').addEventListener('click', (e) => {
    if (e.target.id === 'delete-modal') closeDeleteModal();
  });
}

// ── Carregamento de Dados ────────────────────────────────────
async function loadData() {
  await Promise.all([loadStats(), loadClientes()]);
}

async function loadStats() {
  try {
    const res = await fetch('/api/stats');
    const json = await res.json();
    if (json.success) {
      const { total_clientes, saldo_total, saldo_medio, total_cidades } = json.data;
      document.getElementById('kpi-total').textContent = total_clientes;
      document.getElementById('kpi-saldo-total').textContent = brlFormatter.format(saldo_total || 0);
      document.getElementById('kpi-saldo-medio').textContent = brlFormatter.format(saldo_medio || 0);
      document.getElementById('kpi-cidades').textContent = total_cidades;
    }
  } catch (err) {
    console.error('Erro ao carregar estatísticas:', err);
  }
}

async function loadClientes() {
  try {
    const url = state.searchQuery 
      ? `/api/clientes?search=${encodeURIComponent(state.searchQuery)}`
      : '/api/clientes';

    const res = await fetch(url);
    const json = await res.json();
    if (json.success) {
      state.clientes = json.data;
      renderTable(state.clientes);
    }
  } catch (err) {
    console.error('Erro ao carregar clientes:', err);
    showToast('Erro ao carregar a lista de clientes.', 'error');
  }
}

// ── Renderização da Tabela ───────────────────────────────────
function renderTable(clientes) {
  const tbody = document.getElementById('clientes-table-body');
  const emptyState = document.getElementById('empty-state');
  const countLabel = document.getElementById('label-table-count');

  tbody.innerHTML = '';
  countLabel.textContent = `Mostrando ${clientes.length} cliente${clientes.length === 1 ? '' : 's'}`;

  if (!clientes || clientes.length === 0) {
    emptyState.style.display = 'flex';
    return;
  }

  emptyState.style.display = 'none';

  clientes.forEach(cliente => {
    const tr = document.createElement('tr');
    tr.id = `client-row-${cliente.id}`;

    // Iniciais do Avatar
    const initials = cliente.nome
      .split(' ')
      .slice(0, 2)
      .map(part => part[0])
      .join('')
      .toUpperCase() || 'C';

    tr.innerHTML = `
      <td><span class="id-badge">#${cliente.id}</span></td>
      <td>
        <div class="client-cell">
          <div class="avatar">${initials}</div>
          <div class="client-details">
            <span class="client-name">${escapeHtml(cliente.nome)}</span>
            <span class="client-email">${escapeHtml(cliente.email)}</span>
          </div>
        </div>
      </td>
      <td>${escapeHtml(cliente.telefone || '—')}</td>
      <td>${escapeHtml(cliente.cidade || '—')}</td>
      <td><span class="balance-cell">${brlFormatter.format(cliente.saldo || 0)}</span></td>
      <td>
        <div class="action-buttons">
          <button class="action-btn edit-btn" title="Editar Cliente" onclick="openEditModal(${cliente.id})">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          </button>
          <button class="action-btn delete-btn" title="Excluir Cliente" onclick="openDeleteModal(${cliente.id}, '${escapeQuotes(cliente.nome)}')">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
          </button>
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

// ── Modais de Formulário ──────────────────────────────────────
function openCreateModal() {
  state.editingId = null;
  document.getElementById('modal-title').textContent = 'Cadastrar Novo Cliente';
  document.getElementById('btn-save-text').textContent = 'Cadastrar Cliente';
  document.getElementById('field-client-id').value = '';
  document.getElementById('client-form').reset();
  clearErrors();
  document.getElementById('client-modal').style.display = 'flex';
  document.getElementById('field-nome').focus();
}

function openEditModal(id) {
  const cliente = state.clientes.find(c => c.id === id);
  if (!cliente) return;

  state.editingId = id;
  document.getElementById('modal-title').textContent = `Editar Cliente #${id}`;
  document.getElementById('btn-save-text').textContent = 'Salvar Alterações';
  document.getElementById('field-client-id').value = id;

  document.getElementById('field-nome').value = cliente.nome || '';
  document.getElementById('field-email').value = cliente.email || '';
  document.getElementById('field-telefone').value = cliente.telefone || '';
  document.getElementById('field-cidade').value = cliente.cidade || '';
  document.getElementById('field-saldo').value = cliente.saldo !== undefined ? cliente.saldo : '0.00';

  clearErrors();
  document.getElementById('client-modal').style.display = 'flex';
  document.getElementById('field-nome').focus();
}

function closeModal() {
  document.getElementById('client-modal').style.display = 'none';
  state.editingId = null;
}

// ── Modais de Exclusão ───────────────────────────────────────
function openDeleteModal(id, nome) {
  state.deletingId = id;
  document.getElementById('delete-client-name').textContent = nome;
  document.getElementById('delete-modal').style.display = 'flex';
}

function closeDeleteModal() {
  document.getElementById('delete-modal').style.display = 'none';
  state.deletingId = null;
}

// ── Envio do Formulário (CREATE / UPDATE) ─────────────────────
async function handleFormSubmit(e) {
  e.preventDefault();
  clearErrors();

  const nome = document.getElementById('field-nome').value.trim();
  const email = document.getElementById('field-email').value.trim();
  const telefone = document.getElementById('field-telefone').value.trim();
  const cidade = document.getElementById('field-cidade').value.trim();
  const saldo = parseFloat(document.getElementById('field-saldo').value) || 0.0;

  // Validação simples
  let hasError = false;
  if (!nome) {
    showFieldError('error-nome', 'Por favor, informe o nome do cliente.');
    hasError = true;
  }
  if (!email || !email.includes('@')) {
    showFieldError('error-email', 'Informe um endereço de e-mail válido.');
    hasError = true;
  }
  if (hasError) return;

  const payload = { nome, email, telefone, cidade, saldo };
  const btnSave = document.getElementById('btn-save-client');
  btnSave.disabled = true;

  try {
    let res;
    if (state.editingId) {
      // UPDATE
      res = await fetch(`/api/clientes/${state.editingId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    } else {
      // CREATE
      res = await fetch('/api/clientes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    }

    const json = await res.json();
    if (res.ok && json.success) {
      showToast(json.message || 'Operação realizada com sucesso!', 'success');
      closeModal();
      await loadData();
    } else {
      showToast(json.error || 'Erro ao processar solicitação.', 'error');
    }
  } catch (err) {
    showToast('Falha na comunicação com o servidor SQLite.', 'error');
  } finally {
    btnSave.disabled = false;
  }
}

// ── Exclusão (DELETE) ────────────────────────────────────────
async function handleDelete() {
  if (!state.deletingId) return;

  const btnDelete = document.getElementById('btn-confirm-delete');
  btnDelete.disabled = true;

  try {
    const res = await fetch(`/api/clientes/${state.deletingId}`, {
      method: 'DELETE',
    });
    const json = await res.json();
    if (res.ok && json.success) {
      showToast(json.message, 'success');
      closeDeleteModal();
      await loadData();
    } else {
      showToast(json.error || 'Erro ao excluir registro.', 'error');
    }
  } catch (err) {
    showToast('Erro de conexão ao excluir.', 'error');
  } finally {
    btnDelete.disabled = false;
  }
}

// ── Restaurar Dados Demo (SEED) ──────────────────────────────
async function handleSeed() {
  if (!confirm('Deseja recriar o banco SQLite com os 4 clientes iniciais de teste?')) return;
  try {
    const res = await fetch('/api/seed', { method: 'POST' });
    const json = await res.json();
    if (json.success) {
      showToast(json.message, 'info');
      await loadData();
    }
  } catch (err) {
    showToast('Erro ao restaurar banco de dados.', 'error');
  }
}

// ── Exportação CSV ───────────────────────────────────────────
function handleExportCSV() {
  if (!state.clientes || state.clientes.length === 0) {
    showToast('Não há dados para exportar.', 'error');
    return;
  }

  const headers = ['ID', 'Nome', 'Email', 'Telefone', 'Cidade', 'Saldo'];
  const rows = state.clientes.map(c => [
    c.id,
    `"${c.nome.replace(/"/g, '""')}"`,
    `"${c.email.replace(/"/g, '""')}"`,
    `"${(c.telefone || '').replace(/"/g, '""')}"`,
    `"${(c.cidade || '').replace(/"/g, '""')}"`,
    c.saldo
  ]);

  const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + 
    [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n');

  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', `clientes_vox_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  showToast('Planilha CSV gerada com sucesso!', 'success');
}

// ── Notificações Toast ───────────────────────────────────────
function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;

  const iconMap = {
    success: '✅',
    error: '⚠️',
    info: 'ℹ️'
  };

  toast.innerHTML = `<span>${iconMap[type] || 'ℹ️'}</span> <span>${escapeHtml(message)}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(50px)';
    setTimeout(() => toast.remove(), 300);
  }, 3200);
}

// ── Helpers ──────────────────────────────────────────────────
function showFieldError(elemId, message) {
  const el = document.getElementById(elemId);
  if (el) el.textContent = message;
}

function clearErrors() {
  document.querySelectorAll('.field-error').forEach(el => { el.textContent = ''; });
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function escapeQuotes(str) {
  if (!str) return '';
  return String(str).replace(/'/g, "\\'").replace(/"/g, '\\"');
}
