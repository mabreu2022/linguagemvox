// ==============================================================================
// clientes/server.js — Servidor Comercial MVC Web para a Linguagem Vox
// Módulos Integrados: Clientes, Produtos, Estoque e PDV com Banco SQLite
// ==============================================================================

const http = require('http');
const fs = require('fs');
const path = require('path');
const { DatabaseSync } = require('node:sqlite');

const PORT = process.env.PORT || 3000;
const DB_PATH = path.resolve(__dirname, 'db/clientes_vox.db');
const PUBLIC_DIR = path.resolve(__dirname, 'web');

// Garante que o diretório db exista
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

// ── Conexão SQLite Nativa ──────────────────────────────────────────────────────
const db = new DatabaseSync(DB_PATH);

// ── Inicialização de Tabelas ──────────────────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS clientes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    telefone TEXT,
    cidade TEXT,
    saldo REAL DEFAULT 0.0
  );

  CREATE TABLE IF NOT EXISTS produtos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    codigo TEXT NOT NULL UNIQUE,
    nome TEXT NOT NULL,
    categoria TEXT,
    preco REAL NOT NULL,
    estoque INTEGER DEFAULT 0,
    estoque_min INTEGER DEFAULT 5
  );

  CREATE TABLE IF NOT EXISTS estoque_movimentos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    produto_id INTEGER NOT NULL,
    tipo TEXT NOT NULL,
    quantidade INTEGER NOT NULL,
    saldo_anterior INTEGER NOT NULL,
    saldo_novo INTEGER NOT NULL,
    motivo TEXT,
    data_hora TEXT
  );

  CREATE TABLE IF NOT EXISTS vendas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    cliente_id INTEGER NOT NULL,
    cliente_nome TEXT NOT NULL,
    total_bruto REAL NOT NULL,
    desconto REAL DEFAULT 0.0,
    total_liquido REAL NOT NULL,
    forma_pagamento TEXT NOT NULL,
    data_hora TEXT
  );

  CREATE TABLE IF NOT EXISTS venda_itens (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    venda_id INTEGER NOT NULL,
    produto_id INTEGER NOT NULL,
    codigo TEXT,
    nome TEXT,
    quantidade INTEGER NOT NULL,
    preco_unit REAL NOT NULL,
    subtotal REAL NOT NULL
  );
