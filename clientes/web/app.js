// ==============================================================================
// clientes/web/app.js — Lógica de Frontend para o Sistema Comercial Vox MVC
// Gerenciamento de Estado Reativo: Clientes, Produtos, Estoque e PDV
// ==============================================================================

const API_BASE = '';

const state = {
  activeView: 'clientes',
  clientes: [],
  produtos: [],
  estoqueMovimentos: [],
  estoqueAlertas: [],
  cart: [],
  stats: {},
};

// ── Utilitários de Formatação ──────────────────────────────────────────────────
function formatBRL(value) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(Number(value) || 0);
}

function showToast(message, type = 'success') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `
    <span>${type === 'success' ? '✓' : type === 'error' ? '✕' : 'ℹ'}</span>
    <span>${message}</span>
  `;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(20px)';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

// ── Navegação pelo Menu Lateral ───────────────────────────────────────────────
const viewMeta = {
  clientes: {
    title: 'Gestão de Clientes',
    subtitle: 'Controle relacional de clientes com persistência em SQLite',
    btnText: 'Novo Cliente',
    btnShow: true,
  },
  produtos: {
    title: 'Catálogo de Produtos',
    subtitle: 'Gerenciamento de SKUs, preços unitários e estoque mínimo',
    btnText: 'Novo Produto',
    btnShow: true,
  },
  estoque: {
    title: 'Controle de Estoque & Auditoria',
    subtitle: 'Registro de entradas, saídas automatizadas do PDV e alertas de reposição',
    btnText: 'Dar Entrada de Estoque',
    btnShow: true,
  },
  pdv: {
    title: 'Frente de Caixa (PDV)',
    subtitle: 'Venda ágil com validação de estoque em tempo real e cupom fiscal',
    btnText: 'Limpar Carrinho',
    btnShow: false,
  },
};

function switchView(viewName) {
  state.activeView = viewName;

  // Atualizar classes ativas nos botões do menu lateral
  document.querySelectorAll('.nav-item').forEach(btn => {
    if (btn.dataset.view === viewName) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });

  // Alternar painel visível
  document.querySelectorAll('.view-panel').forEach(panel => {
    panel.classList.remove('active');
  });
  const targetPanel = document.getElementById(`view-${viewName}`);
  if (targetPanel) targetPanel.classList.add('active');

  // Atualizar Topbar
  const meta = viewMeta[viewName];
  document.getElementById('current-view-title').textContent = meta.title;
  document.getElementById('current-view-subtitle').textContent = meta.subtitle;

  const topActionBtn = document.getElementById('btn-top-action');
  const topActionText = document.getElementById('btn-top-action-text');
  if (meta.btnShow) {
    topActionBtn.style.display = 'inline-flex';
    topActionText.textContent = meta.btnText;
  } else {
    topActionBtn.style.display = 'none';
  }

  // Recarregar dados específicos da view
  if (viewName === 'clientes') loadClientes();
  if (viewName === 'produtos') loadProdutos();
  if (viewName === 'estoque') loadEstoque();
  if (viewName === 'pdv') setupPdvView();
}

// ── Botão de Ação Superior Dinâmico ──────────────────────────────────────────
document.getElementById('btn-top-action').addEventListener('click', () => {
  if (state.activeView === 'clientes') {
    openModal('modal-cliente');
    document.getElementById('modal-cliente-title').textContent = 'Novo Cliente';
    document.getElementById('form-cliente').reset();
    document.getElementById('cli-id').value = '';
  } else if (state.activeView === 'produtos') {
    openModal('modal-produto');
    document.getElementById('modal-produto-title').textContent = 'Novo Produto';
    document.getElementById('form-produto').reset();
    document.getElementById('prod-id').value = '';
  } else if (state.activeView === 'estoque') {
    openModalEntradaEstoque();
  }
});

// ── Gestão de Modais ──────────────────────────────────────────────────────────
function openModal(modalId) {
  const m = document.getElementById(modalId);
  if (m) m.classList.add('active');
}

function closeModal(modalId) {
  const m = document.getElementById(modalId);
  if (m) m.classList.remove('active');
}

