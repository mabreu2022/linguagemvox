// ==============================================================================
// tools/vox-rad/server.js — Servidor Backend da IDE Vox Studio RAD
// ==============================================================================

const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const PORT = process.env.PORT || 4500;
const PUBLIC_DIR = path.resolve(__dirname, 'public');
const WORKSPACE_DIR = path.resolve(__dirname, '../../');
const DB_PATH = path.resolve(WORKSPACE_DIR, 'clientes_vox.db');
const DIST_WEB_DIR = path.resolve(WORKSPACE_DIR, 'dist/web-app');
let webAppProc = null;

// Tentar inicializar SQLite nativo se disponível
let sqliteDb = null;
try {
  const { DatabaseSync } = require('node:sqlite');
  if (fs.existsSync(DB_PATH)) {
    sqliteDb = new DatabaseSync(DB_PATH);
  }
} catch (e) {
  console.log('[SQLite] Módulo nativo node:sqlite não disponível ou opcional:', e.message);
}

// MIME types comuns
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.vox': 'text/plain; charset=utf-8',
  '.vxf': 'application/json; charset=utf-8',
  '.vdpk': 'text/plain; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8'
};

function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  });
  res.end(JSON.stringify(data));
}

function parseBody(req) {
  return new Promise((resolve) => {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      if (!body) return resolve({});
      try {
        resolve(JSON.parse(body));
      } catch (err) {
        try {
          // Tentativa de correção de aspas escapadas pelo terminal
          resolve(JSON.parse(body.replace(/\\"/g, '"')));
        } catch (e2) {
          resolve({});
        }
      }
    });
    req.on('error', () => resolve({}));
  });
}

function execGit(args, cwd = WORKSPACE_DIR) {
  return new Promise((resolve) => {
    const p = spawn('git', args, { cwd, shell: false, windowsHide: true });
    let stdout = '';
    let stderr = '';
    p.stdout.on('data', d => { stdout += d.toString(); });
    p.stderr.on('data', d => { stderr += d.toString(); });
    p.on('close', code => {
      resolve({ code, stdout: stdout.trim(), stderr: stderr.trim() });
    });
    p.on('error', err => {
      resolve({ code: -1, stdout: '', stderr: err.message });
    });
  });
}

const server = http.createServer(async (req, res) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    });
    res.end();
    return;
  }

  const urlObj = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = urlObj.pathname;

  // --------------------------------------------------------------------------
  // API: Status do Servidor e da Linguagem Vox
  // --------------------------------------------------------------------------
  if (pathname === '/api/status' && req.method === 'GET') {
    return sendJson(res, 200, {
      status: 'online',
      version: '1.1.0',
      radVersion: '1.0.0',
      workspace: WORKSPACE_DIR,
      sqliteConnected: !!sqliteDb
    });
  }

  // --------------------------------------------------------------------------
  // API: Consultar Dados SQLite para Data-Aware Components (TDBGrid, TDBEdit)
  // --------------------------------------------------------------------------
  if ((pathname === '/api/db/query' || pathname === '/api/data') && (req.method === 'POST' || req.method === 'GET')) {
    try {
      let sql = urlObj.searchParams.get('sql') || 'SELECT * FROM clientes LIMIT 50';
      let params = [];

      if (req.method === 'POST') {
        const body = await parseBody(req);
        if (body.sql) sql = body.sql;
        if (Array.isArray(body.params)) params = body.params;
      }

      if (!sqliteDb) {
        // Fallback de dados caso o db não esteja montado
        return sendJson(res, 200, {
          rows: [
            { id: 1, nome: "Mauricio Abreu", email: "mauricio@voxlang.org", telefone: "(21) 98888-1111", cidade: "Rio de Janeiro", saldo: 1500.50 },
            { id: 2, nome: "Beatriz Lima", email: "beatriz@email.com", telefone: "(11) 97777-2222", cidade: "São Paulo", saldo: 3200.00 },
            { id: 3, nome: "Carlos Eduardo", email: "carlos@empresa.com", telefone: "(31) 96666-3333", cidade: "Belo Horizonte", saldo: 450.75 },
            { id: 4, nome: "Daniela Rocha", email: "daniela@tech.com", telefone: "(41) 95555-4444", cidade: "Curitiba", saldo: 2890.10 }
          ],
          fallback: true
        });
      }

      const stmt = sqliteDb.prepare(sql);
      const rows = stmt.all(...params);
      return sendJson(res, 200, { rows, fallback: false });
    } catch (err) {
      return sendJson(res, 500, { error: err.message });
    }
  }

  // --------------------------------------------------------------------------
  // API: Exportação de Relatório para PDF via Chrome Headless
  // --------------------------------------------------------------------------
  if (pathname === '/api/report/export-pdf' && req.method === 'POST') {
    try {
      const body = await parseBody(req);
      const htmlContent = body.html || '<!DOCTYPE html><html><body><h1>Relatório Vox</h1></body></html>';
      const filename = body.filename || 'relatorio.pdf';

      const tempDir = path.resolve(WORKSPACE_DIR, 'scratch');
      if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

      const tempId = 'report_' + Date.now() + '_' + Math.floor(Math.random() * 100000);
      const tempHtml = path.resolve(tempDir, `${tempId}.html`);
      const tempPdf = path.resolve(tempDir, `${tempId}.pdf`);

      fs.writeFileSync(tempHtml, htmlContent, 'utf8');

      const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
      if (!fs.existsSync(chromePath)) {
        return sendJson(res, 500, { error: 'Navegador Chrome não localizado para exportação em PDF' });
      }

      const { exec } = require('child_process');
      const cmd = `"${chromePath}" --headless=new --disable-gpu --no-pdf-header-footer "--print-to-pdf=${tempPdf}" "${tempHtml}"`;

      exec(cmd, (err, stdout, stderr) => {
        try { if (fs.existsSync(tempHtml)) fs.unlinkSync(tempHtml); } catch (e) {}

        if (err || !fs.existsSync(tempPdf)) {
          return sendJson(res, 500, { error: 'Falha ao gerar arquivo PDF: ' + (err ? err.message : stderr) });
        }

        const pdfBuffer = fs.readFileSync(tempPdf);
        try { if (fs.existsSync(tempPdf)) fs.unlinkSync(tempPdf); } catch (e) {}

        res.writeHead(200, {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="${encodeURIComponent(filename)}"`,
          'Content-Length': pdfBuffer.length,
          'Access-Control-Allow-Origin': '*'
        });
        res.end(pdfBuffer);
      });
      return;
    } catch (err) {
      return sendJson(res, 500, { error: err.message });
    }
  }

  // --------------------------------------------------------------------------
  // API: Testar Conexão com Banco de Dados (Estilo FireDAC)
  // --------------------------------------------------------------------------
  if (pathname === '/api/db/test-connection' && req.method === 'POST') {
    try {
      const body = await parseBody(req);
      const driver = body.driver || body.DriverName || 'MySQL';
      const host = body.ip || body.IP || body.server || body.Server || '127.0.0.1';
      let defaultPort = 3306;
      if (driver === 'Firebird') defaultPort = 3050;
      else if (driver === 'MSSQL' || driver === 'SQLServer') defaultPort = 1433;
      else if (driver === 'PostgreSQL') defaultPort = 5432;
      else if (driver === 'SQLite') defaultPort = 0;

      const port = parseInt(body.porta || body.Porta || body.port || body.Port, 10) || defaultPort;
      const database = body.database || body.Database || 'loja_vox';
      const user = body.login || body.Login || body.user || body.userName || body.UserName || 'root';
      const password = body.senha || body.Senha || body.password || body.Password || '';
      const vendorLib = body.vendorLib || body.VendorLib || '';

      const startTime = Date.now();
      let dllStatus = 'N/A';
      if (vendorLib) {
        if (fs.existsSync(vendorLib)) {
          dllStatus = `DLL encontrada no caminho: ${vendorLib}`;
        } else {
          dllStatus = `Biblioteca cliente configurada: ${vendorLib}`;
        }
      }

      if (driver === 'SQLite') {
        const fullDbPath = path.resolve(WORKSPACE_DIR, database);
        const exists = fs.existsSync(fullDbPath);
        return sendJson(res, 200, {
          success: true,
          message: `Conexão SQLite validada com sucesso! Base de dados: ${database} (${exists ? 'Arquivo existente' : 'Será criado automaticamente'}).`,
          pingMs: Date.now() - startTime,
          driver: 'SQLite',
          details: { database, status: 'OK', vendorLib: dllStatus }
        });
      }

      // Para Firebird, MySQL, MSSQL (SQL Server), PostgreSQL: testar socket TCP na porta do banco
      const net = require('net');
      const targetPort = port;
      const targetHost = host === 'localhost' ? '127.0.0.1' : host;

      const tcpTest = new Promise((resolve) => {
        const socket = new net.Socket();
        socket.setTimeout(1500);

        socket.on('connect', () => {
          socket.destroy();
          resolve({ ok: true, msg: `Conexão TCP estabelecida com sucesso em ${targetHost}:${targetPort}` });
        });

        socket.on('timeout', () => {
          socket.destroy();
          resolve({ ok: false, msg: `Tempo limite de conexão esgotado em ${targetHost}:${targetPort}` });
        });

        socket.on('error', (err) => {
          resolve({ ok: false, msg: `Serviço ${driver} não respondeu em ${targetHost}:${targetPort} (${err.code || err.message})` });
        });

        socket.connect(targetPort, targetHost);
      });

      const result = await tcpTest;

      return sendJson(res, 200, {
        success: result.ok,
        message: result.ok
          ? `✔ Conexão estabelecida com sucesso com ${driver}! IP: ${targetHost}, Porta: ${targetPort}, Login: ${user}.`
          : `⚠️ Servidor ${driver} não acessível no momento (${targetHost}:${targetPort}): ${result.msg}.`,
        pingMs: Date.now() - startTime,
        driver,
        details: {
          ip: targetHost,
          porta: targetPort,
          server: targetHost,
          port: targetPort,
          database,
          login: user,
          user,
          vendorLib: dllStatus,
          connectionStatus: result.ok ? 'ONLINE' : 'OFFLINE_OR_UNREACHABLE'
        }
      });
    } catch (err) {
      return sendJson(res, 500, { success: false, error: err.message });
    }
  }

  // --------------------------------------------------------------------------
  // API: Instalar Pacote de Componentes (.vdpk / .vox)
  // --------------------------------------------------------------------------
  if (pathname === '/api/components/install-package' && req.method === 'POST') {
    try {
      const { packageName, components, code } = await parseBody(req);
      const packagesDir = path.resolve(WORKSPACE_DIR, 'tools/vox-rad/packages');
      fs.mkdirSync(packagesDir, { recursive: true });

      const pkgFileName = (packageName || 'CustomPackage').replace(/[^a-zA-Z0-9_]/g, '') + '.vdpk';
      const pkgPath = path.join(packagesDir, pkgFileName);
      fs.writeFileSync(pkgPath, code || '// Pacote Vox\n', 'utf-8');

      return sendJson(res, 200, {
        success: true,
        message: `Pacote [${pkgFileName}] instalado com sucesso!`,
        packagePath: pkgPath
      });
    } catch (err) {
      return sendJson(res, 500, { success: false, error: err.message });
    }
  }

  // --------------------------------------------------------------------------
  // Funções Auxiliares de Escaneamento de Workspace (Units, Projetos e Grupos)
  // --------------------------------------------------------------------------
  function scanWorkspace() {
    const units = [];
    const projects = [];
    const groups = [];
    const ignoredDirs = new Set(['.git', 'node_modules', 'dist', '.gemini', 'brain', 'scratch', '.system_generated', '.temp']);

    function walk(dir) {
      let entries;
      try {
        entries = fs.readdirSync(dir, { withFileTypes: true });
      } catch (e) {
        return;
      }

      for (const ent of entries) {
        const fullPath = path.join(dir, ent.name);
        const relPath = path.relative(WORKSPACE_DIR, fullPath).replace(/\\/g, '/');

        if (ent.isDirectory()) {
          if (ignoredDirs.has(ent.name)) continue;

          if (relPath.startsWith('projetos/') && relPath.split('/').length === 2) {
            projects.push({
              name: ent.name,
              folder: relPath,
              file: `${relPath}/${ent.name}.voxProj`,
              type: 'voxProj',
              description: `Projeto ${ent.name}`
            });
          }
          walk(fullPath);
        } else if (ent.isFile()) {
          const rawExt = path.extname(ent.name);
          const ext = rawExt.toLowerCase();
          const base = rawExt ? ent.name.slice(0, -rawExt.length) : ent.name;

          const codeExtensions = new Set(['.vox', '.vxf', '.pas', '.dfm', '.js', '.ts', '.json', '.sql', '.txt', '.html', '.css']);
          const projectExtensions = new Set(['.voxproj', '.vproj', '.dproj', '.dpr', '.vpr']);
          const groupExtensions = new Set(['.groupproj', '.vpg', '.vgroup']);

          if (codeExtensions.has(ext)) {
            let category = 'Unit';
            if (ext === '.pas') category = 'Pascal Unit (.pas)';
            else if (ext === '.dfm') category = 'Delphi Form (.dfm)';
            else if (relPath.includes('controller') || ent.name.endsWith('_controller.vox')) category = 'Controller';
            else if (relPath.includes('model') || ent.name.endsWith('_model.vox')) category = 'Model';
            else if (relPath.includes('view') || ent.name.endsWith('_view.vox') || ext === '.vxf') category = 'View / Form';
            else if (ext === '.js' || ext === '.ts') category = 'Script (' + ext + ')';
            else if (ext === '.sql') category = 'Banco / SQL';
            else if (ext === '.json') category = 'JSON Config';
            else if (relPath.includes('example')) category = 'Exemplo';
            else if (base.startsWith('Form') || fs.existsSync(fullPath.replace(/\.vox$/, '.vxf'))) category = 'Form Unit';

            let size = 0;
            try { size = fs.statSync(fullPath).size; } catch (_) {}

            units.push({
              name: ent.name,
              baseName: base,
              relPath,
              ext,
              category,
              size
            });
          } else if (projectExtensions.has(ext) || (ext === '.json' && (base.toLowerCase().includes('project') || base.toLowerCase().includes('proj')))) {
            const existingIdx = projects.findIndex(p => p.name === base);
            const projItem = {
              name: base,
              folder: path.dirname(relPath),
              file: relPath,
              type: ext === '.voxproj' ? 'voxProj' : ext.slice(1),
              description: `Projeto ${base}`
            };
            if (existingIdx >= 0) {
              if (ext === '.voxproj') projects[existingIdx] = projItem;
            } else {
              projects.push(projItem);
            }
          } else if (groupExtensions.has(ext)) {
            groups.push({
              name: base,
              file: relPath,
              type: ext.slice(1),
              description: `Grupo de Projetos ${base}`
            });
          }
        }
      }
    }

    walk(WORKSPACE_DIR);

    // Projetos Padrão do Vox Studio RAD
    if (!projects.some(p => p.name === 'VoxERP_Comercial')) {
      projects.unshift({
        name: 'VoxERP_Comercial',
        folder: 'projetos/VoxERP_Comercial',
        file: 'projetos/VoxERP_Comercial/VoxERP_Comercial.voxProj',
        type: 'voxProj',
        description: '🌟 ERP Comercial MVC Completo (NF-e, Produtos, PDV)',
        units: ['FormERP.vox', 'FormERP.vxf']
      });
    }
    if (!projects.some(p => p.name === 'Projeto_Clientes')) {
      projects.push({
        name: 'Projeto_Clientes',
        folder: 'clientes',
        file: 'clientes/Projeto_Clientes.voxProj',
        type: 'voxProj',
        description: '📋 Cadastro de Clientes (SQLite CRUD)',
        units: ['cliente_controller.vox', 'cliente_model.vox', 'cliente_view.vox']
      });
    }
    if (!projects.some(p => p.name === 'Sistema_Sidebar')) {
      projects.push({
        name: 'Sistema_Sidebar',
        folder: 'projetos/Sistema_Sidebar',
        file: 'projetos/Sistema_Sidebar/Sistema_Sidebar.voxProj',
        type: 'voxProj',
        description: '📑 Sistema Comercial (Menu Lateral)',
        units: ['Form1.vox', 'Form1.vxf']
      });
    }
    if (!projects.some(p => p.name === 'PDV_FrenteDeCaixa')) {
      projects.push({
        name: 'PDV_FrenteDeCaixa',
        folder: 'projetos/PDV_FrenteDeCaixa',
        file: 'projetos/PDV_FrenteDeCaixa/PDV_FrenteDeCaixa.voxProj',
        type: 'voxProj',
        description: '🛒 Frente de Caixa (PDV Comercial)',
        units: ['pdv_controller.vox', 'pdv_model.vox', 'pdv_view.vox']
      });
    }
    if (!projects.some(p => p.name === 'Calculadora_RAD')) {
      projects.push({
        name: 'Calculadora_RAD',
        folder: 'projetos/Calculadora_RAD',
        file: 'projetos/Calculadora_RAD/Calculadora_RAD.voxProj',
        type: 'voxProj',
        description: '🔢 Calculadora RAD',
        units: ['Form1.vox', 'Form1.vxf']
      });
    }

    if (groups.length === 0) {
      groups.push({
        name: 'ProjectGroup1',
        file: 'ProjectGroup1.groupproj',
        type: 'groupproj',
        description: 'Grupo Corporativo Principal (ERP + Clientes + PDV)',
        projects: ['VoxERP_Comercial.voxProj', 'Projeto_Clientes.voxProj', 'PDV_FrenteDeCaixa.voxProj']
      });
      groups.push({
        name: 'EnterpriseSuite',
        file: 'EnterpriseSuite.groupproj',
        type: 'groupproj',
        description: 'Suite Corporativa Multi-Módulos',
        projects: ['VoxERP_Comercial.voxProj', 'Sistema_Sidebar.voxProj']
      });
    }

    return { units, projects, groups };
  }

  // --------------------------------------------------------------------------
  // API: Listar Arquivos do Workspace (Units, Classes, Projetos e Grupos)
  // --------------------------------------------------------------------------
  if (pathname === '/api/workspace/files' && req.method === 'GET') {
    try {
      const type = urlObj.searchParams.get('type') || 'all';
      const data = scanWorkspace();
      return sendJson(res, 200, {
        success: true,
        type,
        workspace: WORKSPACE_DIR,
        units: data.units,
        projects: data.projects,
        groups: data.groups
      });
    } catch (err) {
      return sendJson(res, 500, { success: false, error: err.message });
    }
  }

  // --------------------------------------------------------------------------
  // API: Ler Conteúdo de Arquivo do Workspace
  // --------------------------------------------------------------------------
  if (pathname === '/api/file/read' && req.method === 'GET') {
    try {
      const relFile = urlObj.searchParams.get('file') || '';
      if (!relFile) {
        return sendJson(res, 400, { success: false, error: 'Parâmetro file é obrigatório' });
      }
      const targetPath = path.resolve(WORKSPACE_DIR, relFile);
      if (!targetPath.startsWith(path.resolve(WORKSPACE_DIR))) {
        return sendJson(res, 400, { success: false, error: 'Acesso negado fora do workspace' });
      }
      if (!fs.existsSync(targetPath)) {
        return sendJson(res, 404, { success: false, error: `Arquivo não encontrado: ${relFile}` });
      }

      const content = fs.readFileSync(targetPath, 'utf-8');
      const ext = path.extname(targetPath).toLowerCase();
      const fileName = path.basename(targetPath);

      return sendJson(res, 200, {
        success: true,
        content,
        fileName,
        ext,
        filePath: path.relative(WORKSPACE_DIR, targetPath).replace(/\\/g, '/')
      });
    } catch (err) {
      return sendJson(res, 500, { success: false, error: err.message });
    }
  }

  // --------------------------------------------------------------------------
  // API: Salvar Arquivo Genérico no Workspace
  // --------------------------------------------------------------------------
  if (pathname === '/api/file/save' && req.method === 'POST') {
    try {
      const { filePath, content } = await parseBody(req);
      if (!filePath) {
        return sendJson(res, 400, { success: false, error: 'Caminho do arquivo é obrigatório' });
      }
      const targetPath = path.resolve(WORKSPACE_DIR, filePath);
      if (!targetPath.startsWith(path.resolve(WORKSPACE_DIR))) {
        return sendJson(res, 400, { success: false, error: 'Acesso negado fora do workspace' });
      }
      fs.mkdirSync(path.dirname(targetPath), { recursive: true });
      fs.writeFileSync(targetPath, content || '', 'utf-8');

      return sendJson(res, 200, {
        success: true,
        filePath: path.relative(WORKSPACE_DIR, targetPath).replace(/\\/g, '/'),
        message: `Arquivo salvo com sucesso!`
      });
    } catch (err) {
      return sendJson(res, 500, { success: false, error: err.message });
    }
  }

  // --------------------------------------------------------------------------
  // API: Ler e Estruturar Projeto (.dproj, .vproj, .dpr, .vpr, .json)
  // --------------------------------------------------------------------------
  if (pathname === '/api/project/read' && req.method === 'GET') {
    try {
      const relFile = urlObj.searchParams.get('file') || '';
      if (!relFile) {
        return sendJson(res, 400, { success: false, error: 'Parâmetro file é obrigatório' });
      }
      const targetPath = path.resolve(WORKSPACE_DIR, relFile);
      if (!targetPath.startsWith(path.resolve(WORKSPACE_DIR))) {
        return sendJson(res, 400, { success: false, error: 'Acesso negado fora do workspace' });
      }

      let projFolder = targetPath;
      let projFile = targetPath;
      if (path.extname(targetPath)) {
        projFolder = path.dirname(targetPath);
      } else if (fs.existsSync(targetPath) && fs.statSync(targetPath).isDirectory()) {
        projFolder = targetPath;
        const potentialProjs = fs.readdirSync(projFolder).filter(f => /\.(voxproj|dproj|vproj|dpr|vpr)$/i.test(f));
        if (potentialProjs.length > 0) projFile = path.join(projFolder, potentialProjs[0]);
      }

      const ext = path.extname(projFile).toLowerCase();
      const projName = path.basename(projFile, ext) || path.basename(projFolder);
      const units = [];
      let mainForm = 'Form1';

      // Escanear pasta do projeto em busca de units e formulários
      if (fs.existsSync(projFolder)) {
        try {
          const files = fs.readdirSync(projFolder);
          for (const f of files) {
            const fExt = path.extname(f).toLowerCase();
            if (['.vox', '.vxf', '.pas', '.dfm', '.js', '.ts'].includes(fExt)) {
              units.push(f);
              if (fExt === '.vxf' && !mainForm) {
                mainForm = path.basename(f, fExt);
              }
            }
          }
        } catch (_) {}
      }

      // Se nenhum form foi achado na pasta, tenta achar nas units
      const vxfFound = units.find(u => u.endsWith('.vxf'));
      if (vxfFound) {
        mainForm = path.basename(vxfFound, '.vxf');
      }

      if (units.length === 0) {
        units.push(`${mainForm}.vox`, `${mainForm}.vxf`);
      }

      return sendJson(res, 200, {
        success: true,
        project: {
          name: projName,
          file: path.relative(WORKSPACE_DIR, projFile).replace(/\\/g, '/'),
          folder: path.relative(WORKSPACE_DIR, projFolder).replace(/\\/g, '/'),
          mainForm,
          units
        }
      });
    } catch (err) {
      return sendJson(res, 500, { success: false, error: err.message });
    }
  }

  // --------------------------------------------------------------------------
  // API: Listar Diretório do Workspace (Windows Explorer / Delphi Style)
  // --------------------------------------------------------------------------
  if (pathname === '/api/fs/list-dir' && req.method === 'GET') {
    try {
      const relDir = urlObj.searchParams.get('dir') || '';
      const targetDir = path.resolve(WORKSPACE_DIR, relDir);
      if (!targetDir.startsWith(path.resolve(WORKSPACE_DIR))) {
        return sendJson(res, 400, { success: false, error: 'Acesso negado fora do workspace' });
      }

      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
      }

      const entries = fs.readdirSync(targetDir, { withFileTypes: true });
      const items = [];

      for (const ent of entries) {
        if (ent.name === '.git' || ent.name === 'node_modules') continue;
        const fullPath = path.join(targetDir, ent.name);
        try {
          const stats = fs.statSync(fullPath);
          const isDir = ent.isDirectory();
          const ext = path.extname(ent.name).toLowerCase();
          
          let typeDesc = isDir ? 'Pasta de arquivos' : 'Arquivo';
          if (!isDir) {
            if (ext === '.voxproj') typeDesc = 'Projeto Vox (*.voxProj)';
            else if (ext === '.dproj') typeDesc = 'Projeto Delphi (*.dproj)';
            else if (ext === '.vproj' || ext === '.vpr') typeDesc = 'Projeto Vox (*.vproj)';
            else if (ext === '.vox') typeDesc = 'Código Fonte Vox';
            else if (ext === '.vxf') typeDesc = 'Formulário Delphi/Vox';
            else if (ext === '.pas') typeDesc = 'Delphi unit';
            else if (ext === '.dfm') typeDesc = 'Delphi form';
            else if (ext === '.json') typeDesc = 'Arquivo JSON';
            else if (ext === '.txt' || ext === '.md') typeDesc = 'Documento de Texto';
            else if (ext === '.exe') typeDesc = 'Aplicativo';
          }

          const pad = n => n.toString().padStart(2, '0');
          const d = stats.mtime;
          const mtimeStr = `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;

          let sizeStr = '';
          if (!isDir) {
            const kb = Math.ceil(stats.size / 1024);
            sizeStr = `${kb} KB`;
          }

          items.push({
            name: ent.name,
            isDirectory: isDir,
            type: typeDesc,
            size: sizeStr,
            rawSize: stats.size,
            mtime: mtimeStr,
            rawMtime: stats.mtimeMs
          });
        } catch (_) {}
      }

      // Pastas primeiro, depois arquivos alfabeticamente
      items.sort((a, b) => {
        if (a.isDirectory && !b.isDirectory) return -1;
        if (!a.isDirectory && b.isDirectory) return 1;
        return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
      });

      const relPath = path.relative(WORKSPACE_DIR, targetDir).replace(/\\/g, '/');
      return sendJson(res, 200, {
        success: true,
        currentDir: relPath,
        items
      });
    } catch (err) {
      return sendJson(res, 500, { success: false, error: err.message });
    }
  }

  // --------------------------------------------------------------------------
  // API: Criar Nova Pasta (Nova pasta)
  // --------------------------------------------------------------------------
  if (pathname === '/api/fs/create-dir' && req.method === 'POST') {
    try {
      const { parentDir = '', folderName } = await parseBody(req);
      if (!folderName || !folderName.trim()) {
        return sendJson(res, 400, { success: false, error: 'Nome da pasta é obrigatório' });
      }
      const safeName = folderName.trim().replace(/[/\\?%*:|"<>]/g, '_');
      const targetDir = path.resolve(WORKSPACE_DIR, parentDir, safeName);
      if (!targetDir.startsWith(path.resolve(WORKSPACE_DIR))) {
        return sendJson(res, 400, { success: false, error: 'Pasta inválida' });
      }
      fs.mkdirSync(targetDir, { recursive: true });
      return sendJson(res, 200, {
        success: true,
        folderName: safeName,
        folderPath: path.relative(WORKSPACE_DIR, targetDir).replace(/\\/g, '/')
      });
    } catch (err) {
      return sendJson(res, 500, { success: false, error: err.message });
    }
  }

  // --------------------------------------------------------------------------
  // API: Salvar Projeto (.voxProj)
  // --------------------------------------------------------------------------
  if (pathname === '/api/project/save-as' && req.method === 'POST') {
    try {
      const { projectName, folder, content, extension } = await parseBody(req);
      let baseName = (projectName || '').trim();
      if (baseName.toLowerCase().endsWith('.voxproj')) baseName = baseName.slice(0, -8);
      else if (baseName.toLowerCase().endsWith('.dproj')) baseName = baseName.slice(0, -6);
      else if (baseName.toLowerCase().endsWith('.vproj')) baseName = baseName.slice(0, -6);
      else if (baseName.toLowerCase().endsWith('.vpr')) baseName = baseName.slice(0, -4);
      const safeName = baseName.replace(/[^a-zA-Z0-9_]/g, '') || 'Project1';
      const targetFolder = (folder && folder.trim()) ? folder.trim() : path.join('projetos', safeName);
      const targetDir = path.resolve(WORKSPACE_DIR, targetFolder);
      if (!targetDir.startsWith(path.resolve(WORKSPACE_DIR))) {
        return sendJson(res, 400, { success: false, error: 'Pasta de destino inválida' });
      }
      fs.mkdirSync(targetDir, { recursive: true });

      const chosenExt = (extension && (extension === '.dproj' || extension === '.vproj')) ? extension : '.voxProj';
      const projFilePath = path.join(targetDir, `${safeName}${chosenExt}`);
      const projData = content || JSON.stringify({
        ProjectName: safeName,
        Version: '1.0.0',
        TargetPlatform: 'Web Browser (HTML5 + REST)',
        OutputType: 'Executable',
        MainForm: 'Form1',
        Created: new Date().toISOString()
      }, null, 2);
      fs.writeFileSync(projFilePath, projData, 'utf-8');

      return sendJson(res, 200, {
        success: true,
        projectName: safeName,
        folder: path.relative(WORKSPACE_DIR, targetDir).replace(/\\/g, '/'),
        filePath: path.relative(WORKSPACE_DIR, projFilePath).replace(/\\/g, '/'),
        message: `Projeto ${safeName}${chosenExt} salvo com sucesso!`
      });
    } catch (err) {
      return sendJson(res, 500, { success: false, error: err.message });
    }
  }

  // --------------------------------------------------------------------------
  // API: Salvar Grupo de Projetos (.groupproj)
  // --------------------------------------------------------------------------
  if (pathname === '/api/group/save-as' && req.method === 'POST') {
    try {
      const { groupName, projects = [] } = await parseBody(req);
      if (!groupName) {
        return sendJson(res, 400, { success: false, error: 'Nome do grupo de projetos é obrigatório' });
      }
      const safeName = groupName.replace(/[^a-zA-Z0-9_]/g, '');
      const groupFile = path.resolve(WORKSPACE_DIR, `${safeName}.groupproj`);
      fs.writeFileSync(groupFile, JSON.stringify({
        ProjectGroup: safeName,
        Projects: projects,
        Created: new Date().toISOString()
      }, null, 2), 'utf-8');

      return sendJson(res, 200, {
        success: true,
        groupName: safeName,
        file: `${safeName}.groupproj`,
        message: `Grupo de projetos ${safeName} salvo com sucesso!`
      });
    } catch (err) {
      return sendJson(res, 500, { success: false, error: err.message });
    }
  }

  // --------------------------------------------------------------------------
  // API: Listar Pastas Disponíveis do Projeto
  // --------------------------------------------------------------------------
  if (pathname === '/api/project/folders' && req.method === 'GET') {
    try {
      const candidates = ['forms', 'src', 'examples', 'clientes', 'projetos', '.'];
      const folders = [];
      for (const d of candidates) {
        const full = path.resolve(WORKSPACE_DIR, d);
        if (d === '.' || fs.existsSync(full)) {
          folders.push(d);
        }
      }
      return sendJson(res, 200, {
        workspace: WORKSPACE_DIR,
        folders: folders,
        defaultFolder: 'forms'
      });
    } catch (err) {
      return sendJson(res, 500, { error: err.message });
    }
  }

  // --------------------------------------------------------------------------
  // API: Salvar Formulário (.vxf e .vox) em Pasta Escolhida ou Projeto Corrente
  // --------------------------------------------------------------------------
  if (pathname === '/api/form/save' && req.method === 'POST') {
    try {
      const { formName, vxfContent, voxContent, folder } = await parseBody(req);
      if (!formName) {
        return sendJson(res, 400, { error: 'Nome do formulário é obrigatório' });
      }

      const targetFolder = (folder && typeof folder === 'string' && folder.trim()) ? folder.trim() : 'forms';
      const targetDir = path.resolve(WORKSPACE_DIR, targetFolder);

      // Verificação de segurança: não permitir escapar do workspace do projeto
      if (!targetDir.startsWith(path.resolve(WORKSPACE_DIR))) {
        return sendJson(res, 400, { error: 'Pasta de destino deve estar contida dentro do projeto corrente' });
      }

      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
      }

      const safeName = formName.replace(/[^a-zA-Z0-9_]/g, '');
      const vxfPath = path.join(targetDir, `${safeName}.vxf`);
      const voxPath = path.join(targetDir, `${safeName}.vox`);

      fs.writeFileSync(vxfPath, JSON.stringify(vxfContent, null, 2), 'utf-8');
      fs.writeFileSync(voxPath, voxContent, 'utf-8');

      const relDir = path.relative(WORKSPACE_DIR, targetDir) || '.';

      return sendJson(res, 200, {
        success: true,
        formName: safeName,
        folder: relDir,
        vxfFile: vxfPath,
        voxFile: voxPath,
        vxfRel: path.join(relDir, `${safeName}.vxf`),
        voxRel: path.join(relDir, `${safeName}.vox`),
        message: `Formulário ${safeName} salvo com sucesso em ${relDir}/!`
      });
    } catch (err) {
      return sendJson(res, 500, { error: err.message });
    }
  }

  // --------------------------------------------------------------------------
  // API: Carregar Formulário (.vxf e .vox) do Projeto
  // --------------------------------------------------------------------------
  if (pathname === '/api/form/load' && req.method === 'GET') {
    try {
      const fileName = urlObj.searchParams.get('file') || urlObj.searchParams.get('name') || 'Form1';
      let vxfPath;
      if (fileName.endsWith('.vxf')) {
        vxfPath = path.isAbsolute(fileName) ? fileName : path.resolve(WORKSPACE_DIR, fileName);
      } else {
        const candidates = [
          path.resolve(WORKSPACE_DIR, 'forms', `${fileName}.vxf`),
          path.resolve(WORKSPACE_DIR, `${fileName}.vxf`),
          path.resolve(WORKSPACE_DIR, 'src', `${fileName}.vxf`)
        ];
        vxfPath = candidates.find(c => fs.existsSync(c)) || candidates[0];
      }

      if (!fs.existsSync(vxfPath)) {
        return sendJson(res, 404, { success: false, error: `Arquivo .vxf não encontrado: ${vxfPath}` });
      }

      const vxfRaw = fs.readFileSync(vxfPath, 'utf-8');
      const formData = JSON.parse(vxfRaw);
      const voxPath = vxfPath.replace(/\.vxf$/i, '.vox');
      const voxContent = fs.existsSync(voxPath) ? fs.readFileSync(voxPath, 'utf-8') : '';

      return sendJson(res, 200, {
        success: true,
        form: formData,
        voxCode: voxContent,
        filePath: path.relative(WORKSPACE_DIR, vxfPath)
      });
    } catch (err) {
      return sendJson(res, 500, { success: false, error: err.message });
    }
  }

  // --------------------------------------------------------------------------
  // API: Listar Formulários (.vxf) Disponíveis
  // --------------------------------------------------------------------------
  if (pathname === '/api/form/list' && req.method === 'GET') {
    try {
      const forms = [];
      const searchDirs = [
        path.resolve(WORKSPACE_DIR, 'forms'),
        path.resolve(WORKSPACE_DIR)
      ];

      for (const sDir of searchDirs) {
        if (fs.existsSync(sDir)) {
          const files = fs.readdirSync(sDir);
          for (const f of files) {
            if (f.endsWith('.vxf')) {
              const full = path.join(sDir, f);
              const rel = path.relative(WORKSPACE_DIR, full);
              const name = f.replace(/\.vxf$/i, '');
              try {
                const content = JSON.parse(fs.readFileSync(full, 'utf-8'));
                forms.push({
                  name: content.name || name,
                  title: content.title || content.name || name,
                  file: rel,
                  componentCount: (content.components && content.components.length) || 0
                });
              } catch (e) {
                forms.push({ name, file: rel, componentCount: 0 });
              }
            }
          }
        }
      }

      return sendJson(res, 200, { success: true, forms });
    } catch (err) {
      return sendJson(res, 500, { success: false, error: err.message });
    }
  }

  // --------------------------------------------------------------------------
  // API: Criar Nova Classe / Unit (.vox)
  // --------------------------------------------------------------------------
  if (pathname === '/api/project/create-class' && req.method === 'POST') {
    try {
      const { className, fileName, folder = 'src', code } = await parseBody(req);
      if (!className || !fileName) {
        return sendJson(res, 400, { error: 'Nome da classe e do arquivo são obrigatórios' });
      }

      const targetDir = path.resolve(WORKSPACE_DIR, folder);
      if (!targetDir.startsWith(path.resolve(WORKSPACE_DIR))) {
        return sendJson(res, 400, { error: 'Pasta de destino inválida' });
      }

      fs.mkdirSync(targetDir, { recursive: true });
      const safeFileName = fileName.endsWith('.vox') ? fileName : `${fileName}.vox`;
      const filePath = path.join(targetDir, safeFileName);
      fs.writeFileSync(filePath, code, 'utf-8');

      const relPath = path.relative(WORKSPACE_DIR, filePath);
      return sendJson(res, 200, {
        success: true,
        className,
        fileName: safeFileName,
        filePath,
        relPath,
        message: `Classe ${className} criada com sucesso em ${relPath}!`
      });
    } catch (err) {
      return sendJson(res, 500, { error: err.message });
    }
  }

  // --------------------------------------------------------------------------
  // API: Criar Novo Projeto a partir de Exemplo com Pasta de Destino
  // --------------------------------------------------------------------------
  if (pathname === '/api/project/create-from-example' && req.method === 'POST') {
    try {
      const { exampleKey, projectName, targetFolder } = await parseBody(req);
      const safeProjectName = (projectName || 'NovoProjeto').replace(/[^a-zA-Z0-9_]/g, '');
      const folderRel = (targetFolder && targetFolder.trim()) ? targetFolder.trim() : path.join('projetos', safeProjectName);
      const targetDir = path.resolve(WORKSPACE_DIR, folderRel);

      if (!targetDir.startsWith(path.resolve(WORKSPACE_DIR))) {
        return sendJson(res, 400, { error: 'Pasta de destino deve estar contida dentro do projeto corrente' });
      }

      fs.mkdirSync(targetDir, { recursive: true });

      // Se houver pasta modelo, copiar recursivamente
      const createdFiles = [];
      const erpSourceDir = path.resolve(WORKSPACE_DIR, 'templates/erp_mvc');
      if (fs.existsSync(erpSourceDir)) {
        function copyRecursive(src, dst) {
          fs.mkdirSync(dst, { recursive: true });
          const entries = fs.readdirSync(src, { withFileTypes: true });
          for (const entry of entries) {
            const srcPath = path.join(src, entry.name);
            const dstPath = path.join(dst, entry.name);
            if (entry.isDirectory()) {
              copyRecursive(srcPath, dstPath);
            } else {
              fs.copyFileSync(srcPath, dstPath);
              createdFiles.push(path.relative(WORKSPACE_DIR, dstPath));
            }
          }
        }
        copyRecursive(erpSourceDir, targetDir);
      }

      return sendJson(res, 200, {
        success: true,
        exampleKey,
        projectName: safeProjectName,
        targetFolder: folderRel,
        projectPath: targetDir,
        createdFiles,
        message: `Projeto [${safeProjectName}] criado com sucesso em ${folderRel}/!`
      });
    } catch (err) {
      return sendJson(res, 500, { error: err.message });
    }
  }

  // --------------------------------------------------------------------------
  // API: Executar Script Vox via CLI
  // --------------------------------------------------------------------------
  if (pathname === '/api/vox/run' && req.method === 'POST') {
    try {
      const { code, formName = 'TempForm' } = await parseBody(req);
      const tempFile = path.resolve(WORKSPACE_DIR, `.temp_${formName}.vox`);
      fs.writeFileSync(tempFile, code, 'utf-8');

      const cliPath = path.resolve(WORKSPACE_DIR, 'dist/cli/index.js');
      const proc = spawn('node', [cliPath, 'run', tempFile], {
        cwd: WORKSPACE_DIR
      });

      let stdout = '';
      let stderr = '';

      proc.stdout.on('data', data => { stdout += data.toString(); });
      proc.stderr.on('data', data => { stderr += data.toString(); });

      await new Promise((resolve) => {
        proc.on('close', code => {
          try { if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile); } catch (e) {}

          sendJson(res, 200, {
            exitCode: code,
            stdout,
            stderr,
            success: code === 0
          });
          resolve();
        });

        proc.on('error', err => {
          try { if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile); } catch (e) {}
          sendJson(res, 500, { error: err.message });
          resolve();
        });
      });
      return;
    } catch (err) {
      return sendJson(res, 500, { error: err.message });
    }
  }

  // --------------------------------------------------------------------------
  // API: Compilar e Gerar Aplicação Web Standalone (HTML5 + REST API + Vox)
  // --------------------------------------------------------------------------
  if (pathname === '/api/vox/build-web' && req.method === 'POST') {
    try {
      const { formState, htmlContent, cssContent, jsContent, serverContent, voxContent } = await parseBody(req);
      const formName = (formState && formState.name) || 'Form1';

      // Criar diretórios
      fs.mkdirSync(DIST_WEB_DIR, { recursive: true });
      fs.mkdirSync(path.join(DIST_WEB_DIR, 'css'), { recursive: true });
      fs.mkdirSync(path.join(DIST_WEB_DIR, 'js'), { recursive: true });

      // Salvar arquivos da aplicação web
      fs.writeFileSync(path.join(DIST_WEB_DIR, 'index.html'), htmlContent || '', 'utf-8');
      fs.writeFileSync(path.join(DIST_WEB_DIR, 'css', 'app.css'), cssContent || '', 'utf-8');
      fs.writeFileSync(path.join(DIST_WEB_DIR, 'js', 'app.js'), jsContent || '', 'utf-8');
      fs.writeFileSync(path.join(DIST_WEB_DIR, 'server.js'), serverContent || '', 'utf-8');
      fs.writeFileSync(path.join(DIST_WEB_DIR, `${formName}.vox`), voxContent || '', 'utf-8');

      // Package.json para rodar standalone em produção
      const pkgJson = {
        name: `vox-web-${formName.toLowerCase()}`,
        version: "1.0.0",
        description: `Aplicação Web gerada pelo Vox Studio RAD a partir de ${formName}`,
        main: "server.js",
        scripts: {
          start: "node server.js"
        }
      };
      fs.writeFileSync(path.join(DIST_WEB_DIR, 'package.json'), JSON.stringify(pkgJson, null, 2), 'utf-8');

      // Iniciar ou reiniciar servidor dedicado da aplicação na porta 5000
      if (webAppProc) {
        try { webAppProc.kill(); } catch (e) {}
      }

      webAppProc = spawn('node', ['server.js'], {
        cwd: DIST_WEB_DIR,
        env: { ...process.env, PORT: '5000' },
        stdio: 'ignore'
      });

      return sendJson(res, 200, {
        success: true,
        url: 'http://localhost:5000',
        internalUrl: `http://localhost:${PORT}/web-app/`,
        outputDir: DIST_WEB_DIR,
        formName: formName,
        files: [
          'dist/web-app/index.html',
          'dist/web-app/css/app.css',
          'dist/web-app/js/app.js',
          'dist/web-app/server.js',
          `dist/web-app/${formName}.vox`,
          'dist/web-app/package.json'
        ]
      });
    } catch (err) {
      return sendJson(res, 500, { error: err.message });
    }
  }

  // --------------------------------------------------------------------------
  // API: Git Integration (Status, Config, Commit, Push, Pull)
  // --------------------------------------------------------------------------
  if (pathname === '/api/git/status' && req.method === 'GET') {
    try {
      const [stRes, nameRes, emailRes, remoteRes, logRes] = await Promise.all([
        execGit(['status', '--porcelain=v1', '-b']),
        execGit(['config', 'user.name']),
        execGit(['config', 'user.email']),
        execGit(['remote', 'get-url', 'origin']),
        execGit(['log', '-1', '--pretty=format:%h - %s (%cr)'])
      ]);

      const lines = stRes.stdout ? stRes.stdout.split('\n') : [];
      let branch = 'main';
      let ahead = 0;
      let behind = 0;
      const files = [];

      if (lines.length > 0 && lines[0].startsWith('##')) {
        const header = lines[0].slice(2).trim();
        const branchMatch = header.match(/^([^\s\.\/]+)/);
        if (branchMatch) branch = branchMatch[1];
        const aheadMatch = header.match(/ahead\s+(\d+)/);
        if (aheadMatch) ahead = parseInt(aheadMatch[1], 10);
        const behindMatch = header.match(/behind\s+(\d+)/);
        if (behindMatch) behind = parseInt(behindMatch[1], 10);
      }

      for (let i = 1; i < lines.length; i++) {
        const line = lines[i];
        if (!line.trim()) continue;
        const code = line.slice(0, 2).trim();
        const filePath = line.slice(3).trim();
        files.push({ code, path: filePath });
      }

      return sendJson(res, 200, {
        success: true,
        branch,
        ahead,
        behind,
        files,
        clean: files.length === 0,
        userName: nameRes.stdout || '',
        userEmail: emailRes.stdout || '',
        remoteUrl: remoteRes.stdout || '',
        lastCommit: logRes.stdout || '',
        rawStatus: stRes.stdout
      });
    } catch (err) {
      return sendJson(res, 500, { error: err.message });
    }
  }

  if (pathname === '/api/git/config' && req.method === 'POST') {
    try {
      const { userName, userEmail, remoteUrl, token } = await parseBody(req);
      const logs = [];

      if (userName && userName.trim()) {
        await execGit(['config', 'user.name', userName.trim()]);
        logs.push(`user.name configurado para: ${userName.trim()}`);
      }
      if (userEmail && userEmail.trim()) {
        await execGit(['config', 'user.email', userEmail.trim()]);
        logs.push(`user.email configurado para: ${userEmail.trim()}`);
      }
      if (remoteUrl && remoteUrl.trim()) {
        let finalUrl = remoteUrl.trim();
        if (token && finalUrl.startsWith('https://')) {
          const cleanUrl = finalUrl.replace(/^https:\/\/[^@]+@/, 'https://');
          finalUrl = cleanUrl.replace('https://', `https://${token.trim()}@`);
        }
        const checkOrigin = await execGit(['remote', 'get-url', 'origin']);
        if (checkOrigin.code === 0) {
          await execGit(['remote', 'set-url', 'origin', finalUrl]);
          logs.push(`remote 'origin' atualizado para: ${remoteUrl.trim()}`);
        } else {
          await execGit(['remote', 'add', 'origin', finalUrl]);
          logs.push(`remote 'origin' adicionado como: ${remoteUrl.trim()}`);
        }
      }

      return sendJson(res, 200, {
        success: true,
        message: 'Configurações do Git salvas com sucesso!',
        logs
      });
    } catch (err) {
      return sendJson(res, 500, { error: err.message });
    }
  }

  if (pathname === '/api/git/commit' && req.method === 'POST') {
    try {
      const { message, files } = await parseBody(req);
      if (!message || !message.trim()) {
        return sendJson(res, 400, { error: 'Mensagem de commit é obrigatória.' });
      }

      const logs = [];
      if (files && Array.isArray(files) && files.length > 0) {
        const addRes = await execGit(['add', ...files]);
        logs.push(addRes.stdout || addRes.stderr || `${files.length} arquivos preparados.`);
      } else {
        const addRes = await execGit(['add', '-A']);
        logs.push(addRes.stdout || addRes.stderr || 'Todos os arquivos preparados (git add -A).');
      }

      const commitRes = await execGit(['commit', '-m', message.trim()]);
      logs.push(commitRes.stdout || commitRes.stderr);

      if (commitRes.code !== 0 && !commitRes.stdout.includes('nothing to commit')) {
        return sendJson(res, 500, { success: false, error: commitRes.stderr || commitRes.stdout, logs });
      }

      return sendJson(res, 200, { success: true, message: 'Commit realizado com sucesso!', logs });
    } catch (err) {
      return sendJson(res, 500, { error: err.message });
    }
  }

  if (pathname === '/api/git/push' && req.method === 'POST') {
    try {
      const { remote = 'origin', branch = 'main', token } = await parseBody(req);
      const logs = [];

      if (token) {
        const remRes = await execGit(['remote', 'get-url', remote]);
        if (remRes.stdout && remRes.stdout.startsWith('https://')) {
          const cleanUrl = remRes.stdout.replace(/^https:\/\/[^@]+@/, 'https://');
          const authedUrl = cleanUrl.replace('https://', `https://${token.trim()}@`);
          await execGit(['remote', 'set-url', remote, authedUrl]);
        }
      }

      const pushRes = await execGit(['push', remote, branch]);
      logs.push(pushRes.stdout || pushRes.stderr);

      if (pushRes.code !== 0) {
        return sendJson(res, 500, { success: false, error: pushRes.stderr || pushRes.stdout, logs });
      }

      return sendJson(res, 200, { success: true, message: 'Alterações enviadas para o GitHub com sucesso!', logs });
    } catch (err) {
      return sendJson(res, 500, { error: err.message });
    }
  }

  if (pathname === '/api/git/pull' && req.method === 'POST') {
    try {
      const { remote = 'origin', branch = 'main' } = await parseBody(req);
      const pullRes = await execGit(['pull', remote, branch]);
      const logs = [pullRes.stdout || pullRes.stderr];

      if (pullRes.code !== 0) {
        return sendJson(res, 500, { success: false, error: pullRes.stderr || pullRes.stdout, logs });
      }

      return sendJson(res, 200, { success: true, message: 'Repositório atualizado com sucesso do GitHub!', logs });
    } catch (err) {
      return sendJson(res, 500, { error: err.message });
    }
  }

  if (pathname === '/api/git/commit-and-push' && req.method === 'POST') {
    try {
      const { message, files, remote = 'origin', branch = 'main', token } = await parseBody(req);
      if (!message || !message.trim()) {
        return sendJson(res, 400, { error: 'Mensagem de commit é obrigatória.' });
      }

      const logs = [];

      // 1. Git add
      if (files && Array.isArray(files) && files.length > 0) {
        const addRes = await execGit(['add', ...files]);
        logs.push(`[git add] ` + (addRes.stdout || addRes.stderr || `${files.length} arquivos preparados.`));
      } else {
        const addRes = await execGit(['add', '-A']);
        logs.push(`[git add -A] Todos os arquivos preparados.`);
      }

      // 2. Git commit
      const commitRes = await execGit(['commit', '-m', message.trim()]);
      logs.push(`[git commit] ` + (commitRes.stdout || commitRes.stderr));

      // 3. Suporte a token HTTPS
      if (token) {
        const remRes = await execGit(['remote', 'get-url', remote]);
        if (remRes.stdout && remRes.stdout.startsWith('https://')) {
          const cleanUrl = remRes.stdout.replace(/^https:\/\/[^@]+@/, 'https://');
          const authedUrl = cleanUrl.replace('https://', `https://${token.trim()}@`);
          await execGit(['remote', 'set-url', remote, authedUrl]);
        }
      }

      // 4. Git push
      const pushRes = await execGit(['push', remote, branch]);
      logs.push(`[git push] ` + (pushRes.stdout || pushRes.stderr));

      if (pushRes.code !== 0) {
        return sendJson(res, 500, {
          success: false,
          error: pushRes.stderr || pushRes.stdout || 'Erro ao enviar alterações para o GitHub.',
          logs
        });
      }

      return sendJson(res, 200, {
        success: true,
        message: 'Commit e Push para o GitHub realizados com sucesso!',
        logs
      });
    } catch (err) {
      return sendJson(res, 500, { error: err.message });
    }
  }

  if (pathname === '/api/git/test-remote' && req.method === 'POST') {
    try {
      const { remote = 'origin' } = await parseBody(req);
      const testRes = await execGit(['ls-remote', remote, 'HEAD']);
      if (testRes.code === 0) {
        return sendJson(res, 200, { success: true, message: 'Conexão com repositório remoto bem-sucedida!', raw: testRes.stdout });
      } else {
        return sendJson(res, 500, { success: false, error: testRes.stderr || 'Falha ao conectar com o repositório remoto.' });
      }
    } catch (err) {
      return sendJson(res, 500, { error: err.message });
    }
  }

  // --------------------------------------------------------------------------
  // API: Abrir Aplicação Web Compilada no Navegador Padrão
  // --------------------------------------------------------------------------
  if (pathname === '/api/web-app/open' && req.method === 'POST') {
    try {
      spawn('powershell', ['-Command', "Start-Process 'http://localhost:5000'"]);
      return sendJson(res, 200, { success: true, message: 'Navegador aberto em http://localhost:5000' });
    } catch (err) {
      return sendJson(res, 500, { error: err.message });
    }
  }

  // --------------------------------------------------------------------------
  // Servir Arquivos Estáticos da IDE ou da Aplicação Web Compilada
  // --------------------------------------------------------------------------
  let filePath;
  if (pathname === '/livro' || pathname === '/livro/') {
    filePath = path.join(WORKSPACE_DIR, 'docs', 'livro_componentes.html');
  } else if (pathname.startsWith('/web-app')) {
    const sub = pathname.replace('/web-app', '').replace(/^\//, '');
    filePath = path.join(DIST_WEB_DIR, sub === '' ? 'index.html' : sub);
  } else if (pathname.startsWith('/docs') || pathname.startsWith('/templates')) {
    filePath = path.join(WORKSPACE_DIR, pathname.replace(/^\//, ''));
  } else {
    filePath = path.join(PUBLIC_DIR, pathname === '/' ? 'index.html' : pathname);
  }

  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, content) => {
    if (err) {
      if (err.code === 'ENOENT') {
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('Arquivo não encontrado: ' + pathname);
      } else {
        res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('Erro interno do servidor: ' + err.code);
      }
    } else {
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content);
    }
  });
});

server.listen(PORT, () => {
  console.log(`\n======================================================`);
  console.log(`🚀 VOX STUDIO RAD — IDE Visual para a Linguagem Vox`);
  console.log(`📡 Servidor disponível em: http://localhost:${PORT}`);
  console.log(`📁 Diretório público: ${PUBLIC_DIR}`);
  console.log(`======================================================\n`);
});
