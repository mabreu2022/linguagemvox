// ==============================================================================
// scratch/test_copy_paste.js — Teste do recurso de Copiar, Recortar e Colar Componentes
// ==============================================================================

const assert = require('assert');

// Mock browser environment
global.window = {
  addEventListener: () => {},
  removeEventListener: () => {},
  VOX_COMPONENTS: {
    vox_Button: {
      defaultWidth: 90,
      defaultHeight: 32,
      defaultProps: { Caption: 'Button1' },
      render: (c) => `<button>${c.props.Caption}</button>`
    },
    vox_Edit: {
      defaultWidth: 140,
      defaultHeight: 24,
      defaultProps: { Text: 'Edit1' },
      render: (c) => `<input value="${c.props.Text}"/>`
    },
    vox_Panel: {
      isContainer: true,
      defaultWidth: 200,
      defaultHeight: 150,
      defaultProps: { Caption: 'Panel1' },
      render: (c) => `<div>${c.props.Caption}</div>`
    }
  },
  app: {
    showToast: (msg) => { /* console.log('Toast:', msg); */ },
    onFormChanged: () => {},
    updateStructureTree: () => {},
    inspector: { update: () => {} }
  }
};

global.document = {
  activeElement: { tagName: 'BODY' },
  addEventListener: () => {},
  removeEventListener: () => {},
  getElementById: (id) => null,
  createElement: (tag) => ({
    style: {},
    classList: { add: () => {}, remove: () => {} },
    addEventListener: () => {},
    querySelector: () => null,
    querySelectorAll: () => []
  })
};

// Carregar designer.js
const fs = require('fs');
const path = require('path');
const designerJs = fs.readFileSync(path.join(__dirname, '../tools/vox-rad/public/js/designer.js'), 'utf-8');

// Executar código da classe no contexto
const vm = require('vm');
const context = vm.createContext({
  ...global,
  console,
  setTimeout,
  clearTimeout
});
const VoxDesigner = vm.runInContext(designerJs + '\n; VoxDesigner;', context);

// Criar instância com mocks
const mockCanvas = {
  addEventListener: () => {},
  querySelectorAll: () => [],
  innerHTML: ''
};
const mockFormWindow = {
  style: {},
  offsetLeft: 0,
  offsetTop: 0,
  offsetWidth: 700,
  offsetHeight: 480
};

const designer = new VoxDesigner(mockCanvas, mockFormWindow);
designer.renderForm = () => {}; // mock render DOM

console.log('--- 1. Testando Inserção e Cópia Simples ---');
const btn1 = designer.addComponent('vox_Button', 32, 40);
assert.strictEqual(btn1.name, 'Button1');
assert.strictEqual(designer.form.components.length, 1);

designer.selectComponent(btn1);
designer.copySelected();
assert.ok(designer.clipboard, 'Clipboard deve conter dados');
assert.strictEqual(designer.clipboard.root.name, 'Button1');
assert.strictEqual(designer.clipboard.children.length, 0);
console.log('✓ Componente Button1 copiado com sucesso.');

console.log('--- 2. Testando Colagem (Paste) ---');
const btn2 = designer.pasteComponent();
assert.ok(btn2, 'Componente colado não pode ser nulo');
assert.strictEqual(btn2.name, 'Button2', 'Novo componente deve receber nome sequencial único');
assert.strictEqual(designer.form.components.length, 2);
assert.strictEqual(btn2.left, 32 + 16, 'Deve aplicar offset horizontal de colagem');
assert.strictEqual(btn2.top, 40 + 16, 'Deve aplicar offset vertical de colagem');
console.log(`✓ Componente colado: ${btn2.name} em (${btn2.left}, ${btn2.top})`);

console.log('--- 3. Testando Múltiplas Colagens Subsequentes ---');
const btn3 = designer.pasteComponent();
assert.strictEqual(btn3.name, 'Button3');
assert.strictEqual(btn3.left, 32 + 32, 'Deve incrementar o offset na segunda colagem');
assert.strictEqual(btn3.top, 40 + 32);
assert.strictEqual(designer.form.components.length, 3);
console.log(`✓ Múltipla colagem: ${btn3.name} em (${btn3.left}, ${btn3.top})`);

