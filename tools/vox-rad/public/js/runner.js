// ==============================================================================
// tools/vox-rad/public/js/runner.js — Executor de Telas RAD ao Vivo (F9)
// ==============================================================================

class VoxFormRunner {
  constructor() {
    this.modal = document.getElementById('runModal');
    this.modalTitle = document.getElementById('runModalTitle');
    this.modalBody = document.getElementById('runModalBody');
    this.activeRecords = [];
    this.currentRecordIndex = 0;
  }

  async run(formState) {
    if (!this.modal || !this.modalBody) return;

    this.modalTitle.innerText = `▶ ${formState.title || formState.name} — Running (F9)`;
    this.modalBody.innerHTML = `
      <div style="display: flex; justify-content: center; align-items: center; min-height: 200px; color: #4cc2ff;">
        <span>Carregando dados da aplicação...</span>
      </div>
    `;
    this.modal.style.display = 'flex';

    // Buscar instrução SQL definida no componente vox_Query ou TFDQuery
    let sqlToExecute = 'SELECT * FROM clientes LIMIT 50';
    const queryComp = formState.components.find(c => c.type === 'vox_Query' || c.type === 'TFDQuery');
    if (queryComp && queryComp.props && queryComp.props.SQL) {
      sqlToExecute = queryComp.props.SQL;
    }

    try {
      const res = await fetch('/api/db/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sql: sqlToExecute })
      });
      const data = await res.json();
      this.activeRecords = data.rows || [];
    } catch (e) {
      console.warn('Erro ao consultar SQLite:', e);
      this.activeRecords = [];
    }

