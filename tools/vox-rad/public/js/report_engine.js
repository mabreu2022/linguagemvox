// ==============================================================================
// tools/vox-rad/public/js/report_engine.js — Motor de Relatórios Delphi-Like
// Geração de Relatórios em HTML Semântico e Exportação para PDF / Impressão
// ==============================================================================

class VoxReportEngine {
  constructor() {
    this.currentZoom = 100;
    this.lastHtml = '';
    this.lastReportComp = null;
  }

  // Obter registros do DataSource ou mock de demonstração inteligente
  async resolveRecords(reportComp, formState, providedRecords = null) {
    if (Array.isArray(providedRecords) && providedRecords.length > 0) {
      return providedRecords;
    }

    // 1. Tentar buscar registros ativos no runner
    if (window.app && window.app.runner && Array.isArray(window.app.runner.activeRecords) && window.app.runner.activeRecords.length > 0) {
      return window.app.runner.activeRecords;
    }

    // 2. Tentar buscar do backend SQLite se houver conexão ou query no formulário
    const dsName = reportComp && reportComp.props && reportComp.props.DataSource;
    let sqlToRun = 'SELECT * FROM clientes LIMIT 50';

    if (formState && formState.components) {
      const queryComp = formState.components.find(c =>
        (c.type === 'vox_Query' || c.type === 'TFDQuery') && c.props && c.props.SQL
      );
      if (queryComp) sqlToRun = queryComp.props.SQL;
    }

    try {
      const res = await fetch('/api/db/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sql: sqlToRun })
      });
      const data = await res.json();
      if (Array.isArray(data.rows) && data.rows.length > 0) {
        return data.rows;
      }
    } catch (e) {
      console.warn('[VoxReportEngine] Não foi possível consultar SQLite diretamente:', e);
    }

