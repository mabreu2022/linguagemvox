// ==============================================================================
// tools/vox-rad/public/js/app.js — Orquestrador Central Vox Studio (RAD Studio Layout)
// ==============================================================================

class VoxStudioApp {
  constructor() {
    this.currentView = 'designer'; // 'designer' ou 'code'
    this.isDirty = false;
    this.currentTheme = localStorage.getItem('vox_rad_theme') || 'dark';
  }

  init() {
    console.log('Inicializando Vox Studio RAD...');

    const canvas = document.getElementById('delphiFormCanvas');
    const formWindow = document.getElementById('delphiFormWindow');
    this.designer = new VoxDesigner(canvas, formWindow);

    this.inspector = new VoxObjectInspector();

    const editorContainer = document.getElementById('codeView');
    const codeTextarea = document.getElementById('codeTextarea');
    const lineNumbers = document.getElementById('lineNumbers');
    this.editor = new VoxCodeEditor(editorContainer, codeTextarea, lineNumbers);

    this.debugger = new VoxDebugger(this);

    this.runner = new VoxFormRunner();

    this.applyTheme(this.currentTheme);
    this.initPalette();
    this.initBottomTabs();
    this.initKeyboardShortcuts();
    this.initCodeSearch();
    this.initComponentFactory();
    this.initSaveDialogEvents();
    this.checkServerStatus();

    // Carregar template inicial
    this.loadTemplate('crudClientes');
    this.updateStructureTree();
  }

  // --------------------------------------------------------------------------
  // 1. Tool Palette Lateral (Categorias Accordion e Busca)
  // --------------------------------------------------------------------------
  initPalette() {
    const accordion = document.getElementById('paletteAccordion');
    const searchInput = document.getElementById('paletteSearchInput');
    if (!accordion) return;

    // Categorias padrão com ordenação fixa e suporte a categorias dinâmicas (Custom, Dialogs, etc.)
    const defaultOrder = ['Standard', 'Additional', 'Win32', 'Data Access', 'Data Controls', 'Dialogs', 'Custom'];
    const allCats = Array.from(new Set(Object.values(window.VOX_COMPONENTS).map(c => c.category || 'Standard')));
    allCats.sort((a, b) => {
      const ia = defaultOrder.indexOf(a);
      const ib = defaultOrder.indexOf(b);
      if (ia !== -1 && ib !== -1) return ia - ib;
      if (ia !== -1) return -1;
      if (ib !== -1) return 1;
      return a.localeCompare(b);
    });

    const renderPalette = (filter = '') => {
      accordion.innerHTML = '';
      allCats.forEach(cat => {
        const comps = Object.values(window.VOX_COMPONENTS).filter(c => {
          const matchCat = (c.category || 'Standard') === cat;
          const matchFilter = !filter || c.name.toLowerCase().includes(filter.toLowerCase()) || (c.label && c.label.toLowerCase().includes(filter.toLowerCase()));
          return matchCat && matchFilter;
        });

        if (comps.length === 0 && filter) return;
        if (comps.length === 0 && !filter) return;

        const groupDiv = document.createElement('div');
        groupDiv.className = 'palette-group';

        const hdrDiv = document.createElement('div');
        hdrDiv.className = 'palette-group-hdr';
        hdrDiv.innerHTML = `<span class="arrow">▼</span> <span>${cat}</span>`;

        const itemsDiv = document.createElement('div');
        itemsDiv.className = 'palette-group-items';

        comps.forEach(c => {
          const row = document.createElement('div');
          row.className = 'palette-comp-row';
          row.draggable = true;
          row.dataset.type = c.name;
          row.innerHTML = `
            <span>${c.icon || '▫️'}</span>
            <span>${c.name}</span>
          `;

          row.addEventListener('dragstart', (e) => {
            e.dataTransfer.setData('text/plain', c.name);
          });

          row.addEventListener('click', () => {
            this.designer.addComponent(c.name, 40, 40);
          });

          itemsDiv.appendChild(row);
        });

        // Alternar colapso da categoria
        hdrDiv.addEventListener('click', () => {
          const isCollapsed = itemsDiv.style.display === 'none';
          itemsDiv.style.display = isCollapsed ? 'flex' : 'none';
          hdrDiv.querySelector('.arrow').innerText = isCollapsed ? '▼' : '▶';
        });

        groupDiv.appendChild(hdrDiv);
        groupDiv.appendChild(itemsDiv);
        accordion.appendChild(groupDiv);
      });
    };

    renderPalette();

    if (searchInput) {
      searchInput.oninput = (e) => {
        renderPalette(e.target.value);
      };
    }
  }

  // --------------------------------------------------------------------------
  // 2. Structure Tree (Painel Superior Esquerdo)
  // --------------------------------------------------------------------------
  updateStructureTree() {
    const tree = document.getElementById('structureTree');
    if (!tree || !this.designer) return;

    const form = this.designer.form;
    const selected = this.designer.selectedComponent;

    let html = `
      <div class="tree-node ${!selected ? 'selected' : ''}" onclick="window.app.designer.selectComponent(null)">
        <span>🪟</span>
        <span style="font-weight:600;">${form.name}</span>
        <span style="color:#6c7889; font-size:10px;">: T${form.name}</span>
      </div>
    `;

    form.components.forEach(c => {
      const isSel = selected && selected.id === c.id;
      const meta = window.VOX_COMPONENTS[c.type];
      const icon = meta ? meta.icon : '▫️';

      html += `
        <div class="tree-node ${isSel ? 'selected' : ''}" style="padding-left: 20px;" onclick="window.app.selectComponentById('${c.id}')">
          <span>${icon}</span>
          <span>${c.name}</span>
          <span style="color:#6c7889; font-size:10px;">: ${c.type}</span>
        </div>
      `;
    });

    tree.innerHTML = html;
  }

  selectComponentById(id) {
    const comp = this.designer.form.components.find(c => c.id === id);
    if (comp) {
      this.designer.selectComponent(comp);
    }
  }

  // --------------------------------------------------------------------------
  // 3. Abas Inferiores Direitas: [ Code ] [ Design ] [ History ]
  // --------------------------------------------------------------------------
  initBottomTabs() {
    const btnCode = document.getElementById('btnTabCode');
    const btnDesign = document.getElementById('btnTabDesign');
    const btnHistory = document.getElementById('btnTabHistory');

    const designerContainer = document.getElementById('designerContainer');
    const codeView = document.getElementById('codeView');

    const switchView = (view) => {
      this.currentView = view;
      if (view === 'designer') {
        btnDesign.classList.add('active');
        btnCode.classList.remove('active');
        if (btnHistory) btnHistory.classList.remove('active');
        designerContainer.style.display = 'flex';
        codeView.style.display = 'none';
      } else if (view === 'code') {
        btnCode.classList.add('active');
        btnDesign.classList.remove('active');
        if (btnHistory) btnHistory.classList.remove('active');
        designerContainer.style.display = 'none';
        codeView.style.display = 'flex';
        this.syncCodeFromDesigner();
      }
    };

    btnCode.addEventListener('click', () => switchView('code'));
    btnDesign.addEventListener('click', () => switchView('designer'));
    if (btnHistory) {
      btnHistory.addEventListener('click', () => {
        alert('Histórico de versões: Formulário sincronizado com Git/Workspace.');
      });
    }

    this.switchView = switchView;
  }

  toggleDesignCodeView() {
    const nextView = this.currentView === 'designer' ? 'code' : 'designer';
    this.switchView(nextView);
  }

  // --------------------------------------------------------------------------
  // 4. Atalhos Globais (F12, F9, Ctrl+S, Ctrl+F, Ctrl+H, F3, etc.)
  // --------------------------------------------------------------------------
  initKeyboardShortcuts() {
    window.addEventListener('keydown', (e) => {
      if (e.key === 'F12') {
        e.preventDefault();
        this.toggleDesignCodeView();
      } else if (e.key === 'F9') {
        e.preventDefault();
        if (this.debugger && this.debugger.state === 'PAUSED') {
          this.continueDebug();
        } else if (e.ctrlKey) {
          this.runApp();
        } else {
          this.startDebug();
        }
      } else if (e.key === 'F5') {
        e.preventDefault();
        this.toggleBreakpointCurrentLine();
      } else if (e.key === 'F8') {
        e.preventDefault();
        if (e.shiftKey) this.stepOut();
        else this.stepOver();
      } else if (e.key === 'F7') {
        e.preventDefault();
        this.stepInto();
      } else if (e.key === 'F4') {
        e.preventDefault();
        this.runToCursor();
      } else if (e.ctrlKey && e.key === 'F2') {
        e.preventDefault();
        this.stopDebug();
      } else if (e.ctrlKey && e.key === 'F5') {
        e.preventDefault();
        this.openAddWatchModal();
      } else if (e.ctrlKey && e.key.toLowerCase() === 's') {
        e.preventDefault();
        this.saveForm();
      } else if (e.ctrlKey && e.key.toLowerCase() === 'f') {
        e.preventDefault();
        this.openSearch();
      } else if (e.ctrlKey && e.key.toLowerCase() === 'h') {
        e.preventDefault();
        this.openReplace();
      } else if (e.key === 'F3') {
        e.preventDefault();
        if (e.shiftKey) this.findPrev();
        else this.findNext();
      } else if (e.ctrlKey && e.key.toLowerCase() === 'g') {
        e.preventDefault();
        this.gotoLine();
      }
    });
  }

  syncCodeFromDesigner() {
    const generatedVox = window.VoxCodeGen.generateVoxCode(this.designer.form);
    this.editor.setCode(generatedVox);
  }

  onFormChanged() {
    this.isDirty = true;
    if (this.currentView === 'code') {
      this.syncCodeFromDesigner();
    }
    this.updateStructureTree();
  }

  jumpToEvent(comp, eventName) {
    if (!comp) return;

    // Se der duplo-clique em um vox_Query ou TFDQuery, abre direto o SQL Command Editor clássico do Delphi!
    if (comp.type === 'vox_Query' || comp.type === 'TFDQuery') {
      this.openSqlEditor(comp);
      return;
    }

    let handlerName = comp.events && comp.events[eventName];
    if (!handlerName) {
      handlerName = `${comp.name}${eventName.replace('On', '')}`;
      if (!comp.events) comp.events = {};
      comp.events[eventName] = handlerName;
    }

    this.switchView('code');

    const currentCode = this.editor.getCode();
    const result = window.VoxCodeGen.ensureEventHandler(currentCode, handlerName, comp.name, eventName);
    this.editor.setCode(result.voxCode);

    setTimeout(() => {
      this.editor.jumpToMethod(handlerName);
    }, 50);
  }

