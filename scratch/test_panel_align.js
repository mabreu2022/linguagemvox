// ==============================================================================
// scratch/test_panel_align.js — Comprehensive verification of Panel Align & Alignment
// ==============================================================================

const assert = require('assert');
const fs = require('fs');

// Minimal DOM simulation for Node.js
class Element {
  constructor(id = '', tagName = 'div') {
    this.id = id;
    this.tagName = tagName;
    this.style = {};
    this.classList = new Set();
    this.children = [];
    this.parentElement = null;
    this.innerHTML = '';
    this.dataset = {};
    this._listeners = {};
  }
  addEventListener(type, fn) {
    this._listeners[type] = this._listeners[type] || [];
    this._listeners[type].push(fn);
  }
  appendChild(child) {
    this.children.push(child);
    child.parentElement = this;
  }
  querySelector(sel) {
    if (sel === '.delphi-comp-children') {
      return this.children.find(c => c.classList.has('delphi-comp-children')) || null;
    }
    return null;
  }
  querySelectorAll(sel) {
    const res = [];
    const find = (el) => {
      if (sel === '.delphi-comp' && el.classList.has('delphi-comp')) res.push(el);
      el.children.forEach(find);
    };
    find(this);
    return res;
  }
  closest(sel) {
    let cur = this;
    while (cur) {
      if (sel === '.delphi-comp' && cur.classList.has('delphi-comp')) return cur;
      cur = cur.parentElement;
    }
    return null;
  }
}

Element.prototype.classList = {
  items: new Set(),
  add(c) { this.items.add(c); },
  remove(c) { this.items.delete(c); },
  has(c) { return this.items.has(c); },
  toggle(c, force) { if (force !== undefined) { force ? this.items.add(c) : this.items.delete(c); } }
};

const elements = {};
global.document = {
  getElementById: (id) => elements[id] || null,
  createElement: (tag) => {
    const el = new Element('', tag);
    return el;
  },
  addEventListener: () => {},
  body: { style: {} },
  activeElement: { tagName: 'BODY' }
};

global.window = {
  addEventListener: () => {},
  innerWidth: 1200,
  innerHeight: 800
};

// 1. Load components.js
const compCode = fs.readFileSync('tools/vox-rad/public/js/components.js', 'utf8');
eval(compCode);

// 2. Load designer.js
const designerCode = fs.readFileSync('tools/vox-rad/public/js/designer.js', 'utf8');
eval(designerCode);

// 3. Load inspector.js
const inspectorCode = fs.readFileSync('tools/vox-rad/public/js/inspector.js', 'utf8');
eval(inspectorCode);

// 4. Load codegen.js
const codegenCode = fs.readFileSync('tools/vox-rad/public/js/codegen.js', 'utf8');
eval(codegenCode);

// 5. Load runner.js
const runnerCode = fs.readFileSync('tools/vox-rad/public/js/runner.js', 'utf8');
eval(runnerCode);

console.log('✔ All modules loaded successfully');

// Initialize Designer
const canvas = new Element('delphiFormCanvas');
canvas.clientWidth = 698;
canvas.clientHeight = 450;
elements['delphiFormCanvas'] = canvas;

const formWindow = new Element('delphiFormWindow');
formWindow.style = { width: '700px', height: '480px' };
elements['delphiFormWindow'] = formWindow;

const designer = new window.VoxDesigner(canvas, formWindow);
global.window.app = {
  designer: designer,
  onFormChanged: () => {},
  updateStructureTree: () => {},
  showToast: (msg) => console.log('Toast:', msg)
};
const inspector = new window.VoxObjectInspector();
global.window.app.inspector = inspector;

// --------------------------------------------------------------------------
// TEST 1: Default properties of vox_Panel
// --------------------------------------------------------------------------
console.log('\n--- TEST 1: vox_Panel default props ---');
const panelMeta = window.VOX_COMPONENTS['vox_Panel'];
assert.strictEqual(panelMeta.isContainer, true, 'vox_Panel should be a container');
assert.strictEqual(panelMeta.defaultProps.Align, 'alNone', 'vox_Panel defaultProps should have Align: alNone');
assert.strictEqual(panelMeta.defaultProps.Alignment, 'taCenter', 'vox_Panel defaultProps should have Alignment: taCenter');
console.log('✔ vox_Panel metadata has Align and Alignment');