    this.renderLiveForm(formState);
  }

  computeAlignments(components, width, height) {
    const nonVisual = [
      'vox_DataSource', 'vox_Connection', 'vox_Query', 'vox_Timer', 'vox_OpenDialog', 'vox_SaveDialog',
      'vox_MemTable', 'vox_Transaction', 'vox_StoredProc', 'vox_SQLScript', 'vox_Table',
      'vox_ActionList', 'vox_PopupMenu', 'vox_RESTClient', 'vox_RESTRequest', 'vox_RESTAdapter',
      'TVoxDataSource', 'TVoxConnection', 'TVoxQuery', 'TVoxTimer', 'TVoxOpenDialog', 'TVoxSaveDialog',
      'TVoxMemTable', 'TVoxTransaction', 'TVoxStoredProc', 'TVoxSQLScript', 'TVoxTable',
      'TVoxActionList', 'TVoxPopupMenu', 'TVoxRESTClient', 'TVoxRESTRequest', 'TVoxRESTAdapter',
      'TDataSource', 'TFDConnection', 'TFDQuery', 'TTimer', 'TOpenDialog', 'TSaveDialog'
    ];
    const isContainer = (type) => {
      return [
        'vox_Panel', 'TPanel', 'TVoxPanel',
        'vox_GroupBox', 'TGroupBox', 'TVoxGroupBox',
        'vox_Card', 'TCard', 'TVoxCard',
        'vox_RadioGroup', 'TRadioGroup', 'TVoxRadioGroup',
        'vox_CheckListGroupBox', 'TCheckListBox', 'TVoxCheckListBox',
        'vox_PageControl', 'TPageControl', 'TVoxPageControl',
        'vox_TabSheet', 'TTabSheet', 'TVoxTabSheet',
        'vox_ScrollBox', 'TScrollBox', 'TVoxScrollBox',
        'vox_ToolBar', 'TToolBar', 'TVoxToolBar',
        'vox_StatusBar', 'TStatusBar', 'TVoxStatusBar',
        'vox_FlowPanel', 'TFlowPanel', 'TVoxFlowPanel',
        'vox_GridPanel', 'TGridPanel', 'TVoxGridPanel',
        'vox_SplitView', 'TSplitView', 'TVoxSplitView'
      ].includes(type);
    };

    const alignGroup = (controls, areaW, areaH) => {
      let clientRect = { left: 0, top: 0, right: areaW, bottom: areaH };
      const mainMenu = controls.find(c => c.type === 'vox_MainMenu');
      if (mainMenu) {
        if (mainMenu.props && mainMenu.props.Layout === 'Left') {
          mainMenu.left = 0; mainMenu.top = 0; mainMenu.width = 180; mainMenu.height = clientRect.bottom;
          clientRect.left = 180;
        } else {
          mainMenu.left = 0; mainMenu.top = 0; mainMenu.width = areaW; mainMenu.height = 38;
          clientRect.top = 38;
        }
      }

      controls.filter(c => c !== mainMenu && c.props && c.props.Align === 'alTop').forEach(c => {
        c.left = clientRect.left; c.top = clientRect.top; c.width = Math.max(20, clientRect.right - clientRect.left);
        clientRect.top += (parseInt(c.height, 10) || 30);
      });

      controls.filter(c => c !== mainMenu && c.props && c.props.Align === 'alBottom').forEach(c => {
        c.left = clientRect.left; c.width = Math.max(20, clientRect.right - clientRect.left);
        const h = parseInt(c.height, 10) || 30; clientRect.bottom -= h;
        c.top = Math.max(clientRect.top, clientRect.bottom);
      });

      controls.filter(c => c !== mainMenu && c.props && c.props.Align === 'alLeft').forEach(c => {
        c.left = clientRect.left; c.top = clientRect.top; c.height = Math.max(20, clientRect.bottom - clientRect.top);
        const w = parseInt(c.width, 10) || 120; clientRect.left += w;
      });

      controls.filter(c => c !== mainMenu && c.props && c.props.Align === 'alRight').forEach(c => {
        c.top = clientRect.top; c.height = Math.max(20, clientRect.bottom - clientRect.top);
        const w = parseInt(c.width, 10) || 120; clientRect.right -= w;
        c.left = Math.max(clientRect.left, clientRect.right);
      });

      controls.filter(c => c !== mainMenu && c.props && c.props.Align === 'alClient').forEach(c => {
        c.left = clientRect.left; c.top = clientRect.top;
        c.width = Math.max(20, clientRect.right - clientRect.left);
        c.height = Math.max(20, clientRect.bottom - clientRect.top);
      });
    };

    const visual = (components || []).filter(c => !nonVisual.includes(c.type));
    const rootComps = visual.filter(c => !c.parent || c.parent === 'Form1');
    alignGroup(rootComps, width, height - 28);

    const getDepth = (c) => {
      let depth = 0;
      let cur = c;
      while (cur && cur.parent && cur.parent !== 'Form1') {
        depth++;
        cur = (components || []).find(x => x.name === cur.parent);
      }
      return depth;
    };

    const containers = visual
      .filter(c => isContainer(c.type))
      .sort((a, b) => getDepth(a) - getDepth(b));

    containers.forEach(cont => {
      const childComps = visual.filter(c => c.parent === cont.name);
      alignGroup(childComps, parseInt(cont.width, 10) || 100, parseInt(cont.height, 10) || 100);
    });
  }

  renderLiveForm(formState) {
    const width = formState.width || 680;
    const height = formState.height || 480;

    const nonVisual = [
      'vox_DataSource', 'vox_Connection', 'vox_Query', 'vox_Timer', 'vox_OpenDialog', 'vox_SaveDialog',
      'vox_MemTable', 'vox_Transaction', 'vox_StoredProc', 'vox_SQLScript', 'vox_Table',
      'vox_ActionList', 'vox_PopupMenu', 'vox_RESTClient', 'vox_RESTRequest', 'vox_RESTAdapter',
      'TVoxDataSource', 'TVoxConnection', 'TVoxQuery', 'TVoxTimer', 'TVoxOpenDialog', 'TVoxSaveDialog',
      'TVoxMemTable', 'TVoxTransaction', 'TVoxStoredProc', 'TVoxSQLScript', 'TVoxTable',
      'TVoxActionList', 'TVoxPopupMenu', 'TVoxRESTClient', 'TVoxRESTRequest', 'TVoxRESTAdapter',
      'TDataSource', 'TFDConnection', 'TFDQuery', 'TTimer', 'TOpenDialog', 'TSaveDialog'
    ];

    const isContainer = (type) => {
      return [
        'vox_Panel', 'TPanel', 'TVoxPanel',
        'vox_GroupBox', 'TGroupBox', 'TVoxGroupBox',
        'vox_Card', 'TCard', 'TVoxCard',
        'vox_RadioGroup', 'TRadioGroup', 'TVoxRadioGroup',
        'vox_CheckListGroupBox', 'TCheckListBox', 'TVoxCheckListBox',
        'vox_PageControl', 'TPageControl', 'TVoxPageControl',
        'vox_TabSheet', 'TTabSheet', 'TVoxTabSheet',
        'vox_ScrollBox', 'TScrollBox', 'TVoxScrollBox',
        'vox_ToolBar', 'TToolBar', 'TVoxToolBar',
        'vox_StatusBar', 'TStatusBar', 'TVoxStatusBar',
        'vox_FlowPanel', 'TFlowPanel', 'TVoxFlowPanel',
        'vox_GridPanel', 'TGridPanel', 'TVoxGridPanel',
        'vox_SplitView', 'TSplitView', 'TVoxSplitView'
      ].includes(type);
    };

    this.currentFormState = formState;

    // Recalcular posições alinhadas (alTop, alBottom, alLeft, alRight, alClient)
    this.computeAlignments(formState.components, width, height);

    const renderLevel = (parentName) => {
      const children = (formState.components || []).filter(c => {
        if (!parentName || parentName === formState.name) {
          return !c.parent || c.parent === formState.name;
        }
        return c.parent === parentName;
      });

      return children.map(comp => {
        if (nonVisual.includes(comp.type)) return '';
        const isTabSheet = (comp.type === 'vox_TabSheet' || comp.type === 'TTabSheet');
        let isTabActive = true;
        if (isTabSheet && comp.parent) {
          const pc = (formState.components || []).find(x => x.name === comp.parent);
          if (pc) {
            const pages = (formState.components || []).filter(x => (x.type === 'vox_TabSheet' || x.type === 'TTabSheet') && x.parent === pc.name);
            const actIdx = parseInt(pc.props.ActivePageIndex, 10) || 0;
            const myIdx = pages.findIndex(x => x.id === comp.id);
            isTabActive = (myIdx === actIdx);
          }
        }

        const style = isTabSheet ? `
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          display: ${isTabActive ? 'block' : 'none'};
        ` : `
          position: absolute;
          left: ${comp.left}px;
          top: ${comp.top}px;
          width: ${comp.width}px;
          height: ${comp.height}px;
        `;
        let innerHtml = this.renderLiveComponent(comp);
        if (isContainer(comp.type)) {
          const childMarkup = renderLevel(comp.name);
          const topOffset = (comp.type === 'vox_PageControl' || comp.type === 'TPageControl') ? '26px' : '0px';
          innerHtml += `<div style="position: absolute; top: ${topOffset}; left: 0; right: 0; bottom: 0; pointer-events: none;"><div style="position: relative; width: 100%; height: 100%; pointer-events: auto;">${childMarkup}</div></div>`;
        }
        return `<div style="${style}">${innerHtml}</div>`;
      }).join('\n');
    };

    let formContent = `
      <div style="
        width: ${width}px;
        height: ${height}px;
        background: #f0f2f5;
        border: 1px solid #738096;
        border-radius: 4px;
        position: relative;
        box-shadow: 0 15px 35px rgba(0,0,0,0.6);
        overflow: hidden;
        display: flex;
        flex-direction: column;
      ">
        <!-- Titlebar da Janela Windows / VCL em Execução com Botão Fechar [✕] -->
        <div style="
          height: 28px; background: #ffffff; border-bottom: 1px solid #d0d7de;
          display: flex; align-items: center; justify-content: space-between;
          padding: 0 8px; color: #1a1a1a; font-size: 12px; font-weight: 500;
        ">
          <div style="display: flex; align-items: center; gap: 6px;">
            <span style="width: 12px; height: 12px; border-radius: 50%; background: #0078d4; display: inline-block;"></span>
            <span>${formState.title || formState.name}</span>
          </div>
          <div style="display: flex; gap: 8px; color: #555; font-size: 11px;">
            <span title="Minimizar">🗕</span>
            <span title="Maximizar">🗖</span>
            <span title="Fechar Janela" style="cursor:pointer; color:#ef4444; font-weight:bold; padding: 0 4px;" onclick="window.app.runner.close()">✕</span>
          </div>
        </div>

        <!-- Área de Controles do Formulário -->
        <div style="position: relative; flex: 1; overflow: hidden; background: #f4f6f8;">
          ${renderLevel(null)}
        </div>
      </div>
    `;

    this.modalBody.innerHTML = `
      <div style="display: flex; flex-direction: column; align-items: center; gap: 14px;">
        ${formContent}
        <div style="display: flex; gap: 10px; width: 100%; max-width: ${width}px; justify-content: space-between; align-items: center;">
          <span style="font-size: 11px; color: #9aa7b8;">
            Executando: ${formState.name} (${formState.components.length} componentes ativos)
          </span>
          <button class="tool-btn" style="background:#282e38; border:1px solid #313947; padding:4px 10px;" onclick="window.app.runner.close()">Fechar Janela (Esc)</button>
        </div>
      </div>
    `;

    this.bindLiveEvents(formState);
  }

  renderLiveComponent(comp) {
    if (comp.type === 'vox_Button' || comp.type === 'TButton') {
      return `
        <button id="live_${comp.id}" class="vcl-button" style="cursor: pointer;">
          ${comp.props.Caption || 'Button1'}
        </button>
      `;
    }

    if (comp.type === 'vox_PageControl' || comp.type === 'TPageControl') {
      const pages = (this.currentFormState && this.currentFormState.components || []).filter(c =>
        (c.type === 'vox_TabSheet' || c.type === 'TTabSheet') && c.parent === comp.name
      );
      const activeIdx = parseInt(comp.props.ActivePageIndex, 10) || 0;
      const tabPos = (comp.props.TabPosition || 'tpTop').toLowerCase();
      const tabsHtml = pages.map((p, idx) => {
        const isActive = idx === activeIdx;
        const caption = (p.props && p.props.Caption) || p.name || `Aba ${idx + 1}`;
        return `
          <div class="vcl-tab-item ${isActive ? 'active' : ''}" onclick="window.app.runner.switchTab('${comp.name}', ${idx})" style="cursor: pointer;">
            <span>${caption}</span>
          </div>
        `;
      }).join('');

      return `
        <div id="live_${comp.id}" class="vcl-pagecontrol tab-pos-${tabPos}">
          <div class="vcl-tab-bar">${tabsHtml}</div>
          <div class="vcl-pagecontrol-body"></div>
        </div>
      `;
    }

    if (comp.type === 'vox_TabSheet' || comp.type === 'TTabSheet') {
      return `
        <div id="live_${comp.id}" class="vcl-tabsheet"></div>
      `;
    }

    if (comp.type === 'vox_Edit' || comp.type === 'TEdit') {
      return `
        <input id="live_${comp.id}" type="text" class="vcl-edit" value="${comp.props.Text || ''}" placeholder="${comp.props.Placeholder || ''}" style="outline: none;">
      `;
    }

    if (comp.type === 'vox_Label' || comp.type === 'TLabel' || comp.type === 'TVoxLabel') {
      const isCustomColor = comp.props.Color && comp.props.Color !== 'inherit' && comp.props.Color !== 'default' && comp.props.Color !== '#1a1a1a';
      const labelColor = isCustomColor ? comp.props.Color : '#1a1a1a';
      return `
        <div class="vcl-label" style="color: ${labelColor}; font-weight: 500;">
          ${comp.props.Caption || 'Label1'}
        </div>
      `;
    }

    if (comp.type === 'vox_DBGrid' || comp.type === 'TDBGrid') {
      const cols = (comp.props.Columns || 'ID, Nome, Cidade, Saldo').split(',').map(c => c.trim());
      const headerHtml = cols.map(c => `<div>${c}</div>`).join('');

      let rowsHtml = '';
      if (this.activeRecords && this.activeRecords.length > 0) {
        this.activeRecords.slice(0, 15).forEach((rec, idx) => {
          rowsHtml += `
            <div class="vcl-dbgrid-row" style="cursor: pointer;" onclick="window.app.runner.selectRecord(${idx})">
              <div>${rec.id}</div>
              <div>${rec.nome || ''}</div>
              <div>${rec.cidade || ''}</div>
              <div>${(rec.saldo || 0).toFixed(2)}</div>
            </div>
          `;
        });
      } else {
        rowsHtml = `<div style="padding: 8px; color: #888;">Nenhum registro encontrado.</div>`;
      }

      return `
        <div class="vcl-dbgrid">
          <div class="vcl-dbgrid-hdr">${headerHtml}</div>
          <div style="flex:1; overflow-y:auto;">${rowsHtml}</div>
        </div>
      `;
    }

    if (comp.type === 'vox_DBNavigator' || comp.type === 'TDBNavigator') {
      return `
        <div class="vcl-dbnav" style="display:flex; flex-direction:row; width:100%; height:100%; box-sizing:border-box;">
          <button class="vcl-dbnav-btn" title="Primeiro (|◀)" onclick="window.app.runner.navBtn('${comp.name}', 'First')">|◀</button>
          <button class="vcl-dbnav-btn" title="Anterior (◀)" onclick="window.app.runner.navBtn('${comp.name}', 'Prior')">◀</button>
          <button class="vcl-dbnav-btn" title="Próximo (▶)" onclick="window.app.runner.navBtn('${comp.name}', 'Next')">▶</button>
          <button class="vcl-dbnav-btn" title="Último (▶|)" onclick="window.app.runner.navBtn('${comp.name}', 'Last')">▶|</button>
          <button class="vcl-dbnav-btn" title="Novo (+)" style="color:#22c55e;" onclick="window.app.runner.navBtn('${comp.name}', 'Insert')">➕</button>
          <button class="vcl-dbnav-btn" title="Excluir (-)" style="color:#ef4444;" onclick="window.app.runner.navBtn('${comp.name}', 'Delete')">🗑</button>
          <button class="vcl-dbnav-btn" title="Editar (✏️)" style="color:#f59e0b;" onclick="window.app.runner.navBtn('${comp.name}', 'Edit')">✏️</button>
          <button class="vcl-dbnav-btn" title="Gravar (💾)" style="color:#38bdf8;" onclick="window.app.runner.navBtn('${comp.name}', 'Post')">💾</button>
          <button class="vcl-dbnav-btn" title="Cancelar (❌)" style="color:#94a3b8;" onclick="window.app.runner.navBtn('${comp.name}', 'Cancel')">❌</button>
          <button class="vcl-dbnav-btn" title="Atualizar (🔄)" style="color:#a855f7;" onclick="window.app.runner.navBtn('${comp.name}', 'Refresh')">🔄</button>
        </div>
      `;
    }

    if (comp.type === 'vox_DBEdit' || comp.type === 'TDBEdit') {
      const field = comp.props.DataField || 'nome';
      const curVal = (this.activeRecords[this.currentRecordIndex] && this.activeRecords[this.currentRecordIndex][field]) || '';
      return `
        <input id="live_${comp.id}" type="text" class="vcl-edit" value="${curVal}" data-field="${field}" style="outline: none; background: #fffcf0;">
      `;
    }

    const meta = window.VOX_COMPONENTS[comp.type];
    return meta ? meta.render(comp) : '';
  }

  bindLiveEvents(formState) {
    // 1. Disparar OnCreate do Formulário se houver breakpoint
    if (formState.events && formState.events.OnCreate && window.app && window.app.debugger) {
      const hitBp = window.app.debugger.handleLiveEvent(formState.name, 'OnCreate', formState.events.OnCreate, {
        sender: formState.name,
        senderType: 'TVoxForm'
      });
      if (hitBp) {
        this.close();
        return;
      }
    }

    // 2. Disparar eventos dos componentes visuais
    formState.components.forEach(comp => {
      // Menu Principal (vox_MainMenu / TVoxMainMenu)
      if (['vox_MainMenu', 'TMainMenu', 'TVoxMainMenu', 'vox_PopupMenu', 'TPopupMenu', 'TVoxPopupMenu'].includes(comp.type)) {
        const rawItems = (comp.props && comp.props.Items !== undefined) ? comp.props.Items : 'Cadastros, Vendas, Relatórios, Configurações';
        const items = (rawItems || '').split(',').map(i => i.trim()).filter(Boolean);
        items.forEach((item, idx) => {
          const cleanItem = item.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9_]/g, '_');
          const evKey = `OnClick_${cleanItem}`;
          const handlerName = (comp.events && (comp.events[evKey] || comp.events[item])) ? (comp.events[evKey] || comp.events[item]) : `${comp.name}_${cleanItem}Click`;

          const menuEls = this.modalBody ? this.modalBody.querySelectorAll('.vcl-menu-top-item, .vcl-menu-sidebar-item') : [];
          menuEls.forEach(el => {
            if (el.innerText && el.innerText.trim().includes(item)) {
              el.style.cursor = 'pointer';
              el.addEventListener('click', (e) => {
                e.stopPropagation();
                if (window.app && window.app.debugger) {
                  const hitBp = window.app.debugger.handleLiveEvent(comp.name, evKey, handlerName, {
                    sender: comp.name,
                    item: item,
                    index: idx
                  });
                  if (hitBp) {
                    this.close();
                    return;
                  }
                }
                alert(`[Evento VCL MainMenu]\n${comp.name}.${handlerName}() acionado para a opção: "${item}".`);
              });
            }
          });
        });
      }

      const btn = document.getElementById(`live_${comp.id}`);
      if (!btn) return;

      btn.addEventListener('click', () => {
        const handlerName = comp.events && comp.events.OnClick ? comp.events.OnClick : `${comp.name}Click`;

        // Interceptação pelo Depurador Delphi
        if (window.app && window.app.debugger) {
          const hitBp = window.app.debugger.handleLiveEvent(comp.name, 'OnClick', handlerName, {
            sender: comp.name,
            senderType: (typeof window !== 'undefined' && window.getVoxClassType) ? window.getVoxClassType(comp.type) : comp.type
          });
          if (hitBp) {
            this.close();
            return;
          }
        }

        alert(`[Evento VCL]\n${comp.name}.${handlerName}() acionado com sucesso.`);
      });
    });
  }

  selectRecord(index) {
    this.currentRecordIndex = index;
    const rec = this.activeRecords[index];
    if (!rec) return;

    document.querySelectorAll('input[data-field]').forEach(input => {
      const field = input.dataset.field;
      if (rec[field] !== undefined) {
        input.value = rec[field];
      }
    });
  }

  navBtn(navName, action) {
    // 1. Disparar evento individual do botão (ex.: OnFirstClick, OnInsertClick)
    const comp = this.currentFormState.components.find(c => c.name === navName);
    const eventName = `On${action}Click`;

    if (comp && comp.events && comp.events[eventName] && window.app && window.app.debugger) {
      const hitBp = window.app.debugger.handleLiveEvent(this.currentFormState.name, eventName, comp.events[eventName], {
        sender: navName,
        senderType: 'vox_DBNavigator',
        action: action
      });
      if (hitBp) {
        this.close();
        return;
      }
    }

    // 2. Disparar OnClick genérico do navegador se existir
    if (comp && comp.events && comp.events.OnClick && window.app && window.app.debugger) {
      window.app.debugger.handleLiveEvent(this.currentFormState.name, 'OnClick', comp.events.OnClick, {
        sender: navName,
        senderType: 'vox_DBNavigator',
        button: action
      });
    }

    // 3. Executar a ação correspondente no DataSet
    this.nav(action.toLowerCase());
  }

  nav(action) {
    if (!this.activeRecords) this.activeRecords = [];

    if (action === 'first') {
      this.currentRecordIndex = 0;
    } else if (action === 'prior') {
      this.currentRecordIndex = Math.max(0, this.currentRecordIndex - 1);
    } else if (action === 'next') {
      this.currentRecordIndex = Math.min(Math.max(0, this.activeRecords.length - 1), this.currentRecordIndex + 1);
    } else if (action === 'last') {
      this.currentRecordIndex = Math.max(0, this.activeRecords.length - 1);
    } else if (action === 'insert' || action === 'new') {
      document.querySelectorAll('input[data-field]').forEach(i => i.value = '');
      const firstInput = document.querySelector('input[data-field]');
      if (firstInput) firstInput.focus();
      if (window.app && window.app.showToast) window.app.showToast('➕ [DBNavigator] Novo registro preparado.');
      return;
    } else if (action === 'edit') {
      const firstInput = document.querySelector('input[data-field]');
      if (firstInput) firstInput.focus();
      if (window.app && window.app.showToast) window.app.showToast('✏️ [DBNavigator] Modo de edição ativo.');
      return;
    } else if (action === 'post' || action === 'save') {
      const newRec = {};
      document.querySelectorAll('input[data-field]').forEach(i => {
        newRec[i.dataset.field] = i.value;
      });
      if (this.currentRecordIndex >= 0 && this.currentRecordIndex < this.activeRecords.length) {
        Object.assign(this.activeRecords[this.currentRecordIndex], newRec);
      } else {
        newRec.id = this.activeRecords.length + 1;
        this.activeRecords.push(newRec);
        this.currentRecordIndex = this.activeRecords.length - 1;
      }
      this.renderGridData();
      if (window.app && window.app.showToast) window.app.showToast('💾 [DBNavigator] Registro gravado com sucesso.');
      return;
    } else if (action === 'cancel') {
      this.selectRecord(this.currentRecordIndex);
      if (window.app && window.app.showToast) window.app.showToast('❌ [DBNavigator] Alterações canceladas.');
      return;
    } else if (action === 'delete') {
      if (this.activeRecords.length > 0 && this.currentRecordIndex >= 0) {
        this.activeRecords.splice(this.currentRecordIndex, 1);
        this.currentRecordIndex = Math.max(0, Math.min(this.currentRecordIndex, this.activeRecords.length - 1));
        this.renderGridData();
        if (window.app && window.app.showToast) window.app.showToast('🗑 [DBNavigator] Registro excluído.');
      }
      return;
    } else if (action === 'refresh') {
      this.loadSQLiteData();
      if (window.app && window.app.showToast) window.app.showToast('🔄 [DBNavigator] Dados atualizados do SQLite.');
      return;
    }

    this.selectRecord(this.currentRecordIndex);
  }

  switchTab(pcName, tabIdx) {
    if (!this.currentFormState) return;
    const pc = (this.currentFormState.components || []).find(c => c.name === pcName);
    if (pc) {
      pc.props.ActivePageIndex = tabIdx;
      this.renderLiveForm(this.currentFormState);
      if (pc.events && pc.events.OnChange) {
        if (window.app && window.app.debugger) {
          window.app.debugger.handleLiveEvent(pc.name, 'OnChange', pc.events.OnChange);
        }
      }
    }
  }

  close() {
    if (this.modal) this.modal.style.display = 'none';
  }
}

window.VoxFormRunner = VoxFormRunner;
