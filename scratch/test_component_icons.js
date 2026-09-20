// scratch/test_component_icons.js
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

async function testComponentIcons() {
  console.log('--- Testando Centralização e Ampliação dos Ícones de Componentes ---');
  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const profileDir = path.resolve('scratch/chrome-icons-profile');
  if (!fs.existsSync(profileDir)) fs.mkdirSync(profileDir, { recursive: true });

  const chrome = spawn(chromePath, [
    '--headless=new',
    '--remote-debugging-port=9558',
    '--disable-gpu',
    '--window-size=1400,900',
    `--user-data-dir=${profileDir}`
  ]);

  try {
    await new Promise(r => setTimeout(r, 2000));
    const versionRes = await fetch('http://127.0.0.1:9558/json/version');
    const versionData = await versionRes.json();
    console.log('Chrome Conectado:', versionData.Browser);

    const listRes = await fetch('http://127.0.0.1:9558/json');
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
    await new Promise(r => setTimeout(r, 4000));

    // Configurar o Form com os 4 componentes da imagem do usuário:
    // vox_Query, vox_DataSource, vox_PopupMenu, vox_ActionList
    console.log('Configurando form com os 4 componentes não-visuais da imagem...');
    const setupRes = await send('Runtime.evaluate', {
      awaitPromise: true,
      returnByValue: true,
      expression: `(async () => {
        // Aguardar o app inicializar completamente
        for (let i = 0; i < 20; i++) {
          if (window.app && window.app.designer && window.app.designer.form) break;
          await new Promise(r => setTimeout(r, 200));
        }
        const designer = window.app.designer;
        designer.form.components = [
          {
            id: 'c_qry1',
            name: 'vox_Query1',
            type: 'vox_Query',
            left: 50,
            top: 50,
            width: 46,
            height: 46,
            props: { Active: true }
          },
          {
            id: 'c_ds1',
            name: 'vox_DataSource1',
            type: 'vox_DataSource',
            left: 140,
            top: 50,
            width: 46,
            height: 46,
            props: { DataSet: 'vox_Query1' }
          },
          {
            id: 'c_pop1',
            name: 'vox_PopupMenu1',
            type: 'vox_PopupMenu',
            left: 140,
            top: 130,
            width: 46,
            height: 46,
            props: { Items: 'Copiar, Colar' }
          },
          {
            id: 'c_act1',
            name: 'vox_ActionList1',
            type: 'vox_ActionList',
            left: 240,
            top: 130,
            width: 46,
            height: 46,
            props: { Actions: 'act1, act2' }
          }
        ];
        designer.renderForm();

        // Selecionar o componente para verificar alças e centralização
        designer.selectComponent(designer.form.components[0]);

        const compEl = document.getElementById('c_qry1');
        const iconEl = compEl.querySelector('.vcl-nv-icon');
        const tagEl = compEl.querySelector('.vcl-nv-tag');
        const handles = Array.from(compEl.querySelectorAll('.delphi-handle')).map(h => ({
          className: h.className,
          display: window.getComputedStyle(h).display
        }));

        return {
          compWidth: compEl.offsetWidth,
          compHeight: compEl.offsetHeight,
          iconFontSize: window.getComputedStyle(iconEl).fontSize,
          iconCentered: window.getComputedStyle(compEl.querySelector('.vcl-non-visual')).alignItems,
          tagFontSize: window.getComputedStyle(tagEl).fontSize,
          handlesCount: handles.length,
          handlesVisible: handles.filter(h => h.display !== 'none').length,
          visibleHandleClasses: handles.filter(h => h.display !== 'none').map(h => h.className)
        };
      })()`,
      returnByValue: true
    });

    console.log('Verificação computada:', JSON.stringify(setupRes.result ? setupRes.result.value : setupRes, null, 2));

    // Capturar screenshot focado no Form Designer
    const shot = await send('Page.captureScreenshot', { format: 'png' });
    const shotPath = path.resolve('C:/Users/Denize Abreu/.gemini/antigravity-ide/brain/961cb31d-9640-493e-84d6-6a176fb804c9/icones_componentes_centralizados_verified.png');
    fs.writeFileSync(shotPath, Buffer.from(shot.data, 'base64'));
    console.log('Screenshot salvo com sucesso em:', shotPath);

    console.log('--- TESTE CONCLUÍDO COM SUCESSO ---');
  } catch (err) {
    console.error('Erro durante o teste:', err);
  } finally {
    chrome.kill();
  }
}

testComponentIcons();
