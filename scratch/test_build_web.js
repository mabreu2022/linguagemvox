const fs = require('fs');
const http = require('http');

// Simular objeto de janela do navegador para carregar codegen.js em ambiente Node
const windowMock = {
  VoxComponents: {
    find: (id) => null
  }
};
global.window = windowMock;

// Ler e avaliar codegen.js
const codegenCode = fs.readFileSync('tools/vox-rad/public/js/codegen.js', 'utf-8');
eval(codegenCode);

// Form State de demonstração com vox_MainMenu (lateral), vox_DBGrid, vox_DBNavigator, vox_Connection
const sampleForm = {
  name: 'FormERP',
  title: 'Sistema ERP — Menu Lateral',
  width: 900,
  height: 520,
  components: [
    {
      id: 'vox_MainMenu1',
      name: 'vox_MainMenu1',
      type: 'vox_MainMenu',
      left: 0,
      top: 0,
      width: 220,
      height: 520,
      props: {
        MenuType: 'Left',
        Title: 'Meu ERP Vox',
        Items: 'Dashboard, Clientes, Vendas, Produtos, Relatórios, Ajustes',
        ActiveIndex: 0,
        Responsive: true,
        Collapsed: false
      }
    },
    {
      id: 'vox_Connection1',
      name: 'vox_Connection1',
      type: 'vox_Connection',
      left: 240,
      top: 20,
      width: 38,
      height: 38,
      props: {
        Driver: 'Firebird',
        Server: '127.0.0.1',
        Port: 3050,
        Database: 'C:\\Sistemas\\Dados\\empresa.fdb',
        UserName: 'SYSDBA',
        Password: 'masterkey',
        VendorLib: 'fbclient.dll',
        Connected: true
      }
    },
    {
      id: 'vox_DBNavigator1',
      name: 'vox_DBNavigator1',
      type: 'vox_DBNavigator',
      left: 240,
      top: 20,
      width: 260,
      height: 28,
      props: {}
    },
    {
      id: 'vox_DBGrid1',
      name: 'vox_DBGrid1',
      type: 'vox_DBGrid',
      left: 240,
      top: 60,
      width: 630,
      height: 380,
      props: {
        Columns: 'ID, Nome, Cidade, Saldo'
      }
    }
  ]
};

const voxCode = window.VoxCodeGen.generateVoxCode(sampleForm);
const webPkg = window.VoxCodeGen.generateWebSystem(sampleForm, voxCode);

const postData = JSON.stringify({
  formState: sampleForm,
  ...webPkg
});

const req = http.request({
  hostname: 'localhost',
  port: 4500,
  path: '/api/vox/build-web',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(postData)
  }
}, (res) => {
  let data = '';
  res.on('data', chunk => { data += chunk; });
  res.on('end', () => {
    console.log('Build Web Result:', JSON.parse(data));
  });
});

req.on('error', (e) => {
  console.error('Request Error:', e.message);
});

req.write(postData);
req.end();