document.querySelectorAll('[data-close]').forEach(btn => {
  btn.addEventListener('click', () => {
    closeModal(btn.dataset.close);
  });
});

window.addEventListener('click', e => {
  if (e.target.classList.contains('modal-backdrop')) {
    e.target.classList.remove('active');
  }
});

// ── Estatísticas Globais (KPIs e Contadores do Menu Lateral) ──────────────────
async function loadGlobalStats() {
  try {
    const res = await fetch(`${API_BASE}/api/stats`);
    const json = await res.json();
    if (json.success) {
      state.stats = json.data;
      document.getElementById('counter-clientes').textContent = json.data.totalClientes;
      document.getElementById('counter-produtos').textContent = json.data.totalProdutos;

      const badgeAlert = document.getElementById('badge-alerta-estoque');
      if (json.data.alertasEstoque > 0) {
        badgeAlert.style.display = 'inline-flex';
        badgeAlert.textContent = json.data.alertasEstoque;
      } else {
        badgeAlert.style.display = 'none';
      }
    }
  } catch (err) {
    console.error('Erro ao carregar estatísticas:', err);
  }
}

// ==============================================================================
// 1. MÓDULO DE CLIENTES
// ==============================================================================
async function loadClientes(search = '') {
  try {
    const url = search ? `${API_BASE}/api/clientes?search=${encodeURIComponent(search)}` : `${API_BASE}/api/clientes`;
    const res = await fetch(url);
    const json = await res.json();
    if (json.success) {
      state.clientes = json.data;
      renderClientesTable(json.data);
      updateClientesKpis(json.data);
      loadGlobalStats();
    }
  } catch (err) {
    showToast('Erro ao carregar lista de clientes.', 'error');
  }
}

function updateClientesKpis(clientes) {
  const total = clientes.length;
  const saldoTotal = clientes.reduce((acc, c) => acc + (c.saldo || 0), 0);
  const saldoMedio = total > 0 ? saldoTotal / total : 0;
  const cidades = new Set(clientes.map(c => c.cidade).filter(Boolean)).size;

  document.getElementById('kpi-cli-total').textContent = total;
  document.getElementById('kpi-cli-saldo-total').textContent = formatBRL(saldoTotal);
  document.getElementById('kpi-cli-saldo-medio').textContent = formatBRL(saldoMedio);
  document.getElementById('kpi-cli-cidades').textContent = cidades;
}

function renderClientesTable(clientes) {
  const tbody = document.getElementById('tbody-clientes');
  if (clientes.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--text-muted); padding: 30px;">Nenhum cliente cadastrado.</td></tr>`;
    return;
  }

  tbody.innerHTML = clientes.map(c => `
    <tr>
      <td style="font-family: var(--font-mono); color: var(--text-muted);">#${c.id}</td>
      <td><strong>${c.nome}</strong></td>
      <td style="color: var(--text-secondary);">${c.email}</td>
      <td>${c.telefone || '—'}</td>
      <td>${c.cidade || '—'}</td>
      <td style="text-align: right; font-family: var(--font-mono); font-weight: 700;" class="${c.saldo >= 0 ? 'text-teal' : 'text-rose'}">
        ${formatBRL(c.saldo)}
      </td>
      <td class="table-actions">
        <button class="btn-icon" onclick="editCliente(${c.id})" title="Editar Cliente">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
        </button>
        <button class="btn-icon delete" onclick="deleteCliente(${c.id}, '${c.nome}')" title="Excluir Cliente">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
        </button>
      </td>
    </tr>
  `).join('');
}

document.getElementById('search-clientes').addEventListener('input', e => {
  loadClientes(e.target.value);
});

document.getElementById('form-cliente').addEventListener('submit', async e => {
  e.preventDefault();
  const id = document.getElementById('cli-id').value;
  const data = {
    nome: document.getElementById('cli-nome').value,
    email: document.getElementById('cli-email').value,
    telefone: document.getElementById('cli-telefone').value,
    cidade: document.getElementById('cli-cidade').value,
    saldo: parseFloat(document.getElementById('cli-saldo').value) || 0,
  };

  try {
    const url = id ? `${API_BASE}/api/clientes/${id}` : `${API_BASE}/api/clientes`;
    const method = id ? 'PUT' : 'POST';
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (json.success) {
      showToast(json.message);
      closeModal('modal-cliente');
      loadClientes();
    } else {
      showToast(json.error, 'error');
    }
  } catch (err) {
    showToast('Erro ao salvar cliente.', 'error');
  }
});

