// scratch/test_pagecontrol_cdp.js
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

async function testPageControlCDP() {
  console.log('--- Iniciando Chrome Headless com porta CDP 9334 ---');
  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const profileDir = 'd:/Projetos AntiGravity/linguagem/scratch/chrome-test-pc-profile';
  
  if (!fs.existsSync(profileDir)) {
    fs.mkdirSync(profileDir, { recursive: true });
  }

  const chrome = spawn(chromePath, [
    '--headless=new',
    '--remote-debugging-port=9334',
    '--disable-gpu',
    '--window-size=1280,800',
    `--user-data-dir=${profileDir}`
  ]);

  try {
    await new Promise(r => setTimeout(r, 2000));
    const versionRes = await fetch('http://127.0.0.1:9334/json/version');
    const versionData = await versionRes.json();
    console.log('Chrome version:', versionData.Browser);

    const listRes = await fetch('http://127.0.0.1:9334/json');
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

    // Aguardar carregamento completo do app
    await new Promise(r => setTimeout(r, 3000));

    console.log('Executando bateria de testes do PageControl no DOM...');
    const evalRes = await send('Runtime.evaluate', {
      expression: `
        (() => {
          const designer = window.app.designer;
          const initialCount = designer.form.components.length;

          // 1. Limpar formulário para teste isolado
          designer.form.components = [];
          designer.selectedComponent = null;
          designer.renderForm();

          // 2. Adicionar PageControl
          const pc = designer.addComponent('vox_PageControl', 40, 40);
          
          // Verificar auto-criação de abas
          const totalAfterAdd = designer.form.components.length;
          const pages = designer.form.components.filter(c => 
            (c.type === 'vox_TabSheet' || c.type === 'TTabSheet') && c.parent === pc.name
          );

          // Verificar nós DOM
          const pcDom = document.getElementById(pc.id);
          const tabItems = pcDom.querySelectorAll('.vcl-tab-item');
          const tabAddBtn = pcDom.querySelector('.vcl-tab-add-btn');
          const activeTabInitial = pcDom.querySelector('.vcl-tab-item.active');

          // 3. Clicar na segunda aba (Detalhes)
          let tab2Switched = false;
          if (tabItems.length >= 2) {
            tabItems[1].click();
            tab2Switched = (pc.props.ActivePageIndex === 1);
          }

          // 4. Adicionar botão dentro da aba ativa (Detalhes)
          const btn = designer.addComponent('vox_Button', 20, 20);
          const btnParent = btn ? btn.parent : null;

          // 5. Clicar no botão '+' para criar uma nova aba (TabSheet3)
          if (tabAddBtn) {
            tabAddBtn.click();
          }
          const pagesAfterAddBtn = designer.form.components.filter(c => 
            (c.type === 'vox_TabSheet' || c.type === 'TTabSheet') && c.parent === pc.name
          );

          // 6. Testar navegação Próxima / Anterior
          designer.nextPage(pc);
          const activeAfterNext = pc.props.ActivePageIndex;
          designer.prevPage(pc);
          const activeAfterPrev = pc.props.ActivePageIndex;

          // 7. Testar Menu de Contexto
          designer.selectComponent(pc);
          designer.showContextMenu(200, 200);
          const ctxMenu = document.getElementById('delphiDesignerContextMenu');
          const ctxGroup = document.getElementById('ctxPageControlGroup');
          const ctxMenuVisible = ctxMenu ? ctxMenu.classList.contains('open') : false;
          const ctxGroupDisplay = ctxGroup ? ctxGroup.style.display : 'none';
          designer.hideContextMenu();

          // 8. Testar Codegen
          const voxSource = window.VoxCodeGen.generateVoxCode(designer.form);
          const webSys = window.VoxCodeGen.generateWebSystem(designer.form);

          return {
            initialCount,
            pcAdded: !!pc,
            pcName: pc ? pc.name : null,
            totalAfterAdd,
            pagesCount: pages.length,
            tabSheet1Name: pages[0] ? pages[0].name : null,
            tabSheet1Caption: pages[0] ? pages[0].props.Caption : null,
            tabSheet2Name: pages[1] ? pages[1].name : null,
            tabSheet2Caption: pages[1] ? pages[1].props.Caption : null,
            domTabsCount: tabItems.length,
            hasAddBtn: !!tabAddBtn,
            activeTabCaptionInitial: activeTabInitial ? activeTabInitial.innerText.trim() : null,
            tab2Switched,
            btnAdded: !!btn,
            btnParent,
            pagesAfterAddBtnCount: pagesAfterAddBtn.length,
            tabSheet3Name: pagesAfterAddBtn[2] ? pagesAfterAddBtn[2].name : null,
            activeAfterNext,
            activeAfterPrev,
            ctxMenuVisible,
            ctxGroupDisplay,
            voxHasPageControl: voxSource.includes('vox_PageControl'),
            voxHasTabSheet: voxSource.includes('vox_TabSheet'),
            webHasPageControl: webSys.htmlContent.includes('web-pagecontrol'),
            webHasTabSwitch: webSys.jsContent.includes('voxSwitchTab')
          };
        })()
      `,
      returnByValue: true
    });

    console.log('Resultados do Teste CDP:\n', JSON.stringify(evalRes.result.value, null, 2));

    // Capturar Screenshot
    const screenshotRes = await send('Page.captureScreenshot', { format: 'png' });
    const screenshotBuf = Buffer.from(screenshotRes.data, 'base64');
    const screenshotPath = 'C:\\Users\\Denize Abreu\\.gemini\\antigravity-ide\\brain\\aa5d47d1-8a57-4065-9c23-c51228a2dd91\\pagecontrol_cdp_screenshot.png';
    fs.writeFileSync(screenshotPath, screenshotBuf);
    console.log(`✓ Screenshot salvo em: ${screenshotPath}`);

    ws.close();
  } finally {
    chrome.kill('SIGTERM');
  }
}

testPageControlCDP().catch(err => {
  console.error('❌ Erro no teste CDP:', err);
  process.exit(1);
});
