// Automated test suite for Delphi File Menu: Open & Close (Files, Projects, Groups)
const fs = require('fs');
const path = require('path');

console.log('=== TEST 1: Verifying index.html File Menu and Modals ===');
const html = fs.readFileSync(path.join(__dirname, '../tools/vox-rad/public/index.html'), 'utf8');

const requiredMenuTriggers = [
  'openFileDialog()',
  'openProjectDialog()',
  'openProjectGroupDialog()',
  'closeActiveFile()',
  'closeCurrentProject()',
  'closeProjectGroup()'
];

for (const trigger of requiredMenuTriggers) {
  if (!html.includes(trigger)) {
    console.error(`FAIL: Menu item with trigger ${trigger} not found in index.html`);
    process.exit(1);
  }
  console.log(`PASS: Found menu trigger ${trigger}`);
}

const requiredModals = [
  'id="openFileModal"',
  'id="openProjectModal"',
  'id="openProjectGroupModal"',
  'id="saveProjectAsModal"'
];

for (const modal of requiredModals) {
  if (!html.includes(modal)) {
    console.error(`FAIL: Modal ${modal} not found in index.html`);
    process.exit(1);
  }
  console.log(`PASS: Found modal ${modal}`);
}

console.log('\n=== TEST 2: Verifying Server Endpoints ===');
async function testServer() {
  // 1. /api/workspace/files
  const r1 = await fetch('http://localhost:4500/api/workspace/files');
  const d1 = await r1.json();
  if (!d1.success || !Array.isArray(d1.units) || d1.units.length === 0) {
    console.error('FAIL: /api/workspace/files failed or returned no units:', d1);
    process.exit(1);
  }
  console.log(`PASS: /api/workspace/files returned ${d1.units.length} units, ${d1.projects.length} projects, ${d1.groups.length} groups`);

  // 2. /api/file/read
  const r2 = await fetch('http://localhost:4500/api/file/read?file=clientes/app.vox');
  const d2 = await r2.json();
  if (!d2.success || !d2.content || d2.content.length < 50) {
    console.error('FAIL: /api/file/read failed:', d2);
    process.exit(1);
  }
  console.log(`PASS: /api/file/read successfully read ${d2.fileName} (${d2.content.length} chars)`);

  // 3. /api/project/save-as
  const r3 = await fetch('http://localhost:4500/api/project/save-as', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ projectName: 'TestAutoProj', folder: 'projetos/TestAutoProj' })
  });
  const d3 = await r3.json();
  if (!d3.success) {
    console.error('FAIL: /api/project/save-as failed:', d3);
    process.exit(1);
  }
  console.log(`PASS: /api/project/save-as created ${d3.filePath}`);

  // 4. /api/group/save-as
  const r4 = await fetch('http://localhost:4500/api/group/save-as', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ groupName: 'TestAutoGroup', projects: ['TestAutoProj.dproj'] })
  });
  const d4 = await r4.json();
  if (!d4.success) {
    console.error('FAIL: /api/group/save-as failed:', d4);
    process.exit(1);
  }
  console.log(`PASS: /api/group/save-as created ${d4.file}`);

  console.log('\n=== TEST 3: Verifying app.js Open & Close Methods ===');
  const appJs = fs.readFileSync(path.join(__dirname, '../tools/vox-rad/public/js/app.js'), 'utf8');

  const requiredMethods = [
    'openFileDialog',
    'openFile',
    'openProjectDialog',
    'openProject',
    'openProjectGroupDialog',
    'openProjectGroup',
    'closeActiveFile',
    'closeCurrentProject',
    'closeProjectGroup',
    'updateProjectsTree'
  ];

  for (const m of requiredMethods) {
    if (!appJs.includes(`${m}(`) && !appJs.includes(`async ${m}(`)) {
      console.error(`FAIL: Method ${m} not found in app.js`);
      process.exit(1);
    }
    console.log(`PASS: Method ${m} defined in app.js`);
  }

  console.log('\n=============================================');
  console.log('ALL TESTS PASSED SUCCESSFULLY! 🚀');
  console.log('=============================================');
  process.exitCode = 0;
}

testServer().catch(err => {
  console.error('Test execution error:', err);
  process.exit(1);
});
