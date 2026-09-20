// scratch/test_blank_project_tree.js
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

async function testBlankProjectTree() {
  console.log('--- Testing Blank Project Creation & Project Tree Update ---');
  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const profileDir = path.join(__dirname, 'chrome-test-blank-profile');

  if (!fs.existsSync(profileDir)) {
    fs.mkdirSync(profileDir, { recursive: true });
  }

  const chrome = spawn(chromePath, [
    '--headless=new',
    '--remote-debugging-port=9336',
    '--disable-gpu',
    '--window-size=1440,900',
    `--user-data-dir=${profileDir}`
  ]);

  try {
    await new Promise(r => setTimeout(r, 2000));
    const versionRes = await fetch('http://127.0.0.1:9336/json/version');
    const versionData = await versionRes.json();
    console.log('Chrome connected successfully:', versionData.Browser);

    const listRes = await fetch('http://127.0.0.1:9336/json');
    const list = await listRes.json();
    const tabData = list.find(t => t.type === 'page') || list[0];

    const ws = new WebSocket(tabData.webSocketDebuggerUrl);
    let msgId = 1;
    const send = (method, params = {}) => new Promise((resolve, reject) => {
      const id = msgId++;
      const handler = (event) => {
        const data = JSON.parse(event.data);
        if (data.id === id) {
          ws.removeEventListener('message', handler);
          if (data.error) reject(data.error);
          else resolve(data.result);
        }
      };
      ws.addEventListener('message', handler);
      ws.send(JSON.stringify({ id, method, params }));
    });

    ws.addEventListener('message', (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.method === 'Page.javascriptDialogOpening') {
          send('Page.handleJavaScriptDialog', { accept: true });
        }
      } catch (_) {}
    });

    await new Promise(r => ws.onopen = r);
    await send('Runtime.enable');
    await send('Page.enable');

    await send('Page.navigate', { url: 'http://localhost:4500' });
    await new Promise(r => setTimeout(r, 3000));

    const result = await send('Runtime.evaluate', {
      awaitPromise: true,
      returnByValue: true,
      expression: `
        (async () => {
          const logs = [];
          const assert = (cond, msg) => {
            if (!cond) throw new Error('Assertion failed: ' + msg);
            logs.push('PASS: ' + msg);
          };

          try {
            const app = window.app;
            
            // 1. Simular estado fechado ("Nenhum Projeto Aberto")
            app.closeCurrentProject();
            assert(app.currentProject === null, 'currentProject is null after closeCurrentProject()');
            const container = document.getElementById('projectsTreeContainer');
            assert(container.innerHTML.includes('Nenhum Projeto Aberto'), 'Project tree shows "Nenhum Projeto Aberto" when closed');

            // 2. Abrir Modal de Novo Projeto
            app.openNewProjectModal();
            const modal = document.getElementById('newProjectModal');
            assert(modal && modal.style.display === 'flex', 'newProjectModal is visible');
            const nameInput = document.getElementById('newProjectNameInput');
            assert(nameInput && nameInput.value.length > 0, 'newProjectNameInput initialized with default project name: ' + (nameInput ? nameInput.value : ''));

            // 3. Criar Projeto em Branco (Sem Menu)
            nameInput.value = 'ProjetoVazio_Teste';
            app.createNewFormWithMenu('None');
            assert(modal.style.display === 'none', 'Modal closed after project creation');
            
            // 4. Verificar se currentProject foi configurado
            assert(app.currentProject !== null, 'app.currentProject is NOT null');
            assert(app.currentProject.name === 'ProjetoVazio_Teste', 'Project name is ProjetoVazio_Teste');
            assert(app.currentProject.file === 'ProjetoVazio_Teste.dproj', 'Project file is ProjetoVazio_Teste.dproj');
            assert(app.currentProject.units.includes('Form1.vox'), 'Project contains Form1.vox');
            assert(app.currentProject.units.includes('Form1.vxf'), 'Project contains Form1.vxf');

            // 5. Verificar Gerenciador de Projetos (Project Explorer)
            assert(!container.innerHTML.includes('Nenhum Projeto Aberto'), 'Project tree no longer shows "Nenhum Projeto Aberto"');
            assert(container.innerHTML.includes('ProjetoVazio_Teste.exe'), 'Project tree contains ProjetoVazio_Teste.exe tree node');
            assert(container.innerHTML.includes('Form1.vox'), 'Project tree contains Form1.vox');
            assert(container.innerHTML.includes('Form1.vxf'), 'Project tree contains Form1.vxf');

            const headerTitle = document.getElementById('projHeaderTitle') || document.querySelector('.projects-panel .panel-header span');
            assert(headerTitle.textContent.includes('ProjetoVazio_Teste'), 'Panel header shows "ProjetoVazio_Teste.dproj - Projects"');

            // 6. Verificar Abas de Documentos
            const activeTab = app.getActiveTab();
            assert(activeTab !== null, 'Active tab exists');
            assert(activeTab.name === 'Form1.vxf', 'Active tab is Form1.vxf');

            // 7. Testar Novo Projeto com Menu no Topo
            app.openNewProjectModal();
            nameInput.value = 'ProjetoComMenu_Top';
            app.selectNewProjOption('Top');
            app.confirmCreateNewProject();
            assert(app.currentProject.name === 'ProjetoComMenu_Top', 'Created project ProjetoComMenu_Top');
            assert(container.innerHTML.includes('ProjetoComMenu_Top.exe'), 'Project tree updated with ProjetoComMenu_Top.exe');
            assert(app.designer.form.components.some(c => c.type === 'vox_MainMenu'), 'MainMenu component added to form');

            return { success: true, logs };
          } catch (e) {
            return { success: false, error: e.message, stack: e.stack, logs };
          }
        })()
      `
    });

    if (result && result.result && result.result.value) {
      const val = result.result.value;
      if (val.logs) val.logs.forEach(l => console.log(l));
      if (val.success) {
        console.log('\n=============================================');
        console.log('ALL BLANK PROJECT TESTS PASSED 100%! 🚀');
        console.log('=============================================');
      } else {
        console.error('TEST FAILED:', val.error);
        console.error(val.stack);
        process.exit(1);
      }
    } else {
      console.error('No evaluate result:', result);
      process.exit(1);
    }
  } catch (err) {
    console.error('Fatal test error:', err);
    process.exit(1);
  } finally {
    try { chrome.kill(); } catch (_) {}
  }
}

testBlankProjectTree();
