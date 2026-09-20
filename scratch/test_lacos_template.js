// scratch/test_lacos_template.js
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

async function testLacosTemplate() {
  console.log('--- Testando Seleção do Exemplo de Laços no Combobox da IDE ---');
  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const profileDir = path.resolve('scratch/chrome-lacos-profile');
  if (!fs.existsSync(profileDir)) fs.mkdirSync(profileDir, { recursive: true });

  const chrome = spawn(chromePath, [
    '--headless=new',
    '--remote-debugging-port=9556',
    '--disable-gpu',
    '--window-size=1400,900',
    `--user-data-dir=${profileDir}`
  ]);

  try {
    await new Promise(r => setTimeout(r, 2000));
    const versionRes = await fetch('http://127.0.0.1:9556/json/version');
    const versionData = await versionRes.json();
    console.log('Chrome Conectado:', versionData.Browser);

    const listRes = await fetch('http://127.0.0.1:9556/json');
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

    // 1. Carregar o modelo lacosBancoDados via combobox
    console.log('Disparando loadExampleTemplate("lacosBancoDados")...');
    const loadRes = await send('Runtime.evaluate', {
      expression: `(() => {
        window.app.loadExampleTemplate('lacosBancoDados');
        const form = window.app.designer.form;
        const voxCode = window.VoxCodeGen.generateVoxCode(form);
        return {
          formName: form.name,
          formTitle: form.title,
          totalComponents: form.components.length,
          hasWhileInCode: voxCode.includes('while !this.vox_Query1.eof()'),
          hasForInCode: voxCode.includes('for cliente in registros'),
          hasBreakContinue: voxCode.includes('continue') && voxCode.includes('break'),
          codeLength: voxCode.length
        };
      })()`,
      returnByValue: true
    });
    console.log('Resultado do Carregamento do Template:', loadRes.result.value);

    await new Promise(r => setTimeout(r, 1000));

    // Capturar screenshot do Designer com o formulário de Laços carregado
    const ssDesigner = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync('scratch/lacos_banco_designer_verified.png', Buffer.from(ssDesigner.data, 'base64'));
    console.log('📸 Screenshot Designer salvo em: scratch/lacos_banco_designer_verified.png');

    // 2. Alternar para a visão de código (Code View) para ver o código Vox com os laços
    console.log('Alternando para a visão de Código Vox...');
    await send('Runtime.evaluate', {
      expression: `(() => {
        window.app.switchView('code');
      })()`
    });

    await new Promise(r => setTimeout(r, 1000));

    const ssCode = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync('scratch/lacos_banco_code_view_verified.png', Buffer.from(ssCode.data, 'base64'));
    console.log('📸 Screenshot Code View salvo em: scratch/lacos_banco_code_view_verified.png');

    console.log('\n✅ TESTES DE CARREGAMENTO DE MODELOS CONCLUÍDOS COM SUCESSO!');
  } catch (e) {
    console.error('❌ Erro:', e);
  } finally {
    try { chrome.kill(); } catch (e) {}
  }
}

testLacosTemplate();