console.log('--- 4. Testando Recortar (Cut) e Colar ---');
designer.selectComponent(btn2);
designer.cutSelected();
assert.strictEqual(designer.form.components.some(c => c.name === 'Button2'), false, 'Button2 deve ter sido removido');
assert.strictEqual(designer.clipboard.root.name, 'Button2', 'Clipboard deve conter Button2');

const btnPastedFromCut = designer.pasteComponent();
assert.ok(btnPastedFromCut);
assert.ok(btnPastedFromCut.name.startsWith('Button'));
assert.strictEqual(designer.form.components.filter(c => c.name === btnPastedFromCut.name).length, 1, 'Nome deve ser único no form');
console.log(`✓ Recortar e colar verificado: ${btnPastedFromCut.name} adicionado após exclusão do recortado`);

console.log('--- 5. Testando Cópia e Colagem de Contêiner Completo com Filhos ---');
const panel1 = designer.addComponent('vox_Panel', 100, 120);
assert.strictEqual(panel1.name, 'Panel1');

const editInside = designer.addComponent('vox_Edit', 16, 20, panel1.name);
const btnInside = designer.addComponent('vox_Button', 16, 60, panel1.name);
assert.strictEqual(editInside.parent, 'Panel1');
assert.strictEqual(btnInside.parent, 'Panel1');

designer.selectComponent(panel1);
designer.copySelected();
assert.strictEqual(designer.clipboard.root.name, 'Panel1');
assert.strictEqual(designer.clipboard.children.length, 2, 'Clipboard deve conter os 2 filhos');

const panel2 = designer.pasteComponent();
assert.ok(panel2);
assert.strictEqual(panel2.name, 'Panel2');
assert.strictEqual(panel2.type, 'vox_Panel');

// Verificar se os filhos foram clonados e reparentalizados para Panel2
const panel2Children = designer.form.components.filter(c => c.parent === 'Panel2');
assert.strictEqual(panel2Children.length, 2, 'Panel2 deve ter exatamente 2 filhos');
assert.ok(panel2Children.some(c => c.type === 'vox_Edit'), 'Deve conter Edit filho em Panel2');
assert.ok(panel2Children.some(c => c.type === 'vox_Button'), 'Deve conter Button filho em Panel2');
console.log(`✓ Contêiner Panel1 copiado e colado como Panel2 com ${panel2Children.length} filhos vinculados corretamente!`);

console.log('--- 6. Testando Colagem DENTRO de um Contêiner Selecionado ---');
designer.selectComponent(btn1);
designer.copySelected();

designer.selectComponent(panel2); // Seleciona Panel2
const btnInPanel = designer.pasteComponent();
assert.ok(btnInPanel);
assert.strictEqual(btnInPanel.parent, 'Panel2', 'Ao colar com contêiner selecionado, o pai deve ser o contêiner');
console.log(`✓ Colado dentro de contêiner: ${btnInPanel.name} tem parent="${btnInPanel.parent}"`);

console.log('--- 7. Testando Duplicação Direta (duplicateSelected) ---');
designer.selectComponent(btn1);
const dup = designer.duplicateSelected();
assert.ok(dup);
assert.ok(dup.name.startsWith('Button'));
assert.notStrictEqual(dup.id, btn1.id);
console.log(`✓ Duplicação direta funcionou: ${dup.name}`);

console.log('--- 8. Testando Z-Order (Bring to Front / Send to Back) ---');
const firstComp = designer.form.components[0];
designer.selectComponent(firstComp);
designer.bringToFront();
assert.strictEqual(designer.form.components[designer.form.components.length - 1].id, firstComp.id, 'Primeiro componente deve ir para o final da lista (frente)');

designer.sendToBack();
assert.strictEqual(designer.form.components[0].id, firstComp.id, 'Componente deve voltar ao início (trás)');
console.log('✓ Bring to Front e Send to Back validados.');

console.log('\n=============================================================');
console.log('TODOS OS TESTES DE COPIAR, RECORTAR E COLAR PASSARAM COM SUCESSO!');
console.log('=============================================================\n');