// --------------------------------------------------------------------------
// TEST 2: Add Panel1 to form
// --------------------------------------------------------------------------
console.log('\n--- TEST 2: Add Panel1 to form ---');
const panel1 = designer.addComponent('vox_Panel', 40, 40);
assert.ok(panel1, 'Panel1 should be created');
assert.strictEqual(panel1.parent, null, 'Panel1 should be on the Form (parent: null)');
assert.strictEqual(panel1.props.Align, 'alNone');
assert.strictEqual(panel1.props.Alignment, 'taCenter');
console.log('✔ Panel1 created on form with alNone');

// --------------------------------------------------------------------------
// TEST 3: Align Panel1 to alTop
// --------------------------------------------------------------------------
console.log('\n--- TEST 3: Align Panel1 to alTop ---');
inspector.target = panel1;
inspector.onPropChange('custom', 'Align', 'alTop');
assert.strictEqual(panel1.props.Align, 'alTop');
assert.strictEqual(panel1.left, 0, 'Panel1 left should be 0');
assert.strictEqual(panel1.top, 0, 'Panel1 top should be 0');
assert.strictEqual(panel1.width, 698, 'Panel1 width should span canvasW (698)');
assert.strictEqual(panel1.height, 120, 'Panel1 height should be 120');
console.log('✔ Panel1 correctly aligned to alTop (0, 0, 698, 120)');

// --------------------------------------------------------------------------
// TEST 4: Add Panel2 while Panel1 is selected (Avoid container auto-nesting trap)
// --------------------------------------------------------------------------
console.log('\n--- TEST 4: Add Panel2 while Panel1 is selected ---');
assert.strictEqual(designer.selectedComponent.name, 'Panel1');
const panel2 = designer.addComponent('vox_Panel', 40, 200);
assert.strictEqual(panel2.parent, null, 'Panel2 should NOT auto-nest inside Panel1, should be on the Form');
console.log('✔ Panel2 was placed on the Form, avoiding the auto-nesting trap');

// --------------------------------------------------------------------------
// TEST 5: Align Panel2 to alBottom
// --------------------------------------------------------------------------
console.log('\n--- TEST 5: Align Panel2 to alBottom ---');
inspector.target = panel2;
inspector.onPropChange('custom', 'Align', 'alBottom');
assert.strictEqual(panel2.props.Align, 'alBottom');
assert.strictEqual(panel2.left, 0, 'Panel2 left should be 0');
assert.strictEqual(panel2.width, 698, 'Panel2 width should be 698');
assert.strictEqual(panel2.height, 120, 'Panel2 height should be 120');
// canvasH = 450, bottom control top = 450 - 120 = 330
assert.strictEqual(panel2.top, 330, 'Panel2 top should be at bottom of form (330)');
console.log('✔ Panel2 correctly aligned to alBottom (0, 330, 698, 120)');

// --------------------------------------------------------------------------
// TEST 6: Change Panel1 back to alNone (Restore geometry)
// --------------------------------------------------------------------------
console.log('\n--- TEST 6: Change Panel1 back to alNone ---');
inspector.target = panel1;
inspector.onPropChange('custom', 'Align', 'alNone');
assert.strictEqual(panel1.props.Align, 'alNone');
assert.strictEqual(panel1.width, 200, 'Panel1 width should restore from 698 back to 200');
assert.strictEqual(panel1.height, 120, 'Panel1 height should restore to 120');
console.log('✔ Panel1 restored geometry when changed to alNone');

// --------------------------------------------------------------------------
// TEST 7: Child component inside container with alClient
// --------------------------------------------------------------------------
console.log('\n--- TEST 7: Child component inside container with alClient ---');
// Set panel1 back to alTop
inspector.target = panel1;
inspector.onPropChange('custom', 'Align', 'alTop');