window.editCliente = function(id) {
  const c = state.clientes.find(item => item.id === id);
  if (!c) return;
  document.getElementById('cli-id').value = c.id;
  document.getElementById('cli-nome').value = c.nome;
  document.getElementById('cli-email').value = c.email;
  document.getElementById('cli-telefone').value = c.telefone || '';
  document.getElementById('cli-cidade').value = c.cidade || '';
  document.getElementById('cli-saldo').value = c.saldo || 0;
  document.getElementById('modal-cliente-title').textContent = 'Editar Cliente';
  openModal('modal-cliente');
};

window.deleteCliente = async function(id, nome) {
  if (!confirm(`Deseja realmente remover o cliente "${nome}"?`)) return;
  try {
    const res = await fetch(`${API_BASE}/api/clientes/${id}`, { method: 'DELETE' });
    const json = await res.json();
    if (json.success) {
      showToast(json.message);
      loadClientes();
    } else {
      showToast(json.error, 'error');
    }
  } catch (err) {
    showToast('Erro ao excluir cliente.', 'error');
  }
};

// ==============================================================================
// 2. MÓDULO DE PRODUTOS
// ==============================================================================
async function loadProdutos(search = '', categoria = 'Todas') {
  try {
    let url = `${API_BASE}/api/produtos?`;
    if (search) url += `search=${encodeURIComponent(search)}&`;
    if (categoria && categoria !== 'Todas') url += `categoria=${encodeURIComponent(categoria)}&`;

    const res = await fetch(url);
    const json = await res.json();
    if (json.success) {
      state.produtos = json.data;
      renderProdutosTable(json.data);
      updateProdutosKpis(json.data);
      loadGlobalStats();
    }
  } catch (err) {
    showToast('Erro ao carregar catálogo de produtos.', 'error');
  }
}

function updateProdutosKpis(produtos) {
  const total = produtos.length;
  const itens = produtos.reduce((acc, p) => acc + (p.estoque || 0), 0);
  const valorTotal = produtos.reduce((acc, p) => acc + ((p.estoque || 0) * (p.preco || 0)), 0);
  const criticos = produtos.filter(p => p.estoque <= p.estoque_min).length;

  document.getElementById('kpi-prod-total').textContent = total;
  document.getElementById('kpi-prod-itens').textContent = itens;
  document.getElementById('kpi-prod-valor').textContent = formatBRL(valorTotal);
  document.getElementById('kpi-prod-criticos').textContent = criticos;
}

function renderProdutosTable(produtos) {
  const tbody = document.getElementById('tbody-produtos');
  if (produtos.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--text-muted); padding: 30px;">Nenhum produto cadastrado.</td></tr>`;
    return;
  }

  tbody.innerHTML = produtos.map(p => {
    const isCritical = p.estoque <= p.estoque_min;
    return `
      <tr>
        <td><span class="sku-badge">${p.codigo}</span></td>
        <td><strong>${p.nome}</strong></td>
        <td><span style="font-size: 0.8rem; color: var(--text-secondary);">${p.categoria || 'Geral'}</span></td>
        <td style="text-align: right; font-family: var(--font-mono); font-weight: 700; color: var(--accent-teal);">
          ${formatBRL(p.preco)}
        </td>
        <td style="text-align: center;">
          <span class="stock-tag ${isCritical ? 'danger' : 'normal'}">
            ${isCritical ? '⚠️ ' : ''}${p.estoque} un
          </span>
        </td>
        <td style="text-align: center; font-family: var(--font-mono); color: var(--text-muted);">${p.estoque_min} un</td>
        <td class="table-actions">
          <button class="btn-icon" onclick="openEntradaForProduct(${p.id})" title="Dar Entrada neste item">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          </button>
          <button class="btn-icon" onclick="editProduto(${p.id})" title="Editar Produto">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          </button>
          <button class="btn-icon delete" onclick="deleteProduto(${p.id}, '${p.nome}')" title="Excluir Produto">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
          </button>
        </td>
      </tr>
    `;
  }).join('');
}

