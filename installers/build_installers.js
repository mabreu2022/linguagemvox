// installers/build_installers.js
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT_DIR = path.resolve(__dirname, '..');
const ISCC_PATH = 'C:\\Users\\Denize Abreu\\AppData\\Local\\Programs\\Inno Setup 6\\ISCC.exe';
const DIST_INSTALLERS_DIR = path.join(__dirname, 'dist');

function getHash(filePath) {
  const fileBuffer = fs.readFileSync(filePath);
  const hash = crypto.createHash('sha256').update(fileBuffer).digest('hex');
  return hash;
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

async function buildAll() {
  console.log('================================================================');
  console.log('       GERAÇÃO OFICIAL DE INSTALADORES VOX (WINDOWS)');
  console.log('================================================================\n');

  if (!fs.existsSync(DIST_INSTALLERS_DIR)) {
    fs.mkdirSync(DIST_INSTALLERS_DIR, { recursive: true });
  }

  // 1. Compilar TypeScript
  console.log('1. Compilando núcleo da linguagem Vox (npm run build)...');
  execSync('npm run build', { cwd: ROOT_DIR, stdio: 'inherit' });
  console.log('   ✓ Núcleo Vox compilado com sucesso!\n');

  // 2. Compilar Launchers Nativos (C# via csc.exe)
  console.log('2. Compilando executáveis e launchers nativos...');
  const cscPath = 'C:\\Windows\\Microsoft.NET\\Framework64\\v4.0.30319\\csc.exe';

  // Launcher Vox Studio RAD
  const radLauncherSrc = path.join(__dirname, 'launcher', 'VoxStudioRAD.cs');
  const radLauncherExe = path.join(__dirname, 'launcher', 'VoxStudioRAD.exe');
  const radIcon = path.join(__dirname, 'assets', 'vox_studio.ico');
  execSync(`"${cscPath}" /target:winexe /optimize+ /win32icon:"${radIcon}" /out:"${radLauncherExe}" "${radLauncherSrc}"`, { stdio: 'inherit' });
  console.log('   ✓ VoxStudioRAD.exe compilado com ícone oficial.');

  // CLI Vox e Kael
  const cliSrc = path.join(__dirname, 'launcher', 'VoxCli.cs');
  const voxExe = path.join(__dirname, 'launcher', 'vox.exe');
  const kaelExe = path.join(__dirname, 'launcher', 'kael.exe');
  const langIcon = path.join(__dirname, 'assets', 'vox_lang.ico');
  execSync(`"${cscPath}" /target:exe /optimize+ /win32icon:"${langIcon}" /out:"${voxExe}" "${cliSrc}"`, { stdio: 'inherit' });
  fs.copyFileSync(voxExe, kaelExe);
  console.log('   ✓ vox.exe e kael.exe compilados com ícone oficial.\n');

  // 3. Compilar Instalador da Linguagem Vox via Inno Setup
  console.log('3. Compilando Instalador da Linguagem Vox via Inno Setup...');
  const langIss = path.join(__dirname, 'vox_language_setup.iss');
  execSync(`"${ISCC_PATH}" "${langIss}"`, { stdio: 'inherit' });
  console.log('   ✓ Instalador da Linguagem Vox gerado com sucesso!\n');

  // 4. Compilar Instalador do Vox Studio RAD via Inno Setup
  console.log('4. Compilando Instalador do Vox Studio RAD via Inno Setup...');
  const studioIss = path.join(__dirname, 'vox_studio_rad_setup.iss');
  execSync(`"${ISCC_PATH}" "${studioIss}"`, { stdio: 'inherit' });
  console.log('   ✓ Instalador do Vox Studio RAD gerado com sucesso!\n');

  // 5. Relatório de Verificação dos Instaladores Gerados
  console.log('================================================================');
  console.log('             INSTALADORES GERADOS COM SUCESSO');
  console.log('================================================================');
  const files = fs.readdirSync(DIST_INSTALLERS_DIR).filter(f => f.endsWith('.exe'));
  for (const file of files) {
    const filePath = path.join(DIST_INSTALLERS_DIR, file);
    const stats = fs.statSync(filePath);
    const hash = getHash(filePath);
    console.log(`\n📦 Arquivo: ${file}`);
    console.log(`   Caminho: ${filePath}`);
    console.log(`   Tamanho: ${formatBytes(stats.size)} (${stats.size.toLocaleString()} bytes)`);
    console.log(`   SHA-256: ${hash}`);
  }
  console.log('\n================================================================\n');
}

buildAll().catch(err => {
  console.error('Erro na compilação dos instaladores:', err);
  process.exit(1);
});