  // Pular para manipulador de Evento do Formulário Delphi (OnCreate, OnShow, OnClose, etc.)
  jumpToFormEvent(eventName) {
    if (!this.designer || !this.designer.form) return;
    const form = this.designer.form;

    let handlerName = form.events && form.events[eventName];
    if (!handlerName) {
      handlerName = `${form.name}_${eventName}`;
      if (!form.events) form.events = {};
      form.events[eventName] = handlerName;
    }

    this.switchView('code');

    const currentCode = this.editor.getCode();
    const result = window.VoxCodeGen.ensureFormEventHandler(currentCode, handlerName, form.name, eventName);
    this.editor.setCode(result.voxCode);

    setTimeout(() => {
      this.editor.jumpToMethod(handlerName);
    }, 50);

    if (this.inspector) {
      this.inspector.update(null);
    }
  }

  // --------------------------------------------------------------------------
  // 5. Busca e Substituição no Código do Editor Vox (Ctrl+F, F3, Shift+F3, Ctrl+H)
  // --------------------------------------------------------------------------
  initCodeSearch() {
    const searchBar = document.getElementById('codeSearchBar');
    const searchInput = document.getElementById('codeSearchInput');
    if (!searchBar || !searchInput) return;

    this.searchMatches = [];
    this.currentMatchIndex = -1;

    searchInput.addEventListener('input', () => {
      this.performCodeSearch(searchInput.value);
    });

    searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        if (e.shiftKey) {
          this.findPrev();
        } else {
          this.findNext();
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        this.closeSearch();
      }
    });
  }

  openSearch() {
    if (this.currentView !== 'code') {
      this.switchView('code');
    }

    const searchBar = document.getElementById('codeSearchBar');
    const searchInput = document.getElementById('codeSearchInput');
    if (!searchBar || !searchInput) return;

    searchBar.style.display = 'flex';

    const selStart = this.editor.textarea.selectionStart;
    const selEnd = this.editor.textarea.selectionEnd;
    if (selEnd > selStart) {
      const selText = this.editor.textarea.value.substring(selStart, selEnd);
      if (selText.trim() && !selText.includes('\n')) {
        searchInput.value = selText;
      }
    }

    searchInput.focus();
    searchInput.select();
    this.performCodeSearch(searchInput.value);
  }

  closeSearch() {
    const searchBar = document.getElementById('codeSearchBar');
    if (searchBar) searchBar.style.display = 'none';
    this.editor.textarea.focus();
  }

  performCodeSearch(query) {
    const countEl = document.getElementById('codeSearchCount');
    if (!query) {
      this.searchMatches = [];
      this.currentMatchIndex = -1;
      if (countEl) countEl.innerText = '0 / 0';
      return;
    }

    const code = this.editor.getCode();
    const qLower = query.toLowerCase();
    const cLower = code.toLowerCase();
    this.searchMatches = [];

    let pos = 0;
    while ((pos = cLower.indexOf(qLower, pos)) !== -1) {
      this.searchMatches.push({ start: pos, end: pos + query.length });
      pos += query.length;
    }

    if (this.searchMatches.length === 0) {
      this.currentMatchIndex = -1;
      if (countEl) countEl.innerText = '0 / 0';
      return;
    }

    const curPos = this.editor.textarea.selectionStart;
    let nextIdx = this.searchMatches.findIndex(m => m.start >= curPos);
    if (nextIdx === -1) nextIdx = 0;
    this.currentMatchIndex = nextIdx;

    this.highlightMatch(this.currentMatchIndex);
  }

  highlightMatch(index) {
    const countEl = document.getElementById('codeSearchCount');
    if (index < 0 || index >= this.searchMatches.length) {
      if (countEl) countEl.innerText = '0 / 0';
      return;
    }

    const match = this.searchMatches[index];
    this.editor.textarea.focus();
    this.editor.textarea.setSelectionRange(match.start, match.end);

    const codeBefore = this.editor.getCode().substring(0, match.start);
    const line = codeBefore.split('\n').length;
    const lineHeight = 21;
    this.editor.textarea.scrollTop = Math.max(0, (line - 5) * lineHeight);

    if (countEl) {
      countEl.innerText = `${index + 1} / ${this.searchMatches.length}`;
    }
  }

  findNext() {
    if (this.searchMatches.length === 0) {
      const searchInput = document.getElementById('codeSearchInput');
      if (searchInput && searchInput.value) {
        this.performCodeSearch(searchInput.value);
      } else {
        this.openSearch();
        return;
      }
    }
    if (this.searchMatches.length === 0) return;

    this.currentMatchIndex = (this.currentMatchIndex + 1) % this.searchMatches.length;
    this.highlightMatch(this.currentMatchIndex);
  }

  findPrev() {
    if (this.searchMatches.length === 0) {
      const searchInput = document.getElementById('codeSearchInput');
      if (searchInput && searchInput.value) {
        this.performCodeSearch(searchInput.value);
      } else {
        this.openSearch();
        return;
      }
    }
    if (this.searchMatches.length === 0) return;

    this.currentMatchIndex = (this.currentMatchIndex - 1 + this.searchMatches.length) % this.searchMatches.length;
    this.highlightMatch(this.currentMatchIndex);
  }

  openReplace() {
    if (this.currentView !== 'code') {
      this.switchView('code');
    }

    const searchInput = document.getElementById('codeSearchInput');
    const defaultFind = (searchInput && searchInput.value) || '';

    const findStr = prompt('Substituir no Código Vox:\nDigite o termo a localizar:', defaultFind);
    if (!findStr) return;

    const replaceStr = prompt(`Substituir todas as ocorrências de "${findStr}" por:`, '');
    if (replaceStr === null) return;

    const code = this.editor.getCode();
    const count = code.split(findStr).length - 1;
    if (count === 0) {
      alert(`Nenhuma ocorrência de "${findStr}" encontrada.`);
      return;
    }

    const newCode = code.split(findStr).join(replaceStr);
    this.editor.setCode(newCode);
    this.onFormChanged();
    this.showToast(`🔄 ${count} ocorrência(s) substituída(s) com sucesso!`);
  }

  gotoLine() {
    if (this.currentView !== 'code') {
      this.switchView('code');
    }

    const lines = this.editor.getCode().split('\n');
    const lineStr = prompt(`Ir para a linha (1 a ${lines.length}):`, '1');
    if (!lineStr) return;

    const lineNum = parseInt(lineStr, 10);
    if (isNaN(lineNum) || lineNum < 1 || lineNum > lines.length) {
      alert('Número de linha inválido.');
      return;
    }

    let charPos = 0;
    for (let i = 0; i < lineNum - 1; i++) {
      charPos += lines[i].length + 1;
    }

    this.editor.textarea.focus();
    this.editor.textarea.setSelectionRange(charPos, charPos + lines[lineNum - 1].length);
    const lineHeight = 21;
    this.editor.textarea.scrollTop = Math.max(0, (lineNum - 5) * lineHeight);
  }

  // --------------------------------------------------------------------------
  // 6. Refatoração de Código Vox (Refactor Menu)
  // --------------------------------------------------------------------------
  refactorRename() {
    if (this.currentView !== 'code') {
      this.switchView('code');
    }

    const selStart = this.editor.textarea.selectionStart;
    const selEnd = this.editor.textarea.selectionEnd;
    let selectedText = '';
    if (selEnd > selStart) {
      selectedText = this.editor.textarea.value.substring(selStart, selEnd).trim();
    }

    const oldName = prompt('Refatorar / Renomear Símbolo:\nDigite o identificador a renomear:', selectedText);
    if (!oldName || !oldName.trim()) return;

    const newName = prompt(`Renomear "${oldName}" para:`, oldName);
    if (!newName || !newName.trim() || newName === oldName) return;

    const code = this.editor.getCode();
    const regex = new RegExp(`\\b${oldName}\\b`, 'g');
    const matchCount = (code.match(regex) || []).length;

    if (matchCount === 0) {
      alert(`Símbolo "${oldName}" não encontrado no código.`);
      return;
    }

    const newCode = code.replace(regex, newName);
    this.editor.setCode(newCode);
    this.onFormChanged();
    this.showToast(`🏷️ Símbolo renomeado: ${matchCount} ocorrência(s) de "${oldName}" -> "${newName}"`);
  }

  refactorExtractFn() {
    if (this.currentView !== 'code') {
      this.switchView('code');
    }

    const selStart = this.editor.textarea.selectionStart;
    const selEnd = this.editor.textarea.selectionEnd;
    if (selEnd <= selStart) {
      alert('Selecione um bloco de código no Editor Vox para extrair como novo método/função.');
      return;
    }

    const selectedCode = this.editor.textarea.value.substring(selStart, selEnd).trim();
    const fnName = prompt('Nome do novo procedimento / método a extrair:', 'ExecutarAcao');
    if (!fnName || !fnName.trim()) return;

    const cleanFnName = fnName.replace(/[^a-zA-Z0-9_]/g, '');
    const currentCode = this.editor.getCode();

    const callSnippet = `this.${cleanFnName}();`;
    const newMethodSnippet = `
    // Método Extraído via Refactor
    pub fn ${cleanFnName}() -> void {
        ${selectedCode.replace(/\n/g, '\n        ')}
    }
`;

    let updatedCode = currentCode.substring(0, selStart) + callSnippet + currentCode.substring(selEnd);

    const lastBraceIndex = updatedCode.lastIndexOf('}');
    if (lastBraceIndex !== -1) {
      updatedCode = updatedCode.substring(0, lastBraceIndex) + newMethodSnippet + updatedCode.substring(lastBraceIndex);
    } else {
      updatedCode += '\n' + newMethodSnippet;
    }

    this.editor.setCode(updatedCode);
    this.onFormChanged();
    this.showToast(`⚡ Método "${cleanFnName}" extraído com sucesso!`);
  }

  refactorFormat() {
    if (this.currentView !== 'code') {
      this.switchView('code');
    }

    const code = this.editor.getCode();
    const lines = code.split('\n');
    let indentLevel = 0;
    const indentStep = '    ';

    const formattedLines = lines.map(line => {
      const trimmed = line.trim();
      if (!trimmed) return '';

      if (trimmed.startsWith('}') || trimmed.startsWith(']') || trimmed.startsWith(')')) {
        indentLevel = Math.max(0, indentLevel - 1);
      }

      const formatted = indentStep.repeat(indentLevel) + trimmed;

      const openCount = (trimmed.match(/\{/g) || []).length;
      const closeCount = (trimmed.match(/\}/g) || []).length;
      const netBraces = openCount - closeCount;
      if (netBraces > 0 && !trimmed.startsWith('}')) {
        indentLevel += netBraces;
      } else if (netBraces < 0 && !trimmed.startsWith('}')) {
        indentLevel = Math.max(0, indentLevel + netBraces);
      }

      return formatted;
    });

    const formattedCode = formattedLines.join('\n');
    this.editor.setCode(formattedCode);
    this.onFormChanged();
    this.showToast('✨ Código Vox formatado com indentação limpa!');
  }

  refactorAddHandler() {
    const compName = prompt('Nome do componente (Ex: vox_Button1 ou Form1):', 'Form1');
    if (!compName) return;

    const eventName = prompt('Nome do Evento Delphi (Ex: OnClick, OnCreate, OnShow, OnClose):', 'OnClick');
    if (!eventName) return;

    if (compName.toLowerCase() === 'form1' || compName === this.designer.form.name) {
      this.jumpToFormEvent(eventName);
    } else {
      const comp = this.designer.form.components.find(c => c.name.toLowerCase() === compName.toLowerCase());
      if (comp) {
        this.jumpToEvent(comp, eventName);
      } else {
        alert(`Componente "${compName}" não encontrado no formulário.`);
      }
    }
  }

  // --------------------------------------------------------------------------
  // 7. Fábrica de Componentes (Component Factory)
  // --------------------------------------------------------------------------
  initComponentFactory() {
    const modal = document.getElementById('componentFactoryModal');
    if (!modal) return;

    modal.addEventListener('click', (e) => {
      if (e.target === modal) this.closeComponentFactory();
    });
  }

  openComponentFactory() {
    const modal = document.getElementById('componentFactoryModal');
    if (!modal) return;

    modal.style.display = 'flex';
    this.updateCfPreview();

    const nameInput = document.getElementById('cfNameInput');
    if (nameInput) {
      setTimeout(() => {
        nameInput.focus();
        nameInput.select();
      }, 50);
    }
  }

  closeComponentFactory() {
    const modal = document.getElementById('componentFactoryModal');
    if (modal) modal.style.display = 'none';
  }

  updateCfPreview() {
    const nameInput = document.getElementById('cfNameInput');
    const baseInput = document.getElementById('cfBaseInput');
    const propNameInput = document.getElementById('cfPropNameInput');
    const propValInput = document.getElementById('cfPropValInput');
    const previewEl = document.getElementById('cfCodePreview');

    let compName = (nameInput && nameInput.value.trim()) || 'vox_CardDestaque';
    if (!compName.startsWith('vox_')) {
      compName = 'vox_' + compName.replace(/[^a-zA-Z0-9_]/g, '');
    }

    const baseName = (baseInput && baseInput.value) || 'vox_Panel';
    const propName = (propNameInput && propNameInput.value.trim()) || 'Titulo';
    const propVal = (propValInput && propValInput.value.trim()) || 'Item em Destaque';

    if (previewEl) {
      previewEl.innerText = `classe ${compName} herda ${baseName} {
    var ${propName}: Texto

    procedimento Inicializar() {
        this.${propName} = "${propVal}"
    }

    procedimento Renderizar() {
        // Renderização nativa do componente customizado
        println("Componente ${compName} renderizado.");
    }
}`;
    }
  }

  createCustomComponent() {
    const nameInput = document.getElementById('cfNameInput');
    const categoryInput = document.getElementById('cfCategoryInput');
    const baseInput = document.getElementById('cfBaseInput');
    const iconInput = document.getElementById('cfIconInput');
    const propNameInput = document.getElementById('cfPropNameInput');
    const propValInput = document.getElementById('cfPropValInput');
    const statusEl = document.getElementById('cfStatus');

    let compName = (nameInput && nameInput.value.trim()) || 'vox_CustomWidget';
    if (!compName.startsWith('vox_')) {
      compName = 'vox_' + compName.replace(/[^a-zA-Z0-9_]/g, '');
    }

    const category = (categoryInput && categoryInput.value) || 'Custom';
    const baseName = (baseInput && baseInput.value) || 'vox_Panel';
    const icon = (iconInput && iconInput.value) || '📦';
    const propName = (propNameInput && propNameInput.value.trim()) || 'Titulo';
    const propVal = (propValInput && propValInput.value.trim()) || 'Valor';

    const baseMeta = window.VOX_COMPONENTS[baseName];

    const customCompDef = {
      name: compName,
      category: category,
      label: compName,
      icon: icon,
      defaultWidth: baseMeta ? baseMeta.defaultWidth : 140,
      defaultHeight: baseMeta ? baseMeta.defaultHeight : 50,
      defaultProps: {
        ...(baseMeta ? baseMeta.defaultProps : {}),
        [propName]: propVal
      },
      events: baseMeta ? [...baseMeta.events] : ['OnClick', 'OnDblClick'],
      render(comp) {
        return `
          <div class="vcl-panel vcl-card" style="display:flex; flex-direction:column; justify-content:center; align-items:center; border: 1px dashed #0078d4; background: rgba(0,120,212,0.06); border-radius: 4px; padding: 6px; box-sizing: border-box; width: 100%; height: 100%;">
            <div style="font-weight: 600; font-size: 11px; color: #4cc2ff; display: flex; align-items: center; gap: 4px;">
              <span>${icon}</span>
              <span>${comp.props[propName] || compName}</span>
            </div>
            <span style="font-size: 9px; color: #8b949e;">${compName}</span>
          </div>
        `;
      }
    };

    const success = window.registerCustomComponent(customCompDef);
    if (success) {
      if (statusEl) {
        statusEl.innerHTML = `<span style="color:#22c55e;">✅ Componente ${compName} criado e instalado na paleta!</span>`;
      }

      this.initPalette();
      this.showToast(`🏭 Componente ${compName} criado com sucesso na Paleta [${category}]!`);

      setTimeout(() => {
        this.closeComponentFactory();
        if (statusEl) statusEl.innerText = '';
      }, 1000);
    }
  }

  // --------------------------------------------------------------------------
  // 8. Menus e Ações Auxiliares
  // --------------------------------------------------------------------------
  selectAll() {
    if (this.currentView === 'code') {
      this.editor.textarea.focus();
      this.editor.textarea.select();
    } else {
      if (this.designer && this.designer.form.components.length > 0) {
        this.designer.selectComponent(this.designer.form.components[0]);
      }
    }
  }

  showProjectOptions() {
    alert(`[Opções do Projeto Vox RAD]\n\n• Projeto: Project1\n• Plataforma Alvo: Aplicação Web Standalone (Navegador)\n• Servidor Web: Node.js HTTP/REST na Porta 5000\n• Banco de Dados: SQLite3 (app.db)\n• Linguagem: Vox Language Compiler & Runtime\n• Nomenclatura: vox_* Standard`);
  }

  showAbout() {
    alert(`[Vox Studio RAD — Web Edition]\n\nAmbiente de Desenvolvimento Rápido de Aplicações para a Linguagem Vox.\n\n• Padrão de Componentes: vox_* (vox_Connection, vox_DataSource, vox_Query, vox_Button, etc.)\n• Designer Visual com Redimensionamento e Esticamento ao Vivo\n• Eventos Oficiais do Form Delphi (OnCreate, OnShow, OnClose, etc.)\n• Editor com Busca (Ctrl+F) e Refatoração de Código\n• Fábrica de Componentes Extensível\n• Compilação Web Standalone com Janela Delphi e Botão Fechar [✕]`);
  }

  showToast(msg) {
    const sb = document.getElementById('sbServerStatus');
    if (sb) {
      const prev = sb.innerText;
      const prevColor = sb.style.color;
      sb.innerText = msg;
      sb.style.color = '#38bdf8';
      setTimeout(() => {
        sb.innerText = prev;
        sb.style.color = prevColor;
      }, 4000);
    }
    console.log('[Toast]', msg);
  }

  log(msg) {
    console.log('[Vox Studio]', msg);
  }

  // --------------------------------------------------------------------------
  // Alternância de Temas (Dark Mode / Light Mode)
  // --------------------------------------------------------------------------
  applyTheme(theme) {
    this.currentTheme = theme;
    try {
      localStorage.setItem('vox_rad_theme', theme);
    } catch (e) {}

    const isLight = theme === 'light';
    if (isLight) {
      document.body.classList.add('theme-light');
      document.documentElement.setAttribute('data-theme', 'light');
    } else {
      document.body.classList.remove('theme-light');
      document.documentElement.setAttribute('data-theme', 'dark');
    }

    // Atualizar labels e ícones na interface
    const themeIcon = document.getElementById('themeIcon');
    const themeText = document.getElementById('themeText');
    const btnThemeToggle = document.getElementById('btnThemeToggle');
    const menuThemeIcon = document.getElementById('menuThemeIcon');
    const menuThemeText = document.getElementById('menuThemeText');
    const sbThemeToggle = document.getElementById('sbThemeToggle');

    if (themeIcon) themeIcon.innerText = isLight ? '🌙' : '☀️';
    if (themeText) themeText.innerText = isLight ? 'Modo Escuro' : 'Modo Claro';
    if (btnThemeToggle) btnThemeToggle.title = isLight ? 'Alternar para Modo Escuro (Dark Theme)' : 'Alternar para Modo Claro (Light Theme)';
    if (menuThemeIcon) menuThemeIcon.innerText = isLight ? '🌙' : '☀️';
    if (menuThemeText) menuThemeText.innerText = isLight ? 'Modo Escuro (Dark Mode)' : 'Modo Claro (Light Mode)';
    if (sbThemeToggle) sbThemeToggle.innerText = isLight ? '🎨 Tema: Claro' : '🎨 Tema: Escuro';
  }

  toggleTheme() {
    const nextTheme = this.currentTheme === 'dark' ? 'light' : 'dark';
    this.applyTheme(nextTheme);
    this.showToast(`🎨 Modo ${nextTheme === 'light' ? 'Claro (Light Mode)' : 'Escuro (Dark Mode)'} ativado!`);
  }

  // --------------------------------------------------------------------------
  // 9. Delphi SQL Command Editor Modal
  // --------------------------------------------------------------------------
  openSqlEditor(comp) {
    if (!comp) {
      comp = this.designer.form.components.find(c => c.type === 'vox_Query' || c.type === 'TFDQuery');
      if (!comp) {
        alert('Nenhum componente vox_Query encontrado no formulário. Adicione um vox_Query pela paleta Data Access para editar consultas SQL.');
        return;
      }
    }
    this.editingSqlComp = comp;
    const modal = document.getElementById('sqlEditorModal');
    const textarea = document.getElementById('sqlEditorTextarea');
    const title = document.getElementById('sqlEditorTitle');
    const status = document.getElementById('sqlTestStatus');
    const result = document.getElementById('sqlTestResult');

    if (title) title.innerText = `${comp.name}: vox_Query — SQL Command Editor`;
    if (textarea) textarea.value = comp.props.SQL || 'SELECT * FROM clientes';
    if (status) status.innerText = '';
    if (result) result.innerHTML = '<span style="color: #6c7889;">Clique em "Testar / Executar Consulta" para verificar a sintaxe e dados.</span>';

    if (modal) modal.style.display = 'flex';
  }

  closeSqlEditor() {
    const modal = document.getElementById('sqlEditorModal');
    if (modal) modal.style.display = 'none';
  }

  applySqlEditor() {
    const textarea = document.getElementById('sqlEditorTextarea');
    if (this.editingSqlComp && textarea) {
      this.editingSqlComp.props.SQL = textarea.value.trim();
      this.inspector.update(this.editingSqlComp);
      this.onFormChanged();
    }
    this.closeSqlEditor();
  }

  async testQuerySql() {
    const textarea = document.getElementById('sqlEditorTextarea');
    const status = document.getElementById('sqlTestStatus');
    const result = document.getElementById('sqlTestResult');
    if (!textarea || !result) return;

    const sql = textarea.value.trim();
    if (!sql) return;

    if (status) status.innerText = 'Executando no SQLite...';

    try {
      const res = await fetch('/api/db/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sql })
      });
      const data = await res.json();

      if (data.error) {
        if (status) status.innerText = '❌ Erro de Sintaxe SQL';
        result.innerHTML = `<span style="color:#ef4444;">${data.error}</span>`;
        return;
      }

      const rows = data.rows || [];
      if (status) status.innerText = `✅ Sucesso: ${rows.length} registros retornados.`;

      if (rows.length === 0) {
        result.innerHTML = '<span style="color:#9aa7b8;">Consulta executada com sucesso. Nenhum registro retornado.</span>';
        return;
      }

      // Renderizar mini grid de teste
      const cols = Object.keys(rows[0]);
      let tableHtml = '<table style="width:100%; border-collapse:collapse; font-size:11px;">';
      tableHtml += '<tr style="background:#1e242f; color:#00e5ff; font-weight:bold;">';
      cols.forEach(c => { tableHtml += `<th style="padding:3px 6px; border:1px solid #282f3a; text-align:left;">${c}</th>`; });
      tableHtml += '</tr>';

      rows.slice(0, 5).forEach(r => {
        tableHtml += '<tr style="border-bottom:1px solid #232833;">';
        cols.forEach(c => { tableHtml += `<td style="padding:3px 6px; border:1px solid #232833; color:#e2e8f0;">${r[c]}</td>`; });
        tableHtml += '</tr>';
      });
      tableHtml += '</table>';
      if (rows.length > 5) {
        tableHtml += `<div style="font-size:10px; color:#6c7889; padding:2px;">Mostrando os primeiros 5 de ${rows.length} registros.</div>`;
      }

      result.innerHTML = tableHtml;
    } catch (e) {
      if (status) status.innerText = '❌ Falha de Rede';
      result.innerHTML = `<span style="color:#ef4444;">${e.message}</span>`;
    }
  }

  newForm() {
    this.openNewProjectModal();
  }

  newProject() {
    this.openNewProjectModal();
  }

  openNewProjectModal() {
    const modal = document.getElementById('newProjectModal');
    if (!modal) return;
    this.selectedNewProjMenu = 'Top';
    this.selectNewProjOption('Top');
    modal.style.display = 'flex';
  }

  closeNewProjectModal() {
    const modal = document.getElementById('newProjectModal');
    if (modal) modal.style.display = 'none';
  }

  selectNewProjOption(type) {
    this.selectedNewProjMenu = type;
    const optTop = document.getElementById('optMenuTop');
    const optLeft = document.getElementById('optMenuLeft');
    if (optTop && optLeft) {
      if (type === 'Top') {
        optTop.classList.add('selected');
        optLeft.classList.remove('selected');
      } else {
        optLeft.classList.add('selected');
        optTop.classList.remove('selected');
      }
    }
  }

  confirmCreateNewProject() {
    this.createNewFormWithMenu(this.selectedNewProjMenu || 'Top');
  }

  createNewFormWithMenu(menuType) {
    this.closeNewProjectModal();

    const formWidth = 720;
    const formHeight = 500;
    const components = [];

    if (menuType === 'Top') {
      components.push({
        id: 'comp_menu_' + Date.now(),
        name: 'vox_MainMenu1',
        type: 'vox_MainMenu',
        left: 0,
        top: 0,
        width: formWidth,
        height: 40,
        props: {
          Layout: 'Top',
          Title: 'Meu Sistema',
          Items: 'Cadastros, Vendas, Relatórios, Configurações'
        }
      });
    } else if (menuType === 'Left') {
      components.push({
        id: 'comp_menu_' + Date.now(),
        name: 'vox_MainMenu1',
        type: 'vox_MainMenu',
        left: 0,
        top: 0,
        width: 180,
        height: formHeight,
        props: {
          Layout: 'Left',
          Title: 'Meu Sistema',
          Items: 'Dashboard, Clientes, Vendas, Relatórios, Ajustes'
        }
      });
    }

    this.designer.form = {
      name: 'Form1',
      title: 'Form1',
      width: formWidth,
      height: formHeight,
      components: components
    };

    this.designer.selectedComponent = components.length > 0 ? components[0] : null;
    this.designer.renderForm();
    this.inspector.update(this.designer.selectedComponent);
    this.updateStructureTree();
    this.syncCodeFromDesigner();

    const desc = menuType === 'Top' ? 'Menu Horizontal no Topo' : (menuType === 'Left' ? 'Menu Lateral à Esquerda' : 'em Branco');
    this.showToast(`✨ Novo Projeto criado com ${desc}!`);
  }

  saveAll() {
    this.saveForm();
  }

  closeFormWindow() {
    if (confirm('Deseja fechar o formulário corrente? Alterações não salvas serão perdidas.')) {
      this.createNewFormWithMenu('None');
    }
  }

  editUndo() {
    if (this.currentView === 'code') {
      document.execCommand('undo');
    } else {
      this.showToast('↩️ Desfazer (Undo)');
    }
  }

  editRedo() {
    if (this.currentView === 'code') {
      document.execCommand('redo');
    } else {
      this.showToast('↪️ Refazer (Redo)');
    }
  }

  loadTemplate(templateKey) {
    const tmpl = window.VOX_TEMPLATES[templateKey];
    if (!tmpl) return;

    this.designer.form = JSON.parse(JSON.stringify(tmpl));
    this.designer.selectedComponent = null;
    this.designer.renderForm();
    this.inspector.update(null);
    this.updateStructureTree();
    this.syncCodeFromDesigner();
  }

  // --------------------------------------------------------------------------
  // 5. Diálogo de Salvamento Padrão RAD Studio (Save Unit As)
  // --------------------------------------------------------------------------
  initSaveDialogEvents() {
    const unitInput = document.getElementById('saveUnitNameInput');
    const folderInput = document.getElementById('saveFolderPathInput');

    if (unitInput) {
      unitInput.addEventListener('input', () => this.updateSavePreview());
      unitInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          this.confirmSaveForm();
        } else if (e.key === 'Escape') {
          e.preventDefault();
          this.closeSaveDialog();
        }
      });
    }

    if (folderInput) {
      folderInput.addEventListener('input', () => {
        this.highlightFolderButton(folderInput.value.trim());
        this.updateSavePreview();
      });
      folderInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          this.confirmSaveForm();
        } else if (e.key === 'Escape') {
          e.preventDefault();
          this.closeSaveDialog();
        }
      });
    }
  }

  saveForm() {
    this.openSaveDialog();
  }

  async openSaveDialog() {
    const modal = document.getElementById('saveDialogModal');
    const unitInput = document.getElementById('saveUnitNameInput');
    const folderInput = document.getElementById('saveFolderPathInput');
    const statusEl = document.getElementById('saveDialogStatus');

    if (!modal) return;
    if (statusEl) statusEl.innerText = '';

    // Nome atual do form / unit
    const curName = (this.designer && this.designer.form && this.designer.form.name) || 'Unit1';
    if (unitInput) unitInput.value = curName;

    // Pasta padrão (forms) ou a última utilizada
    const curFolder = this.lastSavedFolder || 'forms';
    if (folderInput) folderInput.value = curFolder;
    this.highlightFolderButton(curFolder);

    // Carregar informações do projeto
    try {
      const res = await fetch('/api/project/folders');
      const data = await res.json();
      if (data && data.workspace) {
        const rootEl = document.getElementById('saveDialogProjectRoot');
        if (rootEl) rootEl.innerText = data.workspace;
      }
    } catch (e) {
      console.warn('Erro ao obter pastas do projeto:', e);
    }

    this.updateSavePreview();
    modal.style.display = 'flex';

    setTimeout(() => {
      if (unitInput) {
        unitInput.focus();
        unitInput.select();
      }
    }, 50);
  }

  closeSaveDialog() {
    const modal = document.getElementById('saveDialogModal');
    if (modal) modal.style.display = 'none';
  }

  selectSaveFolder(folder) {
    const folderInput = document.getElementById('saveFolderPathInput');
    if (folderInput) folderInput.value = folder;
    this.highlightFolderButton(folder);
    this.updateSavePreview();
  }

  highlightFolderButton(folder) {
    document.querySelectorAll('#saveFolderOptions .save-folder-btn').forEach(btn => {
      if (btn.dataset.folder === folder) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });
  }

  updateSavePreview() {
    const unitInput = document.getElementById('saveUnitNameInput');
    const folderInput = document.getElementById('saveFolderPathInput');
    const previewVxf = document.getElementById('savePreviewVxf');
    const previewVox = document.getElementById('savePreviewVox');

    let folder = (folderInput && folderInput.value.trim()) || 'forms';
    let name = (unitInput && unitInput.value.trim()) || 'Unit1';
    name = name.replace(/[^a-zA-Z0-9_]/g, '') || 'Unit1';

    const cleanFolder = (folder === '.' || folder === './') ? '' : (folder.endsWith('/') ? folder : folder + '/');

    if (previewVxf) previewVxf.innerText = `${cleanFolder}${name}.vxf`;
    if (previewVox) previewVox.innerText = `${cleanFolder}${name}.vox`;
  }

  async confirmSaveForm() {
    const unitInput = document.getElementById('saveUnitNameInput');
    const folderInput = document.getElementById('saveFolderPathInput');
    const statusEl = document.getElementById('saveDialogStatus');

    let folder = (folderInput && folderInput.value.trim()) || 'forms';
    let rawName = (unitInput && unitInput.value.trim()) || 'Unit1';
    const safeName = rawName.replace(/[^a-zA-Z0-9_]/g, '');

    if (!safeName) {
      if (statusEl) statusEl.innerHTML = '<span style="color:#ef4444;">Nome da Unit inválido!</span>';
      return;
    }

    if (statusEl) statusEl.innerHTML = '<span style="color:#4cc2ff;">Salvando no projeto...</span>';

    try {
      const vxfContent = this.designer.form;
      const voxContent = this.editor.getCode() || window.VoxCodeGen.generateVoxCode(this.designer.form);

      const res = await fetch('/api/form/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          formName: safeName,
          folder: folder,
          vxfContent: vxfContent,
          voxContent: voxContent
        })
      });

      const data = await res.json();
      if (data.success) {
        this.isDirty = false;
        this.lastSavedFolder = data.folder;

        // Atualizar formulário
        this.designer.form.name = data.formName;
        this.designer.form.title = data.formName;
        const titleEl = document.getElementById('formTitleText');
        if (titleEl) titleEl.innerText = data.formName;

        // Atualizar título da aba superior
        const docTab = document.getElementById('docTabTitle');
        if (docTab) docTab.innerText = `${data.formName}.vox`;

        // Atualizar árvore de projetos
        const projUnit = document.getElementById('projTreeUnitName');
        if (projUnit) projUnit.innerText = `${data.formName}.vox`;
        const projVxf = document.getElementById('projTreeVxfName');
        if (projVxf) projVxf.innerText = `${data.formName}.vxf`;

        // Atualizar barra de status
        const sbStatus = document.getElementById('sbFormStatus');
        if (sbStatus) {
          sbStatus.innerText = `${data.formName} [${this.designer.form.width} x ${this.designer.form.height}]`;
        }

        // Atualizar Object Inspector se estiver inspecionando o form
        if (this.inspector) {
          this.inspector.update(this.designer.selectedComponent);
        }
        this.updateStructureTree();

        // Fechar diálogo
        this.closeSaveDialog();

        // Feedback visual na status bar
        const sbServer = document.getElementById('sbServerStatus');
        if (sbServer) {
          const original = sbServer.innerText;
          sbServer.innerText = `💾 Salvo com sucesso em: ${data.voxRel}`;
          sbServer.style.color = '#38bdf8';
          setTimeout(() => {
            sbServer.innerText = original;
            sbServer.style.color = '#22c55e';
          }, 4000);
        }
      } else {
        if (statusEl) statusEl.innerHTML = `<span style="color:#ef4444;">${data.error || 'Falha ao salvar'}</span>`;
      }
    } catch (e) {
      if (statusEl) statusEl.innerHTML = `<span style="color:#ef4444;">${e.message}</span>`;
    }
  }

  async buildWebApp() {
    try {
      const voxCode = this.editor.getCode() || window.VoxCodeGen.generateVoxCode(this.designer.form);
      const webPkg = window.VoxCodeGen.generateWebSystem(this.designer.form, voxCode);

      const res = await fetch('/api/vox/build-web', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          formState: this.designer.form,
          ...webPkg
        })
      });

      const data = await res.json();
      if (data.success) {
        const modal = document.getElementById('webBuildModal');
        const iframe = document.getElementById('webAppIframe');
        const stats = document.getElementById('webBuildStats');

        if (stats) {
          stats.innerText = `Compilado com sucesso em: dist/web-app/ • Servidor rodando em: ${data.url}`;
        }

        if (iframe) {
          iframe.src = data.internalUrl + '?t=' + Date.now();
        }

        if (modal) modal.style.display = 'flex';
      } else {
        alert('Erro ao compilar aplicação web: ' + data.error);
      }
    } catch (e) {
      alert('Falha ao compilar para web: ' + e.message);
    }
  }

  openExternalBrowser() {
    fetch('/api/web-app/open', { method: 'POST' });
    window.open('http://localhost:5000', '_blank');
  }

  closeWebBuildModal() {
    const modal = document.getElementById('webBuildModal');
    if (modal) modal.style.display = 'none';
  }

  runApp() {
    // Compila e executa o sistema Web diretamente no browser!
    this.buildWebApp();
  }

  // --------------------------------------------------------------------------
  // Métodos de Controle do Depurador Delphi (Run, Step Over, Step Into, BP, Watches)
  // --------------------------------------------------------------------------
  startDebug() {
    if (this.debugger) this.debugger.startDebug();
  }

  stepOver() {
    if (this.debugger) this.debugger.stepOver();
  }

  stepInto() {
    if (this.debugger) this.debugger.stepInto();
  }

  stepOut() {
    if (this.debugger) this.debugger.stepOut();
  }

  runToCursor() {
    if (this.debugger) this.debugger.runToCursor();
  }

  continueDebug() {
    if (this.debugger) this.debugger.continueExecution();
  }

  pauseDebug() {
    if (this.debugger) {
      this.debugger.state = 'PAUSED';
      this.debugger.logConsole('⏸ Depuração pausada pelo usuário.', 'warn');
      this.debugger.updateToolbarState();
    }
  }

  stopDebug() {
    if (this.debugger) this.debugger.stop();
  }

  toggleBreakpointCurrentLine() {
    if (this.debugger) this.debugger.toggleBreakpointCurrentLine();
  }

  clearAllBreakpoints() {
    if (this.debugger) this.debugger.clearAllBreakpoints();
  }

  toggleDebugPanel() {
    if (this.debugger) this.debugger.toggleDebugDock();
  }

  openAddWatchModal() {
    if (this.debugger) {
      this.debugger.showDebugDock();
      this.debugger.switchDebugTab('watches');
      setTimeout(() => {
        const inp = document.getElementById('inputNewWatch');
        if (inp) {
          inp.focus();
          inp.select();
        }
      }, 50);
    }
  }

  async runBackend() {
    try {
      const code = this.editor.getCode() || window.VoxCodeGen.generateVoxCode(this.designer.form);
      const res = await fetch('/api/vox/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          formName: this.designer.form.name,
          code: code
        })
      });

      const data = await res.json();
      alert(`[Vox CLI]\nStatus: ${data.success ? 'Compilado com Sucesso!' : 'Aviso/Erro'}\n${data.stdout || data.stderr || ''}`);
    } catch (e) {
      alert(`Erro ao executar CLI: ${e.message}`);
    }
  }

  async checkServerStatus() {
    try {
      const res = await fetch('/api/status');
      const data = await res.json();
      const statusEl = document.getElementById('sbServerStatus');
      if (statusEl) {
        statusEl.innerText = `● Servidor Vox Online (v${data.version})`;
      }
    } catch (e) {
      const statusEl = document.getElementById('sbServerStatus');
      if (statusEl) statusEl.innerText = '○ Servidor Desconectado';
    }
  }

  // ==========================================================================
  // CONNECTION EDITOR (DELPHI 13 ATHENS FIREDAC CONNECTION DIALOG)
  // ==========================================================================
  openConnectionEditor(compId) {
    let comp = null;
    if (compId) {
      comp = this.designer.form.components.find(c => c.id === compId);
    }
    if (!comp) {
      comp = this.designer.form.components.find(c => c.type === 'vox_Connection');
    }
    if (!comp) {
      // Se não existir componente de conexão no formulário, adiciona um automaticamente
      comp = this.designer.addComponent('vox_Connection', 30, 80);
    }

    this.activeConnectionCompId = comp.id;

    const modal = document.getElementById('connectionEditorModal');
    const titleEl = document.getElementById('connEditorTitle');
    const nameEl = document.getElementById('connCompNameInput');
    const driverEl = document.getElementById('connDriverSelect');
    const serverEl = document.getElementById('connServerInput');
    const portEl = document.getElementById('connPortInput');
    const dbEl = document.getElementById('connDatabaseInput');
    const userEl = document.getElementById('connUserInput');
    const passEl = document.getElementById('connPasswordInput');
    const vendorEl = document.getElementById('connVendorLibInput');
    const statusEl = document.getElementById('connTestStatus');

    comp.props = comp.props || comp.properties || {};
    const driver = comp.props.DriverName || comp.props.Driver || 'MySQL';
    const ip = comp.props.IP || comp.props.Server || '127.0.0.1';
    const porta = comp.props.Porta !== undefined ? comp.props.Porta : (comp.props.Port !== undefined ? comp.props.Port : 3306);
    const db = comp.props.Database || 'loja_vox';
    const login = comp.props.Login || comp.props.UserName || 'root';
    const senha = comp.props.Senha || comp.props.Password || '';
    const vendorLib = comp.props.VendorLib || 'libmysql.dll';

    if (titleEl) titleEl.innerText = `FireDAC Connection Editor — [${comp.name || comp.id}]`;
    if (nameEl) nameEl.value = comp.name || comp.id;
    if (driverEl) driverEl.value = driver;
    if (serverEl) serverEl.value = ip;
    if (portEl) portEl.value = porta;
    if (dbEl) dbEl.value = db;
    if (userEl) userEl.value = login;
    if (passEl) passEl.value = senha;
    if (vendorEl) vendorEl.value = vendorLib;
    if (statusEl) {
      statusEl.innerHTML = '<span style="color:#9aa7b8;">Aguardando teste...</span>';
    }

    if (modal) modal.style.display = 'flex';
  }

  closeConnectionEditor() {
    const modal = document.getElementById('connectionEditorModal');
    if (modal) modal.style.display = 'none';
  }

  onConnectionDriverChange(driver) {
    const portEl = document.getElementById('connPortInput');
    const userEl = document.getElementById('connUserInput');
    const passEl = document.getElementById('connPasswordInput');
    const vendorEl = document.getElementById('connVendorLibInput');
    const dbEl = document.getElementById('connDatabaseInput');

    if (driver === 'MySQL') {
      if (portEl) portEl.value = 3306;
      if (userEl) userEl.value = 'root';
      if (passEl) passEl.value = '';
      if (vendorEl) vendorEl.value = 'libmysql.dll';
      if (dbEl) dbEl.value = 'loja_vox';
    } else if (driver === 'MSSQL' || driver === 'SQLServer') {
      if (portEl) portEl.value = 1433;
      if (userEl) userEl.value = 'sa';
      if (passEl) passEl.value = '';
      if (vendorEl) vendorEl.value = 'sqlncli11.dll';
      if (dbEl) dbEl.value = 'master';
    } else if (driver === 'Firebird') {
      if (portEl) portEl.value = 3050;
      if (userEl) userEl.value = 'SYSDBA';
      if (passEl) passEl.value = 'masterkey';
      if (vendorEl) vendorEl.value = 'fbclient.dll';
      if (dbEl) dbEl.value = 'C:\\dados\\banco.fdb';
    } else if (driver === 'PostgreSQL') {
      if (portEl) portEl.value = 5432;
      if (userEl) userEl.value = 'postgres';
      if (passEl) passEl.value = '';
      if (vendorEl) vendorEl.value = 'libpq.dll';
      if (dbEl) dbEl.value = 'postgres';
    } else if (driver === 'SQLite') {
      if (portEl) portEl.value = 0;
      if (userEl) userEl.value = '';
      if (passEl) passEl.value = '';
      if (vendorEl) vendorEl.value = 'sqlite3.dll';
      if (dbEl) dbEl.value = 'clientes.db';
    } else if (driver === 'Oracle') {
      if (portEl) portEl.value = 1521;
      if (userEl) userEl.value = 'system';
      if (passEl) passEl.value = '';
      if (vendorEl) vendorEl.value = 'oci.dll';
      if (dbEl) dbEl.value = 'XE';
    }
  }

  browseDatabaseFile() {
    const driver = document.getElementById('connDriverSelect')?.value || 'MySQL';
    const dbEl = document.getElementById('connDatabaseInput');
    if (!dbEl) return;
    
    let sample = '';
    if (driver === 'Firebird') sample = 'C:\\Projetos\\Banco\\dados.fdb';
    else if (driver === 'SQLite') sample = 'banco.db';
    else if (driver === 'MySQL') sample = 'loja_vox';
    else if (driver === 'MSSQL' || driver === 'SQLServer') sample = 'master';
    else sample = 'database_vox';

    const chosen = prompt(`Informe o caminho ou nome da base de dados (${driver}):`, dbEl.value || sample);
    if (chosen !== null) {
      dbEl.value = chosen;
    }
  }

  selectCommonVendorLib() {
    const vendorEl = document.getElementById('connVendorLibInput');
    const driver = document.getElementById('connDriverSelect')?.value || 'MySQL';
    if (!vendorEl) return;

    let options = [];
    if (driver === 'MySQL') {
      options = [
        'libmysql.dll (MySQL Client Oficial)',
        'C:\\Program Files\\MySQL\\MySQL Server 8.0\\lib\\libmysql.dll',
        'libmariadb.dll (MariaDB Connector C)',
        'libmysqlclient.so (Linux)'
      ];
    } else if (driver === 'MSSQL' || driver === 'SQLServer') {
      options = [
        'sqlncli11.dll (SQL Server Native Client 11.0)',
        'msodbcsql17.dll (ODBC Driver 17 for SQL Server)',
        'msodbcsql18.dll (ODBC Driver 18 for SQL Server)'
      ];
    } else if (driver === 'Firebird') {
      options = [
        'fbclient.dll (Firebird 2.5 / 3.0 / 4.0 / 5.0)',
        'C:\\Program Files\\Firebird\\Firebird_3_0\\fbclient.dll',
        'gds32.dll (Compatibilidade legada InterBase/Firebird)',
        'libfbclient.so (Linux)',
        'libfbclient.dylib (macOS)'
      ];
    } else if (driver === 'PostgreSQL') {
      options = [
        'libpq.dll (PostgreSQL Client)',
        'C:\\Program Files\\PostgreSQL\\16\\bin\\libpq.dll',
        'libpq.so (Linux)'
      ];
    } else {
      options = [
        'sqlite3.dll (SQLite3 C Engine)',
        'oci.dll (Oracle Call Interface)'
      ];
    }

    const msg = `Selecione ou copie a DLL para o driver ${driver}:\n\n` + options.map((o, i) => `${i + 1}) ${o}`).join('\n') + `\n\nDigite o número (1-${options.length}) ou o caminho:`;
    const ans = prompt(msg, options[0].split(' ')[0]);
    if (ans) {
      const idx = parseInt(ans) - 1;
      if (!isNaN(idx) && options[idx]) {
        vendorEl.value = options[idx].split(' ')[0];
      } else {
        vendorEl.value = ans;
      }
    }
  }

  togglePasswordVisibility(inputId) {
    const input = document.getElementById(inputId);
    if (input) {
      input.type = input.type === 'password' ? 'text' : 'password';
    }
  }

  async testDatabaseConnection() {
    const statusEl = document.getElementById('connTestStatus');
    if (statusEl) {
      statusEl.innerHTML = '<span style="color:#38bdf8;">⏳ Testando conexão com o banco de dados...</span>';
    }

    const driver = document.getElementById('connDriverSelect')?.value || 'MySQL';
    const ip = document.getElementById('connServerInput')?.value || '127.0.0.1';
    const porta = parseInt(document.getElementById('connPortInput')?.value || '3306', 10);
    const database = document.getElementById('connDatabaseInput')?.value || '';
    const login = document.getElementById('connUserInput')?.value || 'root';
    const senha = document.getElementById('connPasswordInput')?.value || '';
    const vendorLib = document.getElementById('connVendorLibInput')?.value || '';

    const payload = {
      driver,
      ip,
      server: ip,
      porta,
      port: porta,
      database,
      login,
      userName: login,
      user: login,
      senha,
      password: senha,
      vendorLib
    };

    try {
      const res = await fetch('/api/db/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();

      if (data.success || data.connected) {
        let dllInfo = data.details?.vendorLib && data.details.vendorLib !== 'N/A' ? `<br><small style="color:#38bdf8;">📦 ${data.details.vendorLib}</small>` : '';
        statusEl.innerHTML = `<span style="color:#22c55e; font-weight:bold;">${data.message || '✅ Conexão estabelecida com sucesso!'} (${data.pingMs || 1}ms)</span>${dllInfo}`;
      } else {
        let dllInfo = data.details?.vendorLib && data.details.vendorLib !== 'N/A' ? `<br><small style="color:#f59e0b;">📦 ${data.details.vendorLib}</small>` : '';
        statusEl.innerHTML = `<span style="color:#ef4444; font-weight:bold;">${data.message || data.error || '❌ Falha na conexão: host inacessível'}</span>${dllInfo}`;
      }
    } catch (e) {
      if (statusEl) {
        statusEl.innerHTML = `<span style="color:#ef4444;">❌ Erro ao testar: ${e.message}</span>`;
      }
    }
  }

  applyConnectionEditor() {
    if (!this.activeConnectionCompId) return;
    const comp = this.designer.form.components.find(c => c.id === this.activeConnectionCompId);
    if (!comp) return;

    comp.props = comp.props || comp.properties || {};
    const driver = document.getElementById('connDriverSelect')?.value || 'MySQL';
    const ip = document.getElementById('connServerInput')?.value || '127.0.0.1';
    const porta = parseInt(document.getElementById('connPortInput')?.value || '3306', 10);
    const database = document.getElementById('connDatabaseInput')?.value || '';
    const login = document.getElementById('connUserInput')?.value || 'root';
    const senha = document.getElementById('connPasswordInput')?.value || '';
    const vendorLib = document.getElementById('connVendorLibInput')?.value || '';

    // Salvar propriedades principais no padrão solicitado: IP, Porta, Login, Senha
    comp.props.DriverName = driver;
    comp.props.IP = ip;
    comp.props.Porta = porta;
    comp.props.Login = login;
    comp.props.Senha = senha;
    comp.props.Database = database;
    comp.props.VendorLib = vendorLib;
    comp.props.Connected = true;

    // Manter propriedades espelho compatíveis
    comp.props.Server = ip;
    comp.props.Port = porta;
    comp.props.UserName = login;
    comp.props.Password = senha;

    // Sincronizar comp.properties caso exista
    if (comp.properties) {
      comp.properties = Object.assign(comp.properties, comp.props);
    }

    this.isDirty = true;
    this.designer.render();
    if (this.inspector && this.designer.selectedComponent?.id === comp.id) {
      this.inspector.update(comp);
    }

    this.closeConnectionEditor();

    // Notificação na barra de status
    const sb = document.getElementById('sbServerStatus');
    if (sb) {
      const orig = sb.innerText;
      sb.innerText = `⚡ vox_Connection (${driver} -> ${ip}:${porta} | Login: ${login}) configurado e salvo com sucesso!`;
      sb.style.color = '#38bdf8';
      setTimeout(() => {
        sb.innerText = orig;
        sb.style.color = '#22c55e';
      }, 4000);
    }
  }

  // ==========================================================================
  // INSTALADOR DE PACOTES DE COMPONENTES (.vdpk)
  // ==========================================================================
  openInstallPackageModal() {
    const modal = document.getElementById('installPackageModal');
    const input = document.getElementById('packageCodeInput');
    const status = document.getElementById('pkgInstallStatus');

    if (input && !input.value.trim()) {
      this.loadDefaultPackageTemplate();
    }
    if (status) status.innerText = '';
    if (modal) modal.style.display = 'flex';
  }

  closeInstallPackageModal() {
    const modal = document.getElementById('installPackageModal');
    if (modal) modal.style.display = 'none';
  }

  async loadDefaultPackageTemplate() {
    const input = document.getElementById('packageCodeInput');
    if (!input) return;
    try {
      const res = await fetch('/templates/component_template.vdpk');
      if (res.ok) {
        input.value = await res.text();
      } else {
        throw new Error('Template não encontrado via HTTP');
      }
    } catch (e) {
      // Fallback embutido
      input.value = `package VoxCustomControls;\n\nrequires\n    vox_rtl,\n    vox_vcl;\n\ncontains\n    vox_RatingStars in 'vox_RatingStars.vox';\n\nclasse vox_RatingStars herda vox_Panel {\n    pub let mut StarsCount: i32;\n    pub let mut Rating: f32;\n    pub let mut ActiveColor: string;\n\n    procedimento Inicializar() {\n        this.width = 140;\n        this.height = 32;\n        this.StarsCount = 5;\n        this.Rating = 4.0;\n        this.ActiveColor = "#ffca28";\n    }\n}\n\nprocedimento Register() {\n    RegisterComponents("Custom", [\n        vox_RatingStars\n    ]);\n}\n`;
    }
  }

  async installPackageFromVdpk() {
    const input = document.getElementById('packageCodeInput');
    const status = document.getElementById('pkgInstallStatus');
    const code = input ? input.value.trim() : '';

    if (!code) {
      if (status) status.innerHTML = '<span style="color:#ef4444;">O código do pacote não pode estar vazio!</span>';
      return;
    }

    if (status) status.innerHTML = '<span style="color:#38bdf8;">Compilando pacote .vdpk...</span>';

    try {
      // Extrair nome do pacote: package Nome;
      const pkgMatch = code.match(/package\s+([a-zA-Z0-9_]+)/);
      const pkgName = pkgMatch ? pkgMatch[1] : 'VoxCustomPackage';

      // Extrair componentes registrados: RegisterComponents("Categoria", [Comp1, Comp2])
      const regMatch = code.match(/RegisterComponents\s*\(\s*["']([^"']+)["']\s*,\s*\[([^\]]+)\]/);
      const category = regMatch ? regMatch[1] : 'Custom';
      let compNames = [];
      if (regMatch) {
        compNames = regMatch[2].split(',').map(s => s.trim()).filter(Boolean);
      } else {
        const classMatch = code.match(/classe\s+([a-zA-Z0-9_]+)/);
        if (classMatch) compNames.push(classMatch[1]);
      }

      // Salvar no backend
      const res = await fetch('/api/components/install-package', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          packageName: pkgName,
          packageCode: code,
          components: compNames
        })
      });
      const data = await res.json();

      if (data.success) {
        // Registrar dinamicamente cada componente na IDE
        compNames.forEach(name => {
          if (window.registerCustomComponent) {
            window.registerCustomComponent(name, category, '⭐');
          }
        });

        // Atualizar a Tool Palette
        if (this.palette) {
          this.palette.render();
        }

        if (status) {
          status.innerHTML = `<span style="color:#22c55e; font-weight:bold;">✅ Pacote "${pkgName}" instalado com sucesso! [${compNames.join(', ')}] na categoria "${category}"</span>`;
        }

        setTimeout(() => {
          this.closeInstallPackageModal();
        }, 1800);
      } else {
        if (status) status.innerHTML = `<span style="color:#ef4444;">Falha ao compilar pacote: ${data.error}</span>`;
      }
    } catch (e) {
      if (status) status.innerHTML = `<span style="color:#ef4444;">Erro na instalação: ${e.message}</span>`;
    }
  }

  // ==========================================================================
  // LIVRO DE CONSTRUÇÃO DE COMPONENTES VOX (.vdpk)
  // ==========================================================================
  openComponentBook() {
    const modal = document.getElementById('componentBookModal');
    if (modal) {
      modal.style.display = 'flex';
      this.loadBookChapter(1);
    }
  }

  closeComponentBook() {
    const modal = document.getElementById('componentBookModal');
    if (modal) modal.style.display = 'none';
  }

  openBookInNewTab() {
    window.open('/livro', '_blank');
  }

  exportBookPdf() {
    // Abre a versão completa em HTML com o gatilho automático de impressão/salvar em PDF
    window.open('/livro?print=1', '_blank');
  }

  async loadBookChapter(chapNum) {
    document.querySelectorAll('.book-chapter-item').forEach(item => {
      if (parseInt(item.dataset.chapter) === chapNum) {
        item.classList.add('active');
      } else {
        item.classList.remove('active');
      }
    });

    const pane = document.getElementById('bookContentPane');
    if (!pane) return;

    pane.innerHTML = '<div style="color:#38bdf8; padding: 20px;">Carregando capítulo do livro...</div>';

    try {
      const res = await fetch('/docs/LIVRO_CONSTRUCAO_COMPONENTES_VOX.md');
      if (res.ok) {
        const fullMd = await res.text();
        // Separar capítulos por ## Capítulo \d+:
        const chapters = fullMd.split(/(?=## Capítulo \d+:)/g);
        let content = '';
        if (chapNum === 1 && chapters.length > 0) {
          // O capítulo 1 vem com a introdução do livro
          content = chapters[0] + (chapters[1] ? '\n\n' + chapters[1] : '');
        } else if (chapters[chapNum]) {
          content = chapters[chapNum];
        } else {
          content = chapters[chapNum - 1] || 'Capítulo não encontrado.';
        }

        // Renderizador simples de Markdown para HTML
        pane.innerHTML = this.renderMarkdown(content);
      } else {
        throw new Error('Falha ao carregar documento');
      }
    } catch (e) {
      pane.innerHTML = `<div style="color:#ef4444;">Erro ao carregar livro: ${e.message}</div>`;
    }
  }

  renderMarkdown(md) {
    if (!md) return '';
    let html = md
      // Escapar tags HTML literais
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      // Headers
      .replace(/^# (.*$)/gim, '<h1>$1</h1>')
      .replace(/^## (.*$)/gim, '<h2>$1</h2>')
      .replace(/^### (.*$)/gim, '<h3>$1</h3>')
      // Blocos de código ```vox ... ```
      .replace(/```([a-z]*)\n([\s\S]*?)```/gim, (m, lang, code) => {
        return `<pre><code class="lang-${lang}">${code.trim()}</code></pre>`;
      })
      // Inline code `...`
      .replace(/`([^`]+)`/gim, '<code>$1</code>')
      // Bold
      .replace(/\*\*([^*]+)\*\*/gim, '<strong>$1</strong>')
      // Blockquotes
      .replace(/^\> (.*$)/gim, '<div class="book-callout">$1</div>')
      // Tabela simples
      .replace(/\|(.+)\|/gim, (match) => {
        const cols = match.split('|').filter(c => c.trim().length > 0);
        if (cols.some(c => c.includes('---'))) return '';
        const cells = cols.map(c => `<td>${c.trim()}</td>`).join('');
        return `<tr>${cells}</tr>`;
      })
      // Quebras de parágrafo
      .replace(/\n\n/gim, '<br><br>');

    // Envolver tabelas
  // --------------------------------------------------------------------------
  // 15. Assistente de Criação de Classes Vox (Class Wizard & MVC)
  // --------------------------------------------------------------------------
  openNewClassModal() {
    const modal = document.getElementById('newClassModal');
    if (!modal) return;
    this.updateNewClassPreview();
    modal.style.display = 'flex';
  }

  closeNewClassModal() {
    const modal = document.getElementById('newClassModal');
    if (modal) modal.style.display = 'none';
  }

  onNewClassPatternChange() {
    const pattern = document.getElementById('ncPatternType').value;
    const nameInput = document.getElementById('ncClassName');
    const fileInput = document.getElementById('ncFileName');
    const superInput = document.getElementById('ncSuperClass');

    if (pattern === 'Model') {
      nameInput.value = 'TClienteModel';
      fileInput.value = 'cliente_model.vox';
      superInput.value = 'TObject';
    } else if (pattern === 'Controller') {
      nameInput.value = 'TClienteController';
      fileInput.value = 'cliente_controller.vox';
      superInput.value = 'TObject';
    } else if (pattern === 'Interface') {
      nameInput.value = 'IClienteService';
      fileInput.value = 'icliente_service.vox';
      superInput.value = '';
    } else {
      nameInput.value = 'TMinhaClasse';
      fileInput.value = 'minha_classe.vox';
      superInput.value = 'TObject';
    }
    this.updateNewClassPreview();
  }

  generateNewClassCode() {
    const className = document.getElementById('ncClassName')?.value.trim() || 'TMinhaClasse';
    const pattern = document.getElementById('ncPatternType')?.value || 'Model';
    const superClass = document.getElementById('ncSuperClass')?.value.trim();
    const hasPrivate = document.getElementById('ncSecPrivate')?.checked;
    const hasPublished = document.getElementById('ncSecPublished')?.checked;
    const hasPublic = document.getElementById('ncSecPublic')?.checked;

    let code = `// ==============================================================================\n`;
    code += `// ${className}.vox — Unidade da Arquitetura MVC gerada pelo Vox Studio\n`;
    code += `// ==============================================================================\n\n`;
    code += `import Vox_UI, Vox_Database, Vox_SysUtils;\n\n`;

    const heranca = superClass ? ` herda ${superClass}` : '';

    if (pattern === 'Interface') {
      code += `interface ${className} {\n`;
      code += `    fn Validar(dados: any) -> bool;\n`;
      code += `    fn Salvar(dados: any) -> bool;\n`;
      code += `    fn Excluir(id: int) -> bool;\n`;
      code += `    fn BuscarPorId(id: int) -> any;\n`;
      code += `}\n`;
      return code;
    }

    code += `classe ${className}${heranca} {\n`;

    if (hasPrivate) {
      code += `private:\n`;
      if (pattern === 'Model') {
        code += `    var _id: int;\n`;
        code += `    var _ativo: bool;\n`;
      } else if (pattern === 'Controller') {
        code += `    var _model: any;\n`;
      } else {
        code += `    var _internalState: int;\n`;
      }
      code += `\n`;
    }

    if (hasPublished) {
      code += `published:\n`;
      if (pattern === 'Model') {
        code += `    var Codigo: str;\n`;
        code += `    var Nome: str;\n`;
        code += `    var Valor: float;\n`;
      } else if (pattern === 'Controller') {
        code += `    var UltimaMensagem: str;\n`;
        code += `    var TotalRegistros: int;\n`;
      } else {
        code += `    var Nome: str;\n`;
      }
      code += `\n`;
    }

    if (hasPublic) {
      code += `public:\n`;
      code += `    new() {\n`;
      if (pattern === 'Model') {
        code += `        this._id = 0;\n`;
        code += `        this._ativo = true;\n`;
        code += `        this.Codigo = "";\n`;
        code += `        this.Nome = "";\n`;
        code += `        this.Valor = 0.0;\n`;
      } else if (pattern === 'Controller') {
        code += `        this.UltimaMensagem = "Pronto";\n`;
        code += `        this.TotalRegistros = 0;\n`;
      }
      code += `        println("${className} inicializado com sucesso.");\n`;
      code += `    }\n\n`;

      if (pattern === 'Model') {
        code += `    public fn Validar() -> bool {\n`;
        code += `        return len(this.Nome) > 0;\n`;
        code += `    }\n\n`;
        code += `    public procedure Salvar() {\n`;
        code += `        println("Gravando ${className} no banco de dados...");\n`;
        code += `    }\n`;
      } else if (pattern === 'Controller') {
        code += `    public procedure ProcessarAcao(acao: str) {\n`;
        code += `        println("[CONTROLLER] Executando: " + acao);\n`;
        code += `    }\n`;
      } else {
        code += `    public procedure Executar() {\n`;
        code += `        println("${className}.Executar() executado.");\n`;
        code += `    }\n`;
      }
    }

    code += `}\n`;
    return code;
  }

  updateNewClassPreview() {
    const previewEl = document.getElementById('ncCodePreview');
    if (!previewEl) return;
    previewEl.textContent = this.generateNewClassCode();
  }

  async confirmCreateNewClass() {
    const className = document.getElementById('ncClassName')?.value.trim();
    const fileName = document.getElementById('ncFileName')?.value.trim();
    const autoInject = document.getElementById('ncAutoInjectImport')?.checked;
    const openInEditor = document.getElementById('ncOpenInEditor')?.checked;

    if (!className || !fileName) {
      alert('Por favor, informe o nome da classe e do arquivo.');
      return;
    }

    const code = this.generateNewClassCode();

    try {
      const res = await fetch('/api/project/create-class', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          className,
          fileName,
          folder: 'src',
          code
        })
      });
      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || 'Erro ao criar classe');
      }

      this.closeNewClassModal();
      this.showToast(`🏛️ Classe ${className} criada em ${data.relPath}!`);

      // 1. Injetar import na unit do formulário ativo se selecionado
      if (autoInject) {
        const unitName = fileName.replace(/\.vox$/i, '');
        this.injectImportIntoCurrentForm(unitName);
      }

      // 2. Abrir no editor se selecionado
      if (openInEditor) {
        this.switchView('code');
        this.editor.setCode(code);
      }

      // 3. Atualizar Project Manager
      this.addUnitToProjectManager(data.relPath || fileName);
    } catch (err) {
      alert('Falha ao criar classe: ' + err.message);
    }
  }

  injectImportIntoCurrentForm(unitName) {
    let currentCode = this.editor.getCode();
    if (!currentCode) {
      currentCode = window.VoxCodeGen.generateVoxCode(this.designer.form);
    }

    // Se já contém a unit, não duplica
    const importRegex = new RegExp(`\\b${unitName}\\b`);
    if (importRegex.test(currentCode)) return;

    // Se já tem linha import ..., injeta na lista
    if (/^[ \t]*import[ \t]+([^;]+);/m.test(currentCode)) {
      currentCode = currentCode.replace(/^[ \t]*import[ \t]+([^;]+);/m, (match, units) => {
        return `import ${units.trim()}, ${unitName};`;
      });
    } else {
      currentCode = `import ${unitName};\n` + currentCode;
    }

    this.editor.setCode(currentCode);
    this.showToast(`🔗 Unidade '${unitName}' adicionada ao import da tela atual!`);
  }

  addUnitToProjectManager(filePath) {
    const list = document.querySelector('.project-tree ul');
    if (!list) return;
    const baseName = filePath.split(/[/\\]/).pop();
    const li = document.createElement('li');
    li.style.cursor = 'pointer';
    li.style.display = 'flex';
    li.style.alignItems = 'center';
    li.style.gap = '6px';
    li.innerHTML = `<span>📄</span><span>${baseName}</span>`;
    li.onclick = () => {
      this.switchView('code');
    };
    list.appendChild(li);
  }

  // --------------------------------------------------------------------------
  // 16. Criar Projeto a partir de Exemplo com Escolha de Pasta
  // --------------------------------------------------------------------------
  openCreateFromExampleModal(templateKey = 'erpCompleto') {
    const modal = document.getElementById('createFromExampleModal');
    if (!modal) return;

    const select = document.getElementById('cfeTemplateSelect');
    if (select) select.value = templateKey;
    this.onCfeTemplateChange();
    modal.style.display = 'flex';
  }

  closeCreateFromExampleModal() {
    const modal = document.getElementById('createFromExampleModal');
    if (modal) modal.style.display = 'none';
  }

  onCfeTemplateChange() {
    const templateKey = document.getElementById('cfeTemplateSelect')?.value || 'erpCompleto';
    const nameInput = document.getElementById('cfeProjectName');
    const titleEl = document.getElementById('cfeDescriptionTitle');
    const textEl = document.getElementById('cfeDescriptionText');

    if (templateKey === 'erpCompleto') {
      nameInput.value = 'VoxERP_Comercial';
      titleEl.innerHTML = '🌟 ERP Completo MVC (Clientes NF-e, Produtos, Estoque, PDV):';
      textEl.innerHTML = '• <strong>Models:</strong> Clientes NF-e com 17 campos fiscais (Razão Social, CNPJ/CPF, IE, Município IBGE, CRT), Produtos com tributos (NCM, CEST, CFOP) e Estoque.<br>• <strong>Controllers:</strong> Validações de CNPJ/CPF, regras de negócio e cálculo de troco.<br>• <strong>Views:</strong> Formulários visuais RAD sincronizados (.vxf e .vox) prontos para compilar para web.';
    } else if (templateKey === 'crudClientes') {
      nameInput.value = 'Projeto_Clientes';
      titleEl.innerHTML = '📋 Cadastro de Clientes (SQLite CRUD):';
      textEl.innerHTML = 'Formulário tradicional de clientes com menu no topo, navegação por vox_DBNavigator, vox_Connection e vox_Query SQLite.';
    } else if (templateKey === 'sistemaSidebar') {
      nameInput.value = 'Sistema_Sidebar';
      titleEl.innerHTML = '📑 Sistema Comercial com Menu Lateral (Sidebar):';
      textEl.innerHTML = 'Interface moderna com menu vertical fixo à esquerda e área dinâmica de trabalho à direita.';
    } else if (templateKey === 'pdv') {
      nameInput.value = 'PDV_FrenteDeCaixa';
      titleEl.innerHTML = '🛒 PDV Frente de Caixa:';
      textEl.innerHTML = 'Frente de caixa rápida com leitor de código de barras, subtotal dinâmico e painel de formas de pagamento.';
    } else {
      nameInput.value = 'Calculadora_RAD';
      titleEl.innerHTML = '🔢 Calculadora RAD:';
      textEl.innerHTML = 'Calculadora visual com grid de botões e display LCD.';
    }

    this.setCfeFolder('projetos');
  }

  setCfeFolder(baseFolder) {
    const projName = document.getElementById('cfeProjectName')?.value.trim() || 'NovoProjeto';
    const folderInput = document.getElementById('cfeTargetFolder');
    if (folderInput) {
      folderInput.value = `${baseFolder}/${projName}`;
      this.updateCfePreview();
    }
  }

  updateCfePreview() {
    const folderInput = document.getElementById('cfeTargetFolder');
    const previewEl = document.getElementById('cfeFolderPreview');
    if (folderInput && previewEl) {
      previewEl.textContent = `Destino: D:/Projetos AntiGravity/linguagem/${folderInput.value}`;
    }
  }

  async confirmCreateProjectFromExample() {
    const templateKey = document.getElementById('cfeTemplateSelect')?.value || 'erpCompleto';
    const projectName = document.getElementById('cfeProjectName')?.value.trim() || 'NovoProjeto';
    const targetFolder = document.getElementById('cfeTargetFolder')?.value.trim() || `projetos/${projectName}`;

    try {
      this.showToast('🚀 Gerando projeto na pasta escolhida...');
      const res = await fetch('/api/project/create-from-example', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          exampleKey: templateKey,
          projectName,
          targetFolder
        })
      });
      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || 'Erro ao criar projeto');
      }

      this.closeCreateFromExampleModal();
      this.showToast(`🎉 Projeto ${projectName} criado com sucesso em ${targetFolder}/!`);

      // Carregar o modelo correspondente no designer da IDE
      this.loadTemplate(templateKey);

      // Atualizar o nome do projeto no título e cabeçalho
      const projTitle = document.querySelector('.project-header span');
      if (projTitle) projTitle.textContent = `${projectName}.dproj - Projects`;
    } catch (err) {
      alert('Falha ao criar projeto: ' + err.message);
    }
  }
}

window.addEventListener('DOMContentLoaded', () => {
  window.app = new VoxStudioApp();
  window.app.init();
});
