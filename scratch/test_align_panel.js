// ==============================================================================
// scratch/test_align_panel.js — Teste da propriedade Align do Panel no Designer
// ==============================================================================

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

// Mock browser environment
global.window = {
  addEventListener: () => {},
  removeEventListener: () => {},
  VOX_COMPONENTS: {
    vox_Panel: {
      name: 'vox_Panel',
      isContainer: true,
      defaultWidth: 200,
      defaultHeight: 120,
      defaultProps: {
        Caption: 'Panel1',
        BevelOuter: 'bvRaised',
        Color: '#e9ecef',
        Align: 'alNone'
      },
      render: (c) => `<div class="vcl-panel">${c.props.Caption}</div>`
    },
    vox_Button: {
      name: 'vox_Button',
      defaultWidth: 90,
      defaultHeight: 32,
      defaultProps: { Caption: 'Button1', Align: 'alNone' },
      render: (c) => `<button>${c.props.Caption}</button>`
    }
  },
  app: {
    showToast: () => {},
    onFormChanged: () => {},
    updateStructureTree: () => {},
    inspector: { update: () => {}, renderProperties: () => {} }
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

const designerJs = fs.readFileSync(path.join(__dirname, '../tools/vox-rad/public/js/designer.js'), 'utf-8');
const context = vm.createContext({
  ...global,
  console,
  setTimeout,
  clearTimeout
});
const VoxDesigner = vm.runInContext(designerJs + '\n; VoxDesigner;', context);

const mockCanvas = {
  clientWidth: 700,
  clientHeight: 451,
  addEventListener: () => {},
  querySelectorAll: () => [],
  innerHTML: ''
};
const mockFormWindow = {
  style: {},
  offsetLeft: 40,
  offsetTop: 30,
  offsetWidth: 700,
  offsetHeight: 480
};

const designer = new VoxDesigner(mockCanvas, mockFormWindow);
designer.renderForm = () => {};

console.log('--- Teste 1: Adicionar Panel ---');
const panel = designer.addComponent('vox_Panel', 50, 60);
console.log('Panel inicial:', { name: panel.name, left: panel.left, top: panel.top, width: panel.width, height: panel.height, align: panel.props.Align });

console.log('\n--- Teste 2: Mudar Align para alTop ---');
panel.props.Align = 'alTop';
designer.recalculateAlignments(false);
console.log('Panel com alTop:', { left: panel.left, top: panel.top, width: panel.width, height: panel.height });

console.log('\n--- Teste 3: Mudar Align para alBottom ---');
panel.props.Align = 'alBottom';
designer.recalculateAlignments(false);
console.log('Panel com alBottom:', { left: panel.left, top: panel.top, width: panel.width, height: panel.height });

console.log('\n--- Teste 4: Mudar Align para alClient ---');
panel.props.Align = 'alClient';
designer.recalculateAlignments(false);
console.log('Panel com alClient:', { left: panel.left, top: panel.top, width: panel.width, height: panel.height });
