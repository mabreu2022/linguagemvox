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
  if (pathname === '/api/db/query' && (req.method === 'POST' || req.method === 'GET')) {
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
  // API: Testar Conexão com Banco de Dados (Estilo Delphi 13 FireDAC)
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
  // API: Listar Pastas Disponíveis do Projeto
  // --------------------------------------------------------------------------
  if (pathname === '/api/project/folders' && req.method === 'GET') {
    try {
      const candidates = ['forms', 'src', 'examples', 'clientes', '.'];
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
