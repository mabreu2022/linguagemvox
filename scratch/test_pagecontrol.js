// scratch/test_pagecontrol.js
const fs = require('fs');
const assert = require('assert');

async function testPageControl() {
  console.log('=====================================================');
  console.log('  TESTE COMPLETO DO COMPONENTE PAGECONTROL / TABSHEET');
  console.log('=====================================================');

  // 1. Validar definições de componentes em components.js
  console.log('\n--- 1. Validando components.js ---');
  const componentsJs = fs.readFileSync('tools/vox-rad/public/js/components.js', 'utf-8');
  assert(componentsJs.includes("name: 'vox_PageControl'"), 'vox_PageControl deve estar registrado');
  assert(componentsJs.includes("name: 'vox_TabSheet'"), 'vox_TabSheet deve estar registrado');
  assert(componentsJs.includes("'TPageControl'"), 'Alias TPageControl deve existir');
  assert(componentsJs.includes("'TTabSheet'"), 'Alias TTabSheet deve existir');
  assert(componentsJs.includes("category: 'Win32'"), 'PageControl deve estar na categoria Win32');
  assert(componentsJs.includes("isContainer: true"), 'PageControl e TabSheet devem ser containers');
  console.log('✓ components.js validado com sucesso!');

  // 2. Validar index.html (Context Menu)
  console.log('\n--- 2. Validando index.html (Context Menu) ---');
  const indexHtml = fs.readFileSync('tools/vox-rad/public/index.html', 'utf-8');
  assert(indexHtml.includes('id="ctxPageControlGroup"'), 'Grupo de menu de contexto do PageControl deve existir');
  assert(indexHtml.includes('addTabSheet'), 'Item Nova Página deve chamar addTabSheet()');
  assert(indexHtml.includes('nextPage'), 'Item Próxima Página deve chamar nextPage()');
  assert(indexHtml.includes('prevPage'), 'Item Página Anterior deve chamar prevPage()');
  assert(indexHtml.includes('deleteCurrentPage'), 'Item Excluir Página deve chamar deleteCurrentPage()');
  console.log('✓ Menu de contexto do PageControl validado com sucesso!');

  // 3. Validar rad.css (Estilos Delphi VCL)
  console.log('\n--- 3. Validando rad.css (Estilos VCL) ---');
  const radCss = fs.readFileSync('tools/vox-rad/public/css/rad.css', 'utf-8');
  assert(radCss.includes('.vcl-pagecontrol'), 'Estilo .vcl-pagecontrol deve existir');
  assert(radCss.includes('.vcl-tab-bar'), 'Estilo .vcl-tab-bar deve existir');
  assert(radCss.includes('.vcl-tab-item'), 'Estilo .vcl-tab-item deve existir');
  assert(radCss.includes('.vcl-tab-item.active'), 'Estilo de aba ativa .vcl-tab-item.active deve existir');
  assert(radCss.includes('.vcl-tab-add-btn'), 'Botão de adicionar aba .vcl-tab-add-btn deve existir');
  assert(radCss.includes('.vcl-pagecontrol.tab-pos-tpbottom'), 'Suporte a TabPosition tpBottom deve existir');
  console.log('✓ rad.css com estilos Delphi VCL verificado com sucesso!');

  // 4. Validar designer.js
  console.log('\n--- 4. Validando designer.js ---');
  const designerJs = fs.readFileSync('tools/vox-rad/public/js/designer.js', 'utf-8');
  assert(designerJs.includes('addTabSheet('), 'Método addTabSheet deve existir no designer');
  assert(designerJs.includes('nextPage('), 'Método nextPage deve existir no designer');
  assert(designerJs.includes('prevPage('), 'Método prevPage deve existir no designer');
  assert(designerJs.includes('deleteCurrentPage('), 'Método deleteCurrentPage deve existir no designer');
  assert(designerJs.includes('getPageControlTarget('), 'Método getPageControlTarget deve existir no designer');
  assert(designerJs.includes("'Geral'") && designerJs.includes("'Detalhes'"), 'Auto-criação de abas iniciais deve existir no addComponent');
  assert(designerJs.includes('ctxPageControlGroup'), 'showContextMenu deve controlar visibilidade do menu PageControl');
  console.log('✓ designer.js com gestão de abas, auto-criação e escopo verificado com sucesso!');

  // 5. Validar inspector.js
  console.log('\n--- 5. Validando inspector.js ---');
  const inspectorJs = fs.readFileSync('tools/vox-rad/public/js/inspector.js', 'utf-8');
  assert(inspectorJs.includes('ActivePageIndex'), 'Object Inspector deve suportar ActivePageIndex');
  assert(inspectorJs.includes('TabPosition'), 'Object Inspector deve suportar TabPosition');
  assert(inspectorJs.includes('+ Nova Página (TabSheet)'), 'Object Inspector deve ter botão de Nova Página');
  console.log('✓ inspector.js verificado com sucesso!');

  // 6. Validar Codegen (Vox e Web Standalone)
  console.log('\n--- 6. Validando codegen.js ---');
  global.window = {};
  eval(fs.readFileSync('tools/vox-rad/public/js/codegen.js', 'utf-8'));
  const VoxCodeGen = window.VoxCodeGen;
  assert(VoxCodeGen, 'VoxCodeGen deve estar exposto em window.VoxCodeGen');

  const mockFormState = {
    name: 'Form1',
    caption: 'Formulário com Abas',
    width: 600,
    height: 400,
    components: [
      {
        id: 'pc1',
        name: 'PageControl1',
        type: 'vox_PageControl',
        left: 20,
        top: 20,
        width: 500,
        height: 300,
        props: {
          ActivePageIndex: 0,
          TabPosition: 'tpTop',
          Align: 'alClient'
        }
      },
      {
        id: 'ts1',
        name: 'TabSheet1',
        type: 'vox_TabSheet',
        parent: 'PageControl1',
        left: 0,
        top: 0,
        width: 500,
        height: 270,
        props: {
          Caption: 'Dados Gerais',
          PageIndex: 0
        }
      },
      {
        id: 'btn1',
        name: 'btnGravar',
        type: 'vox_Button',
        parent: 'TabSheet1',
        left: 30,
        top: 40,
        width: 100,
        height: 35,
        props: {
          Caption: 'Gravar',
          Events: { OnClick: 'btnGravarClick' }
        }
      },
      {
        id: 'ts2',
        name: 'TabSheet2',
        type: 'vox_TabSheet',
        parent: 'PageControl1',
        left: 0,
        top: 0,
        width: 500,
        height: 270,
        props: {
          Caption: 'Configurações',
          PageIndex: 1
        }
      }
    ]
  };

  // Testar geração de código Vox (.vox)
  const voxCode = VoxCodeGen.generateVoxCode(mockFormState);
  assert(voxCode.includes('let mut PageControl1: vox_PageControl;'), 'Deve declarar PageControl1 no código Vox');
  assert(voxCode.includes('let mut TabSheet1: vox_TabSheet;'), 'Deve declarar TabSheet1 no código Vox');
  assert(voxCode.includes('this.PageControl1.activePageIndex = 0;'), 'Deve inicializar activePageIndex');
  assert(voxCode.includes('this.PageControl1.tabPosition = "tpTop";'), 'Deve inicializar tabPosition');
  assert(voxCode.includes('this.TabSheet1.parent = "PageControl1";'), 'TabSheet1 deve ter parent PageControl1');
  assert(voxCode.includes('this.btnGravar.parent = "TabSheet1";'), 'btnGravar deve ter parent TabSheet1');
  console.log('✓ Geração de código Vox (.vox) verificada com sucesso!');

  // Testar geração de Web System Standalone
  const webFiles = VoxCodeGen.generateWebSystem(mockFormState);
  assert(webFiles.htmlContent, 'Web System deve gerar htmlContent');
  assert(webFiles.htmlContent.includes('web-pagecontrol'), 'htmlContent deve conter .web-pagecontrol');
  assert(webFiles.htmlContent.includes('web-tab-bar'), 'htmlContent deve conter .web-tab-bar');
  assert(webFiles.htmlContent.includes('Dados Gerais'), 'htmlContent deve conter aba Dados Gerais');
  assert(webFiles.htmlContent.includes('Configurações'), 'htmlContent deve conter aba Configurações');
  assert(webFiles.htmlContent.includes('id="btnGravar"'), 'htmlContent deve conter btnGravar dentro da aba');
  assert(webFiles.cssContent.includes('.web-pagecontrol'), 'cssContent deve estilizar o PageControl');
  assert(webFiles.jsContent.includes('window.voxSwitchTab'), 'jsContent deve conter a função voxSwitchTab');
  console.log('✓ Geração de Web System Standalone verificada com sucesso!');

  // 7. Validar runner.js (Live Runner)
  console.log('\n--- 7. Validando runner.js ---');
  const runnerJs = fs.readFileSync('tools/vox-rad/public/js/runner.js', 'utf-8');
  assert(runnerJs.includes('vox_PageControl'), 'runner.js deve reconhecer vox_PageControl');
  assert(runnerJs.includes('vox_TabSheet'), 'runner.js deve reconhecer vox_TabSheet');
  assert(runnerJs.includes('switchTab('), 'runner.js deve implementar switchTab');
  assert(runnerJs.includes('vcl-tab-item'), 'runner.js deve renderizar abas com vcl-tab-item');
  console.log('✓ runner.js com suporte ao PageControl interativo verificado!');

  console.log('\n=====================================================');
  console.log('🎉 TODOS OS TESTES DO PAGECONTROL PASSARAM COM 100%!');
  console.log('=====================================================\n');
}

testPageControl().catch(err => {
  console.error('❌ Falha nos testes do PageControl:', err);
  process.exit(1);
});