`);

// Migração segura para adicionar coluna imagem caso a tabela já exista
try {
  db.exec('ALTER TABLE produtos ADD COLUMN imagem TEXT;');
} catch (e) {
  // Coluna já existe
}

// ── Seed Inicial de Dados (Se o banco estiver vazio) ──────────────────────────
function seedDatabase() {
  const countClientes = db.prepare('SELECT COUNT(*) as total FROM clientes').get().total;
  if (countClientes === 0) {
    const insertCliente = db.prepare('INSERT INTO clientes (nome, email, telefone, cidade, saldo) VALUES (?, ?, ?, ?, ?)');
    insertCliente.run('Mauricio Abreu', 'mauricio@voxlang.org', '(21) 98888-1111', 'Rio de Janeiro', 1500.00);
    insertCliente.run('Beatriz Lima', 'beatriz@empresa.com', '(11) 97777-2222', 'São Paulo', 3200.00);
    insertCliente.run('Carlos Eduardo', 'carlos@tech.io', '(31) 96666-3333', 'Belo Horizonte', 500.00);
    insertCliente.run('Fernanda Souza', 'fernanda@inovacao.com', '(41) 95555-4444', 'Curitiba', 4850.00);
  }

  const countProdutos = db.prepare('SELECT COUNT(*) as total FROM produtos').get().total;
  if (countProdutos === 0) {
    const insertProd = db.prepare('INSERT INTO produtos (codigo, nome, categoria, preco, estoque, estoque_min, imagem) VALUES (?, ?, ?, ?, ?, ?, ?)');
    insertProd.run('PROD-001', 'Teclado Mecânico RGB', 'Periféricos', 299.90, 15, 5, 'img/prod_teclado.jpg');
    insertProd.run('PROD-002', 'Mouse Gamer 16000 DPI', 'Periféricos', 179.50, 4, 5, 'img/prod_mouse.jpg');
    insertProd.run('PROD-003', 'Monitor 27 Pol 165Hz', 'Monitores', 1450.00, 8, 3, 'img/prod_monitor.jpg');
    insertProd.run('PROD-004', 'Headset Surround 7.1', 'Áudio', 349.00, 20, 6, 'img/prod_headset.jpg');
    insertProd.run('PROD-005', 'SSD NVMe 1TB PCIe 4.0', 'Armazenamento', 489.90, 3, 5, 'img/prod_ssd.jpg');
    insertProd.run('PROD-006', 'Cadeira Ergonômica Pro', 'Mobiliário', 899.00, 6, 2, 'img/prod_cadeira.jpg');
  }

  // Atualiza produtos existentes que estejam sem foto definida
  const imgMap = {
    'PROD-001': 'img/prod_teclado.jpg',
    'PROD-002': 'img/prod_mouse.jpg',
    'PROD-003': 'img/prod_monitor.jpg',
    'PROD-004': 'img/prod_headset.jpg',
    'PROD-005': 'img/prod_ssd.jpg',
    'PROD-006': 'img/prod_cadeira.jpg',
  };
  for (const [cod, img] of Object.entries(imgMap)) {
    db.prepare("UPDATE produtos SET imagem = ? WHERE codigo = ? AND (imagem IS NULL OR imagem = '')").run(img, cod);
  }
}
seedDatabase();

// ── Utilitários HTTP ──────────────────────────────────────────────────────────
function jsonResponse(res, status, data) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  });
  res.end(JSON.stringify(data));
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (err) {
        reject(err);
      }
    });
    req.on('error', reject);
  });
}

function getFormattedDateTime() {
  const now = new Date();
  const pad = n => String(n).padStart(2, '0');
  const d = pad(now.getDate());
  const m = pad(now.getMonth() + 1);
  const y = now.getFullYear();
  const hr = pad(now.getHours());
  const min = pad(now.getMinutes());
  const s = pad(now.getSeconds());
  return `${d}/${m}/${y} ${hr}:${min}:${s}`;
}

// ── Servidor HTTP e Roteador REST ─────────────────────────────────────────────
const server = http.createServer(async (req, res) => {
  // CORS
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    });
    return res.end();
  }

  const url = new URL(req.url, `http://${req.headers.host}`);
  const pathname = url.pathname;

  // ============================================================================
  // API: ESTATÍSTICAS GERAIS (KPIs PARA A DASHBOARD)
  // ============================================================================
  if (req.method === 'GET' && pathname === '/api/stats') {
    try {
      const totalClientes = db.prepare('SELECT COUNT(*) as c FROM clientes').get().c;
      const totalProdutos = db.prepare('SELECT COUNT(*) as p FROM produtos').get().p;
      const prodStats = db.prepare('SELECT SUM(estoque) as total_itens, SUM(estoque * preco) as valor_estoque FROM produtos').get();
      const alertasEstoque = db.prepare('SELECT COUNT(*) as a FROM produtos WHERE estoque <= estoque_min').get().a;
      const vendasStats = db.prepare('SELECT COUNT(*) as total_vendas, COALESCE(SUM(total_liquido), 0) as total_faturado FROM vendas').get();

      return jsonResponse(res, 200, {
        success: true,
        data: {
          totalClientes,
          totalProdutos,
          totalItensEstoque: prodStats.total_itens || 0,
          valorEstoque: prodStats.valor_estoque || 0,
          alertasEstoque,
          totalVendas: vendasStats.total_vendas,
          totalFaturado: vendasStats.total_faturado
        }
      });
    } catch (err) {
      return jsonResponse(res, 500, { success: false, error: err.message });
    }
  }

  // ============================================================================
  // API: CLIENTES (CRUD COMPLETO)
  // ============================================================================
  if (req.method === 'GET' && pathname === '/api/clientes') {
    try {
      const search = (url.searchParams.get('search') || '').trim();
      let rows;
      if (search) {
        const q = `%${search}%`;
        rows = db.prepare(`
          SELECT * FROM clientes 
          WHERE nome LIKE ? OR email LIKE ? OR cidade LIKE ?
          ORDER BY id DESC
        `).all(q, q, q);
      } else {
        rows = db.prepare('SELECT * FROM clientes ORDER BY id DESC').all();
      }
      return jsonResponse(res, 200, { success: true, data: rows });
    } catch (err) {
      return jsonResponse(res, 500, { success: false, error: err.message });
    }
  }

  if (req.method === 'POST' && pathname === '/api/clientes') {
    try {
      const { nome, email, telefone, cidade, saldo } = await parseBody(req);
      if (!nome || !email) {
        return jsonResponse(res, 400, { success: false, error: 'Nome e E-mail são obrigatórios.' });
      }

      const stmt = db.prepare('INSERT INTO clientes (nome, email, telefone, cidade, saldo) VALUES (?, ?, ?, ?, ?)');
      stmt.run(
        String(nome).trim(),
        String(email).trim().toLowerCase(),
        String(telefone || '').trim(),
        String(cidade || '').trim(),
        Number(saldo) || 0.0
      );

      const novo = db.prepare('SELECT * FROM clientes WHERE email = ?').get(String(email).trim().toLowerCase());
      return jsonResponse(res, 201, { success: true, data: novo, message: 'Cliente cadastrado com sucesso!' });
    } catch (err) {
      if (err.message && err.message.includes('UNIQUE constraint failed')) {
        return jsonResponse(res, 409, { success: false, error: 'Já existe um cliente cadastrado com este e-mail.' });
      }
      return jsonResponse(res, 500, { success: false, error: err.message });
    }
  }

  const clienteIdMatch = pathname.match(/^\/api\/clientes\/(\d+)$/);
  if (req.method === 'PUT' && clienteIdMatch) {
    try {
      const id = Number(clienteIdMatch[1]);
      const { nome, email, telefone, cidade, saldo } = await parseBody(req);
      const clienteAtual = db.prepare('SELECT * FROM clientes WHERE id = ?').get(id);
      if (!clienteAtual) {
        return jsonResponse(res, 404, { success: false, error: 'Cliente não encontrado.' });
      }

      db.prepare(`
        UPDATE clientes 
        SET nome = ?, email = ?, telefone = ?, cidade = ?, saldo = ?
        WHERE id = ?
      `).run(
        String(nome || clienteAtual.nome).trim(),
        String(email || clienteAtual.email).trim().toLowerCase(),
        String(telefone || clienteAtual.telefone).trim(),
        String(cidade || clienteAtual.cidade).trim(),
        saldo !== undefined ? Number(saldo) : clienteAtual.saldo,
        id
      );

      const atualizado = db.prepare('SELECT * FROM clientes WHERE id = ?').get(id);
      return jsonResponse(res, 200, { success: true, data: atualizado, message: 'Cliente atualizado!' });
    } catch (err) {
      return jsonResponse(res, 500, { success: false, error: err.message });
    }
  }

  if (req.method === 'DELETE' && clienteIdMatch) {
    try {
      const id = Number(clienteIdMatch[1]);
      db.prepare('DELETE FROM clientes WHERE id = ?').run(id);
      return jsonResponse(res, 200, { success: true, message: `Cliente #${id} removido com sucesso.` });
    } catch (err) {
      return jsonResponse(res, 500, { success: false, error: err.message });
    }
  }

  // ============================================================================
  // API: PRODUTOS (CRUD COMPLETO)
  // ============================================================================
  if (req.method === 'GET' && pathname === '/api/produtos') {
    try {
      const search = (url.searchParams.get('search') || '').trim();
      const categoria = (url.searchParams.get('categoria') || '').trim();

      let query = 'SELECT * FROM produtos WHERE 1=1';
      const params = [];

      if (categoria && categoria !== 'Todas') {
        query += ' AND categoria = ?';
        params.push(categoria);
      }

      if (search) {
        query += ' AND (codigo LIKE ? OR nome LIKE ? OR categoria LIKE ?)';
        const q = `%${search}%`;
        params.push(q, q, q);
      }

      query += ' ORDER BY id DESC';
      const rows = db.prepare(query).all(...params);
      return jsonResponse(res, 200, { success: true, data: rows });
    } catch (err) {
      return jsonResponse(res, 500, { success: false, error: err.message });
    }
  }

  if (req.method === 'POST' && pathname === '/api/produtos') {
    try {
      const { codigo, nome, categoria, preco, estoque, estoque_min, imagem } = await parseBody(req);
      if (!codigo || !nome || preco === undefined) {
        return jsonResponse(res, 400, { success: false, error: 'Código SKU, Nome e Preço são obrigatórios.' });
      }

      const cod = String(codigo).trim().toUpperCase();
      const nom = String(nome).trim();
      const cat = String(categoria || 'Geral').trim();
      const prc = Number(preco);
      const est = Number(estoque) || 0;
      const min = Number(estoque_min) || 5;

      // Imagem personalizada ou fallback baseado na categoria/código
      let img = imagem ? String(imagem).trim() : null;
      if (!img) {
        const catLower = cat.toLowerCase();
        if (catLower.includes('peri') || nom.toLowerCase().includes('mouse')) img = 'img/prod_mouse.jpg';
        else if (catLower.includes('peri') || nom.toLowerCase().includes('teclado')) img = 'img/prod_teclado.jpg';
        else if (catLower.includes('monit') || nom.toLowerCase().includes('tela')) img = 'img/prod_monitor.jpg';
        else if (catLower.includes('áudio') || catLower.includes('audio') || nom.toLowerCase().includes('headset')) img = 'img/prod_headset.jpg';
        else if (catLower.includes('armazen') || nom.toLowerCase().includes('ssd')) img = 'img/prod_ssd.jpg';
        else if (catLower.includes('mobili') || nom.toLowerCase().includes('cadeira')) img = 'img/prod_cadeira.jpg';
        else img = 'img/prod_teclado.jpg';
      }

      if (prc <= 0) {
        return jsonResponse(res, 400, { success: false, error: 'O preço do produto deve ser maior que zero.' });
      }

      const stmt = db.prepare(`
        INSERT INTO produtos (codigo, nome, categoria, preco, estoque, estoque_min, imagem)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);
      stmt.run(cod, nom, cat, prc, est, min, img);

      // Se informou estoque inicial > 0, grava no histórico de movimentação
      const inserido = db.prepare('SELECT * FROM produtos WHERE codigo = ?').get(cod);
      if (est > 0) {
        db.prepare(`
          INSERT INTO estoque_movimentos (produto_id, tipo, quantidade, saldo_anterior, saldo_novo, motivo, data_hora)
          VALUES (?, 'ENTRADA_INICIAL', ?, 0, ?, 'Cadastro inicial de produto', ?)
        `).run(inserido.id, est, est, getFormattedDateTime());
      }

      return jsonResponse(res, 201, { success: true, data: inserido, message: 'Produto cadastrado com sucesso!' });
    } catch (err) {
      if (err.message && err.message.includes('UNIQUE constraint failed')) {
        return jsonResponse(res, 409, { success: false, error: 'Já existe um produto com este código SKU.' });
      }
      return jsonResponse(res, 500, { success: false, error: err.message });
    }
  }

  const produtoIdMatch = pathname.match(/^\/api\/produtos\/(\d+)$/);
  if (req.method === 'PUT' && produtoIdMatch) {
    try {
      const id = Number(produtoIdMatch[1]);
      const { codigo, nome, categoria, preco, estoque_min, imagem } = await parseBody(req);

      const prodAtual = db.prepare('SELECT * FROM produtos WHERE id = ?').get(id);
      if (!prodAtual) {
        return jsonResponse(res, 404, { success: false, error: 'Produto não encontrado.' });
      }

      db.prepare(`
        UPDATE produtos 
        SET codigo = ?, nome = ?, categoria = ?, preco = ?, estoque_min = ?, imagem = ?
        WHERE id = ?
      `).run(
        String(codigo || prodAtual.codigo).trim().toUpperCase(),
        String(nome || prodAtual.nome).trim(),
        String(categoria || prodAtual.categoria).trim(),
        preco !== undefined ? Number(preco) : prodAtual.preco,
        estoque_min !== undefined ? Number(estoque_min) : prodAtual.estoque_min,
        imagem !== undefined ? String(imagem).trim() : prodAtual.imagem,
        id
      );

      const atualizado = db.prepare('SELECT * FROM produtos WHERE id = ?').get(id);
      return jsonResponse(res, 200, { success: true, data: atualizado, message: 'Produto atualizado!' });
    } catch (err) {
      return jsonResponse(res, 500, { success: false, error: err.message });
    }
  }

  if (req.method === 'DELETE' && produtoIdMatch) {
    try {
      const id = Number(produtoIdMatch[1]);
      db.prepare('DELETE FROM produtos WHERE id = ?').run(id);
      return jsonResponse(res, 200, { success: true, message: `Produto #${id} removido com sucesso.` });
    } catch (err) {
      return jsonResponse(res, 500, { success: false, error: err.message });
    }
  }

  // ============================================================================
  // API: CONTROLE DE ESTOQUE (ENTRADAS, ALERTAS E AUDITORIA)
  // ============================================================================
  if (req.method === 'GET' && pathname === '/api/estoque/movimentos') {
    try {
      const rows = db.prepare(`
        SELECT m.*, p.codigo as produto_codigo, p.nome as produto_nome
        FROM estoque_movimentos m
        JOIN produtos p ON p.id = m.produto_id
        ORDER BY m.id DESC
        LIMIT 50
      `).all();
      return jsonResponse(res, 200, { success: true, data: rows });
    } catch (err) {
      return jsonResponse(res, 500, { success: false, error: err.message });
    }
  }

  if (req.method === 'GET' && pathname === '/api/estoque/alertas') {
    try {
      const criticos = db.prepare(`
        SELECT * FROM produtos 
        WHERE estoque <= estoque_min 
        ORDER BY (estoque - estoque_min) ASC
      `).all();
      return jsonResponse(res, 200, { success: true, data: criticos });
    } catch (err) {
      return jsonResponse(res, 500, { success: false, error: err.message });
    }
  }

  if (req.method === 'POST' && pathname === '/api/estoque/entrada') {
    try {
      const { produto_id, quantidade, motivo } = await parseBody(req);
      const qtd = Number(quantidade);
      const pid = Number(produto_id);

      if (!pid || isNaN(qtd) || qtd <= 0) {
        return jsonResponse(res, 400, { success: false, error: 'Produto e quantidade válida (> 0) são obrigatórios.' });
      }

      const prod = db.prepare('SELECT * FROM produtos WHERE id = ?').get(pid);
      if (!prod) {
        return jsonResponse(res, 404, { success: false, error: 'Produto não encontrado.' });
      }

      const saldoAnterior = prod.estoque;
      const saldoNovo = saldoAnterior + qtd;

      // Atualiza o estoque do produto
      db.prepare('UPDATE produtos SET estoque = ? WHERE id = ?').run(saldoNovo, pid);

      // Registra a movimentação
      db.prepare(`
        INSERT INTO estoque_movimentos (produto_id, tipo, quantidade, saldo_anterior, saldo_novo, motivo, data_hora)
        VALUES (?, 'ENTRADA', ?, ?, ?, ?, ?)
      `).run(pid, qtd, saldoAnterior, saldoNovo, String(motivo || 'Entrada manual de mercadoria').trim(), getFormattedDateTime());

      return jsonResponse(res, 200, {
        success: true,
        data: { produto_id: pid, saldoAnterior, saldoNovo, quantidade: qtd },
        message: `Entrada de ${qtd} un registrada! Novo saldo de ${prod.nome}: ${saldoNovo} un.`
      });
    } catch (err) {
      return jsonResponse(res, 500, { success: false, error: err.message });
    }
  }

  // ============================================================================
  // API: PDV (PONTO DE VENDA / CHECKOUT / CUPOM FISCAL)
  // ============================================================================
  if (req.method === 'POST' && pathname === '/api/pdv/vender') {
    try {
      const { cliente_id, cliente_nome, itens, desconto, forma_pagamento, valor_pago } = await parseBody(req);

      if (!itens || !Array.isArray(itens) || itens.length === 0) {
        return jsonResponse(res, 400, { success: false, error: 'O carrinho do PDV não pode estar vazio.' });
      }

      // 1. Validação Estrita de Estoque em Tempo Real
      for (const item of itens) {
        const prod = db.prepare('SELECT * FROM produtos WHERE id = ?').get(item.produto_id);
        if (!prod) {
          return jsonResponse(res, 404, { success: false, error: `Produto #${item.produto_id} não encontrado.` });
        }
        if (prod.estoque < item.quantidade) {
          return jsonResponse(res, 400, {
            success: false,
            error: `Estoque insuficiente para o produto "${prod.nome}"! Solicitado: ${item.quantidade} un | Disponível em prateleira: ${prod.estoque} un.`
          });
        }
      }

      // 2. Cálculos Financeiros
      let totalBruto = 0;
      for (const item of itens) {
        totalBruto += Number(item.quantidade) * Number(item.preco_unit);
      }
      const desc = Math.max(0, Number(desconto) || 0);
      const totalLiquido = Math.max(0, totalBruto - desc);
      const pgto = String(forma_pagamento || 'DINHEIRO').toUpperCase();
      const vPago = Number(valor_pago) || totalLiquido;
      const troco = Math.max(0, vPago - totalLiquido);
      const dataHora = getFormattedDateTime();

      // 3. Gravação da Venda
      const insertVenda = db.prepare(`
        INSERT INTO vendas (cliente_id, cliente_nome, total_bruto, desconto, total_liquido, forma_pagamento, data_hora)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);
      insertVenda.run(
        Number(cliente_id) || 1,
        String(cliente_nome || 'Consumidor Final').trim(),
        totalBruto,
        desc,
        totalLiquido,
        pgto,
        dataHora
      );

      // Obter ID gerado da venda
      const vendaId = db.prepare('SELECT last_insert_rowid() as id').get().id;

      // 4. Inserção dos Itens e Baixa Atômica de Estoque
      const insertItem = db.prepare(`
        INSERT INTO venda_itens (venda_id, produto_id, codigo, nome, quantidade, preco_unit, subtotal)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);
      const updateEstoque = db.prepare('UPDATE produtos SET estoque = ? WHERE id = ?');
      const insertMovimento = db.prepare(`
        INSERT INTO estoque_movimentos (produto_id, tipo, quantidade, saldo_anterior, saldo_novo, motivo, data_hora)
        VALUES (?, 'SAIDA_VENDA', ?, ?, ?, ?, ?)
      `);

      for (const item of itens) {
        const subtotal = Number(item.quantidade) * Number(item.preco_unit);
        insertItem.run(vendaId, item.produto_id, item.codigo, item.nome, item.quantidade, item.preco_unit, subtotal);

        // Baixa de estoque
        const prod = db.prepare('SELECT estoque FROM produtos WHERE id = ?').get(item.produto_id);
        const saldoAnterior = prod.estoque;
        const saldoNovo = saldoAnterior - item.quantidade;
        updateEstoque.run(saldoNovo, item.produto_id);

        // Movimento de auditoria
        insertMovimento.run(
          item.produto_id,
          item.quantidade,
          saldoAnterior,
          saldoNovo,
          `Venda PDV #${vendaId}`,
          dataHora
        );
      }

      // 5. Retorna dados completos para emissão do Cupom Fiscal
      return jsonResponse(res, 201, {
        success: true,
        data: {
          vendaId,
          clienteNome: cliente_nome || 'Consumidor Final',
          itens,
          totalBruto,
          desconto: desc,
          totalLiquido,
          formaPagamento: pgto,
          valorPago: vPago,
          troco,
          dataHora
        },
        message: `Venda #${vendaId} concluída com sucesso! Estoque atualizado.`
      });
    } catch (err) {
      return jsonResponse(res, 500, { success: false, error: err.message });
    }
  }

  if (req.method === 'GET' && pathname === '/api/pdv/vendas') {
    try {
      const vendas = db.prepare('SELECT * FROM vendas ORDER BY id DESC LIMIT 50').all();
      return jsonResponse(res, 200, { success: true, data: vendas });
    } catch (err) {
      return jsonResponse(res, 500, { success: false, error: err.message });
    }
  }

  // ============================================================================
  // API: REINICIALIZAR DEMO (SEED)
  // ============================================================================
  if (req.method === 'POST' && pathname === '/api/seed') {
    try {
      db.exec(`
        DELETE FROM venda_itens;
        DELETE FROM vendas;
        DELETE FROM estoque_movimentos;
        DELETE FROM produtos;
        DELETE FROM clientes;
      `);
      seedDatabase();
      return jsonResponse(res, 200, { success: true, message: 'Dados de demonstração restaurados com sucesso!' });
    } catch (err) {
      return jsonResponse(res, 500, { success: false, error: err.message });
    }
  }

  // ============================================================================
  // SERVIDOR DE ARQUIVOS ESTÁTICOS (FRONTEND COM MENU LATERAL)
  // ============================================================================
  let safePath = pathname === '/' ? 'index.html' : pathname;
  let filePath = path.join(PUBLIC_DIR, safePath);

  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403);
    return res.end('Acesso Negado');
  }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      return res.end('Página não encontrada');
    }

    const ext = path.extname(filePath).toLowerCase();
    const mimeTypes = {
      '.html': 'text/html; charset=utf-8',
      '.css': 'text/css; charset=utf-8',
      '.js': 'application/javascript; charset=utf-8',
      '.json': 'application/json; charset=utf-8',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.webp': 'image/webp',
      '.svg': 'image/svg+xml',
      '.ico': 'image/x-icon',
    };
    const contentType = mimeTypes[ext] || 'application/octet-stream';

    res.writeHead(200, { 'Content-Type': contentType });
    fs.createReadStream(filePath).pipe(res);
  });
});

server.listen(PORT, () => {
  console.log(`\n======================================================`);
  console.log(`🚀 Sistema Comercial MVC Vox (Clientes, Produtos, Estoque e PDV)`);
  console.log(`🌐 Acesse no seu navegador: http://localhost:${PORT}`);
  console.log(`📦 Banco de Dados SQLite: ${DB_PATH}`);
  console.log(`======================================================\n`);
});