// Add a button explicitly inside Panel1
const btn = designer.addComponent('vox_Button', 10, 10, 'Panel1');
assert.strictEqual(btn.parent, 'Panel1', 'Button parent should be Panel1');
inspector.target = btn;
inspector.onPropChange('custom', 'Align', 'alClient');
assert.strictEqual(btn.props.Align, 'alClient');
assert.strictEqual(btn.left, 0, 'Btn inside Panel1 should align to left 0');
assert.strictEqual(btn.top, 0, 'Btn inside Panel1 should align to top 0');
assert.strictEqual(btn.width, panel1.width, 'Btn width should fill Panel1 width');
assert.strictEqual(btn.height, panel1.height, 'Btn height should fill Panel1 height');
console.log('✔ Child button inside Panel1 with alClient filled Panel1 dimensions');

// --------------------------------------------------------------------------
// TEST 8: Codegen Vox Code Emission
// --------------------------------------------------------------------------
console.log('\n--- TEST 8: Codegen Vox Code Emission ---');
const voxCode = window.VoxCodeGen.generateVoxCode(designer.form);
assert.ok(voxCode.includes('this.Panel1.align = "alTop";'), 'Should emit this.Panel1.align = "alTop"');
assert.ok(voxCode.includes('this.Panel1.alignment = "taCenter";'), 'Should emit this.Panel1.alignment = "taCenter"');
assert.ok(voxCode.includes('this.Panel2.align = "alBottom";'), 'Should emit this.Panel2.align = "alBottom"');
assert.ok(voxCode.includes('this.Button1.parent = "Panel1";'), 'Should emit this.Button1.parent = "Panel1"');
assert.ok(voxCode.includes('this.Button1.align = "alClient";'), 'Should emit this.Button1.align = "alClient"');
console.log('✔ generateVoxCode emitted align, alignment, and parent correctly');

// --------------------------------------------------------------------------
// TEST 9: Codegen Web System Standalone Generation
// --------------------------------------------------------------------------
console.log('\n--- TEST 9: Codegen Web System Standalone Generation ---');
const webSystem = window.VoxCodeGen.generateWebSystem(designer.form, voxCode);
assert.ok(webSystem.htmlContent.includes('id="Panel1"'), 'Web HTML should contain Panel1');
assert.ok(webSystem.htmlContent.includes('id="Panel2"'), 'Web HTML should contain Panel2');
assert.ok(webSystem.htmlContent.includes('id="Button1"'), 'Web HTML should contain Button1');
assert.ok(webSystem.htmlContent.includes('web-panel-caption text-center'), 'Web HTML should contain centered caption');
console.log('✔ generateWebSystem created markup with aligned dimensions');

// --------------------------------------------------------------------------
// TEST 10: Runner computeAlignments
// --------------------------------------------------------------------------
console.log('\n--- TEST 10: Runner computeAlignments ---');
const runner = new window.VoxFormRunner();
const testFormState = JSON.parse(JSON.stringify(designer.form));
runner.computeAlignments(testFormState.components, 700, 480);
const rP1 = testFormState.components.find(c => c.name === 'Panel1');
const rP2 = testFormState.components.find(c => c.name === 'Panel2');
const rBtn = testFormState.components.find(c => c.name === 'Button1');
assert.strictEqual(rP1.left, 0);
assert.strictEqual(rP1.top, 0);
assert.strictEqual(rP1.width, 700);
assert.strictEqual(rP2.left, 0);
assert.strictEqual(rP2.top, 480 - 28 - 120);
assert.strictEqual(rBtn.left, 0);
assert.strictEqual(rBtn.width, rP1.width);
assert.strictEqual(rBtn.height, rP1.height);
console.log('✔ Runner computeAlignments calculated hierarchical alignments');

console.log('\n🎉 ALL 10 TESTS PASSED SUCCESSFULLY! 🎉\n');
