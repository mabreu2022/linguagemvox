const { spawn } = require('child_process');
const http = require('http');

async function main() {
  const chrome = spawn('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', [
    '--headless=new',
    '--remote-debugging-port=9444',
    '--no-sandbox',
    '--disable-gpu',
    '--window-size=1280,800',
    'http://localhost:4500'
  ]);

  try {
    await new Promise(r => setTimeout(r, 2000));

    const targets = await new Promise((resolve, reject) => {
      http.get('http://127.0.0.1:9444/json', (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => resolve(JSON.parse(data)));
      }).on('error', reject);
    });

    const pageTarget = targets.find(t => t.type === 'page' && t.url.includes('4500'));
    if (!pageTarget) {
      console.error('Page target not found!');
      return;
    }

    const ws = new WebSocket(pageTarget.webSocketDebuggerUrl);
    await new Promise((resolve, reject) => {
      ws.onopen = resolve;
      ws.onerror = reject;
    });

    let msgId = 1;
    function send(method, params = {}) {
      return new Promise((resolve) => {
        const id = msgId++;
        const handler = (event) => {
          const res = JSON.parse(event.data);
          if (res.id === id) {
            ws.removeEventListener('message', handler);
            resolve(res.result);
          }
        };
        ws.addEventListener('message', handler);
        ws.send(JSON.stringify({ id, method, params }));
      });
    }

    await send('Runtime.enable');
    await send('Page.enable');

    // Wait for app to be ready
    await new Promise(r => setTimeout(r, 1500));

    // Run diagnostic in browser context
    const evalRes = await send('Runtime.evaluate', {
      expression: `(() => {
        const results = {};
        const app = window.app;
        if (!app) return { error: 'window.app not found' };

        // 1. Initial components
        results.initialComps = app.designer.form.components.map(c => ({ id: c.id, name: c.name, type: c.type }));

        // 2. Add Panel via designer.addComponent
        const panel = app.designer.addComponent('vox_Panel', 60, 60);
        results.addedPanel = { id: panel.id, name: panel.name, type: panel.type, parent: panel.parent };
        results.componentsAfterAdd = app.designer.form.components.map(c => ({ id: c.id, name: c.name, parent: c.parent }));

        // 3. Inspect canvas DOM elements
        const canvas = document.getElementById('delphiFormCanvas');
        results.canvasChildElements = Array.from(canvas.children).map(el => ({
          tagName: el.tagName,
          id: el.id,
          className: el.className,
          rect: el.getBoundingClientRect(),
          innerHTML: el.innerHTML.substring(0, 150)
        }));

        // 4. Test hit testing on the panel coordinates (center of panel: 60 + 100, 60 + 60 = 160, 120)
        const panelEl = document.getElementById(panel.id);
        const rect = panelEl.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;

        const hitEl = document.elementFromPoint(centerX, centerY);
        results.hitTesting = {
          centerX,
          centerY,
          hitElementTag: hitEl ? hitEl.tagName : null,
          hitElementId: hitEl ? hitEl.id : null,
          hitElementClass: hitEl ? hitEl.className : null,
          isInsidePanel: hitEl ? panelEl.contains(hitEl) : false,
          isExactPanelEl: hitEl === panelEl
        };

        // 5. Simulate mouse click directly on the hit element
        app.designer.selectComponent(null);
        results.selectedBeforeClick = app.designer.selectedComponent ? app.designer.selectedComponent.name : null;

        const evt = new MouseEvent('mousedown', {
          bubbles: true,
          cancelable: true,
          clientX: centerX,
          clientY: centerY
        });
        hitEl.dispatchEvent(evt);

        results.selectedAfterClick = app.designer.selectedComponent ? app.designer.selectedComponent.name : null;

        // 6. Check for duplicate visual elements or orphan nodes
        const allComps = document.querySelectorAll('.delphi-comp');
        results.allDelphiCompElements = Array.from(allComps).map(el => ({
          id: el.id,
          parentEl: el.parentElement.id || el.parentElement.className,
          className: el.className
        }));

        const allVclPanels = document.querySelectorAll('.vcl-panel');
        results.allVclPanelCount = allVclPanels.length;

        return results;
      })()`,
      returnByValue: true
    });

    const val = evalRes && evalRes.result ? evalRes.result.value : evalRes;
    console.log('Diagnostic Results:\n', JSON.stringify(val, null, 2));

    ws.close();
  } finally {
    chrome.kill();
  }
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