    // 3. Fallback inteligente com dados simulados realistas
    return [
      { id: 1, codigo: 'CLI-001', nome: 'Mauricio Abreu Consultoria', email: 'mauricio@voxlang.org', telefone: '(21) 98888-1111', cidade: 'Rio de Janeiro', uf: 'RJ', saldo: 15420.50, valor: 15420.50, status: 'Ativo', data: '2026-09-01' },
      { id: 2, codigo: 'CLI-002', nome: 'Beatriz Lima Software ME', email: 'beatriz@empresa.com', telefone: '(11) 97777-2222', cidade: 'São Paulo', uf: 'SP', saldo: 23150.00, valor: 23150.00, status: 'Ativo', data: '2026-09-03' },
      { id: 3, codigo: 'CLI-003', nome: 'Carlos Eduardo & Filhos', email: 'carlos@comercio.com', telefone: '(31) 96666-3333', cidade: 'Belo Horizonte', uf: 'MG', saldo: 4890.75, valor: 4890.75, status: 'Pendente', data: '2026-09-08' },
      { id: 4, codigo: 'CLI-004', nome: 'Daniela Rocha Logística S/A', email: 'daniela@log.com', telefone: '(41) 95555-4444', cidade: 'Curitiba', uf: 'PR', saldo: 38900.20, valor: 38900.20, status: 'Ativo', data: '2026-09-12' },
      { id: 5, codigo: 'CLI-005', nome: 'Eduardo Martins Engenharia', email: 'eduardo@eng.com', telefone: '(51) 94444-5555', cidade: 'Porto Alegre', uf: 'RS', saldo: 12780.00, valor: 12780.00, status: 'Ativo', data: '2026-09-15' },
      { id: 6, codigo: 'CLI-006', nome: 'Fernanda Souza Contabilidade', email: 'fernanda@contab.com', telefone: '(71) 93333-6666', cidade: 'Salvador', uf: 'BA', saldo: 9450.30, valor: 9450.30, status: 'Pendente', data: '2026-09-16' },
      { id: 7, codigo: 'CLI-007', nome: 'Gabriel Santos Tech ME', email: 'gabriel@tech.com', telefone: '(81) 92222-7777', cidade: 'Recife', uf: 'PE', saldo: 18600.00, valor: 18600.00, status: 'Ativo', data: '2026-09-18' },
      { id: 8, codigo: 'CLI-008', nome: 'Helena Carvalho Distribuidora', email: 'helena@distrib.com', telefone: '(85) 91111-8888', cidade: 'Fortaleza', uf: 'CE', saldo: 42100.90, valor: 42100.90, status: 'Ativo', data: '2026-09-19' }
    ];
  }

  // Formatador de valores (moeda, data, número)
  formatValue(val, format, prefix = '', suffix = '') {
    if (val === undefined || val === null) return '';
    let res = String(val);

    const fmt = (format || '').toLowerCase();
    if (fmt.includes('currency') || fmt.includes('r$')) {
      const num = parseFloat(val);
      if (!isNaN(num)) {
        res = 'R$ ' + num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      }
    } else if (fmt.includes('number') || fmt.includes('#,##0.00')) {
      const num = parseFloat(val);
      if (!isNaN(num)) {
        res = num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      }
    } else if (fmt.includes('integer') || fmt.includes('#,##0')) {
      const num = parseInt(val, 10);
      if (!isNaN(num)) {
        res = num.toLocaleString('pt-BR');
      }
    } else if (fmt.includes('date') && typeof val === 'string' && val.includes('-')) {
      const parts = val.split('T')[0].split('-');
      if (parts.length === 3) {
        res = `${parts[2]}/${parts[1]}/${parts[0]}`;
      }
    }

    return (prefix || '') + res + (suffix || '');
  }

  // Geração do HTML Estruturado do Relatório
  generateHTML(reportComp, formState, records = []) {
    this.lastReportComp = reportComp;
    const props = (reportComp && reportComp.props) || {};
    const reportTitle = props.ReportTitle || 'Relatório Vox';
    const orientation = props.PageOrientation || 'poPortrait';
    const isLandscape = orientation === 'poLandscape';
    const pageSize = props.PageSize || 'psA4';
    const fontFamily = props.FontFamily || 'Segoe UI, -apple-system, BlinkMacSystemFont, Arial, sans-serif';

    const marginLeft = parseInt(props.MarginLeft, 10) || 10;
    const marginRight = parseInt(props.MarginRight, 10) || 10;
    const marginTop = parseInt(props.MarginTop, 10) || 15;
    const marginBottom = parseInt(props.MarginBottom, 10) || 15;

    // Dimensões A4 em milímetros
    const pageWidthMm = isLandscape ? 297 : 210;
    const pageHeightMm = isLandscape ? 210 : 297;

    // Dimensões úteis em mm
    const usableWidthMm = pageWidthMm - marginLeft - marginRight;
    const usableHeightMm = pageHeightMm - marginTop - marginBottom;

    // Fator de escala mm -> px (a 96 DPI: 1 inch = 25.4mm, 96 / 25.4 ≈ 3.7795 px/mm)
    const MM_TO_PX = 3.7795;
    const usableWidthPx = Math.round(usableWidthMm * MM_TO_PX);
    const usableHeightPx = Math.round(usableHeightMm * MM_TO_PX);

    // Identificar todas as bandas pertencentes a este relatório
    const allComps = (formState && formState.components) || [];
    const bands = allComps.filter(c =>
      (c.type === 'vox_ReportBand' || c.type === 'TVoxReportBand' || c.type === 'TQRBand') &&
      (!c.parent || c.parent === reportComp.name)
    );

    // Mapeamento das bandas por tipo
    const titleBand = bands.find(b => b.props.BandType === 'rbTitle');
    const pageHeaderBand = bands.find(b => b.props.BandType === 'rbPageHeader');
    const columnHeaderBand = bands.find(b => b.props.BandType === 'rbColumnHeader');
    const detailBand = bands.find(b => b.props.BandType === 'rbDetail' || !b.props.BandType);
    const summaryBand = bands.find(b => b.props.BandType === 'rbSummary');
    const pageFooterBand = bands.find(b => b.props.BandType === 'rbPageFooter');

    // Alturas em pixels das seções
    const titleH = titleBand ? (parseInt(titleBand.height, 10) || 50) : 0;
    const pageHeaderH = pageHeaderBand ? (parseInt(pageHeaderBand.height, 10) || 40) : 0;
    const colHeaderH = columnHeaderBand ? (parseInt(columnHeaderBand.height, 10) || 28) : 0;
    const detailH = detailBand ? (parseInt(detailBand.height, 10) || 32) : 32;
    const summaryH = summaryBand ? (parseInt(summaryBand.height, 10) || 45) : 0;
    const pageFooterH = pageFooterBand ? (parseInt(pageFooterBand.height, 10) || 30) : 30;

    // Filhos de cada banda
    const getBandChildren = (band) => {
      if (!band) return [];
      return allComps.filter(c => c.parent === band.name);
    };

    // Helper para renderizar os elementos posicionados dentro de uma faixa
    const renderBandElements = (band, record = null, pageNumber = 1, totalPages = 1) => {
      if (!band) return '';
      const children = getBandChildren(band);
      const bandWidth = parseInt(band.width, 10) || usableWidthPx;
      const bandHeight = parseInt(band.height, 10) || 30;

      let html = '';
      children.forEach(c => {
        const left = parseInt(c.left, 10) || 0;
        const top = parseInt(c.top, 10) || 0;
        const width = parseInt(c.width, 10) || 100;
        const height = parseInt(c.height, 10) || 20;
        const cp = c.props || {};

        const align = cp.Alignment === 'taRightJustify' ? 'right' : (cp.Alignment === 'taCenter' ? 'center' : 'left');
        const bold = cp.FontBold ? 'bold' : 'normal';
        const italic = cp.FontItalic ? 'italic' : 'normal';
        const fontSize = cp.FontSize ? `${cp.FontSize}pt` : '9.5pt';
        const fontColor = cp.FontColor || 'inherit';

        const style = `position:absolute; left:${left}px; top:${top}px; width:${width}px; height:${height}px; text-align:${align}; font-weight:${bold}; font-style:${italic}; font-size:${fontSize}; color:${fontColor}; line-height:${height}px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; box-sizing:border-box;`;

        if (c.type === 'vox_ReportLabel' || c.type === 'TVoxReportLabel' || c.type === 'TQRLabel') {
          html += `<div style="${style}">${cp.Caption || c.name}</div>`;
        } else if (c.type === 'vox_ReportDBText' || c.type === 'TVoxReportDBText' || c.type === 'TQRDBText') {
          const field = cp.DataField || '';
          let val = (record && field && record[field] !== undefined) ? record[field] : (record ? Object.values(record)[0] : field);
          const formatted = this.formatValue(val, cp.DisplayFormat, cp.Prefix, cp.Suffix);
          html += `<div style="${style}">${formatted}</div>`;
        } else if (c.type === 'vox_ReportSysData' || c.type === 'TVoxReportSysData' || c.type === 'TQRSysData') {
          let text = '';
          const sdt = cp.SysDataType || 'sdPageCount';
          const now = new Date();
          if (sdt === 'sdDate') text = now.toLocaleDateString('pt-BR');
          else if (sdt === 'sdTime') text = now.toLocaleTimeString('pt-BR');
          else if (sdt === 'sdDateTime') text = now.toLocaleString('pt-BR');
          else if (sdt === 'sdPageNumber') text = `Página ${pageNumber}`;
          else if (sdt === 'sdPageCount') text = `Página ${pageNumber} de ${totalPages}`;
          else if (sdt === 'sdRecordCount') text = `Total de Registros: ${records.length}`;
          else if (sdt === 'sdReportTitle') text = reportTitle;
          else text = `Página ${pageNumber} de ${totalPages}`;

          if (cp.Text && cp.Text.includes('{page}')) {
            text = cp.Text.replace('{page}', pageNumber).replace('{pages}', totalPages);
          }
          html += `<div style="${style}">${text}</div>`;
        } else if (c.type === 'vox_ReportShape' || c.type === 'TVoxReportShape' || c.type === 'TQRShape') {
          const st = cp.ShapeType || 'stHorizontalLine';
          const penColor = cp.PenColor || '#cbd5e1';
          const penWidth = parseInt(cp.PenWidth, 10) || 1;
          let shapeInner = '';
          if (st === 'stHorizontalLine') {
            shapeInner = `<div style="width:100%; border-top:${penWidth}px solid ${penColor}; margin-top:${Math.floor(height/2)}px;"></div>`;
          } else if (st === 'stVerticalLine') {
            shapeInner = `<div style="height:100%; border-left:${penWidth}px solid ${penColor}; margin-left:${Math.floor(width/2)}px;"></div>`;
          } else if (st === 'stRoundRect') {
            shapeInner = `<div style="width:100%; height:100%; border:${penWidth}px solid ${penColor}; border-radius:4px; background:${cp.BrushColor || 'transparent'}; box-sizing:border-box;"></div>`;
          } else {
            shapeInner = `<div style="width:100%; height:100%; border:${penWidth}px solid ${penColor}; background:${cp.BrushColor || 'transparent'}; box-sizing:border-box;"></div>`;
          }
          html += `<div style="position:absolute; left:${left}px; top:${top}px; width:${width}px; height:${height}px;">${shapeInner}</div>`;
        } else if (c.type === 'vox_ReportImage' || c.type === 'TVoxReportImage' || c.type === 'TQRImage') {
          const pic = cp.Picture;
          if (pic) {
            html += `<div style="${style}"><img src="${pic}" style="width:100%; height:100%; object-fit:${cp.Proportional ? 'contain' : 'cover'};" /></div>`;
          } else {
            html += `<div style="${style}; display:flex; align-items:center; justify-content:center; background:#f1f5f9; border:1px dashed #cbd5e1; font-size:10px; color:#64748b;">🖼️ Logo</div>`;
          }
        }
      });
      return html;
    };

    // ------------------------------------------------------------------------
    // Algoritmo de Paginação Delphi Multi-Page
    // ------------------------------------------------------------------------
    const pages = [];
    let curPageIndex = 0;
    let availableHeight = usableHeightPx - pageFooterH;

    // Função para iniciar uma nova página
    const createNewPage = (isFirst = false) => {
      curPageIndex++;
      let curY = 0;
      let pageHtml = '';

      // Título na primeira página
      if (isFirst && titleBand) {
        pageHtml += `
          <div class="vox-band vox-band-title" style="position:relative; width:100%; height:${titleH}px; background:${titleBand.props.Color || 'transparent'}; border-bottom:${titleBand.props.BorderBottom ? '1px solid #0284c7' : 'none'};">
            ${renderBandElements(titleBand, null, curPageIndex, 1)}
          </div>
        `;
        curY += titleH;
      }

      // Page Header em todas as páginas
      if (pageHeaderBand) {
        pageHtml += `
          <div class="vox-band vox-band-pageheader" style="position:relative; width:100%; height:${pageHeaderH}px; background:${pageHeaderBand.props.Color || 'transparent'}; border-bottom:${pageHeaderBand.props.BorderBottom ? '1px solid #cbd5e1' : 'none'};">
            ${renderBandElements(pageHeaderBand, null, curPageIndex, 1)}
          </div>
        `;
        curY += pageHeaderH;
      }

      // Column Header em todas as páginas
      if (columnHeaderBand) {
        pageHtml += `
          <div class="vox-band vox-band-colheader" style="position:relative; width:100%; height:${colHeaderH}px; background:${columnHeaderBand.props.Color || '#f8fafc'}; border-bottom:${columnHeaderBand.props.BorderBottom ? '1px solid #cbd5e1' : 'none'};">
            ${renderBandElements(columnHeaderBand, null, curPageIndex, 1)}
          </div>
        `;
        curY += colHeaderH;
      }

      return {
        pageNumber: curPageIndex,
        headerHtml: pageHtml,
        bodyHtml: '',
        footerHtml: '',
        usedHeight: curY
      };
    };

    let curPage = createNewPage(true);
    pages.push(curPage);

    // Iteração dos registros (Detail Band)
    records.forEach((rec, idx) => {
      // Se não couber na página atual, quebrar para nova folha
      if (curPage.usedHeight + detailH > availableHeight) {
        curPage = createNewPage(false);
        pages.push(curPage);
      }

      const zebraBg = idx % 2 === 1 ? '#f8fafc' : '#ffffff';
      const bg = (detailBand && detailBand.props.Color && detailBand.props.Color !== '#ffffff') ? detailBand.props.Color : zebraBg;
      const borderBottom = (detailBand && detailBand.props.BorderBottom !== false) ? 'border-bottom: 1px solid #e2e8f0;' : '';

      curPage.bodyHtml += `
        <div class="vox-band vox-band-detail" style="position:relative; width:100%; height:${detailH}px; background:${bg}; ${borderBottom}">
          ${renderBandElements(detailBand, rec, curPage.pageNumber, 1)}
        </div>
      `;
      curPage.usedHeight += detailH;
    });

    // Summary Band (Totais / Resumo ao final dos registros)
    if (summaryBand) {
      if (curPage.usedHeight + summaryH > availableHeight) {
        curPage = createNewPage(false);
        pages.push(curPage);
      }

      // Calcular soma de campos numéricos se houver
      let sumValue = 0;
      records.forEach(r => {
        const val = parseFloat(r.saldo || r.valor || r.total || 0);
        if (!isNaN(val)) sumValue += val;
      });

      curPage.bodyHtml += `
        <div class="vox-band vox-band-summary" style="position:relative; width:100%; height:${summaryH}px; background:${summaryBand.props.Color || '#f1f5f9'}; border-top: 2px solid #334155; margin-top: 4px;">
          ${renderBandElements(summaryBand, { saldo: sumValue, valor: sumValue, total: sumValue, count: records.length }, curPage.pageNumber, 1)}
        </div>
      `;
      curPage.usedHeight += summaryH;
    }

    const totalPages = pages.length;

    // Renderizar PageFooter na base de cada página com os totais de páginas calculados
    pages.forEach(p => {
      let footerContent = '';
      if (pageFooterBand) {
        footerContent = renderBandElements(pageFooterBand, null, p.pageNumber, totalPages);
      } else {
        footerContent = `
          <div style="position:absolute; left:0; top:8px; font-size:8.5pt; color:#64748b;">
            Gerado por Vox Studio RAD — ${new Date().toLocaleDateString('pt-BR')} ${new Date().toLocaleTimeString('pt-BR')}
          </div>
          <div style="position:absolute; right:0; top:8px; font-size:8.5pt; color:#64748b; font-weight:bold;">
            Página ${p.pageNumber} de ${totalPages}
          </div>
        `;
      }

      p.footerHtml = `
        <div class="vox-band vox-band-pagefooter" style="position:relative; width:100%; height:${pageFooterH}px; border-top: 1px solid #cbd5e1; margin-top: auto;">
          ${footerContent}
        </div>
      `;
    });

    // ------------------------------------------------------------------------
    // Montagem do Documento HTML Completo com CSS de Impressão (@media print)
    // ------------------------------------------------------------------------
    let pagesHtml = '';
    pages.forEach((p, idx) => {
      pagesHtml += `
        <div class="vox-report-page" data-page="${p.pageNumber}" style="
          width: ${usableWidthMm}mm;
          height: ${usableHeightMm}mm;
          min-height: ${usableHeightMm}mm;
          max-height: ${usableHeightMm}mm;
          padding: ${marginTop}mm ${marginRight}mm ${marginBottom}mm ${marginLeft}mm;
          box-sizing: content-box;
          background: #ffffff;
          position: relative;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
          margin: 0 auto 20px auto;
          page-break-after: always;
          break-after: page;
          overflow: hidden;
        ">
          <div class="vox-page-body" style="width: 100%; height: 100%; display: flex; flex-direction: column; justify-content: space-between; position: relative;">
            <div class="vox-page-content-top" style="width: 100%;">
              ${p.headerHtml}
              ${p.bodyHtml}
            </div>
            ${p.footerHtml}
          </div>
        </div>
      `;
    });

    const fullHtml = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <title>${reportTitle}</title>
  <style>
    @page {
      size: ${pageSize.replace('ps', '')} ${isLandscape ? 'landscape' : 'portrait'};
      margin: 0;
    }
    *, *:before, *:after {
      box-sizing: border-box;
    }
    body {
      margin: 0;
      padding: 20px 0;
      background: #e2e8f0;
      font-family: ${fontFamily};
      color: #0f172a;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    @media print {
      body {
        background: #ffffff !important;
        padding: 0 !important;
        margin: 0 !important;
      }
      .vox-report-toolbar, .no-print {
        display: none !important;
      }
      .vox-report-page {
        box-shadow: none !important;
        margin: 0 !important;
        border: none !important;
        width: 100% !important;
        page-break-after: always !important;
        break-after: page !important;
      }
      .vox-report-page:last-child {
        page-break-after: auto !important;
        break-after: auto !important;
      }
    }
  </style>
</head>
<body>
  ${pagesHtml}
</body>
</html>`;

    this.lastHtml = fullHtml;
    return fullHtml;
  }

  // --------------------------------------------------------------------------
  // Exibição da Modal de Pré-visualização Interativa (Report Preview)
  // --------------------------------------------------------------------------
  async showPreview(reportComp, formState, records = null) {
    const data = await this.resolveRecords(reportComp, formState, records);
    const html = this.generateHTML(reportComp, formState, data);

    let modal = document.getElementById('voxReportPreviewModal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'voxReportPreviewModal';
      modal.className = 'vox-modal-overlay';
      modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        background: rgba(15, 23, 42, 0.75);
        backdrop-filter: blur(4px);
        z-index: 99999;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        animation: fadeIn 0.15s ease-out;
      `;
      document.body.appendChild(modal);
    }

    const reportTitle = (reportComp && reportComp.props && reportComp.props.ReportTitle) || 'Relatório Vox';

    modal.innerHTML = `
      <div class="vox-report-window" style="
        width: 92vw;
        height: 94vh;
        background: #0f172a;
        border-radius: 8px;
        display: flex;
        flex-direction: column;
        overflow: hidden;
        box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
        border: 1px solid #334155;
      ">
        <!-- Barra de Ferramentas Superior Delphi Preview -->
        <div class="vox-report-toolbar" style="
          height: 48px;
          background: #1e293b;
          border-bottom: 1px solid #334155;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 16px;
          color: #f8fafc;
          user-select: none;
        ">
          <!-- Título e Ícone -->
          <div style="display: flex; align-items: center; gap: 8px; font-size: 13px; font-weight: 600;">
            <span style="font-size: 16px;">📑</span>
            <span>${reportTitle} — Visualização de Impressão</span>
          </div>

          <!-- Ações: Imprimir, PDF, HTML, Zoom -->
          <div style="display: flex; align-items: center; gap: 8px;">
            <button id="btnReportPrint" class="vox-report-btn" style="
              background: #0284c7; color: #ffffff; border: none; padding: 6px 14px; border-radius: 4px;
              font-size: 11px; font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: 5px;
            ">
              <span>🖨️</span> Imprimir
            </button>

            <button id="btnReportExportPdf" class="vox-report-btn" style="
              background: #dc2626; color: #ffffff; border: none; padding: 6px 14px; border-radius: 4px;
              font-size: 11px; font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: 5px;
            ">
              <span>📄</span> Exportar PDF
            </button>

            <button id="btnReportExportHtml" class="vox-report-btn" style="
              background: #059669; color: #ffffff; border: none; padding: 6px 14px; border-radius: 4px;
              font-size: 11px; font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: 5px;
            ">
              <span>🌐</span> Baixar HTML
            </button>

            <div style="width: 1px; height: 20px; background: #475569; margin: 0 6px;"></div>

            <!-- Controles de Zoom -->
            <div style="display: flex; align-items: center; gap: 4px; background: #0f172a; padding: 3px 8px; border-radius: 4px; border: 1px solid #334155; font-size: 11px;">
              <button id="btnZoomOut" style="background:none; border:none; color:#cbd5e1; cursor:pointer; font-weight:bold; padding:0 4px;">−</button>
              <span id="txtZoomLevel" style="color:#67e8f9; min-width:38px; text-align:center;">100%</span>
              <button id="btnZoomIn" style="background:none; border:none; color:#cbd5e1; cursor:pointer; font-weight:bold; padding:0 4px;">+</button>
            </div>

            <div style="width: 1px; height: 20px; background: #475569; margin: 0 6px;"></div>

            <!-- Fechar -->
            <button id="btnReportClose" style="
              background: #334155; color: #ffffff; border: none; padding: 6px 10px; border-radius: 4px;
              font-size: 11px; font-weight: bold; cursor: pointer;
            ">✕</button>
          </div>
        </div>

        <!-- Área de Exibição com Iframe Sandbox -->
        <div id="reportPreviewContainer" style="
          flex: 1;
          background: #475569;
          overflow: auto;
          display: flex;
          justify-content: center;
          padding: 24px;
        ">
          <iframe id="reportPreviewIframe" style="
            width: 100%;
            height: 100%;
            border: none;
            background: transparent;
            transform-origin: top center;
            transition: transform 0.15s ease;
          "></iframe>
        </div>
      </div>
    `;

    modal.style.display = 'flex';

    const iframe = document.getElementById('reportPreviewIframe');
    const doc = iframe.contentWindow.document;
    doc.open();
    doc.write(html);
    doc.close();

    // Eventos dos Botões
    document.getElementById('btnReportClose').onclick = () => {
      modal.style.display = 'none';
    };

    // Imprimir
    document.getElementById('btnReportPrint').onclick = () => {
      iframe.contentWindow.focus();
      iframe.contentWindow.print();
    };

    // Exportar PDF via API do Servidor
    document.getElementById('btnReportExportPdf').onclick = async () => {
      const btn = document.getElementById('btnReportExportPdf');
      const originalText = btn.innerHTML;
      btn.innerHTML = '<span>⏳</span> Gerando PDF...';
      btn.disabled = true;

      try {
        const res = await fetch('/api/report/export-pdf', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            html: html,
            filename: `${reportTitle.replace(/\s+/g, '_').toLowerCase()}.pdf`
          })
        });

        if (!res.ok) {
          throw new Error(`Erro ao gerar PDF: ${res.statusText}`);
        }

        const blob = await res.blob();
        const downloadUrl = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = downloadUrl;
        a.download = `${reportTitle.replace(/\s+/g, '_').toLowerCase()}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(downloadUrl);

        if (window.app && window.app.showToast) {
          window.app.showToast('📄 Relatório PDF exportado com sucesso!');
        }
      } catch (err) {
        console.error('Falha na exportação para PDF:', err);
        // Fallback: abrir print nativo do navegador
        alert('Disparando impressão para PDF nativa do navegador...');
        iframe.contentWindow.focus();
        iframe.contentWindow.print();
      } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
      }
    };

    // Baixar HTML Puro
    document.getElementById('btnReportExportHtml').onclick = () => {
      const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = `${reportTitle.replace(/\s+/g, '_').toLowerCase()}.html`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(downloadUrl);

      if (window.app && window.app.showToast) {
        window.app.showToast('🌐 Arquivo HTML do relatório baixado!');
      }
    };

    // Zoom
    let zoomLevel = 100;
    const txtZoom = document.getElementById('txtZoomLevel');
    const updateZoom = (val) => {
      zoomLevel = Math.max(50, Math.min(200, val));
      txtZoom.innerText = `${zoomLevel}%`;
      const scale = zoomLevel / 100;
      iframe.style.transform = `scale(${scale})`;
      iframe.style.width = `${100 / scale}%`;
      iframe.style.height = `${100 / scale}%`;
    };

    document.getElementById('btnZoomIn').onclick = () => updateZoom(zoomLevel + 15);
    document.getElementById('btnZoomOut').onclick = () => updateZoom(zoomLevel - 15);
  }
}

// Instância global disponível em todo o ambiente RAD e Node.js
if (typeof window !== 'undefined') {
  window.VoxReportEngine = VoxReportEngine;
  window.voxReportEngine = new VoxReportEngine();
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { VoxReportEngine };
}

