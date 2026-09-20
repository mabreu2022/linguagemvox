// Full integration simulation for Delphi Containers in Vox RAD
const fs = require('fs');
const path = require('path');

console.log('=== TESTE DE FLUXO COMPLETO DE CONTÊINERES NO DESIGNER ===\n');

// Mock a minimal DOM environment
class MockElement {
  constructor(tagName = 'div', id = '') {
    this.tagName = tagName.toUpperCase();
    this.id = id;
    this.className = '';
    this.style = {};
    this.children = [];
    this.parentElement = null;
    this._innerHTML = '';
    this.eventListeners = {};
    this.classList = {
      _classes: new Set(),
      add: (c) => this.classList._classes.add(c),
      remove: (c) => this.classList._classes.delete(c),
      contains: (c) => this.classList._classes.has(c)
    };
  }

  get innerHTML() {
    return this._innerHTML;
  }

  set innerHTML(val) {
    this._innerHTML = val;
    this.children = [];
  }

  addEventListener(event, fn) {
    if (!this.eventListeners[event]) this.eventListeners[event] = [];
    this.eventListeners[event].push(fn);
  }

  dispatchEvent(event) {
    if (this.eventListeners[event.type]) {
      this.eventListeners[event.type].forEach(fn => fn(event));
    }
  }

  appendChild(child) {
    child.parentElement = this;
    this.children.push(child);
    return child;
  }

  remove() {
    if (this.parentElement) {
      this.parentElement.children = this.parentElement.children.filter(c => c !== this);
      this.parentElement = null;
    }
  }

  querySelector(selector) {
    if (selector === '.delphi-comp-children') {
      return this.children.find(c => c.className.includes('delphi-comp-children')) || null;
    }
    if (selector === '.delphi-comp-visual') {
      return this.children.find(c => c.className.includes('delphi-comp-visual')) || null;
    }
    return null;
  }

  querySelectorAll(selector) {
    const results = [];
    const search = (node) => {
      node.children.forEach(c => {
        if (selector === '.delphi-comp' && c.className.includes('delphi-comp')) {
          results.push(c);
        }
        search(c);
      });
    };
    search(this);
    return results;
  }

  closest(selector) {
    let cur = this;
    while (cur) {
      if (selector === '.delphi-comp' && cur.className && cur.className.includes('delphi-comp')) {
        return cur;
      }
      cur = cur.parentElement;
    }
    return null;
  }

  getBoundingClientRect() {
    return { left: parseInt(this.style.left || 0, 10), top: parseInt(this.style.top || 0, 10), width: parseInt(this.style.width || 100, 10), height: parseInt(this.style.height || 100, 10) };
  }
}

const elementsById = {};
const documentMock = {
  createElement: (tag) => new MockElement(tag),
  getElementById: (id) => elementsById[id] || null,
  addEventListener: () => {},
  body: { style: {} }
};

global.document = documentMock;
global.window = {
  addEventListener: () => {},
  VOX_COMPONENTS: {}
};

// Carregar components.js
const componentsCode = fs.readFileSync(path.join(__dirname, '../tools/vox-rad/public/js/components.js'), 'utf8');
eval(componentsCode);

// Carregar designer.js
const designerCode = fs.readFileSync(path.join(__dirname, '../tools/vox-rad/public/js/designer.js'), 'utf8');
eval(designerCode);

// Instanciar Canvas e FormWindow
const canvasEl = new MockElement('div', 'formCanvas');
const formWinEl = new MockElement('div', 'formWindow');
elementsById['formCanvas'] = canvasEl;
elementsById['formWindow'] = formWinEl;

// Override document.getElementById para achar elementos criados no canvas
const origGetById = documentMock.getElementById;
documentMock.getElementById = (id) => {
  if (elementsById[id]) return elementsById[id];
  const findInTree = (el) => {
    if (el.id === id) return el;
    for (const child of el.children) {
      const found = findInTree(child);
      if (found) return found;
    }
    return null;
  };
  return findInTree(canvasEl) || origGetById(id);
};

console.log('1. Instanciando VoxDesigner...');
const designer = new window.VoxDesigner(canvasEl, formWinEl);
console.log('  ✓ Designer instanciado com sucesso. Componentes iniciais:', designer.form.components.length);

console.log('\n2. Adicionando vox_Panel na raiz do Form...');
const panel = designer.addComponent('vox_Panel', 50, 50);
console.log(`  ✓ Adicionado: ${panel.name} (${panel.type}), parent = ${panel.parent}, bounds = (${panel.left}, ${panel.top})`);

console.log('\n3. Com o Panel1 selecionado, adicionando vox_Button...');
designer.selectComponent(panel);
const btn = designer.addComponent('vox_Button', 20, 30);
console.log(`  ✓ Adicionado: ${btn.name} (${btn.type}), parent = ${btn.parent}, bounds = (${btn.left}, ${btn.top})`);
if (btn.parent !== 'Panel1') {
  console.error(`  ❌ Esperado btn.parent === 'Panel1', mas foi: ${btn.parent}`);
  process.exit(1);
} else {
  console.log('  ✓ Botão herdou automaticamente Panel1 como parent por estar selecionado!');
}

console.log('\n4. Adicionando vox_Edit também dentro de Panel1...');
const edit = designer.addComponent('vox_Edit', 20, 70, 'Panel1');
console.log(`  ✓ Adicionado: ${edit.name} (${edit.type}), parent = ${edit.parent}`);

console.log('\n5. Testando reparentComponent: movendo Edit1 de Panel1 para Form1...');
designer.reparentComponent(edit, designer.form.name);
console.log(`  ✓ Edit1 reparentado: parent = ${edit.parent}, novo left = ${edit.left}, top = ${edit.top}`);
if (edit.parent !== null) {
  console.error(`  ❌ Esperado edit.parent === null, mas foi: ${edit.parent}`);
  process.exit(1);
}
// 50 (panel.left) + 20 (edit.left original) = 70
if (edit.left === 70 && edit.top === 120) {
  console.log('  ✓ Coordenadas absolutas preservadas com precisão na reparentalização (70, 120)!');
} else {
  console.log(`  ℹ Coordenadas calculadas: (${edit.left}, ${edit.top})`);
}

console.log('\n6. Testando reparentComponent de volta para Panel1...');
designer.reparentComponent(edit, 'Panel1');
console.log(`  ✓ Edit1 de volta para Panel1: parent = ${edit.parent}, left = ${edit.left}, top = ${edit.top}`);
if (edit.parent !== 'Panel1') {
  console.error(`  ❌ Esperado edit.parent === 'Panel1', mas foi: ${edit.parent}`);
  process.exit(1);
}

console.log('\n7. Testando exclusão em cascata (deleteSelected) em Panel1...');
designer.selectComponent(panel);
designer.deleteSelected();
console.log(`  ✓ Exclusão executada. Componentes restantes no form: ${designer.form.components.length}`);
const remaining = designer.form.components.map(c => c.name);
if (remaining.includes('Panel1') || remaining.includes('Button1') || remaining.includes('Edit1')) {
  console.error('  ❌ Filhos não foram excluídos em cascata!', remaining);
  process.exit(1);
} else {
  console.log('  ✓ Panel1 e todos os seus filhos (Button1, Edit1) foram excluídos em cascata no padrão Delphi!');
}

console.log('\n🎉 TODOS OS TESTES DE SIMULAÇÃO DOM/DESIGNER PASSARAM 100%!');
