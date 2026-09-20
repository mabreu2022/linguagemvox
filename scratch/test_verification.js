const assert = require('assert');
const fs = require('fs');

async function verify() {
  console.log('=== 1. Testando Carregamento da IDE (Porta 4500) ===');
  const ideRes = await fetch('http://localhost:4500/');
  assert.strictEqual(ideRes.status, 200, 'IDE deve retornar HTTP 200');
  const ideHtml = await ideRes.text();
  assert(ideHtml.includes('id="gitModal"'), 'gitModal deve estar no HTML');
  assert(ideHtml.includes('openFormDialog'), 'openFormDialog deve estar no HTML');
  assert(ideHtml.includes('openGitDialog'), 'openGitDialog deve estar no HTML');
  console.log('✓ IDE carregada com sucesso!');

  console.log('\n=== 2. Testando API de Status do Git (/api/git/status) ===');
  const gitRes = await fetch('http://localhost:4500/api/git/status');
  assert.strictEqual(gitRes.status, 200, 'Git status deve retornar 200');
  const gitData = await gitRes.json();
  assert.strictEqual(gitData.success, true);
  console.log(`✓ Git Status: branch=${gitData.branch}, arquivos alterados=${gitData.files.length}, autor=${gitData.userName}`);

  console.log('\n=== 3. Testando API /api/data (para componentes no iframe) ===');
  const dataRes = await fetch('http://localhost:4500/api/data');
  assert.strictEqual(dataRes.status, 200, '/api/data deve retornar 200');
  const dataJson = await dataRes.json();
  assert(Array.isArray(dataJson.rows), 'rows deve ser array');
  console.log(`✓ /api/data retornando ${dataJson.rows.length} registros!`);

  console.log('\n=== 4. Testando API /api/form/load e /api/form/list ===');
  const listRes = await fetch('http://localhost:4500/api/form/list');
  assert.strictEqual(listRes.status, 200);
  const listJson = await listRes.json();
  assert(listJson.success);
  console.log(`✓ /api/form/list encontrou ${listJson.forms.length} formulários:`, listJson.forms.map(f => f.name).join(', '));

  const loadRes = await fetch('http://localhost:4500/api/form/load?name=Form1');
  assert.strictEqual(loadRes.status, 200);
  const loadJson = await loadRes.json();
  assert(loadJson.success);
  assert(loadJson.form && Array.isArray(loadJson.form.components));
  console.log(`✓ /api/form/load carregou Form1 com ${loadJson.form.components.length} componentes!`);

  console.log('\n=== 5. Testando Compilação Web (build-web) com Componentes ===');
  const vm = require('vm');
  const codegenCode = fs.readFileSync('tools/vox-rad/public/js/codegen.js', 'utf8');
  const ctx = { window: {}, console: console };
  vm.createContext(ctx);
  vm.runInContext(codegenCode, ctx);

  const voxCode = ctx.window.VoxCodeGen.generateVoxCode(loadJson.form);
  const webPkg = ctx.window.VoxCodeGen.generateWebSystem(loadJson.form, voxCode);

  const buildRes = await fetch('http://localhost:4500/api/vox/build-web', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      formState: loadJson.form,
      ...webPkg
    })
  });
  assert.strictEqual(buildRes.status, 200);
  const buildJson = await buildRes.json();
  assert.strictEqual(buildJson.success, true);
  console.log('✓ Aplicação web compilada com sucesso:', buildJson.url);

  console.log('\n=== 6. Verificando HTML e CSS gerados em dist/web-app ===');
  const genHtml = fs.readFileSync('dist/web-app/index.html', 'utf8');
  const genCss = fs.readFileSync('dist/web-app/css/app.css', 'utf8');

  assert(genHtml.includes('webFormCanvas'), 'webFormCanvas deve existir');
  // Form1 tem DBGrid1, ComboBox1, DBEdit1
  assert(genHtml.includes('DBGrid1'), 'DBGrid1 deve ser gerado no HTML');
  assert(genHtml.includes('ComboBox1'), 'ComboBox1 deve ser gerado no HTML');
  assert(genHtml.includes('DBEdit1'), 'DBEdit1 deve ser gerado no HTML');
  assert(genCss.includes('.web-panel'), '.web-panel deve ter estilo em app.css');
  assert(genCss.includes('.web-grid-wrapper'), '.web-grid-wrapper deve ter estilo em app.css');
  assert(genCss.includes('.web-speedbtn'), '.web-speedbtn deve ter estilo em app.css');
  console.log('✓ Componentes DBGrid1, ComboBox1, DBEdit1 confirmados dentro de webFormCanvas!');
  console.log('✓ Estilos CSS dos componentes confirmados em app.css!');

  console.log('\n======================================================');
  console.log('🎉 TODAS AS VERIFICAÇÕES PASSARAM COM 100% DE SUCESSO!');
  console.log('======================================================');
}

verify().catch(err => {
  console.error('❌ Erro no teste:', err);
  process.exit(1);
});
