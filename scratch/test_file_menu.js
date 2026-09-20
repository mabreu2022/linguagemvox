// scratch/test_file_menu.js
const { spawn } = require('child_process');
const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const chrome = spawn(chromePath, ['--headless=new', '--remote-debugging-port=9339', '--disable-gpu']);

setTimeout(async () => {
  try {
    const listRes = await fetch('http://127.0.0.1:9339/json');
    const list = await listRes.json();
    const tab = list.find(t => t.type === 'page') || list[0];
    const ws = new WebSocket(tab.webSocketDebuggerUrl);
    await new Promise(r => ws.onopen = r);
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
    await send('Runtime.enable');
    await send('Page.enable');
    await send('Page.navigate', { url: 'http://localhost:4500' });
    await new Promise(r => setTimeout(r, 2000));

    // Test 1: Test openFileDialog()
    const r1 = await send('Runtime.evaluate', {
      expression: `(async () => {
        await window.app.openFileDialog();
        const modal = document.getElementById('openFileModal');
        const rows = document.querySelectorAll('#openFileListBody tr');
        window.app.closeOpenFileModal();
        return { modalDisplayBeforeClose: modal.style.display, rowsCount: rows.length };
      })()`,
      awaitPromise: true,
      returnByValue: true
    });
    console.log('Open File Dialog test:', r1.result.value);

    // Test 2: Test openProjectDialog()
    const r2 = await send('Runtime.evaluate', {
      expression: `(async () => {
        await window.app.openProjectDialog();
        const modal = document.getElementById('openProjectModal');
        const cards = document.querySelectorAll('#openProjectListContainer > div');
        window.app.closeOpenProjectModal();
        return { modalDisplayBeforeClose: modal.style.display, cardsCount: cards.length };
      })()`,
      awaitPromise: true,
      returnByValue: true
    });
    console.log('Open Project Dialog test:', r2.result.value);

    // Test 3: Test openProjectGroupDialog()
    const r3 = await send('Runtime.evaluate', {
      expression: `(async () => {
        await window.app.openProjectGroupDialog();
        const modal = document.getElementById('openProjectGroupModal');
        const cards = document.querySelectorAll('#openGroupListContainer > div');
        window.app.closeOpenProjectGroupModal();
        return { modalDisplayBeforeClose: modal.style.display, cardsCount: cards.length };
      })()`,
      awaitPromise: true,
      returnByValue: true
    });
    console.log('Open Project Group Dialog test:', r3.result.value);

    // Test 4: Test clicking on File menu item then clicking dropdown item
    const r4 = await send('Runtime.evaluate', {
      expression: `(async () => {
        const fileMenuItem = document.querySelector('.delphi-menubar .delphi-menu-item:first-child');
        const dropdown = fileMenuItem.querySelector('.delphi-menu-dropdown');
        const items = dropdown.querySelectorAll('.delphi-menu-dropdown-item');
        
        // Let's test all File menu dropdown items
        const results = [];
        for (const item of items) {
          results.push({
            text: item.innerText.trim(),
            onclick: item.getAttribute('onclick')
          });
        }
        return results;
      })()`,
      awaitPromise: true,
      returnByValue: true
    });
    console.log('All File menu items in DOM:', r4.result.value);

    chrome.kill();
    process.exit(0);
  } catch (e) {
    console.error(e);
    chrome.kill();
    process.exit(1);
  }
}, 1500);
