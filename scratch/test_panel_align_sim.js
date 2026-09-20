// Test simulation of VoxDesigner and VoxObjectInspector alignment behavior
const fs = require('fs');

// Minimal DOM simulation
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
  createElement: (tag) => new Element('', tag),
  addEventListener: () => {},
  body: { style: {} },
  activeElement: { tagName: 'BODY' }
};
global.window = {
  addEventListener: () => {},
  innerWidth: 1200,
  innerHeight: 800
};

// Load components.js
const compCode = fs.readFileSync('tools/vox-rad/public/js/components.js', 'utf8');
eval(compCode);

// Load designer.js
const designerCode = fs.readFileSync('tools/vox-rad/public/js/designer.js', 'utf8');
eval(designerCode);

// Load inspector.js
const inspectorCode = fs.readFileSync('tools/vox-rad/public/js/inspector.js', 'utf8');
eval(inspectorCode);

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

console.log('--- TEST 1: Add Panel 1 ---');
const panel1 = designer.addComponent('vox_Panel', 50, 50);
console.log('Panel1 initial:', {
  name: panel1.name,
  parent: panel1.parent,
  left: panel1.left,
  top: panel1.top,
  width: panel1.width,
  height: panel1.height,
  align: panel1.props.Align
});

console.log('--- TEST 2: Change Panel 1 Align to alTop ---');
inspector.target = panel1;
inspector.onPropChange('custom', 'Align', 'alTop');
console.log('Panel1 after alTop:', {
  left: panel1.left,
  top: panel1.top,
  width: panel1.width,
  height: panel1.height,
  align: panel1.props.Align
});

console.log('--- TEST 3: Add Panel 2 when Panel 1 is selected ---');
const panel2 = designer.addComponent('vox_Panel', 50, 200);
console.log('Panel2 created:', {
  name: panel2.name,
  parent: panel2.parent,
  left: panel2.left,
  top: panel2.top,
  width: panel2.width,
  height: panel2.height
});

console.log('--- TEST 4: Change Panel 2 Align to alBottom ---');
inspector.target = panel2;
inspector.onPropChange('custom', 'Align', 'alBottom');
console.log('Panel2 after alBottom:', {
  left: panel2.left,
  top: panel2.top,
  width: panel2.width,
  height: panel2.height,
  parent: panel2.parent
});

console.log('--- TEST 5: Change Panel 1 back to alNone ---');
inspector.target = panel1;
inspector.onPropChange('custom', 'Align', 'alNone');
console.log('Panel1 after alNone:', {
  left: panel1.left,
  top: panel1.top,
  width: panel1.width,
  height: panel1.height,
  align: panel1.props.Align
});
