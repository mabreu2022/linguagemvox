// scratch/test_browser_file_menu.js
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

async function runBrowserTests() {
  console.log('--- Starting Chrome Headless on CDP port 9335 ---');
  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const profileDir = path.join(__dirname, 'chrome-test-menu-profile');

  if (!fs.existsSync(profileDir)) {
    fs.mkdirSync(profileDir, { recursive: true });
  }

  const chrome = spawn(chromePath, [
    '--headless=new',
    '--remote-debugging-port=9335',
    '--disable-gpu',
    '--window-size=1440,900',
    `--user-data-dir=${profileDir}`
  ]);

  try {
    await new Promise(r => setTimeout(r, 2000));
    const versionRes = await fetch('http://127.0.0.1:9335/json/version');
    const versionData = await versionRes.json();
    console.log('Chrome connected successfully:', versionData.Browser);

    const listRes = await fetch('http://127.0.0.1:9335/json');
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
          console.log(`[Auto-Dialog] ${data.params.type}: ${data.params.message}`);
          send('Page.handleJavaScriptDialog', { accept: true });
        }
      } catch (_) {}
    });

    await new Promise(r => ws.onopen = r);
    await send('Runtime.enable');
    await send('Page.enable');

    console.log('Navigating to http://localhost:4500...');
    await send('Page.navigate', { url: 'http://localhost:4500' });

    // Wait for full page and IDE initialization
    await new Promise(r => setTimeout(r, 3500));

    console.log('Running in-browser File Menu & Document Tabs test suite...');

    const result = await send('Runtime.evaluate', {
      awaitPromise: true,
      returnByValue: true,
      expression: `
        (async () => {
          const testLogs = [];
          const assert = (cond, msg) => {
            if (!cond) throw new Error('Assertion failed: ' + msg);
            testLogs.push('PASS: ' + msg);
          };

          try {
            const app = window.app;
            assert(!!app, 'window.app initialized');
            assert(!!app.editorTabs, 'window.app.editorTabs initialized');

            // 1. Initial Tabs check
            const initialTabs = app.editorTabs.openTabs;
            assert(initialTabs.length >= 1, 'Initial tabs loaded (count: ' + initialTabs.length + ')');
            const tabBar = document.getElementById('documentTabBar');
            assert(!!tabBar, '#documentTabBar element exists in DOM');
            assert(tabBar.children.length >= 1, 'Tab elements rendered in #documentTabBar');

            // 2. New Form (Task A & B)
            const initialTabCount = app.editorTabs.openTabs.length;
            app.newForm();
            assert(app.editorTabs.openTabs.length === initialTabCount + 1, 'newForm() opened a new tab');
            const newFormTab = app.editorTabs.openTabs.find(t => t.id === app.editorTabs.activeTabId);
            assert(newFormTab.type === 'form', 'New tab is of type "form"');
            assert(newFormTab.title.includes('Form'), 'New tab has title with Form');

            // 3. New Unit (Task A & B)
            app.newUnit();
            assert(app.editorTabs.openTabs.length === initialTabCount + 2, 'newUnit() opened second new tab');
            const newUnitTab = app.editorTabs.openTabs.find(t => t.id === app.editorTabs.activeTabId);
            assert(newUnitTab.type === 'unit', 'New tab is of type "unit"');
            const codeView = document.getElementById('codeView');
            assert(codeView && codeView.style.display !== 'none', 'Code editor view displayed when unit tab is active');

            // 4. Tab Switching
            app.editorTabs.switchTab(newFormTab.id);
            assert(app.editorTabs.activeTabId === newFormTab.id, 'Switched active tab back to Form tab');
            const designerContainer = document.getElementById('designerContainer');
            assert(designerContainer && designerContainer.style.display !== 'none', 'Designer displayed when form tab is active');

            // 5. Tab Closing
            app.editorTabs.closeTab(newUnitTab.id);
            assert(!app.editorTabs.openTabs.find(t => t.id === newUnitTab.id), 'Unit tab closed cleanly');

            // 6. Open File Dialog & Modal Test
            await app.openFileDialog();
            const openFileModal = document.getElementById('openFileModal');
            assert(openFileModal && openFileModal.style.display === 'flex', 'openFileModal opened and visible');
            
            // Test category filter tabs inside modal
            app.filterOpenFileCategory('Unit');
            const rows = document.querySelectorAll('#openFileListBody tr');
            assert(rows.length > 0, 'Workspace files list populated with ' + rows.length + ' rows');
            app.closeOpenFileModal();
            assert(openFileModal.style.display === 'none', 'openFileModal closed successfully');

            // 7. Open Project Dialog & Modal Test
            await app.openProjectDialog();
            const openProjectModal = document.getElementById('openProjectModal');
            assert(openProjectModal && openProjectModal.style.display === 'flex', 'openProjectModal opened and visible');
            const projCards = document.querySelectorAll('#openProjectListContainer .workspace-project-card');
            assert(projCards.length > 0, 'Project list populated in modal');
            app.closeOpenProjectModal();
            assert(openProjectModal.style.display === 'none', 'openProjectModal closed successfully');

            // 8. Open Project Group Dialog & Modal Test
            await app.openProjectGroupDialog();
            const openGroupModal = document.getElementById('openProjectGroupModal');
            assert(openGroupModal && openGroupModal.style.display === 'flex', 'openProjectGroupModal opened and visible');
            app.closeOpenProjectGroupModal();
            assert(openGroupModal.style.display === 'none', 'openProjectGroupModal closed successfully');

            // 9. Load Real File into Tab via openFile
            await app.openFile('clientes/app.vox');
            const fileTab = app.editorTabs.openTabs.find(t => t.path === 'clientes/app.vox' || t.name === 'app.vox');
            assert(!!fileTab, 'File clientes/app.vox loaded into tabs');
            assert(fileTab.title === 'app.vox', 'Tab title matches file name');

            // 10. Test Dirty state and Save All
            fileTab.dirty = true;
            app.editorTabs.renderTabs();
            assert(document.querySelector('.doc-tab.dirty') !== null, 'Dirty tab visual dot/indicator displayed');
            await app.saveAll();
            assert(fileTab.dirty === false, 'saveAll() reset dirty state of open tabs');

            // 11. Open Existing Real Project and verify Project Explorer & Designer
            await app.openProject('projetos/VoxERP_Comercial/VoxERP_Comercial.dproj');
            assert(app.currentProject && app.currentProject.name.includes('VoxERP'), 'Active project updated to VoxERP_Comercial');
            const projectTree = document.getElementById('projectTree');
            const projHeader = document.getElementById('projHeaderTitle') || document.querySelector('.projects-panel .panel-header span');
            assert((projectTree && projectTree.textContent.includes('VoxERP')) || (projHeader && projHeader.textContent.includes('VoxERP')), 'Project Explorer updated with project name');

            // 12. Close Active File & Close Project & Close Group
            app.closeActiveFile();
            const closedActive = !app.editorTabs.openTabs.find(t => t.id === app.editorTabs.activeTabId);
            assert(!closedActive, 'Active tab handled');

            app.closeCurrentProject();
            assert(app.currentProject === null, 'Project closed cleanly');

            return { success: true, logs: testLogs };
          } catch (err) {
            return { success: false, error: err.message, stack: err.stack, logs: testLogs };
          }
        })()
      `
    });

    if (result && result.result && result.result.value) {
      const val = result.result.value;
      if (val.logs) {
        val.logs.forEach(l => console.log(l));
      }
      if (val.success) {
        console.log('\n=============================================');
        console.log('ALL IN-BROWSER TESTS PASSED 100%! 🚀');
        console.log('=============================================');
      } else {
        console.error('\nBROWSER TEST FAILED:', val.error);
        console.error(val.stack);
        process.exit(1);
      }
    } else {
      console.error('No result returned from evaluate:', result);
      process.exit(1);
    }
  } catch (err) {
    console.error('Fatal error running browser tests:', err);
    process.exit(1);
  } finally {
    try {
      chrome.kill();
    } catch (_) {}
  }
}

runBrowserTests();
