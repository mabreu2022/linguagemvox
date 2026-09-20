const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

async function captureManual() {
  console.log('--- Capturando Screenshot do Manual da IDE ---');
  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const profileDir = path.resolve('scratch/chrome-manual-profile');
  if (!fs.existsSync(profileDir)) fs.mkdirSync(profileDir, { recursive: true });

  const chrome = spawn(chromePath, [
    '--headless=new',
    '--remote-debugging-port=9559',
    '--disable-gpu',
    '--window-size=1400,1000',
    `--user-data-dir=${profileDir}`
  ]);

  try {
    await new Promise(r => setTimeout(r, 2000));
    const versionRes = await fetch('http://127.0.0.1:9559/json/version');
    const versionData = await versionRes.json();
    console.log('Chrome Conectado:', versionData.Browser);

    const listRes = await fetch('http://127.0.0.1:9559/json');
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

    console.log('Navegando para http://localhost:4500/docs/manual_ide.html...');
    await send('Page.navigate', { url: 'http://localhost:4500/docs/manual_ide.html' });
    await new Promise(r => setTimeout(r, 2000));

    // Rolar para a seção de componentes
    await send('Runtime.evaluate', {
      expression: `document.getElementById('catalogo-componentes').scrollIntoView();`
    });
    await new Promise(r => setTimeout(r, 1000));

    // Capturar screenshot
    const shot = await send('Page.captureScreenshot', { format: 'png' });
    const shotPath = path.resolve('C:/Users/Denize Abreu/.gemini/antigravity-ide/brain/961cb31d-9640-493e-84d6-6a176fb804c9/manual_ide_components_preview.png');
    fs.writeFileSync(shotPath, Buffer.from(shot.data, 'base64'));
    console.log('Screenshot dos componentes salvo em:', shotPath);
  } catch (err) {
    console.error('Erro:', err);
  } finally {
    chrome.kill();
  }
}

captureManual();
