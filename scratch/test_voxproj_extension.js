// scratch/test_voxproj_extension.js
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

async function testVoxProjExtension() {
  console.log('--- Testando Nova Extensão de Projetos .voxProj ---');
  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const profileDir = path.resolve('scratch/chrome-voxproj-profile');
  if (!fs.existsSync(profileDir)) fs.mkdirSync(profileDir, { recursive: true });

  const chrome = spawn(chromePath, [
    '--headless=new',
    '--remote-debugging-port=9557',
    '--disable-gpu',
    '--window-size=1400,900',
    `--user-data-dir=${profileDir}`
  ]);

  try {
    await new Promise(r => setTimeout(r, 2000));
    const versionRes = await fetch('http://127.0.0.1:9557/json/version');
    const versionData = await versionRes.json();
    console.log('Chrome Conectado:', versionData.Browser);

    const listRes = await fetch('http://127.0.0.1:9557/json');
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

    await new Promise(r => ws.onopen = r);
    await send('Runtime.enable');
    await send('Page.enable');

    console.log('Navegando para http://localhost:4500...');
    await send('Page.navigate', { url: 'http://localhost:4500' });
    await new Promise(r => setTimeout(r, 3000));

    // 1. Verificar título inicial do painel de projetos
    const initialHeaderRes = await send('Runtime.evaluate', {
      expression: `document.getElementById('projHeaderTitle').textContent`
    });
    console.log('1. Título inicial do painel Projects:', initialHeaderRes.value);

    // 2. Abrir Modal de Abrir Projeto
    console.log('2. Abrindo diálogo de Abrir Projeto...');
    await send('Runtime.evaluate', {
      expression: `window.app.openProjectDialog()`
    });
    await new Promise(r => setTimeout(r, 1000));

    const openModalInfo = await send('Runtime.evaluate', {
      expression: `(() => {
        const modal = document.getElementById('openProjectModal');
        const isVisible = modal && modal.style.display !== 'none';
        const title = modal ? modal.querySelector('.modal-header span:last-child').textContent : '';
        const placeholder = document.getElementById('selectedOpenProjPath') ? document.getElementById('selectedOpenProjPath').placeholder : '';
        const items = Array.from(document.querySelectorAll('#openProjectListContainer .workspace-project-card')).map(c => c.textContent.trim());
        return { isVisible, title, placeholder, count: items.length, firstItem: items[0] };
      })()`,
      returnByValue: true
    });
    console.log('Modal Abrir Projeto:', JSON.stringify(openModalInfo.value, null, 2));

    const shot1 = await send('Page.captureScreenshot', { format: 'png' });
    const shot1Path = path.resolve('C:/Users/Denize Abreu/.gemini/antigravity-ide/brain/961cb31d-9640-493e-84d6-6a176fb804c9/voxproj_open_modal_verified.png');
    fs.writeFileSync(shot1Path, Buffer.from(shot1.data, 'base64'));
    console.log('Screenshot do Modal Abrir Projeto salvo em:', shot1Path);

    // 3. Abrir Modal de Salvar Projeto Como
    console.log('3. Fechando modal de abrir e abrindo Salvar Projeto Como...');
    await send('Runtime.evaluate', {
      expression: `
        window.app.closeOpenProjectModal();
        window.app.openSaveProjectAsModal();
      `
    });
    await new Promise(r => setTimeout(r, 1000));

    const saveModalInfo = await send('Runtime.evaluate', {
      expression: `(() => {
        const modal = document.getElementById('saveProjectAsModal');
        const isVisible = modal && modal.style.display !== 'none';
        const nameVal = document.getElementById('saveProjNameInput') ? document.getElementById('saveProjNameInput').value : '';
        const typeVal = document.getElementById('saveProjTypeSelect') ? document.getElementById('saveProjTypeSelect').value : '';
        const typeText = document.getElementById('saveProjTypeSelect') ? document.getElementById('saveProjTypeSelect').selectedOptions[0].text : '';
        return { isVisible, nameVal, typeVal, typeText };
      })()`,
      returnByValue: true
    });
    console.log('Modal Salvar Projeto Como:', JSON.stringify(saveModalInfo.value, null, 2));

    const shot2 = await send('Page.captureScreenshot', { format: 'png' });
    const shot2Path = path.resolve('C:/Users/Denize Abreu/.gemini/antigravity-ide/brain/961cb31d-9640-493e-84d6-6a176fb804c9/voxproj_save_as_modal_verified.png');
    fs.writeFileSync(shot2Path, Buffer.from(shot2.data, 'base64'));
    console.log('Screenshot do Modal Salvar Projeto Como salvo em:', shot2Path);

    // 4. Carregar Projeto Exemplo
    console.log('4. Carregando Projeto Exemplo lacosBancoDados...');
    await send('Runtime.evaluate', {
      expression: `
        window.app.closeSaveProjectAsModal();
        window.app.loadExampleTemplate('lacosBancoDados');
      `
    });
    await new Promise(r => setTimeout(r, 1500));

    const loadedHeaderRes = await send('Runtime.evaluate', {
      expression: `(() => {
        return {
          headerTitle: document.getElementById('projHeaderTitle').textContent,
          projFile: window.app.currentProject ? window.app.currentProject.file : ''
        };
      })()`,
      returnByValue: true
    });
    console.log('4. Projeto carregado:', JSON.stringify(loadedHeaderRes.value, null, 2));

    const shot3 = await send('Page.captureScreenshot', { format: 'png' });
    const shot3Path = path.resolve('C:/Users/Denize Abreu/.gemini/antigravity-ide/brain/961cb31d-9640-493e-84d6-6a176fb804c9/voxproj_loaded_project_verified.png');
    fs.writeFileSync(shot3Path, Buffer.from(shot3.data, 'base64'));
    console.log('Screenshot do Projeto Carregado salvo em:', shot3Path);

    console.log('--- TESTE CONCLUÍDO COM SUCESSO ---');
  } catch (err) {
    console.error('Erro durante teste:', err);
  } finally {
    chrome.kill();
  }
}

testVoxProjExtension();