document.getElementById('search-produtos').addEventListener('input', () => {
  const s = document.getElementById('search-produtos').value;
  const c = document.getElementById('filter-categoria').value;
  loadProdutos(s, c);
});

document.getElementById('filter-categoria').addEventListener('change', () => {
  const s = document.getElementById('search-produtos').value;
  const c = document.getElementById('filter-categoria').value;
  loadProdutos(s, c);
});

document.getElementById('form-produto').addEventListener('submit', async e => {
  e.preventDefault();
  const id = document.getElementById('prod-id').value;
  const data = {
    codigo: document.getElementById('prod-codigo').value,
    nome: document.getElementById('prod-nome').value,
    categoria: document.getElementById('prod-categoria').value,
    preco: parseFloat(document.getElementById('prod-preco').value),
    estoque: parseInt(document.getElementById('prod-estoque').value, 10) || 0,
    estoque_min: parseInt(document.getElementById('prod-estoque-min').value, 10) || 5,
  };

  try {
    const url = id ? `${API_BASE}/api/produtos/${id}` : `${API_BASE}/api/produtos`;
    const method = id ? 'PUT' : 'POST';
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (json.success) {
      showToast(json.message);
      closeModal('modal-produto');
      loadProdutos();
    } else {
      showToast(json.error, 'error');
    }
  } catch (err) {
    showToast('Erro ao salvar produto.', 'error');
  }
});

window.editProduto = function(id) {
  const p = state.produtos.find(item => item.id === id);
  if (!p) return;
  document.getElementById('prod-id').value = p.id;
  document.getElementById('prod-codigo').value = p.codigo;
  document.getElementById('prod-nome').value = p.nome;
  document.getElementById('prod-categoria').value = p.categoria || '';
  document.getElementById('prod-preco').value = p.preco;
  document.getElementById('prod-estoque').value = p.estoque;
  document.getElementById('prod-estoque').disabled = true; // Edição não mexe no saldo direto, usa Entrada
  document.getElementById('prod-estoque-min').value = p.estoque_min;
  document.getElementById('modal-produto-title').textContent = 'Editar Produto';
  openModal('modal-produto');
};

window.deleteProduto = async function(id, nome) {
  if (!confirm(`Deseja realmente remover o produto "${nome}"?`)) return;
  try {
    const res = await fetch(`${API_BASE}/api/produtos/${id}`, { method: 'DELETE' });
    const json = await res.json();
    if (json.success) {
      showToast(json.message);
      loadProdutos();
    } else {
      showToast(json.error, 'error');
    }
  } catch (err) {
    showToast('Erro ao excluir produto.', 'error');
  }
};

// ==============================================================================
// 3. MÓDULO DE CONTROLE DE ESTOQUE
// ==============================================================================
async function loadEstoque() {
  try {
    // 1. Carregar Alertas de Estoque Mínimo
    const resAlertas = await fetch(`${API_BASE}/api/estoque/alertas`);
    const jsonAlertas = await resAlertas.json();
    if (jsonAlertas.success) {
      state.estoqueAlertas = jsonAlertas.data;
      renderEstoqueAlertas(jsonAlertas.data);
    }

    // 2. Carregar Histórico de Movimentações
    const resMov = await fetch(`${API_BASE}/api/estoque/movimentos`);
    const jsonMov = await resMov.json();
    if (jsonMov.success) {
      state.estoqueMovimentos = jsonMov.data;
      renderEstoqueMovimentos(jsonMov.data);
    }

    loadGlobalStats();
  } catch (err) {
    showToast('Erro ao carregar dados do estoque.', 'error');
  }
}

