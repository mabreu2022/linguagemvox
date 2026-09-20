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

  renderLiveForm(formState) {
    const width = formState.width || 680;
    const height = formState.height || 480;

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
    `;

    const nonVisual = [
      'vox_DataSource', 'vox_Connection', 'vox_Query', 'vox_Timer', 'vox_OpenDialog', 'vox_SaveDialog',
      'TDataSource', 'TFDConnection', 'TFDQuery'
    ];

    formState.components.forEach(comp => {
      // Ignorar componentes não-visuais
      if (nonVisual.includes(comp.type)) return;

      const style = `
        position: absolute;
        left: ${comp.left}px;
        top: ${comp.top}px;
        width: ${comp.width}px;
        height: ${comp.height}px;
      `;

      formContent += `<div style="${style}">${this.renderLiveComponent(comp)}</div>`;
    });

    formContent += `
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

    if (comp.type === 'vox_Edit' || comp.type === 'TEdit') {
      return `
        <input id="live_${comp.id}" type="text" class="vcl-edit" value="${comp.props.Text || ''}" placeholder="${comp.props.Placeholder || ''}" style="outline: none;">
      `;
    }

    if (comp.type === 'vox_Label' || comp.type === 'TLabel') {
      return `
        <div class="vcl-label" style="color: ${comp.props.Color || '#1a1a1a'};">
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
        senderType: 'TForm'
      });
      if (hitBp) {
        this.close();
        return;
      }
    }

    // 2. Disparar eventos dos componentes visuais
    formState.components.forEach(comp => {
      const btn = document.getElementById(`live_${comp.id}`);
      if (!btn) return;

      btn.addEventListener('click', () => {
        const handlerName = comp.events && comp.events.OnClick ? comp.events.OnClick : `${comp.name}Click`;

        // Interceptação pelo Depurador Delphi
        if (window.app && window.app.debugger) {
          const hitBp = window.app.debugger.handleLiveEvent(comp.name, 'OnClick', handlerName, {
            sender: comp.name,
            senderType: comp.type
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

  close() {
    if (this.modal) this.modal.style.display = 'none';
  }
}

window.VoxFormRunner = VoxFormRunner;
