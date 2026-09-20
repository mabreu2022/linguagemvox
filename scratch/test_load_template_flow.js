// Comprehensive automated test to verify loading example projects
const fs = require('fs');
const path = require('path');

// 1. Verify index.html contains correct onchange on toolbarTemplateSelect
const html = fs.readFileSync(path.join(__dirname, '../tools/vox-rad/public/index.html'), 'utf8');

if (!html.includes('id="toolbarTemplateSelect"')) {
  console.error('FAIL: toolbarTemplateSelect ID missing in index.html');
  process.exit(1);
}
if (!html.includes('loadExampleTemplate(this.value)')) {
  console.error('FAIL: loadExampleTemplate(this.value) missing in index.html');
  process.exit(1);
}
if (!html.includes('loadTemplateFromModal()')) {
  console.error('FAIL: loadTemplateFromModal() missing in index.html');
  process.exit(1);
}
console.log('PASS: index.html markup verified!');

// 2. Setup mock DOM environment to test app.js logic
const domElements = {
  docTabTitle: { innerText: '' },
  projTreeUnitName: { innerText: '' },
  projTreeVxfName: { innerText: '' },
  toolbarTemplateSelect: { value: '' },
  cfeTemplateSelect: { value: '' },
  formTitleText: { innerText: '' },
  sbFormStatus: { innerText: '' },
  btnTabCode: { classList: { add: () => {}, remove: () => {} } },
  btnTabDesign: { classList: { add: () => {}, remove: () => {} } },
  btnTabHistory: { classList: { add: () => {}, remove: () => {} } },
  designerContainer: { style: {} },
  codeView: { style: {} }
};

global.window = {};
global.document = {
  getElementById: (id) => domElements[id] || { classList: { add: () => {}, remove: () => {} }, style: {}, innerText: '', innerHTML: '' },
  querySelector: (sel) => {
    if (sel === '.project-header span') return { textContent: '' };
    return null;
  },
  querySelectorAll: () => [],
  createElement: () => ({
    classList: { add: () => {}, remove: () => {} },
    style: {},
    appendChild: () => {},
    querySelector: () => null,
    querySelectorAll: () => []
  })
};

// Load templates.js
const templatesCode = fs.readFileSync(path.join(__dirname, '../tools/vox-rad/public/js/templates.js'), 'utf8');
eval(templatesCode);

// Load codegen.js
const codegenCode = fs.readFileSync(path.join(__dirname, '../tools/vox-rad/public/js/codegen.js'), 'utf8');
eval(codegenCode);

// Mock App and Designer
const app = {
  currentView: 'designer',
  switchView(view) { this.currentView = view; },
  designer: {
    form: {},
    selectedComponent: null,
    canvas: { innerHTML: '', querySelectorAll: () => [] },
    formWindow: { style: {} },
    recalculateAlignments() {},
    isContainerComponent() { return false; },
    renderForm() {
      this.formWindow.style.width = `${this.form.width}px`;
      this.formWindow.style.height = `${this.form.height}px`;
    }
  },
  inspector: {
    update(comp) { this.lastComp = comp; }
  },
  editor: {
    code: '',
    setCode(c) { this.code = c; }
  },
  toastHistory: [],
  showToast(msg) { this.toastHistory.push(msg); },
  updateStructureTree() { this.treeUpdated = true; }
};

// Attach loadExampleTemplate and syncCodeFromDesigner extracted from app.js
const appJs = fs.readFileSync(path.join(__dirname, '../tools/vox-rad/public/js/app.js'), 'utf8');

// Test that methods are in app.js
if (!appJs.includes('loadExampleTemplate(templateKey)')) {
  console.error('FAIL: loadExampleTemplate definition missing in app.js');
  process.exit(1);
}
if (!appJs.includes('loadTemplateFromModal()')) {
  console.error('FAIL: loadTemplateFromModal definition missing in app.js');
  process.exit(1);
}

// Bind methods
app.syncCodeFromDesigner = function() {
  const generatedVox = window.VoxCodeGen.generateVoxCode(this.designer.form);
  this.editor.setCode(generatedVox);
};

// Evaluate the actual loadExampleTemplate logic from app.js
const methodCode = appJs.match(/loadExampleTemplate\(templateKey\)\s*\{[\s\S]*?\n  \}/)[0];
eval(`app.loadExampleTemplate = function ${methodCode};`);
app.loadTemplate = function(k) { return this.loadExampleTemplate(k); };

const templatesToTest = ['erpCompleto', 'crudClientes', 'sistemaSidebar', 'pdv', 'calculadora'];

for (const key of templatesToTest) {
  console.log(`\nTesting loadExampleTemplate('${key}')...`);
  app.loadExampleTemplate(key);

  const tmpl = window.VOX_TEMPLATES[key];
  if (!app.designer.form || app.designer.form.name !== tmpl.name) {
    console.error(`FAIL: form.name mismatch for ${key}`);
    process.exit(1);
  }

  if (domElements.toolbarTemplateSelect.value !== key) {
    console.error(`FAIL: toolbarTemplateSelect.value not updated for ${key}`);
    process.exit(1);
  }

  if (!app.editor.code || app.editor.code.length < 50) {
    console.error(`FAIL: editor code not generated for ${key}`);
    process.exit(1);
  }

  const expectedUnit = `${tmpl.name || 'Form1'}.vox`;
  if (domElements.docTabTitle.innerText !== expectedUnit) {
    console.error(`FAIL: docTabTitle mismatch for ${key}, got: ${domElements.docTabTitle.innerText}`);
    process.exit(1);
  }

  console.log(`PASS: Template '${key}' loaded successfully! (${tmpl.components.length} components, ${app.editor.code.length} code chars)`);
}

console.log('\n=============================================');
console.log('ALL TESTS PASSED SUCCESSFULLY! ✨');
console.log('=============================================');
process.exit(0);
