// scratch/test_palette_duplicates.js
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

async function testPaletteDuplicates() {
  console.log('--- Testing Palette Duplication Resolution ---');
  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const profileDir = path.join(__dirname, 'chrome-test-palette-profile');

  if (!fs.existsSync(profileDir)) {
    fs.mkdirSync(profileDir, { recursive: true });
  }

  const chrome = spawn(chromePath, [
    '--headless=new',
    '--remote-debugging-port=9337',
    '--disable-gpu',
    '--window-size=1440,900',
    `--user-data-dir=${profileDir}`
  ]);

  try {
    await new Promise(r => setTimeout(r, 2000));
    const versionRes = await fetch('http://127.0.0.1:9337/json/version');
    const versionData = await versionRes.json();
    console.log('Chrome connected successfully:', versionData.Browser);

    const listRes = await fetch('http://127.0.0.1:9337/json');
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
            const searchInput = document.getElementById('paletteSearchInput');
            const accordion = document.getElementById('paletteAccordion');

            assert(!!accordion, 'paletteAccordion element exists');
            assert(!!searchInput, 'paletteSearchInput element exists');

            // 1. Verificar estado inicial sem filtro: coletar todos os componentes
            const allRows = document.querySelectorAll('.palette-comp-row');
            assert(allRows.length > 0, 'Palette contains ' + allRows.length + ' component rows');

            const compTypes = Array.from(allRows).map(r => r.dataset.type);
            const duplicates = compTypes.filter((t, i) => compTypes.indexOf(t) !== i);
            assert(duplicates.length === 0, 'Zero duplicated components in palette (found: ' + duplicates.join(', ') + ')');
            logs.push('Verified: ' + compTypes.length + ' unique components in palette with 0 duplicates');

            // 2. Testar busca por "memo"
            searchInput.value = 'memo';
            searchInput.dispatchEvent(new Event('input', { bubbles: true }));
            
            const memoRows = document.querySelectorAll('.palette-comp-row');
            assert(memoRows.length === 1, 'Search "memo" returned exactly 1 row (got: ' + memoRows.length + ')');
            assert(memoRows[0].dataset.type === 'vox_Memo', 'Matching component is vox_Memo');

            // 3. Testar busca por "button"
            searchInput.value = 'button';
            searchInput.dispatchEvent(new Event('input', { bubbles: true }));
            const buttonRows = document.querySelectorAll('.palette-comp-row');
            const buttonTypes = Array.from(buttonRows).map(r => r.dataset.type);
            const buttonDupes = buttonTypes.filter((t, i) => buttonTypes.indexOf(t) !== i);
            assert(buttonDupes.length === 0, 'Search "button" contains no duplicates: ' + buttonTypes.join(', '));
            assert(buttonTypes.includes('vox_Button'), 'vox_Button is present');

            // 4. Limpar busca
            const clearBtn = document.getElementById('paletteSearchClear');
            if (clearBtn) clearBtn.click();
            searchInput.value = '';
            searchInput.dispatchEvent(new Event('input', { bubbles: true }));

            const resetRows = document.querySelectorAll('.palette-comp-row');
            assert(resetRows.length === allRows.length, 'Palette reset to full list after clearing search');

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
        console.log('ALL PALETTE DEDUPLICATION TESTS PASSED! 🚀');
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

testPaletteDuplicates();
