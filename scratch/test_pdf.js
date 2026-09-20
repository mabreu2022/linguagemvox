const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const html = path.resolve('scratch/test_report.html');
const pdf = path.resolve('scratch/test_report.pdf');

fs.writeFileSync(html, `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    @page { size: A4 portrait; margin: 15mm; }
    body { font-family: Segoe UI, sans-serif; }
    h1 { color: #0284c7; }
  </style>
</head>
<body>
  <h1>Relatório Vox — Teste PDF</h1>
  <p>Exportação nativa de relatório Delphi em HTML e PDF funcionando!</p>
</body>
</html>
`);

const chrome = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const cmd = `"${chrome}" --headless=new --disable-gpu --no-pdf-header-footer "--print-to-pdf=${pdf}" "${html}"`;
console.log('Running:', cmd);
execSync(cmd);

console.log('PDF created:', fs.existsSync(pdf), 'Size bytes:', fs.existsSync(pdf) ? fs.statSync(pdf).size : 0);
const buf = fs.readFileSync(pdf);
console.log('PDF header:', buf.slice(0, 8).toString('utf8'));