function renderEstoqueAlertas(alertas) {
  const container = document.getElementById('stock-alerts-container');
  const list = document.getElementById('stock-alerts-list');

  if (alertas.length === 0) {
    container.style.display = 'none';
    return;
  }

  container.style.display = 'block';
  list.innerHTML = alertas.map(p => `
    <div class="alert-item-box">
      <div class="alert-prod-info">
        <strong>${p.codigo} — ${p.nome}</strong>
        <span>Restam apenas ${p.estoque} un (Estoque Mínimo: ${p.estoque_min} un)</span>
      </div>
      <button class="btn btn-sm btn-primary" onclick="openEntradaForProduct(${p.id})">
        + Dar Entrada
      </button>
    </div>
  `).join('');
}

function renderEstoqueMovimentos(movimentos) {
  const tbody = document.getElementById('tbody-estoque-movimentos');
  if (movimentos.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; color: var(--text-muted); padding: 30px;">Nenhuma movimentação registrada.</td></tr>`;
    return;
  }

  tbody.innerHTML = movimentos.map(m => {
    const isEntrada = m.tipo.startsWith('ENTRADA');
    return `
      <tr>
        <td style="font-family: var(--font-mono); color: var(--text-muted);">#${m.id}</td>
        <td style="font-size: 0.8rem; color: var(--text-secondary);">${m.data_hora}</td>
        <td><strong>${m.produto_codigo}</strong> — ${m.produto_nome}</td>
        <td style="text-align: center;">
          <span class="stock-tag ${isEntrada ? 'normal' : 'danger'}">
            ${m.tipo}
          </span>
        </td>
        <td style="text-align: center; font-family: var(--font-mono); font-weight: 700;">
          ${isEntrada ? '+' : '-'}${m.quantidade} un
        </td>
        <td style="text-align: center; font-family: var(--font-mono); color: var(--text-muted);">${m.saldo_anterior} un</td>
        <td style="text-align: center; font-family: var(--font-mono); font-weight: 800; color: #fff;">${m.saldo_novo} un</td>
        <td style="color: var(--text-secondary); font-size: 0.82rem;">${m.motivo || '—'}</td>
      </tr>
    `;
  }).join('');
}

document.getElementById('btn-open-entrada-modal').addEventListener('click', () => {
  openModalEntradaEstoque();
});

async function openModalEntradaEstoque(selectedProdId = null) {
  // Carrega produtos para preencher o select
  const res = await fetch(`${API_BASE}/api/produtos`);
  const json = await res.json();
  if (json.success) {
    const select = document.getElementById('entrada-select-produto');
    select.innerHTML = json.data.map(p => `
      <option value="${p.id}" ${selectedProdId === p.id ? 'selected' : ''}>
        ${p.codigo} — ${p.nome} (Estoque Atual: ${p.estoque} un)
      </option>
    `).join('');
    document.getElementById('entrada-quantidade').value = 10;
    document.getElementById('entrada-motivo').value = 'NF-e de Entrada / Reposição';
    openModal('modal-entrada-estoque');
  }
}

window.openEntradaForProduct = function(prodId) {
  openModalEntradaEstoque(prodId);
};

document.getElementById('form-entrada-estoque').addEventListener('submit', async e => {
  e.preventDefault();
  const prodId = document.getElementById('entrada-select-produto').value;
  const qtd = parseInt(document.getElementById('entrada-quantidade').value, 10);
  const motivo = document.getElementById('entrada-motivo').value;

  try {
    const res = await fetch(`${API_BASE}/api/estoque/entrada`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ produto_id: prodId, quantidade: qtd, motivo }),
    });
    const json = await res.json();
    if (json.success) {
      showToast(json.message);
      closeModal('modal-entrada-estoque');
      loadEstoque();
      loadProdutos();
    } else {
      showToast(json.error, 'error');
    }
  } catch (err) {
    showToast('Erro ao registrar entrada de estoque.', 'error');
  }
});

// ==============================================================================
// 4. MÓDULO DE PONTO DE VENDA (PDV)
// ==============================================================================
async function setupPdvView() {
  // Carrega clientes para o dropdown da comanda
  const resCli = await fetch(`${API_BASE}/api/clientes`);
  const jsonCli = await resCli.json();
  if (jsonCli.success) {
    const select = document.getElementById('pdv-select-cliente');
    select.innerHTML = `
      <option value="1">Consumidor Final (Venda Rápida)</option>
      ${jsonCli.data.map(c => `<option value="${c.id}">${c.nome} (${c.cidade || 'Cliente'})</option>`).join('')}
    `;
  }

  // Carrega produtos para a grade do PDV
  loadPdvProducts();
  updatePdvCartDisplay();
}

