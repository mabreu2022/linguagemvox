// scratch/test_full_engine.js
const fs = require('fs');
const path = require('path');
const { VoxReportEngine } = require('../tools/vox-rad/public/js/report_engine.js');

async function testFullEngine() {
  console.log('--- 1. Instanciando VoxReportEngine ---');
  const engine = new VoxReportEngine();

  const rep = {
    name: 'ReportVendas',
    props: {
      ReportTitle: 'RELATÓRIO DE CLIENTES E SALDOS',
      PageSize: 'psA4',
      PageOrientation: 'poPortrait',
      MarginLeft: 10,
      MarginRight: 10,
      MarginTop: 15,
      MarginBottom: 15
    }
  };

  const comps = [
    rep,
    { name: 'bTitle', parent: 'ReportVendas', height: 45, props: { BandType: 'rbTitle', Color: '#f8fafc', BorderBottom: true }, type: 'vox_ReportBand' },
    { name: 'lblEmpresa', parent: 'bTitle', left: 10, top: 10, width: 450, height: 26, props: { Caption: 'EMPRESA EXEMPLO S/A — RELATÓRIO DE VENDAS', FontSize: 12, FontBold: true, FontColor: '#0284c7' }, type: 'vox_ReportLabel' },

    { name: 'bHeader', parent: 'ReportVendas', height: 32, props: { BandType: 'rbPageHeader', Color: '#e2e8f0', BorderBottom: true }, type: 'vox_ReportBand' },
    { name: 'hCod', parent: 'bHeader', left: 10, top: 6, width: 80, height: 20, props: { Caption: 'CÓDIGO', FontBold: true }, type: 'vox_ReportLabel' },
    { name: 'hNome', parent: 'bHeader', left: 100, top: 6, width: 220, height: 20, props: { Caption: 'CLIENTE', FontBold: true }, type: 'vox_ReportLabel' },
    { name: 'hCid', parent: 'bHeader', left: 330, top: 6, width: 140, height: 20, props: { Caption: 'CIDADE', FontBold: true }, type: 'vox_ReportLabel' },
    { name: 'hValor', parent: 'bHeader', left: 480, top: 6, width: 140, height: 20, props: { Caption: 'VALOR ATUAL', FontBold: true, Alignment: 'taRightJustify' }, type: 'vox_ReportLabel' },

    { name: 'bDetail', parent: 'ReportVendas', height: 30, props: { BandType: 'rbDetail', BorderBottom: true }, type: 'vox_ReportBand' },
    { name: 'dCod', parent: 'bDetail', left: 10, top: 6, width: 80, height: 20, props: { DataField: 'codigo' }, type: 'vox_ReportDBText' },
    { name: 'dNome', parent: 'bDetail', left: 100, top: 6, width: 220, height: 20, props: { DataField: 'nome' }, type: 'vox_ReportDBText' },
    { name: 'dCid', parent: 'bDetail', left: 330, top: 6, width: 140, height: 20, props: { DataField: 'cidade' }, type: 'vox_ReportDBText' },
    { name: 'dValor', parent: 'bDetail', left: 480, top: 6, width: 140, height: 20, props: { DataField: 'saldo', DisplayFormat: 'Currency (R$ #,##0.00)', Alignment: 'taRightJustify' }, type: 'vox_ReportDBText' },

    { name: 'bSummary', parent: 'ReportVendas', height: 38, props: { BandType: 'rbSummary', Color: '#f1f5f9' }, type: 'vox_ReportBand' },
    { name: 'sLbl', parent: 'bSummary', left: 300, top: 8, width: 170, height: 20, props: { Caption: 'TOTAL ACUMULADO:', FontBold: true, Alignment: 'taRightJustify' }, type: 'vox_ReportLabel' },
    { name: 'sVal', parent: 'bSummary', left: 480, top: 8, width: 140, height: 20, props: { DataField: 'saldo', DisplayFormat: 'Currency (R$ #,##0.00)', FontBold: true, Alignment: 'taRightJustify', FontColor: '#059669' }, type: 'vox_ReportDBText' },

    { name: 'bFooter', parent: 'ReportVendas', height: 28, props: { BandType: 'rbPageFooter' }, type: 'vox_ReportBand' },
    { name: 'fDate', parent: 'bFooter', left: 10, top: 6, width: 220, height: 18, props: { SysDataType: 'sdDateTime' }, type: 'vox_ReportSysData' },
    { name: 'fPage', parent: 'bFooter', left: 450, top: 6, width: 170, height: 18, props: { SysDataType: 'sdPageCount', Alignment: 'taRightJustify' }, type: 'vox_ReportSysData' }
  ];

  const formState = { name: 'Form1', components: comps };
  const records = [
    { codigo: 'CLI-001', nome: 'Alpha Logística Ltda', cidade: 'São Paulo', saldo: 15420.50 },
    { codigo: 'CLI-002', nome: 'Beta Soluções de TI', cidade: 'Rio de Janeiro', saldo: 23150.00 },
    { codigo: 'CLI-003', nome: 'Gama Engenharia S/A', cidade: 'Belo Horizonte', saldo: 8900.20 },
    { codigo: 'CLI-004', nome: 'Delta Comércio Eireli', cidade: 'Curitiba', saldo: 42100.90 }
  ];

  console.log('--- 2. Gerando HTML Semântico ---');
  const html = engine.generateHTML(rep, formState, records);
  fs.writeFileSync('scratch/full_report.html', html, 'utf8');
  console.log('Tamanho HTML gerado:', html.length, 'bytes');

  console.log('--- 3. Exportando para PDF via /api/report/export-pdf ---');
  const res = await fetch('http://localhost:4500/api/report/export-pdf', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ html: html, filename: 'relatorio_clientes_vendas.pdf' })
  });

  console.log('Status HTTP:', res.status, 'Content-Type:', res.headers.get('content-type'));
  const buf = await res.arrayBuffer();
  fs.writeFileSync('scratch/relatorio_clientes_vendas.pdf', Buffer.from(buf));
  console.log('Tamanho PDF:', buf.byteLength, 'bytes. Cabeçalho:', Buffer.from(buf).slice(0, 8).toString('utf8'));
  console.log('PDF gerado com sucesso em scratch/relatorio_clientes_vendas.pdf!');
}

testFullEngine();
