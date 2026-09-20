// ==============================================================================
// tools/vox-rad/public/js/codegen.js — Sincronização Bidirecional (.vxf <-> .vox)
// ==============================================================================

window.VoxCodeGen = {
  // --------------------------------------------------------------------------
  // Gerar o Código Fonte da Classe Vox a partir do Formulário Visual
  // --------------------------------------------------------------------------
  generateVoxCode(formState) {
    const formName = formState.name || 'Form1';
    const components = formState.components || [];

    let declLines = [];
    let initLines = [];
    let eventMethods = [];

    components.forEach(comp => {
      // Declaração do componente
      declLines.push(`    let mut ${comp.name}: ${comp.type};`);

      // Inicialização no construtor new()
      initLines.push(`        this.${comp.name} = new ${comp.type}();`);
      initLines.push(`        this.${comp.name}.left = ${comp.left};`);
      initLines.push(`        this.${comp.name}.top = ${comp.top};`);
      initLines.push(`        this.${comp.name}.width = ${comp.width};`);
      initLines.push(`        this.${comp.name}.height = ${comp.height};`);

      // Propriedades específicas
      if (comp.props.Caption !== undefined) {
        initLines.push(`        this.${comp.name}.caption = "${comp.props.Caption}";`);
      }
      if (comp.props.Text !== undefined) {
        initLines.push(`        this.${comp.name}.text = "${comp.props.Text}";`);
      }
      if (comp.props.DriverName !== undefined) {
        initLines.push(`        this.${comp.name}.driverName = "${comp.props.DriverName}";`);
      }
      if (comp.props.Database !== undefined) {
        initLines.push(`        this.${comp.name}.database = "${comp.props.Database}";`);
      }
      if (comp.props.Connected !== undefined) {
        initLines.push(`        this.${comp.name}.connected = ${comp.props.Connected};`);
      }
      if (comp.props.Connection !== undefined) {
        initLines.push(`        this.${comp.name}.connection = "${comp.props.Connection}";`);
      }
      if (comp.props.SQL !== undefined) {
        const escapedSql = comp.props.SQL.replace(/"/g, '\\"').replace(/\n/g, ' ');
        initLines.push(`        this.${comp.name}.sql = "${escapedSql}";`);
      }
      if (comp.props.Active !== undefined) {
        initLines.push(`        this.${comp.name}.active = ${comp.props.Active};`);
      }
      if (comp.props.DataSet !== undefined) {
        initLines.push(`        this.${comp.name}.dataSet = "${comp.props.DataSet}";`);
      }
      if (comp.props.DataSource !== undefined) {
        initLines.push(`        this.${comp.name}.dataSource = "${comp.props.DataSource}";`);
      }
      if (comp.props.DataField !== undefined) {
        initLines.push(`        this.${comp.name}.dataField = "${comp.props.DataField}";`);
      }
      if (comp.props.Layout !== undefined) {
        initLines.push(`        this.${comp.name}.layout = "${comp.props.Layout}";`);
      }
      if (comp.props.Items !== undefined) {
        initLines.push(`        this.${comp.name}.items = "${comp.props.Items}";`);
      }
      if (comp.props.Title !== undefined) {
        initLines.push(`        this.${comp.name}.title = "${comp.props.Title}";`);
      }
      if (comp.props.IP !== undefined) {
        initLines.push(`        this.${comp.name}.IP = "${comp.props.IP}";`);
      } else if (comp.props.Server !== undefined) {
        initLines.push(`        this.${comp.name}.IP = "${comp.props.Server}";`);
      }
      if (comp.props.Porta !== undefined) {
        initLines.push(`        this.${comp.name}.Porta = ${comp.props.Porta};`);
      } else if (comp.props.Port !== undefined) {
        initLines.push(`        this.${comp.name}.Porta = ${comp.props.Port};`);
      }
      if (comp.props.Login !== undefined) {
        initLines.push(`        this.${comp.name}.Login = "${comp.props.Login}";`);
      } else if (comp.props.UserName !== undefined) {
        initLines.push(`        this.${comp.name}.Login = "${comp.props.UserName}";`);
      }
      if (comp.props.Senha !== undefined) {
        initLines.push(`        this.${comp.name}.Senha = "${comp.props.Senha}";`);
      } else if (comp.props.Password !== undefined) {
        initLines.push(`        this.${comp.name}.Senha = "${comp.props.Password}";`);
      }
      if (comp.props.VendorLib !== undefined) {
        initLines.push(`        this.${comp.name}.vendorLib = "${comp.props.VendorLib}";`);
      }
      if (comp.props.CharSet !== undefined) {
        initLines.push(`        this.${comp.name}.charSet = "${comp.props.CharSet}";`);
      }
      if (comp.props.Responsive !== undefined) {
        initLines.push(`        this.${comp.name}.responsive = ${comp.props.Responsive};`);
      }
      if (comp.props.Collapsed !== undefined) {
        initLines.push(`        this.${comp.name}.collapsed = ${comp.props.Collapsed};`);
      }

      // Conexão de eventos declarados
      if (comp.events) {
        Object.entries(comp.events).forEach(([eventName, handlerName]) => {
          if (handlerName && handlerName.trim()) {
            initLines.push(`        this.${comp.name}.${eventName.toLowerCase()} = this.${handlerName};`);
            
            // Garantir que o método do evento exista
            if (!eventMethods.some(m => m.name === handlerName)) {
              eventMethods.push({
                name: handlerName,
                compName: comp.name,
                eventName: eventName,
                body: `        println("[VOX EVENT] ${comp.name} -> ${eventName} acionado!");`
              });
            }
          }
        });
      }

      initLines.push('');
    });

    // ── Conexão de Eventos Oficiais do Formulário (OnCreate, OnShow, OnClose, etc.) ──
    if (formState.events) {
      Object.entries(formState.events).forEach(([eventName, handlerName]) => {
        if (handlerName && handlerName.trim()) {
          initLines.push(`        this.${eventName.toLowerCase()} = this.${handlerName};`);
          if (!eventMethods.some(m => m.name === handlerName)) {
            eventMethods.push({
              name: handlerName,
              compName: formName,
              eventName: eventName,
              body: `        println("[VOX FORM EVENT] ${formName} -> ${eventName} executado!");`
            });
          }
        }
      });
    }

    // Se nenhum evento foi criado, adiciona um exemplo padrão
    if (eventMethods.length === 0) {
      eventMethods.push({
        name: 'FormCreate',
        compName: formName,
        eventName: 'OnCreate',
        body: `        println("Formulário ${formName} carregado com sucesso!");`
      });
    }

    const eventFunctionsCode = eventMethods.map(m => `
    // Tratador de Evento Publicado: ${m.compName} -> ${m.eventName}
    public procedure ${m.name}(sender: any) {
${m.body}
    }`).join('\n');

    // Referências de unidades necessárias padrão Delphi
    const importedUnits = ['Vox_UI', 'Vox_Database', 'Vox_SysUtils'];

    return `// ==============================================================================
// ${formName}.vox — Unidade RAD Gerada pelo Vox Studio
// ==============================================================================

import ${importedUnits.join(', ')};

classe ${formName} herda vox_Form {
private:
    // ── Membros e Métodos Privados ──────────────────────────────────────────
    var _initialized: bool;

    private procedure LogInterno(msg: str) {
        println("[DEBUG INTERNO] " + msg);
    }

published:
    // ── Propriedades e Componentes Publicados (Object Inspector) ─────────────
    var width: int;
    var height: int;
    var title: str;
${declLines.join('\n')}

public:
    // ── Construtor e Inicialização de Tela ────────────────────────────────────
    new() {
        this.title = "${formState.title || formName}";
        this.width = ${formState.width || 640};
        this.height = ${formState.height || 460};
        this._initialized = true;

${initLines.join('\n')}
        println("Formulário " + this.title + " inicializado no Vox Studio.");
    }

${eventFunctionsCode}
}

// ── Ponto de Entrada para Execução Standalone ─────────────────────────────────
public fn main() -> void {
    let app = new ${formName}();
    println("Janela ativa: " + app.title + " [" + str(app.width) + "x" + str(app.height) + "]");
}
`;
  },

  // --------------------------------------------------------------------------
  // Compilador / Gerador de Sistema Web Standalone (HTML5 + CSS + JS + Server)
  // --------------------------------------------------------------------------
  generateWebSystem(formState, voxCode) {
    const formName = formState.name || 'Form1';
    const formTitle = formState.title || formName;
    const width = formState.width || 680;
    const height = formState.height || 480;
    const components = formState.components || [];

    // Localizar componente SQL e Conexão (vox_Query ou TFDQuery)
    const queryComp = components.find(c => c.type === 'vox_Query' || c.type === 'TFDQuery');
    const sqlQuery = (queryComp && queryComp.props && queryComp.props.SQL) ? queryComp.props.SQL : 'SELECT * FROM clientes';

    // 1. Gerar HTML dos Componentes
    let compHtmlList = [];
    components.forEach(comp => {
      // Ignorar componentes não-visuais
      const nonVisual = ['vox_DataSource', 'vox_Connection', 'vox_Query', 'vox_Timer', 'vox_OpenDialog', 'vox_SaveDialog', 'TDataSource', 'TFDConnection', 'TFDQuery'];
      if (nonVisual.includes(comp.type)) return;

      const style = `position: absolute; left: ${comp.left}px; top: ${comp.top}px; width: ${comp.width}px; height: ${comp.height}px;`;

      if (comp.type === 'vox_Button' || comp.type === 'TButton') {
        compHtmlList.push(`
          <button id="${comp.name}" class="web-btn" style="${style}" onclick="app.handleClick('${comp.name}')">
            ${comp.props.Caption || 'Button'}
          </button>
        `);
      } else if (comp.type === 'vox_SpeedButton') {
        compHtmlList.push(`
          <button id="${comp.name}" class="web-btn web-speedbtn" style="${style}" onclick="app.handleClick('${comp.name}')" title="${comp.props.Hint || ''}">
            ${comp.props.Caption || '⚡'}
          </button>
        `);
      } else if (comp.type === 'vox_Edit' || comp.type === 'TEdit') {
        compHtmlList.push(`
          <input type="text" id="${comp.name}" class="web-input" value="${comp.props.Text || ''}" placeholder="${comp.props.Placeholder || ''}" style="${style}">
        `);
      } else if (comp.type === 'vox_Label' || comp.type === 'TLabel') {
        compHtmlList.push(`
          <div id="${comp.name}" class="web-label" style="${style} color: ${comp.props.Color || '#e2e8f0'};">
            ${comp.props.Caption || 'Label'}
          </div>
        `);
      } else if (comp.type === 'vox_CheckBox' || comp.type === 'TCheckBox') {
        compHtmlList.push(`
          <label id="${comp.name}" class="web-checkbox" style="${style}">
            <input type="checkbox" ${comp.props.Checked ? 'checked' : ''}>
            <span>${comp.props.Caption || 'CheckBox'}</span>
          </label>
        `);
      } else if (comp.type === 'vox_RadioButton' || comp.type === 'TRadioButton') {
        compHtmlList.push(`
          <label id="${comp.name}" class="web-radio" style="${style}">
            <input type="radio" name="${comp.props.GroupName || 'grp1'}" ${comp.props.Checked ? 'checked' : ''}>
            <span>${comp.props.Caption || 'RadioButton'}</span>
          </label>
        `);
      } else if (comp.type === 'vox_ComboBox' || comp.type === 'TComboBox') {
        const items = (comp.props.Items || 'Item 1, Item 2, Item 3').split(',').map(i => `<option>${i.trim()}</option>`).join('');
        compHtmlList.push(`
          <select id="${comp.name}" class="web-input" style="${style}">
            ${items}
          </select>
        `);
      } else if (comp.type === 'vox_ListBox' || comp.type === 'TListBox') {
        const items = (comp.props.Items || 'Item 1, Item 2, Item 3').split(',').map(i => `<div class="web-listbox-item">${i.trim()}</div>`).join('');
        compHtmlList.push(`
          <div id="${comp.name}" class="web-listbox" style="${style}">
            ${items}
          </div>
        `);
      } else if (comp.type === 'vox_Memo' || comp.type === 'TMemo') {
        compHtmlList.push(`
          <textarea id="${comp.name}" class="web-input web-memo" style="${style}">${comp.props.Lines || ''}</textarea>
        `);
      } else if (comp.type === 'vox_GroupBox' || comp.type === 'TGroupBox') {
        compHtmlList.push(`
          <fieldset id="${comp.name}" class="web-groupbox" style="${style}">
            <legend>${comp.props.Caption || 'GroupBox'}</legend>
          </fieldset>
        `);
      } else if (comp.type === 'vox_Panel' || comp.type === 'TPanel') {
        compHtmlList.push(`
          <div id="${comp.name}" class="web-panel" style="${style}">
            ${comp.props.Caption || ''}
          </div>
        `);
      } else if (comp.type === 'vox_Image') {
        const bg = comp.props.PictureUrl ? `background-image:url('${comp.props.PictureUrl}'); background-size:cover;` : 'background:#1a202c;';
        compHtmlList.push(`
          <div id="${comp.name}" class="web-image" style="${style} ${bg}">
            ${!comp.props.PictureUrl ? '<span style="font-size:11px; color:#888;">🖼️ Imagem</span>' : ''}
          </div>
        `);
      } else if (comp.type === 'vox_Card') {
        compHtmlList.push(`
          <div id="${comp.name}" class="web-card" style="${style}">
            <div class="web-card-title">${comp.props.Title || 'Card'}</div>
            <div class="web-card-desc">${comp.props.Subtitle || ''}</div>
          </div>
        `);
      } else if (comp.type === 'vox_Badge') {
        compHtmlList.push(`
          <div id="${comp.name}" class="web-badge" style="${style} background:${comp.props.Color || '#22c55e'}; color:${comp.props.TextColor || '#fff'};">
            ${comp.props.Text || 'Badge'}
          </div>
        `);
      } else if (comp.type === 'vox_Switch') {
        compHtmlList.push(`
          <div id="${comp.name}" class="web-switch ${comp.props.Checked ? 'checked' : ''}" style="${style}" onclick="this.classList.toggle('checked')">
            <div class="switch-ball"></div>
          </div>
        `);
      } else if (comp.type === 'vox_ProgressBar') {
        const p = Math.min(100, Math.max(0, comp.props.Position || 50));
        compHtmlList.push(`
          <div id="${comp.name}" class="web-progress" style="${style}">
            <div class="progress-inner" style="width:${p}%; background:${comp.props.Color || '#0078d4'};"></div>
          </div>
        `);
      } else if (comp.type === 'vox_Slider') {
        compHtmlList.push(`
          <input type="range" id="${comp.name}" class="web-slider" min="${comp.props.Min || 0}" max="${comp.props.Max || 100}" value="${comp.props.Value || 50}" style="${style}">
        `);
      } else if (comp.type === 'vox_DatePicker') {
        compHtmlList.push(`
          <input type="date" id="${comp.name}" class="web-input" value="${comp.props.Value || '2026-09-20'}" style="${style}">
        `);
      } else if (comp.type === 'vox_DBGrid' || comp.type === 'TDBGrid') {
        const cols = (comp.props.Columns || 'ID, Nome, Cidade, Saldo').split(',').map(c => c.trim());
        const headerHtml = cols.map(c => `<th>${c}</th>`).join('');
        compHtmlList.push(`
          <div id="${comp.name}" class="web-grid-wrapper" style="${style}">
            <table class="web-table">
              <thead><tr>${headerHtml}</tr></thead>
              <tbody id="grid_body"></tbody>
            </table>
          </div>
        `);
      } else if (comp.type === 'vox_DBNavigator' || comp.type === 'TDBNavigator') {
        compHtmlList.push(`
          <div id="${comp.name}" class="web-navigator" style="${style} display:flex; flex-direction:row;">
            <button onclick="app.navFirst('${comp.name}')" title="Primeiro (|◀)">|◀</button>
            <button onclick="app.navPrior('${comp.name}')" title="Anterior (◀)">◀</button>
            <button onclick="app.navNext('${comp.name}')" title="Próximo (▶)">▶</button>
            <button onclick="app.navLast('${comp.name}')" title="Último (▶|)">▶|</button>
            <button onclick="app.navNew('${comp.name}')" title="Novo (+)" style="color:#22c55e;">➕</button>
            <button onclick="app.navDelete('${comp.name}')" title="Excluir (-)" style="color:#ef4444;">🗑</button>
            <button onclick="app.navEdit('${comp.name}')" title="Editar (✏️)" style="color:#f59e0b;">✏️</button>
            <button onclick="app.navSave('${comp.name}')" title="Salvar (💾)" style="color:#38bdf8;">💾</button>
            <button onclick="app.navCancel('${comp.name}')" title="Cancelar (❌)" style="color:#94a3b8;">❌</button>
            <button onclick="app.loadData('${comp.name}')" title="Atualizar (🔄)" style="color:#a855f7;">🔄</button>
          </div>
        `);
      } else if (comp.type === 'vox_DBEdit' || comp.type === 'TDBEdit') {
        const field = comp.props.DataField || 'nome';
        compHtmlList.push(`
          <input type="text" id="${comp.name}" data-field="${field}" class="web-input web-dbedit" placeholder="[${field}]" style="${style}">
        `);
      } else if (comp.type === 'vox_DBText') {
        const field = comp.props.DataField || 'saldo';
        compHtmlList.push(`
          <div id="${comp.name}" data-field="${field}" class="web-label web-dbtext" style="${style} font-weight:bold; color:#38bdf8;">
            [${field}]
          </div>
        `);
      } else if (comp.type === 'vox_MainMenu' || comp.type === 'TMainMenu') {
        const isLeft = comp.props.Layout === 'Left' || comp.props.MenuType === 'Left';
        const items = (comp.props.Items || 'Cadastros, Vendas, Relatórios, Configurações')
          .split(',')
          .map(i => i.trim())
          .filter(Boolean);
        const title = comp.props.Title || 'Meu Sistema';
        const activeIdx = comp.props.ActiveIndex || 0;

        if (isLeft) {
          const icons = ['📁', '🛒', '📊', '⚙️', '📄', '🏷️', '👥', '📦'];
          let itemsHtml = items.map((item, idx) => `
            <div class="web-sidebar-item ${idx === activeIdx ? 'active' : ''}" onclick="app.handleMenuClick('${item}', ${idx})" title="${item}">
              <span class="sidebar-icon">${icons[idx % icons.length]}</span>
              <span class="sidebar-text">${item}</span>
            </div>
          `).join('');

          compHtmlList.push(`
            <aside id="${comp.name}" class="web-sidebar-menu">
              <div class="web-menu-brand">
                <span class="web-sidebar-toggle-btn" onclick="app.toggleSidebar()" title="Recolher / Expandir Menu">☰</span>
                <span class="web-brand-title">🚀 ${title}</span>
              </div>
              <nav class="web-sidebar-nav">
                ${itemsHtml}
              </nav>
              <div class="web-menu-footer">v1.0 • Vox Web</div>
            </aside>
          `);
        } else {
          let itemsHtml = items.map((item, idx) => `
            <div class="web-topbar-item ${idx === activeIdx ? 'active' : ''}" onclick="app.handleMenuClick('${item}', ${idx})">
              <span>${item}</span>
            </div>
          `).join('');

          compHtmlList.push(`
            <nav id="${comp.name}" class="web-topbar-menu">
              <div class="web-menu-brand">
                <span class="web-topbar-toggle-btn" onclick="app.toggleTopMenu()" title="Menu Mobile">☰</span>
                <span>🚀 ${title}</span>
              </div>
              <div class="web-topbar-items" id="webTopbarItems">
                ${itemsHtml}
              </div>
            </nav>
          `);
        }
      }
    });

    // 2. index.html Completo com Moldura de Janela Delphi e Botão Fechar [X]
    const htmlContent = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${formTitle} — Aplicação Web Vox</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="css/app.css">
</head>
<body>
  <header class="app-header">
    <div class="brand">
      <span class="icon">🪐</span>
      <span class="title">${formTitle}</span>
      <span class="badge">Web System</span>
    </div>
    <div class="header-status">
      <span id="connStatus" class="status-online">● Conectado ao Banco</span>
    </div>
  </header>

  <main class="app-workspace fullscreen-workspace">
    <!-- Janela do Formulário: Preenche toda a janela do Navegador por Padrão -->
    <div class="web-form-window fullscreen-mode" id="webFormWindow">
      <div class="web-form-titlebar" id="webFormTitlebar">
        <div class="web-form-title">
          <span class="web-form-icon"></span>
          <span id="webFormTitleText">${formTitle}</span>
        </div>
        <div class="web-form-sysbuttons">
          <button class="sys-btn" onclick="app.toggleMaximize()" id="btnToggleMaximize" title="Alternar Preencher Navegador / Janela Flutuante">🗖</button>
          <button class="sys-btn close-btn" onclick="app.closeForm()" title="Fechar Formulário">✕</button>
        </div>
      </div>
      <div class="form-canvas" id="webFormCanvas">
        ${compHtmlList.join('\n')}
      </div>
      <!-- Painel exibido quando o formulário é fechado -->
      <div class="web-form-closed-box" id="webFormClosedBox" style="display: none;">
        <div class="closed-content">
          <span style="font-size: 36px;">🪟</span>
          <h3 style="color:#ffffff; margin: 6px 0;">Formulário Encerrado</h3>
          <p style="color:#94a3b8; font-size: 12px;">O formulário <strong>${formTitle}</strong> foi fechado.</p>
          <button class="web-btn" style="padding: 7px 20px; margin-top: 12px; font-weight:600;" onclick="app.reopenForm()">🔄 Reabrir Formulário</button>
        </div>
      </div>
    </div>
  </main>

  <footer class="app-footer">
    <span>Gerado pelo Vox Studio RAD • Executando no Navegador</span>
    <span>Backend Vox & SQLite</span>
  </footer>

  <script src="js/app.js"></script>
</body>
</html>`;

    // 3. css/app.css Completo
    const cssContent = `/* ==============================================================================
   Aplicação Web Gerada pelo Vox Studio RAD
   ============================================================================== */
:root {
  --bg-body: #0d1117;
  --bg-card: #161b22;
  --bg-input: #0b0e14;
  --border-color: #30363d;
  --accent-color: #0078d4;
  --text-main: #f0f6fc;
  --text-muted: #8b949e;
}

* { box-sizing: border-box; margin: 0; padding: 0; }

body {
  font-family: 'Inter', -apple-system, sans-serif;
  background-color: var(--bg-body);
  color: var(--text-main);
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.app-header {
  height: 50px;
  background: var(--bg-card);
  border-bottom: 1px solid var(--border-color);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
}

.brand {
  display: flex;
  align-items: center;
  gap: 10px;
  font-weight: 700;
  font-size: 15px;
}

.badge {
  font-size: 10px;
  background: rgba(0, 120, 212, 0.2);
  color: #4cc2ff;
  padding: 2px 8px;
  border-radius: 12px;
  border: 1px solid #0078d4;
}

.status-online {
  font-size: 11px;
  color: #22c55e;
}

.app-workspace {
  flex: 1;
  display: flex;
  width: 100%;
  height: calc(100vh - 50px - 28px);
  padding: 0;
  margin: 0;
  overflow: hidden;
}

.form-canvas {
  position: relative;
  background: #12161f;
  flex: 1;
  width: 100%;
  height: 100%;
  overflow: auto;
}

/* Controles Web */
.web-btn {
  background: linear-gradient(180deg, #2a3449 0%, #1f2637 100%);
  border: 1px solid var(--border-color);
  color: #ffffff;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
}
.web-btn:hover {
  background: #0078d4;
  border-color: #4cc2ff;
}

.web-input {
  background: var(--bg-input);
  border: 1px solid var(--border-color);
  color: #ffffff;
  border-radius: 4px;
  padding: 0 8px;
  font-size: 12px;
  outline: none;
}
.web-input:focus {
  border-color: var(--accent-color);
}

.web-label {
  color: var(--text-main);
  font-size: 12px;
  display: flex;
  align-items: center;
}

.web-groupbox {
  border: 1px solid var(--border-color);
  border-radius: 4px;
  padding: 8px;
}
.web-groupbox legend {
  padding: 0 6px;
  font-size: 11px;
  color: #4cc2ff;
  font-weight: 600;
}

.web-grid-wrapper {
  background: var(--bg-input);
  border: 1px solid var(--border-color);
  border-radius: 4px;
  overflow-y: auto;
}

.web-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 11.5px;
}
.web-table th {
  background: #212631;
  color: #4cc2ff;
  padding: 6px 8px;
  text-align: left;
  border-bottom: 1px solid var(--border-color);
  position: sticky;
  top: 0;
}
.web-table td {
  padding: 6px 8px;
  border-bottom: 1px solid rgba(255,255,255,0.05);
  color: #c9d1d9;
}
.web-table tr {
  cursor: pointer;
}
.web-table tr:hover {
  background: rgba(0, 120, 212, 0.15);
}
.web-table tr.selected {
  background: #094771;
  color: #ffffff;
}

.web-navigator {
  background: #1c222d;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  display: flex;
}
.web-navigator button {
  flex: 1;
  border: none;
  background: transparent;
  color: var(--text-main);
  cursor: pointer;
  padding: 4px 6px;
  font-size: 11px;
  border-right: 1px solid var(--border-color);
}
.web-navigator button:hover {
  background: #283142;
  color: #4cc2ff;
}

.web-form-window {
  background: var(--bg-card);
  border: none;
  border-radius: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  flex: 1;
  width: 100%;
  height: 100%;
}

.web-form-window.fullscreen-mode {
  width: 100% !important;
  height: 100% !important;
}

.web-form-titlebar {
  height: 32px;
  background: #ffffff;
  border-bottom: 1px solid #d0d7de;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 10px;
  color: #1a1a1a;
  font-size: 12px;
  font-weight: 600;
  user-select: none;
}

.web-form-title {
  display: flex;
  align-items: center;
  gap: 8px;
}

.web-form-icon {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: #d83b01;
  display: inline-block;
}

.web-form-sysbuttons {
  display: flex;
  align-items: center;
}

.sys-btn {
  background: transparent;
  border: none;
  color: #333333;
  width: 28px;
  height: 28px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  transition: background 0.1s;
}

.sys-btn:hover {
  background: #e5e5e5;
}

.sys-btn.close-btn:hover {
  background: #e81123 !important;
  color: #ffffff !important;
}

.web-form-closed-box {
  padding: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #11141a;
  min-height: 250px;
}

.closed-content {
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.app-footer {
  height: 32px;
  background: #0b0e14;
  border-top: 1px solid var(--border-color);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
  font-size: 11px;
  color: var(--text-muted);
}

/* Estilos de Menu Web (vox_MainMenu) */
.web-topbar-menu {
  display: flex;
  align-items: center;
  padding: 0 14px;
  background: #161b22;
  color: #f0f6fc;
  border-bottom: 1px solid var(--border-color);
  box-sizing: border-box;
  z-index: 10;
}

.web-topbar-items {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-left: 16px;
}

.web-topbar-item {
  padding: 5px 12px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  color: #8b949e;
  transition: all 0.15s;
}

.web-topbar-item:hover {
  background: rgba(255, 255, 255, 0.08);
  color: #ffffff;
}

.web-topbar-item.active {
  background: var(--accent-color);
  color: #ffffff;
  font-weight: 600;
}

.web-sidebar-menu {
  display: flex;
  flex-direction: column;
  background: #161b22;
  color: #f0f6fc;
  border-right: 1px solid var(--border-color);
  box-sizing: border-box;
  z-index: 100;
  width: 220px;
  height: 100%;
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  transition: width 0.2s ease, transform 0.3s ease;
}

.web-sidebar-menu.collapsed {
  width: 60px !important;
}

.web-sidebar-menu.collapsed .web-brand-title {
  display: none !important;
}

.web-sidebar-menu.collapsed .sidebar-text {
  display: none !important;
}

.web-sidebar-menu.collapsed .web-menu-footer {
  display: none !important;
}

.web-sidebar-toggle-btn {
  cursor: pointer;
  padding: 4px 8px;
  font-size: 15px;
  border-radius: 3px;
  transition: background 0.15s;
}

.web-sidebar-toggle-btn:hover {
  background: rgba(255, 255, 255, 0.1);
}

.web-topbar-toggle-btn {
  display: none;
  cursor: pointer;
  padding: 2px 6px;
}

@media (max-width: 768px) {
  .web-topbar-toggle-btn {
    display: inline-block !important;
  }
  .web-topbar-items {
    display: none;
    position: absolute;
    top: 44px;
    left: 0;
    right: 0;
    background: #161b22;
    flex-direction: column;
    padding: 8px;
    border-bottom: 1px solid var(--border-color);
    z-index: 1000;
  }
  .web-topbar-items.mobile-open {
    display: flex !important;
  }
  .web-sidebar-menu {
    transform: translateX(-100%);
    width: 240px !important;
  }
  .web-sidebar-menu.mobile-open {
    transform: translateX(0) !important;
    box-shadow: 4px 0 25px rgba(0,0,0,0.8);
  }
}
`;

    // 4. js/app.js Completo
    const jsContent = `// ==============================================================================
// Aplicação Web Client-Side Gerada pelo Vox Studio
// ==============================================================================

class WebAppController {
  constructor() {
    this.records = [];
    this.currentIndex = 0;
    this.init();
  }

  async init() {
    await this.loadData();
  }

  handleMenuClick(item, idx) {
    console.log('[Vox Menu]', item, idx);
    alert('Módulo selecionado: ' + item);
  }

  toggleSidebar() {
    const sidebar = document.querySelector('.web-sidebar-menu');
    if (!sidebar) return;
    if (window.innerWidth <= 768) {
      sidebar.classList.toggle('mobile-open');
    } else {
      sidebar.classList.toggle('collapsed');
    }
  }

  toggleTopMenu() {
    const items = document.getElementById('webTopbarItems');
    if (items) items.classList.toggle('mobile-open');
  }

  toggleMaximize() {
    const win = document.getElementById('webFormWindow');
    if (!win) return;
    win.classList.toggle('fullscreen-mode');
  }

  closeForm() {
    const canvas = document.getElementById('webFormCanvas');
    const closed = document.getElementById('webFormClosedBox');
    if (canvas) canvas.style.display = 'none';
    if (closed) closed.style.display = 'flex';
  }

  reopenForm() {
    const canvas = document.getElementById('webFormCanvas');
    const closed = document.getElementById('webFormClosedBox');
    if (canvas) canvas.style.display = 'block';
    if (closed) closed.style.display = 'none';
  }

  minimizeForm() {
    const canvas = document.getElementById('webFormCanvas');
    if (canvas) canvas.style.display = canvas.style.display === 'none' ? 'block' : 'none';
  }

  maximizeForm() {
    const win = document.getElementById('webFormWindow');
    if (win) win.classList.toggle('maximized');
  }

  async loadData() {
    try {
      const res = await fetch('/api/data');
      const data = await res.json();
      this.records = data.rows || [];
      this.renderGrid();
      if (this.records.length > 0) {
        this.selectRecord(0);
      }
    } catch (e) {
      console.error('Falha ao carregar dados:', e);
    }
  }

  renderGrid() {
    const tbody = document.getElementById('grid_body');
    if (!tbody) return;

    if (this.records.length === 0) {
      tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding:12px; color:#888;">Nenhum registro encontrado.</td></tr>';
      return;
    }

    let rowsHtml = '';
    this.records.forEach((rec, idx) => {
      const isSel = idx === this.currentIndex ? 'class="selected"' : '';
      rowsHtml += \`
        <tr \${isSel} onclick="app.selectRecord(\${idx})">
          <td>\${rec.id}</td>
          <td>\${rec.nome || ''}</td>
          <td>\${rec.cidade || ''}</td>
          <td>R$ \${(parseFloat(rec.saldo) || 0).toFixed(2)}</td>
        </tr>
      \`;
    });
    tbody.innerHTML = rowsHtml;
  }

  selectRecord(idx) {
    if (idx < 0 || idx >= this.records.length) return;
    this.currentIndex = idx;
    const rec = this.records[idx];

    // Atualizar inputs vinculados (vox_DBEdit / TDBEdit)
    document.querySelectorAll('input.web-dbedit').forEach(input => {
      const field = input.dataset.field;
      if (field && rec[field] !== undefined) {
        input.value = rec[field];
      }
    });

    this.renderGrid();
  }

  navFirst() { this.selectRecord(0); }
  navPrior() { this.selectRecord(Math.max(0, this.currentIndex - 1)); }
  navNext() { this.selectRecord(Math.min(this.records.length - 1, this.currentIndex + 1)); }
  navLast() { this.selectRecord(this.records.length - 1); }

  navNew() {
    document.querySelectorAll('input.web-dbedit').forEach(input => input.value = '');
    const firstInput = document.querySelector('input.web-dbedit');
    if (firstInput) firstInput.focus();
  }

  async navDelete() {
    const cur = this.records[this.currentIndex];
    if (!cur || !cur.id) return;
    if (confirm(\`Deseja realmente excluir o registro #\${cur.id} (\${cur.nome})?\`)) {
      await fetch(\`/api/data/\${cur.id}\`, { method: 'DELETE' });
      await this.loadData();
    }
  }

  async navSave() {
    const payload = {};
    document.querySelectorAll('input.web-dbedit').forEach(input => {
      const field = input.dataset.field;
      if (field) payload[field] = input.value;
    });

    const cur = this.records[this.currentIndex];
    const isUpdate = cur && cur.id;

    const url = isUpdate ? \`/api/data/\${cur.id}\` : '/api/data';
    const method = isUpdate ? 'PUT' : 'POST';

    await fetch(url, {
      method: method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    alert('Registro salvo com sucesso!');
    await this.loadData();
  }

  handleClick(btnName) {
    if (btnName === 'Button1' || btnName === 'vox_Button1' || btnName === 'btnSalvar') {
      this.navSave();
    } else {
      alert(\`Botão \${btnName} clicado!\`);
    }
  }
}

window.app = new WebAppController();
`;

    // 5. server.js (Servidor Web Standalone)
    const serverContent = `// ==============================================================================
// Servidor Web Standalone da Aplicação — Gerado pelo Vox Studio
// ==============================================================================

const http = require('http');
const fs = require('fs');
const path = require('path');
const { DatabaseSync } = require('node:sqlite');

const PORT = process.env.PORT || 5000;
const DB_PATH = path.resolve(__dirname, '../../clientes_vox.db');
const PUBLIC_DIR = __dirname;

let db = null;
try {
  if (fs.existsSync(DB_PATH)) {
    db = new DatabaseSync(DB_PATH);
  }
} catch (e) {
  console.log('[SQLite]', e.message);
}

function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*'
  });
  res.end(JSON.stringify(data));
}

function parseBody(req) {
  return new Promise((resolve) => {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try { resolve(JSON.parse(body)); } catch (e) { resolve({}); }
    });
  });
}

const server = http.createServer(async (req, res) => {
  const urlObj = new URL(req.url, \`http://\${req.headers.host || 'localhost'}\`);
  const pathname = urlObj.pathname;

  // GET /api/data (Executa a query do TFDQuery)
  if (pathname === '/api/data' && req.method === 'GET') {
    if (!db) {
      return sendJson(res, 200, { rows: [] });
    }
    const stmt = db.prepare("${sqlQuery.replace(/"/g, '\\"')}");
    const rows = stmt.all();
    return sendJson(res, 200, { rows });
  }

  // POST /api/data (Inserir)
  if (pathname === '/api/data' && req.method === 'POST') {
    const b = await parseBody(req);
    if (db) {
      const stmt = db.prepare("INSERT INTO clientes (nome, email, telefone, cidade, saldo) VALUES (?, ?, ?, ?, ?)");
      stmt.run(b.nome || '', b.email || '', b.telefone || '', b.cidade || '', parseFloat(b.saldo) || 0);
    }
    return sendJson(res, 200, { success: true });
  }

  // PUT /api/data/:id (Atualizar)
  if (pathname.startsWith('/api/data/') && req.method === 'PUT') {
    const id = pathname.split('/').pop();
    const b = await parseBody(req);
    if (db) {
      const stmt = db.prepare("UPDATE clientes SET nome=?, email=?, cidade=?, saldo=? WHERE id=?");
      stmt.run(b.nome, b.email, b.cidade, parseFloat(b.saldo) || 0, id);
    }
    return sendJson(res, 200, { success: true });
  }

  // DELETE /api/data/:id (Excluir)
  if (pathname.startsWith('/api/data/') && req.method === 'DELETE') {
    const id = pathname.split('/').pop();
    if (db) {
      const stmt = db.prepare("DELETE FROM clientes WHERE id=?");
      stmt.run(id);
    }
    return sendJson(res, 200, { success: true });
  }

  // Servir arquivos estáticos
  let filePath = path.join(PUBLIC_DIR, pathname === '/' ? 'index.html' : pathname);
  const ext = path.extname(filePath).toLowerCase();
  const mime = { '.html': 'text/html', '.css': 'text/css', '.js': 'application/javascript' }[ext] || 'text/plain';

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end('Not Found');
    } else {
      res.writeHead(200, { 'Content-Type': mime });
      res.end(data);
    }
  });
});

server.listen(PORT, () => {
  console.log(\`🪐 Aplicação Web Vox rodando em http://localhost:\${PORT}\`);
});
`;

    return {
      htmlContent,
      cssContent,
      jsContent,
      serverContent,
      voxContent: voxCode
    };
  },

  ensureEventHandler(currentCode, handlerName, compName, eventName) {
    if (!currentCode || !currentCode.includes('class ')) {
      currentCode = this.generateVoxCode(window.app.designer.form);
    }

    const methodSig = `pub fn ${handlerName}(`;
    if (currentCode.includes(methodSig) || currentCode.includes(`fn ${handlerName}(`)) {
      return { voxCode: currentCode, created: false };
    }

    const methodBlock = `
    // Tratador de Evento: ${compName} -> ${eventName}
    pub fn ${handlerName}(sender: any) -> void {
        println("Evento ${compName}.${eventName} executado!");
    }
`;

    const lastBraceIndex = currentCode.lastIndexOf('}');
    if (lastBraceIndex !== -1) {
      const newCode = currentCode.slice(0, lastBraceIndex) + methodBlock + currentCode.slice(lastBraceIndex);
      return { voxCode: newCode, created: true };
    }

    return { voxCode: currentCode + '\n' + methodBlock, created: true };
  },

  ensureFormEventHandler(currentCode, handlerName, formName, eventName) {
    if (!currentCode || !currentCode.includes('class ')) {
      currentCode = this.generateVoxCode(window.app.designer.form);
    }

    const methodSig = `pub fn ${handlerName}(`;
    if (currentCode.includes(methodSig) || currentCode.includes(`fn ${handlerName}(`)) {
      return { voxCode: currentCode, created: false };
    }

    const methodBlock = `
    // Tratador de Evento do Formulário: ${formName} -> ${eventName}
    pub fn ${handlerName}(sender: any) -> void {
        println("Evento ${formName}.${eventName} executado!");
    }
`;

    const lastBraceIndex = currentCode.lastIndexOf('}');
    if (lastBraceIndex !== -1) {
      const newCode = currentCode.slice(0, lastBraceIndex) + methodBlock + currentCode.slice(lastBraceIndex);
      return { voxCode: newCode, created: true };
    }

    return { voxCode: currentCode + '\n' + methodBlock, created: true };
  }
};