async function loadPdvProducts(search = '') {
  try {
    const url = search ? `${API_BASE}/api/produtos?search=${encodeURIComponent(search)}` : `${API_BASE}/api/produtos`;
    const res = await fetch(url);
    const json = await res.json();
    if (json.success) {
      renderPdvProductsGrid(json.data);
    }
  } catch (err) {
    console.error('Erro ao carregar catálogo do PDV:', err);
  }
}

function renderPdvProductsGrid(produtos) {
  const grid = document.getElementById('pdv-products-grid');
  if (produtos.length === 0) {
    grid.innerHTML = `<div style="grid-column: 1 / -1; text-align: center; color: var(--text-muted); padding: 40px;">Nenhum produto encontrado.</div>`;
    return;
  }

  grid.innerHTML = produtos.map(p => {
    const outOfStock = p.estoque <= 0;
    return `
      <div class="pdv-prod-card ${outOfStock ? 'out-of-stock' : ''}" onclick="${outOfStock ? '' : `addItemToCart(${p.id})`}">
        <div>
          <div class="pdv-prod-category">${p.categoria || 'Geral'}</div>
          <div class="pdv-prod-name">${p.nome}</div>
        </div>
        <div class="pdv-prod-footer">
          <div class="pdv-prod-price">${formatBRL(p.preco)}</div>
          <div class="pdv-prod-stock">${p.estoque} em estoque</div>
        </div>
      </div>
    `;
  }).join('');
}

document.getElementById('pdv-product-search').addEventListener('input', e => {
  loadPdvProducts(e.target.value);
});

// Adição de Item com Validação Rigorosa de Estoque
window.addItemToCart = async function(produtoId) {
  // Busca o produto atualizado
  const res = await fetch(`${API_BASE}/api/produtos`);
  const json = await res.json();
  const prod = json.data.find(p => p.id === produtoId);
  if (!prod) return;

  const itemNoCarrinho = state.cart.find(i => i.produto_id === produtoId);
  const qtdAtualNoCarrinho = itemNoCarrinho ? itemNoCarrinho.quantidade : 0;

  if (qtdAtualNoCarrinho + 1 > prod.estoque) {
    showToast(`ESTOQUE INSUFICIENTE para "${prod.nome}"! Disponível em prateleira: ${prod.estoque} un.`, 'error');
    return;
  }

  if (itemNoCarrinho) {
    itemNoCarrinho.quantidade += 1;
    itemNoCarrinho.subtotal = itemNoCarrinho.quantidade * itemNoCarrinho.preco_unit;
  } else {
    state.cart.push({
      produto_id: prod.id,
      codigo: prod.codigo,
      nome: prod.nome,
      preco_unit: prod.preco,
      quantidade: 1,
      subtotal: prod.preco,
      maxEstoque: prod.estoque,
    });
  }

  updatePdvCartDisplay();
  showToast(`+1 "${prod.nome}" adicionado ao cupom.`, 'success');
};

window.changeCartQty = function(produtoId, delta) {
  const item = state.cart.find(i => i.produto_id === produtoId);
  if (!item) return;

  if (delta > 0 && item.quantidade + 1 > item.maxEstoque) {
    showToast(`Limite de estoque atingido para "${item.nome}" (${item.maxEstoque} un)!`, 'warning');
    return;
  }

  item.quantidade += delta;
  if (item.quantidade <= 0) {
    state.cart = state.cart.filter(i => i.produto_id !== produtoId);
  } else {
    item.subtotal = item.quantidade * item.preco_unit;
  }

  updatePdvCartDisplay();
};

window.removeCartItem = function(produtoId) {
  state.cart = state.cart.filter(i => i.produto_id !== produtoId);
  updatePdvCartDisplay();
};

