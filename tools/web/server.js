// ============================================================
// tools/web/server.js — Servidor HTTP & API REST para o CRUD SQLite
// ============================================================

const http = require('http');
const fs = require('fs');
const path = require('path');
const { DatabaseSync } = require('node:sqlite');

const PORT = process.env.PORT || 3000;
const DB_PATH = path.resolve(__dirname, '../../clientes_vox.db');
const PUBLIC_DIR = path.resolve(__dirname, 'public');

// ── Conexão SQLite ──────────────────────────────────────────
const db = new DatabaseSync(DB_PATH);

// Inicialização da Tabela
db.exec(`
  CREATE TABLE IF NOT EXISTS clientes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    telefone TEXT,
    cidade TEXT,
    saldo REAL DEFAULT 0.0,
    criado_em DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// Função de sementes (Seed) caso a tabela esteja vazia
function seedIfEmpty() {
  const countStmt = db.prepare('SELECT COUNT(*) as total FROM clientes');
  const count = countStmt.get().total;
  if (count === 0) {
    const insert = db.prepare(`
      INSERT INTO clientes (nome, email, telefone, cidade, saldo) VALUES (?, ?, ?, ?, ?)
    `);
    insert.run('Mauricio Abreu', 'mauricio@voxlang.org', '(21) 98888-1111', 'Rio de Janeiro', 1500.50);
    insert.run('Beatriz Lima', 'beatriz@email.com', '(11) 97777-2222', 'São Paulo', 3200.00);
    insert.run('Carlos Eduardo', 'carlos@empresa.com', '(31) 96666-3333', 'Belo Horizonte', 450.75);
    insert.run('Fernanda Souza', 'fernanda@tech.io', '(41) 95555-4444', 'Curitiba', 8900.20);
    console.log('[SQLite] Dados iniciais de demonstração inseridos com sucesso.');
  }
}
seedIfEmpty();

// ── Utilitários HTTP ─────────────────────────────────────────
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

// ── Servidor HTTP ────────────────────────────────────────────
const server = http.createServer(async (req, res) => {
  // CORS Pre-flight
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

  // ── API REST ───────────────────────────────────────────────

  // 1. GET /api/clientes (Listagem e Busca)
  if (req.method === 'GET' && pathname === '/api/clientes') {
    try {
      const search = url.searchParams.get('search') || '';
      let stmt;
      if (search) {
        stmt = db.prepare(`
          SELECT * FROM clientes
          WHERE nome LIKE ? OR email LIKE ? OR cidade LIKE ?
          ORDER BY id DESC
        `);
        const q = `%${search}%`;
        const rows = stmt.all(q, q, q);
        return jsonResponse(res, 200, { success: true, data: rows });
      } else {
        stmt = db.prepare('SELECT * FROM clientes ORDER BY id DESC');
        const rows = stmt.all();
        return jsonResponse(res, 200, { success: true, data: rows });
      }
    } catch (err) {
      return jsonResponse(res, 500, { success: false, error: err.message });
    }
  }

  // 2. GET /api/stats (Métricas da Dashboard)
  if (req.method === 'GET' && pathname === '/api/stats') {
    try {
      const stats = db.prepare(`
        SELECT 
          COUNT(*) as total_clientes,
          COALESCE(SUM(saldo), 0) as saldo_total,
          COALESCE(AVG(saldo), 0) as saldo_medio,
          COUNT(DISTINCT cidade) as total_cidades
        FROM clientes
      `).get();
      return jsonResponse(res, 200, { success: true, data: stats });
    } catch (err) {
      return jsonResponse(res, 500, { success: false, error: err.message });
    }
  }

  // 3. POST /api/clientes (Criação de Cliente)
  if (req.method === 'POST' && pathname === '/api/clientes') {
    try {
      const body = await parseBody(req);
      const { nome, email, telefone, cidade, saldo } = body;

      if (!nome || !email) {
        return jsonResponse(res, 400, { success: false, error: 'Nome e E-mail são obrigatórios.' });
      }

      const stmt = db.prepare(`
        INSERT INTO clientes (nome, email, telefone, cidade, saldo)
        VALUES (?, ?, ?, ?, ?)
      `);
      stmt.run(
        String(nome).trim(),
        String(email).trim().toLowerCase(),
        String(telefone || '').trim(),
        String(cidade || '').trim(),
        Number(saldo) || 0.0
      );

      // Obter o cliente inserido
      const novoCliente = db.prepare('SELECT * FROM clientes WHERE email = ?').get(String(email).trim().toLowerCase());
      return jsonResponse(res, 201, { success: true, data: novoCliente, message: 'Cliente cadastrado com sucesso!' });
    } catch (err) {
      if (err.message && err.message.includes('UNIQUE constraint failed')) {
        return jsonResponse(res, 409, { success: false, error: 'Já existe um cliente cadastrado com este e-mail.' });
      }
      return jsonResponse(res, 500, { success: false, error: err.message });
    }
  }

  // 4. PUT /api/clientes/:id (Atualização de Cliente)
  const putMatch = pathname.match(/^\/api\/clientes\/(\d+)$/);
  if (req.method === 'PUT' && putMatch) {
    try {
      const id = Number(putMatch[1]);
      const body = await parseBody(req);
      const { nome, email, telefone, cidade, saldo } = body;

      const clienteExistente = db.prepare('SELECT * FROM clientes WHERE id = ?').get(id);
      if (!clienteExistente) {
        return jsonResponse(res, 404, { success: false, error: 'Cliente não encontrado.' });
      }

      const stmt = db.prepare(`
        UPDATE clientes 
        SET nome = ?, email = ?, telefone = ?, cidade = ?, saldo = ?
        WHERE id = ?
      `);
      stmt.run(
        String(nome ?? clienteExistente.nome).trim(),
        String(email ?? clienteExistente.email).trim().toLowerCase(),
        String(telefone ?? clienteExistente.telefone).trim(),
        String(cidade ?? clienteExistente.cidade).trim(),
        saldo !== undefined ? Number(saldo) : clienteExistente.saldo,
        id
      );

      const clienteAtualizado = db.prepare('SELECT * FROM clientes WHERE id = ?').get(id);
      return jsonResponse(res, 200, { success: true, data: clienteAtualizado, message: 'Cliente atualizado com sucesso!' });
    } catch (err) {
      return jsonResponse(res, 500, { success: false, error: err.message });
    }
  }

  // 5. DELETE /api/clientes/:id (Remoção de Cliente)
  const delMatch = pathname.match(/^\/api\/clientes\/(\d+)$/);
  if (req.method === 'DELETE' && delMatch) {
    try {
      const id = Number(delMatch[1]);
      const clienteExistente = db.prepare('SELECT * FROM clientes WHERE id = ?').get(id);
      if (!clienteExistente) {
        return jsonResponse(res, 404, { success: false, error: 'Cliente não encontrado.' });
      }

      db.prepare('DELETE FROM clientes WHERE id = ?').run(id);
      return jsonResponse(res, 200, { success: true, message: `Cliente #${id} removido com sucesso.` });
    } catch (err) {
      return jsonResponse(res, 500, { success: false, error: err.message });
    }
  }

  // 6. POST /api/seed (Restaurar dados de teste)
  if (req.method === 'POST' && pathname === '/api/seed') {
    try {
      db.exec('DROP TABLE IF EXISTS clientes;');
      db.exec(`
        CREATE TABLE IF NOT EXISTS clientes (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          nome TEXT NOT NULL,
          email TEXT NOT NULL UNIQUE,
          telefone TEXT,
          cidade TEXT,
          saldo REAL DEFAULT 0.0,
          criado_em DATETIME DEFAULT CURRENT_TIMESTAMP
        );
      `);
      seedIfEmpty();
      return jsonResponse(res, 200, { success: true, message: 'Banco de dados restaurado com dados de demonstração.' });
    } catch (err) {
      return jsonResponse(res, 500, { success: false, error: err.message });
    }
  }

  // ── Servir Arquivos Estáticos (Frontend) ──────────────────────
  let filePath = path.join(PUBLIC_DIR, pathname === '/' ? 'index.html' : pathname);

  // Segurança de diretório
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
  console.log(`🚀 Servidor Web CRUD Vox + SQLite Ativo!`);
  console.log(`🌐 Acesse no seu navegador: http://localhost:${PORT}`);
  console.log(`📦 Banco de Dados: ${DB_PATH}`);
  console.log(`======================================================\n`);
});
