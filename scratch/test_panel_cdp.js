const { spawn } = require('child_process');
const fs = require('fs');

async function testCDP() {
  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const profileDir = 'd:/Projetos AntiGravity/linguagem/scratch/chrome-test-profile';
  
  const chrome = spawn(chromePath, [
    '--headless=new',
    '--remote-debugging-port=9333',
    '--disable-gpu',
    `--user-data-dir=${profileDir}`
  ]);

  try {
    await new Promise(r => setTimeout(r, 1500));
    const versionRes = await fetch('http://127.0.0.1:9333/json/version');
    const versionData = await versionRes.json();
    console.log('Chrome version:', versionData.Browser);

    const listRes = await fetch('http://127.0.0.1:9333/json');
    const listTxt = await listRes.text();
    console.log('List raw:', listTxt);
    let tabData;
    try {
      const list = JSON.parse(listTxt);
      tabData = list.find(t => t.type === 'page') || list[0];
    } catch(e) {
      console.log('Error parsing list:', e.message);
    }

    const ws = new WebSocket(tabData.webSocketDebuggerUrl);
    let msgId = 1;
    const send = (method, params = {}) => new Promise((resolve) => {
      const id = msgId++;
      const handler = (event) => {
        const data = JSON.parse(event.data);
        if (data.id === id) {
          ws.removeEventListener('message', handler);
          resolve(data.result);
        }
      };
      ws.addEventListener('message', handler);
      ws.send(JSON.stringify({ id, method, params }));
    });

    await new Promise(r => ws.onopen = r);
    await send('Runtime.enable');
    await send('Page.enable');

    console.log('Navigating to http://localhost:4500...');
    await send('Page.navigate', { url: 'http://localhost:4500' });

    // Aguardar inicialização do app e carregamento do formulário
    await new Promise(r => setTimeout(r, 2500));

    const evalRes = await send('Runtime.evaluate', {
      expression: `
        (() => {
          // 1. Componentes iniciais
          const initComps = (window.app.designer.form.components || []).map(c => ({ id: c.id, name: c.name, type: c.type }));
          
          // 2. Adicionar Panel
          const addedPanel = window.app.designer.addComponent('vox_Panel', 80, 80);

          // 3. Inspecionar elementos no DOM
          const domComps = Array.from(document.querySelectorAll('#delphiFormCanvas .delphi-comp')).map(el => ({
            id: el.id,
            className: el.className,
            name: el.dataset.compName,
            hasHandles: !!el.querySelector('.delphi-handle')
          }));

          // 4. Deselecionar primeiro
          window.app.designer.selectComponent(null);
          const deselectInspector = document.getElementById('oiComponentDropdown') ? document.getElementById('oiComponentDropdown').value : null;

          // 5. Clicar diretamente no elemento Panel no canvas (mousedown + click)
          const panelEl = document.getElementById(addedPanel.id);
          panelEl.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true, clientX: 100, clientY: 100 }));
          panelEl.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, clientX: 100, clientY: 100 }));

          const selectedNow = window.app.designer.selectedComponent;
          const inspectorAfterClick = document.getElementById('oiComponentDropdown') ? document.getElementById('oiComponentDropdown').value : null;
          const panelClassAfterClick = panelEl.className;
          const handlesVisible = panelEl.querySelector('.delphi-handle') !== null;

          // 6. Testar arraste/movimentação sem gerar duplicatas
          const compCountBeforeMove = document.querySelectorAll('#delphiFormCanvas .delphi-comp').length;
          panelEl.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true, clientX: 100, clientY: 100 }));
          window.dispatchEvent(new MouseEvent('mousemove', { bubbles: true, cancelable: true, clientX: 150, clientY: 150 }));
          window.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true }));
          const compCountAfterMove = document.querySelectorAll('#delphiFormCanvas .delphi-comp').length;

          // 7. Checar duplicatas de IDs em todo o formCanvas
          const allCanvasComps = Array.from(document.querySelectorAll('#delphiFormCanvas .delphi-comp'));
          const allIds = allCanvasComps.map(c => c.id);
          const uniqueIds = Array.from(new Set(allIds));

          // 8. Teste de contêiner aninhado (Botão dentro do Panel)
          const addedButton = window.app.designer.addComponent('vox_Button', 20, 20, addedPanel.name);
          const buttonEl = document.getElementById(addedButton.id);
          
          // Clicar no botão: deve selecionar o botão
          buttonEl.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
          buttonEl.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
          const selectedButtonName = window.app.designer.selectedComponent ? window.app.designer.selectedComponent.name : null;
          const inspectorButton = document.getElementById('oiComponentDropdown') ? document.getElementById('oiComponentDropdown').value : null;

          // Clicar de volta no Panel (área vazia do painel): deve selecionar o Panel
          panelEl.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
          panelEl.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
          const selectedPanelAgain = window.app.designer.selectedComponent ? window.app.designer.selectedComponent.name : null;
          const inspectorPanelAgain = document.getElementById('oiComponentDropdown') ? document.getElementById('oiComponentDropdown').value : null;

          // Excluir o Panel selecionado: exclusão em cascata (painel + filho)
          const compCountBeforeDelete = document.querySelectorAll('#delphiFormCanvas .delphi-comp').length;
          window.app.designer.deleteSelected();
          const compCountAfterDelete = document.querySelectorAll('#delphiFormCanvas .delphi-comp').length;
          const panelOrphan = document.getElementById(addedPanel.id);
          const buttonOrphan = document.getElementById(addedButton.id);

          return {
            initCount: initComps.length,
            addedId: addedPanel.id,
            addedName: addedPanel.name,
            domCompsCount: domComps.length,
            deselectInspector,
            selectedName: selectedNow ? selectedNow.name : null,
            selectedId: selectedNow ? selectedNow.id : null,
            inspectorAfterClick,
            panelClassAfterClick,
            handlesVisible,
            compCountBeforeMove,
            compCountAfterMove,
            totalCompsInDOM: allIds.length,
            uniqueIdsCount: uniqueIds.length,
            hasDuplicateIds: allIds.length !== uniqueIds.length,
            allIds,
            // Resultados do teste aninhado
            selectedButtonName,
            inspectorButton,
            selectedPanelAgain,
            inspectorPanelAgain,
            compCountBeforeDelete,
            compCountAfterDelete,
            hasOrphans: !!(panelOrphan || buttonOrphan)
          };
        })()
      `,
      returnByValue: true
    });

    console.log('Result:', JSON.stringify(evalRes.result.value, null, 2));
    ws.close();
  } finally {
    chrome.kill('SIGTERM');
  }
}

testCDP().catch(e => {
  console.error('CDP Error:', e);
  process.exit(1);
});