document.getElementById('btn-pdv-clear-cart').addEventListener('click', () => {
  if (state.cart.length === 0) return;
  if (confirm('Deseja limpar todo o carrinho do PDV?')) {
    state.cart = [];
    updatePdvCartDisplay();
  }
});

function updatePdvCartDisplay() {
  const tbody = document.getElementById('cart-items-body');
  const emptyState = document.getElementById('cart-empty-state');
  const badgeCarrinho = document.getElementById('badge-pdv-carrinho');

  const totalItens = state.cart.reduce((acc, i) => acc + i.quantidade, 0);
  if (totalItens > 0) {
    badgeCarrinho.style.display = 'inline-flex';
    badgeCarrinho.textContent = totalItens;
  } else {
    badgeCarrinho.style.display = 'none';
  }

  if (state.cart.length === 0) {
    tbody.innerHTML = '';
    emptyState.style.display = 'flex';
  } else {
    emptyState.style.display = 'none';
    tbody.innerHTML = state.cart.map(item => `
      <tr>
        <td>
          <div style="font-weight: 600;">${item.nome}</div>
          <small style="color: var(--text-muted); font-family: var(--font-mono);">${item.codigo}</small>
        </td>
        <td style="text-align: center;">
          <div class="cart-qty-ctrl">
            <button class="cart-qty-btn" onclick="changeCartQty(${item.produto_id}, -1)">-</button>
            <span class="cart-qty-val">${item.quantidade}</span>
            <button class="cart-qty-btn" onclick="changeCartQty(${item.produto_id}, 1)">+</button>
          </div>
        </td>
        <td style="text-align: right; font-family: var(--font-mono); font-size: 0.82rem;">${formatBRL(item.preco_unit)}</td>
        <td style="text-align: right; font-family: var(--font-mono); font-weight: 700; color: var(--accent-teal);">
          ${formatBRL(item.subtotal)}
        </td>
        <td style="text-align: center;">
          <button class="btn-icon delete" onclick="removeCartItem(${item.produto_id})" style="width: 24px; height: 24px;">&times;</button>
        </td>
      </tr>
    `).join('');
  }

  recalculateTotals();
}

function recalculateTotals() {
  const subtotal = state.cart.reduce((acc, i) => acc + i.subtotal, 0);
  const descInput = parseFloat(document.getElementById('pdv-desconto-input').value) || 0;
  const totalLiquido = Math.max(0, subtotal - descInput);

  document.getElementById('pdv-subtotal-display').textContent = formatBRL(subtotal);
  document.getElementById('pdv-total-liquido-display').textContent = formatBRL(totalLiquido);

  const valorPagoInput = document.getElementById('pdv-valor-pago-input');
  // Se ainda estiver com o padrão de 0 ou igual ao subtotal, sugere o valor líquido
  if (parseFloat(valorPagoInput.value) === 0 || parseFloat(valorPagoInput.value) < totalLiquido) {
    valorPagoInput.value = totalLiquido.toFixed(2);
  }

  const vPago = parseFloat(valorPagoInput.value) || totalLiquido;
  const troco = Math.max(0, vPago - totalLiquido);
  document.getElementById('pdv-troco-display').textContent = formatBRL(troco);
}

document.getElementById('pdv-desconto-input').addEventListener('input', recalculateTotals);
document.getElementById('pdv-valor-pago-input').addEventListener('input', recalculateTotals);

