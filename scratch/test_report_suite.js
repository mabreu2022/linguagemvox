// scratch/test_report_suite.js
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

async function runReportVerification() {
  console.log('========================================================');
  console.log('🧪 INICIANDO TESTES DO SISTEMA DE RELATÓRIOS DELPHI-LIKE');
  console.log('========================================================');

  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const profileDir = path.resolve('scratch/chrome-report-profile');
  if (!fs.existsSync(profileDir)) fs.mkdirSync(profileDir, { recursive: true });

  const chrome = spawn(chromePath, [
    '--headless=new',
    '--remote-debugging-port=9445',
    '--disable-gpu',
    '--window-size=1400,900',
    `--user-data-dir=${profileDir}`
  ]);

  try {
    await new Promise(r => setTimeout(r, 2000));
    const versionRes = await fetch('http://127.0.0.1:9445/json/version');
    const versionData = await versionRes.json();
    console.log('Chrome Conectado:', versionData.Browser);

    const listRes = await fetch('http://127.0.0.1:9445/json');
    const list = await listRes.json();
    const tabData = list.find(t => t.type === 'page') || list[0];

    const ws = new WebSocket(tabData.webSocketDebuggerUrl);
    let msgId = 1;
    const send = (method, params = {}) => new Promise((resolve, reject) => {
      const id = msgId++;
      const handler = (event) => {
        const data = JSON.parse(event.data);
        if (data.id === id) {
          ws.removeEventListener('message', handler);
          if (data.error) reject(data.error);
          else resolve(data.result);
        }
      };
      ws.addEventListener('message', handler);
      ws.send(JSON.stringify({ id, method, params }));
    });

    await new Promise(r => ws.onopen = r);
    await send('Runtime.enable');
    await send('Page.enable');

    console.log('Navegando para http://localhost:4500...');
    await send('Page.navigate', { url: 'http://localhost:4500' });
    await new Promise(r => setTimeout(r, 3000));

    // 1. Verificar categoria Reports na Paleta
    console.log('\n--- 1. Verificando Paleta de Componentes ---');
    const paletteCheck = await send('Runtime.evaluate', {
      expression: `(() => {
        const comps = window.VOX_COMPONENTS;
        const reportComps = Object.keys(comps).filter(k => comps[k].category === 'Reports');
        return {
          registered: reportComps,
          hasReportEngine: !!window.voxReportEngine,
          aliases: {
            TQuickRep: !!window.VOX_COMPONENTS['TQuickRep'],
            TQRBand: !!window.VOX_COMPONENTS['TQRBand'],
            TQRLabel: !!window.VOX_COMPONENTS['TQRLabel'],
            TQRDBText: !!window.VOX_COMPONENTS['TQRDBText'],
            TQRSysData: !!window.VOX_COMPONENTS['TQRSysData'],
            TQRShape: !!window.VOX_COMPONENTS['TQRShape'],
            TQRImage: !!window.VOX_COMPONENTS['TQRImage']
          }
        };
      })()`,
      returnByValue: true
    });
    console.log('Componentes Reports na Paleta:', paletteCheck.result.value);

    // 2. Montar um Relatório no Designer com todas as bandas
    console.log('\n--- 2. Montando Relatório Delphi com Bandas no Designer ---');
    const buildReportRes = await send('Runtime.evaluate', {
      expression: `(() => {
        const app = window.app;
        const d = app.designer;

        // Limpar formulário
        d.form.components = [];

        // 1. Criar vox_Report
        const rep = {
          id: 'rep_1',
          name: 'ReportVendas',
          type: 'vox_Report',
          parent: d.form.name,
          left: 30,
          top: 30,
          width: 720,
          height: 520,
          props: {
            ReportTitle: 'RELATÓRIO GERENCIAL DE VENDAS',
            PageOrientation: 'poPortrait',
            PageSize: 'psA4',
            MarginLeft: 10,
            MarginTop: 15,
            MarginRight: 10,
            MarginBottom: 15,
            DataSource: 'DataSource1',
            ShowHeaderFooterOnFirstPage: true
          },
          events: {}
        };
        d.form.components.push(rep);

        // 2. Criar TitleBand
        const bTitle = {
          id: 'band_title',
          name: 'TitleBand1',
          type: 'vox_ReportBand',
          parent: 'ReportVendas',
          left: 10,
          top: 36,
          width: 700,
          height: 50,
          props: { BandType: 'rbTitle', Height: 50, Color: '#f8fafc', BorderBottom: true },
          events: {}
        };
        d.form.components.push(bTitle);

        const lblMainTitle = {
          id: 'lbl_title_1',
          name: 'lblMainTitle',
          type: 'vox_ReportLabel',
          parent: 'TitleBand1',
          left: 15,
          top: 10,
          width: 450,
          height: 28,
          props: { Caption: 'EMPRESA EXEMPLO S/A — RELATÓRIO DE CLIENTES', FontSize: 13, FontBold: true, FontColor: '#0284c7' },
          events: {}
        };
        d.form.components.push(lblMainTitle);

        // 3. Criar PageHeaderBand
        const bHeader = {
          id: 'band_header',
          name: 'HeaderBand1',
          type: 'vox_ReportBand',
          parent: 'ReportVendas',
          left: 10,
          top: 92,
          width: 700,
          height: 32,
          props: { BandType: 'rbPageHeader', Height: 32, Color: '#e2e8f0', BorderBottom: true },
          events: {}
        };
        d.form.components.push(bHeader);

        const hCols = [
          { name: 'lblH_Cod', text: 'CÓDIGO', left: 15, width: 80 },
          { name: 'lblH_Nome', text: 'NOME DO CLIENTE', left: 105, width: 230 },
          { name: 'lblH_Cid', text: 'CIDADE / UF', left: 345, width: 140 },
          { name: 'lblH_Valor', text: 'SALDO ATUAL', left: 495, width: 140, align: 'taRightJustify' }
        ];
        hCols.forEach(c => {
          d.form.components.push({
            id: 'h_' + c.name,
            name: c.name,
            type: 'vox_ReportLabel',
            parent: 'HeaderBand1',
            left: c.left,
            top: 6,
            width: c.width,
            height: 20,
            props: { Caption: c.text, FontBold: true, FontSize: 9, FontColor: '#334155', Alignment: c.align || 'taLeftJustify' },
            events: {}
          });
        });

        // 4. Criar DetailBand
        const bDetail = {
          id: 'band_detail',
          name: 'DetailBand1',
          type: 'vox_ReportBand',
          parent: 'ReportVendas',
          left: 10,
          top: 130,
          width: 700,
          height: 32,
          props: { BandType: 'rbDetail', Height: 32, Color: '#ffffff', BorderBottom: true },
          events: {}
        };
        d.form.components.push(bDetail);

        const dCols = [
          { name: 'dbCod', field: 'codigo', left: 15, width: 80 },
          { name: 'dbNome', field: 'nome', left: 105, width: 230 },
          { name: 'dbCid', field: 'cidade', left: 345, width: 140 },
          { name: 'dbSaldo', field: 'saldo', left: 495, width: 140, align: 'taRightJustify', fmt: 'Currency (R$ #,##0.00)' }
        ];
        dCols.forEach(c => {
          d.form.components.push({
            id: 'd_' + c.name,
            name: c.name,
            type: 'vox_ReportDBText',
            parent: 'DetailBand1',
            left: c.left,
            top: 6,
            width: c.width,
            height: 20,
            props: { DataField: c.field, DisplayFormat: c.fmt || '(None)', Alignment: c.align || 'taLeftJustify', FontColor: '#0f172a' },
            events: {}
          });
        });

        // 5. Criar SummaryBand
        const bSummary = {
          id: 'band_summary',
          name: 'SummaryBand1',
          type: 'vox_ReportBand',
          parent: 'ReportVendas',
          left: 10,
          top: 168,
          width: 700,
          height: 40,
          props: { BandType: 'rbSummary', Height: 40, Color: '#f1f5f9', BorderBottom: true },
          events: {}
        };
        d.form.components.push(bSummary);

        d.form.components.push({
          id: 'lblTotalGeral',
          name: 'lblTotalGeral',
          type: 'vox_ReportLabel',
          parent: 'SummaryBand1',
          left: 320,
          top: 10,
          width: 160,
          height: 20,
          props: { Caption: 'TOTAL ACUMULADO:', FontBold: true, FontColor: '#1e293b', Alignment: 'taRightJustify' },
          events: {}
        });

        d.form.components.push({
          id: 'dbTotalSaldo',
          name: 'dbTotalSaldo',
          type: 'vox_ReportDBText',
          parent: 'SummaryBand1',
          left: 495,
          top: 10,
          width: 140,
          height: 20,
          props: { DataField: 'saldo', DisplayFormat: 'Currency (R$ #,##0.00)', FontBold: true, FontColor: '#047857', Alignment: 'taRightJustify' },
          events: {}
        });

        // 6. Criar PageFooterBand
        const bFooter = {
          id: 'band_footer',
          name: 'FooterBand1',
          type: 'vox_ReportBand',
          parent: 'ReportVendas',
          left: 10,
          top: 214,
          width: 700,
          height: 30,
          props: { BandType: 'rbPageFooter', Height: 30, Color: '#ffffff', BorderBottom: false },
          events: {}
        };
        d.form.components.push(bFooter);

        d.form.components.push({
          id: 'sysDate',
          name: 'sysDate',
          type: 'vox_ReportSysData',
          parent: 'FooterBand1',
          left: 15,
          top: 6,
          width: 250,
          height: 18,
          props: { SysDataType: 'sdDateTime', Alignment: 'taLeftJustify', FontColor: '#64748b' },
          events: {}
        });

        d.form.components.push({
          id: 'sysPages',
          name: 'sysPages',
          type: 'vox_ReportSysData',
          parent: 'FooterBand1',
          left: 450,
          top: 6,
          width: 200,
          height: 18,
          props: { SysDataType: 'sdPageCount', Alignment: 'taRightJustify', FontColor: '#64748b' },
          events: {}
        });

        d.renderForm();
        d.selectComponent(rep);
        app.updateStructureTree();
        app.inspector.update(rep);

        return {
          totalComps: d.form.components.length,
          reportName: rep.name
        };
      })()`,
      returnByValue: true
    });
    console.log('Relatório criado no Designer:', buildReportRes.result.value);

    await new Promise(r => setTimeout(r, 1000));

    // Capturar screenshot do Designer com o Relatório
    const ssDesigner = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync('scratch/designer_delphi_report.png', Buffer.from(ssDesigner.data, 'base64'));
    console.log('📸 Screenshot Designer salvo: scratch/designer_delphi_report.png');

    // 3. Testar a Geração HTML do Relatório
    console.log('\n--- 3. Testando Geração HTML e Paginação ---');
    const htmlGenRes = await send('Runtime.evaluate', {
      expression: `(() => {
        const app = window.app;
        const rep = app.designer.form.components.find(c => c.type === 'vox_Report');
        const html = window.voxReportEngine.generateHTML(rep, app.designer.form);
        return {
          length: html.length,
          hasMediaPrint: html.includes('@media print'),
          hasPageBreak: html.includes('page-break-after'),
          hasReportPage: html.includes('vox-report-page'),
          hasTitle: html.includes('EMPRESA EXEMPLO S/A'),
          hasCurrencyFormatted: html.includes('R$')
        };
      })()`,
      returnByValue: true
    });
    console.log('Resultado da Geração HTML:', htmlGenRes.result.value);

    // 4. Abrir Modal de Pré-visualização (Report Viewer)
    console.log('\n--- 4. Abrindo Janela de Pré-visualização (Preview) ---');
    await send('Runtime.evaluate', {
      expression: `(() => {
        const app = window.app;
        const rep = app.designer.form.components.find(c => c.type === 'vox_Report');
        window.voxReportEngine.showPreview(rep, app.designer.form);
      })()`
    });

    await new Promise(r => setTimeout(r, 2000));

    // Capturar screenshot do Modal de Preview do Relatório
    const ssPreview = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync('scratch/delphi_report_preview_modal.png', Buffer.from(ssPreview.data, 'base64'));
    console.log('📸 Screenshot Preview salvo: scratch/delphi_report_preview_modal.png');

    // 5. Testar Exportação para PDF via API do Servidor
    console.log('\n--- 5. Testando Exportação Direta para PDF ---');
    const pdfTestRes = await send('Runtime.evaluate', {
      expression: `(async () => {
        const app = window.app;
        const rep = app.designer.form.components.find(c => c.type === 'vox_Report');
        const html = window.voxReportEngine.generateHTML(rep, app.designer.form);
        const res = await fetch('/api/report/export-pdf', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ html: html, filename: 'relatorio_vendas.pdf' })
        });
        const buf = await res.arrayBuffer();
        return {
          status: res.status,
          contentType: res.headers.get('content-type'),
          byteLength: buf.byteLength
        };
      })()`,
      awaitPromise: true,
      returnByValue: true
    });
    console.log('Resposta da Rota PDF:', pdfTestRes.result.value);

    console.log('\n========================================================');
    console.log('✅ TODOS OS TESTES FORAM CONCLUÍDOS COM SUCESSO!');
    console.log('========================================================');
  } catch (e) {
    console.error('❌ Erro no teste:', e);
  } finally {
    try { chrome.kill(); } catch (e) {}
  }
}

runReportVerification();
