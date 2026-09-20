// Test script for Delphi VCL Containers in Vox RAD
const fs = require('fs');
const path = require('path');
const http = require('http');

console.log('=== TESTE DE COMPONENTES CONTÊINER VOX RAD ===\n');

// 1. Simular ambiente de navegador para testar componentes e codegen
const window = {};
global.window = window;

// Carregar components.js
const componentsCode = fs.readFileSync(path.join(__dirname, '../tools/vox-rad/public/js/components.js'), 'utf8');
eval(componentsCode);

console.log('1. Verificando VOX_COMPONENTS e containers...');
const expectedContainers = ['vox_Panel', 'vox_GroupBox', 'vox_Card', 'vox_RadioGroup', 'vox_CheckListGroupBox'];
let containersOk = true;
for (const c of expectedContainers) {
  const meta = window.VOX_COMPONENTS[c];
  if (!meta) {
    console.error(`❌ Componente ${c} não encontrado no catálogo!`);
    containersOk = false;
  } else if (!meta.isContainer) {
    console.error(`❌ Componente ${c} não está marcado com isContainer: true!`);
    containersOk = false;
  } else {
    console.log(`  ✓ ${c}: isContainer = true`);
  }
}

if (!containersOk) {
  process.exit(1);
}

// 2. Carregar codegen.js
const codegenCode = fs.readFileSync(path.join(__dirname, '../tools/vox-rad/public/js/codegen.js'), 'utf8');
eval(codegenCode);

console.log('\n2. Testando CodeGen (generateVoxCode & generateWebSystem) com hierarquia...');
const testForm = {
  name: 'Form1',
  title: 'Formulário Teste Contêineres',
  width: 700,
  height: 500,
  components: [
    {
      id: 'comp_1',
      name: 'Panel1',
      type: 'vox_Panel',
      parent: null,
      left: 50,
      top: 50,
      width: 400,
      height: 300,
      props: { Caption: 'Painel Superior', Color: '#1e293b' },
      events: {}
    },
    {
      id: 'comp_2',
      name: 'Button1',
      type: 'vox_Button',
      parent: 'Panel1',
      left: 20,
      top: 30,
      width: 100,
      height: 32,
      props: { Caption: 'Salvar' },
      events: {}
    },
    {
      id: 'comp_3',
      name: 'Edit1',
      type: 'vox_Edit',
      parent: 'Panel1',
      left: 140,
      top: 30,
      width: 180,
      height: 32,
      props: { Text: 'Texto inicial' },
      events: {}
    },
    {
      id: 'comp_4',
      name: 'Card1',
      type: 'vox_Card',
      parent: null,
      left: 50,
      top: 370,
      width: 300,
      height: 100,
      props: { Title: 'Total de Vendas', Subtitle: 'R$ 50.000,00' },
      events: {}
    },
    {
      id: 'comp_5',
      name: 'Button2',
      type: 'vox_Button',
      parent: 'Card1',
      left: 180,
      top: 40,
      width: 80,
      height: 28,
      props: { Caption: 'Ver Detalhes' },
      events: {}
    }
  ]
};

// Teste Vox Code
const voxCode = window.VoxCodeGen.generateVoxCode(testForm);
console.log('  Verificando código Vox gerado:');
if (voxCode.includes('this.Button1.parent = "Panel1";')) {
  console.log('  ✓ this.Button1.parent = "Panel1" gerado com sucesso!');
} else {
  console.error('  ❌ this.Button1.parent não encontrado no código Vox gerado!');
  process.exit(1);
}
if (voxCode.includes('this.Button2.parent = "Card1";')) {
  console.log('  ✓ this.Button2.parent = "Card1" gerado com sucesso!');
} else {
  console.error('  ❌ this.Button2.parent não encontrado no código Vox gerado!');
  process.exit(1);
}

// Teste Web System HTML
const webSystem = window.VoxCodeGen.generateWebSystem(testForm, voxCode);
console.log('  Verificando HTML Web System gerado:');
const html = webSystem.htmlContent;

// Verificar que Button1 está dentro de Panel1
const panelIndex = html.indexOf('id="Panel1"');
const button1Index = html.indexOf('id="Button1"');
const edit1Index = html.indexOf('id="Edit1"');
const cardIndex = html.indexOf('id="Card1"');
const button2Index = html.indexOf('id="Button2"');

if (panelIndex !== -1 && button1Index > panelIndex && edit1Index > panelIndex) {
  console.log('  ✓ Button1 e Edit1 estão inseridos dentro do bloco do Panel1 no HTML!');
} else {
  console.error('  ❌ Button1 ou Edit1 não foram aninhados corretamente dentro de Panel1!');
  process.exit(1);
}

if (cardIndex !== -1 && button2Index > cardIndex) {
  console.log('  ✓ Button2 está inserido dentro do bloco do Card1 no HTML!');
} else {
  console.error('  ❌ Button2 não foi aninhado corretamente dentro de Card1!');
  process.exit(1);
}

// 3. Teste HTTP com o servidor
console.log('\n3. Testando endpoints do servidor na porta 4500...');
const req = http.get('http://localhost:4500/', (res) => {
  console.log(`  ✓ GET / -> Status ${res.statusCode}`);
  if (res.statusCode === 200) {
    console.log('\n🎉 TODOS OS TESTES DE CONTÊINERES PASSARAM COM SUCESSO!');
  } else {
    console.error(`  ❌ Status inesperado: ${res.statusCode}`);
    process.exit(1);
  }
});

req.on('error', (err) => {
  console.error('  ❌ Erro ao conectar ao servidor:', err.message);
  process.exit(1);
});