// Fechamento e Emissão de Venda no PDV
document.getElementById('btn-pdv-finalizar').addEventListener('click', async () => {
  if (state.cart.length === 0) {
    showToast('O carrinho do PDV está vazio! Adicione produtos antes de concluir.', 'warning');
    return;
  }

  const selectCliente = document.getElementById('pdv-select-cliente');
  const clienteId = selectCliente.value;
  const clienteNome = selectCliente.options[selectCliente.selectedIndex].text;

  const desconto = parseFloat(document.getElementById('pdv-desconto-input').value) || 0;
  const formaPagamento = document.querySelector('input[name="pay-method"]:checked').value;
  const valorPago = parseFloat(document.getElementById('pdv-valor-pago-input').value) || 0;

  const payload = {
    cliente_id: clienteId,
    cliente_nome: clienteNome,
    itens: state.cart,
    desconto,
    forma_pagamento: formaPagamento,
    valor_pago: valorPago,
  };

  try {
    const res = await fetch(`${API_BASE}/api/pdv/vender`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const json = await res.json();
    if (json.success) {
      showToast(json.message, 'success');
      // Renderiza e abre o Cupom Fiscal
      renderThermalReceipt(json.data);
      openModal('modal-cupom-fiscal');

      // Limpa carrinho
      state.cart = [];
      document.getElementById('pdv-desconto-input').value = '0.00';
      updatePdvCartDisplay();
      loadPdvProducts();
      loadGlobalStats();
    } else {
      showToast(json.error, 'error');
    }
  } catch (err) {
    showToast('Erro ao processar venda no PDV.', 'error');
  }
});

function renderThermalReceipt(data) {
  document.getElementById('receipt-id').textContent = String(data.vendaId).padStart(4, '0');
  document.getElementById('receipt-data').textContent = data.dataHora;
  document.getElementById('receipt-cliente').textContent = data.clienteNome;

  const itemsList = document.getElementById('receipt-items-list');
  itemsList.innerHTML = data.itens.map((item, idx) => `
    <div class="receipt-item-row">
      <span class="r-col-idx">${idx + 1}</span>
      <span class="r-col-desc">${item.nome.substring(0, 18)}</span>
      <span class="r-col-qtd">${item.quantidade}</span>
      <span class="r-col-unit">${item.preco_unit.toFixed(2)}</span>
      <span class="r-col-tot">${(item.quantidade * item.preco_unit).toFixed(2)}</span>
    </div>
  `).join('');

  document.getElementById('receipt-total-bruto').textContent = formatBRL(data.totalBruto);
  if (data.desconto > 0) {
    document.getElementById('receipt-desconto-row').style.display = 'flex';
    document.getElementById('receipt-desconto').textContent = `- ${formatBRL(data.desconto)}`;
  } else {
    document.getElementById('receipt-desconto-row').style.display = 'none';
  }

  document.getElementById('receipt-total-liquido').textContent = formatBRL(data.totalLiquido);
  document.getElementById('receipt-forma-pgto').textContent = data.formaPagamento;
  document.getElementById('receipt-valor-pago').textContent = formatBRL(data.valorPago);
  document.getElementById('receipt-troco').textContent = formatBRL(data.troco);
}

document.getElementById('btn-print-receipt').addEventListener('click', () => {
  window.print();
});

// ==============================================================================
// 5. SEED / RESTAURAÇÃO DE DADOS INICIAIS
// ==============================================================================
document.getElementById('btn-seed-data').addEventListener('click', async () => {
  if (!confirm('Deseja restaurar os dados iniciais de demonstração (Clientes e Produtos)?')) return;
  try {
    const res = await fetch(`${API_BASE}/api/seed`, { method: 'POST' });
    const json = await res.json();
    if (json.success) {
      showToast(json.message);
      loadClientes();
      loadProdutos();
      loadEstoque();
      loadGlobalStats();
    }
  } catch (err) {
    showToast('Erro ao restaurar banco de dados.', 'error');
  }
});

// ── Alternar Menu Lateral em Telas Menores ────────────────────────────────────
document.getElementById('btn-toggle-sidebar').addEventListener('click', () => {
  document.getElementById('app-sidebar').classList.toggle('open');
});

// ── Registro de Eventos nos Botões do Menu Lateral ───────────────────────────
document.querySelectorAll('.nav-item').forEach(btn => {
  btn.addEventListener('click', () => {
    const view = btn.dataset.view;
    switchView(view);
    document.getElementById('app-sidebar').classList.remove('open');
  });
});

// Atalho de Teclado F2 para finalizar venda se estiver no PDV
window.addEventListener('keydown', e => {
  if (e.key === 'F2' && state.activeView === 'pdv') {
    e.preventDefault();
    document.getElementById('btn-pdv-finalizar').click();
  }
});

// ── Inicialização do Sistema ──────────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', () => {
  switchView('clientes');
  loadGlobalStats();
});
