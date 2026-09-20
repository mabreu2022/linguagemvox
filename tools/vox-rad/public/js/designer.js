// ==============================================================================
// tools/vox-rad/public/js/designer.js — Motor Visual do Form Canvas Delphi VCL
// ==============================================================================

class VoxDesigner {
  constructor(canvasElement, formWindowElement) {
    this.canvas = canvasElement;
    this.formWindow = formWindowElement;
    this.form = {
      name: 'Form1',
      title: 'Form1',
      width: 700,
      height: 480,
      components: []
    };

    this.selectedComponent = null;
    this.gridSnap = 8;
    this.isSnapping = true;
    this.idCounter = 1;
    this.syncIdCounter();

    this.dragMode = null;
    this.resizeHandle = null;
    this.dragStart = { x: 0, y: 0 };
    this.compStart = { left: 0, top: 0, width: 0, height: 0 };

    this.clipboard = null;
    this.pasteOffsetCount = 0;

    this.initEvents();
    this.renderForm();
  }

  snap(val) {
    if (!this.isSnapping || this.gridSnap <= 1) return Math.round(val);
    return Math.round(val / this.gridSnap) * this.gridSnap;
  }

  syncIdCounter() {
    let maxId = 0;
    if (this.form && this.form.components) {
      this.form.components.forEach(c => {
        if (c.id && c.id.startsWith('comp_')) {
          const num = parseInt(c.id.replace('comp_', ''), 10);
          if (!isNaN(num) && num > maxId) maxId = num;
        }
      });
    }
    this.idCounter = Math.max(this.idCounter, maxId + 1);
  }

  generateUniqueId() {
    this.syncIdCounter();
    let candidate = 'comp_' + (this.idCounter++);
    const existingIds = new Set((this.form.components || []).map(c => c.id));
    while (existingIds.has(candidate) || (typeof document !== 'undefined' && document.getElementById && document.getElementById(candidate))) {
      candidate = 'comp_' + (this.idCounter++);
    }
    return candidate;
  }

  initEvents() {
    this.canvas.addEventListener('mousedown', (e) => {
      // Se clicou em uma aba ou no botão de adicionar aba (+), não iniciar arrasto do PageControl
      if (e.target.closest('.vcl-tab-add-btn') || e.target.closest('.vcl-tab-item')) {
        return;
      }

      const compEl = e.target.closest('.delphi-comp');
      if (compEl) {
        const comp = this.form.components.find(c => c.id === compEl.id);
        if (comp) {
          this.selectComponent(comp);
        }
      } else if (e.target === this.canvas) {
        this.selectComponent(null);
      }
    });

    this.canvas.addEventListener('click', (e) => {
      // 1. Botão de adicionar nova aba (+) no PageControl
      const tabAddBtn = e.target.closest('.vcl-tab-add-btn');
      if (tabAddBtn) {
        e.stopPropagation();
        const pcName = tabAddBtn.dataset.pagecontrol;
        const pc = this.getComponentByName(pcName);
        if (pc) {
          this.addTabSheet(pc);
        }
        return;
      }

      // 2. Clique em uma aba existente para alternar a página ativa
      const tabItem = e.target.closest('.vcl-tab-item');
      if (tabItem) {
        e.stopPropagation();
        const pcName = tabItem.dataset.pagecontrol;
        const tabIdx = parseInt(tabItem.dataset.tabIndex, 10);
        const tabSheetName = tabItem.dataset.tabsheet;
        const pc = this.getComponentByName(pcName);
        if (pc) {
          pc.props.ActivePageIndex = tabIdx;
          this.renderForm();
          const tabSheet = this.getComponentByName(tabSheetName);
          if (tabSheet) {
            this.selectComponent(tabSheet);
          } else {
            this.selectComponent(pc);
          }
          if (window.app) {
            window.app.onFormChanged();
            window.app.updateStructureTree();
          }
        }
        return;
      }

      const compEl = e.target.closest('.delphi-comp');
      if (compEl) {
        const comp = this.form.components.find(c => c.id === compEl.id);
        if (comp) {
          this.selectComponent(comp);
        }
      }
    });

    // Menu de contexto com o botão direito no Designer
    this.canvas.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      e.stopPropagation();

      const compEl = e.target.closest('.delphi-comp');
      if (compEl) {
        const comp = this.form.components.find(c => c.id === compEl.id);
        if (comp) {
          this.selectComponent(comp);
        }
      } else {
        this.selectComponent(null);
      }

      this.showContextMenu(e.clientX, e.clientY);
    });

    // Fechar menu de contexto ao clicar em qualquer outro lugar
    document.addEventListener('mousedown', (e) => {
      const menu = document.getElementById('delphiDesignerContextMenu');
      if (menu && menu.classList.contains('open') && !menu.contains(e.target)) {
        this.hideContextMenu();
      }
    });

    this.canvas.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'copy';
    });

    this.canvas.addEventListener('drop', (e) => {
      e.preventDefault();
      const compType = e.dataTransfer.getData('text/plain');
      if (compType && window.VOX_COMPONENTS[compType]) {
        // Interceptar contêiner sob o ponto de drop
        const elemBelow = document.elementFromPoint(e.clientX, e.clientY);
        const targetCompEl = elemBelow ? elemBelow.closest('.delphi-comp') : null;
        let targetContainer = null;

        if (targetCompEl) {
          let curEl = targetCompEl;
          while (curEl) {
            const comp = this.form.components.find(c => c.id === curEl.id);
            if (comp && this.isContainerComponent(comp.type)) {
              targetContainer = comp;
              break;
            }
            curEl = curEl.parentElement ? curEl.parentElement.closest('.delphi-comp') : null;
          }
        }

        if (targetContainer) {
          // Se o alvo for um PageControl, colocar o novo componente dentro da TabSheet ativa
          if (this.isPageControlComponent(targetContainer.type)) {
            const pages = this.form.components.filter(c =>
              this.isTabSheetComponent(c.type) && c.parent === targetContainer.name
            );
            const activeIdx = Math.min(pages.length - 1, Math.max(0, parseInt(targetContainer.props.ActivePageIndex, 10) || 0));
            if (pages[activeIdx]) {
              targetContainer = pages[activeIdx];
            }
          }

          const targetEl = document.getElementById(targetContainer.id);
          const targetRect = targetEl ? targetEl.getBoundingClientRect() : this.canvas.getBoundingClientRect();
          const dropX = this.snap(e.clientX - targetRect.left);
          const dropY = this.snap(e.clientY - targetRect.top);
          this.addComponent(compType, dropX, dropY, targetContainer.name);
        } else {
          const rect = this.canvas.getBoundingClientRect();
          const dropX = this.snap(e.clientX - rect.left);
          const dropY = this.snap(e.clientY - rect.top);
          this.addComponent(compType, dropX, dropY, null);
        }
      }
    });

    // Redimensionamento do Form com o Mouse (Alças e Linhas Azuis Padrão Delphi)
    // Usando captura no document para NUNCA perder o clique nas alças do formulário
    document.addEventListener('mousedown', (e) => {
      const handleEl = e.target.closest('[data-form-handle]');
      if (handleEl) {
        e.preventDefault();
        e.stopPropagation();
        this.dragMode = 'form-resize';
        this.formResizeDir = handleEl.dataset.formHandle; // 'r', 'b', ou 'br'
        this.dragStart = { x: e.clientX, y: e.clientY };
        this.formStart = {
          width: parseInt(this.form.width, 10) || this.formWindow.offsetWidth || 660,
          height: parseInt(this.form.height, 10) || this.formWindow.offsetHeight || 460
        };
        this.selectComponent(null);
        document.body.style.userSelect = 'none';
        if (this.formResizeDir === 'r') document.body.style.cursor = 'ew-resize';
        else if (this.formResizeDir === 'b') document.body.style.cursor = 'ns-resize';
        else if (this.formResizeDir === 'br') document.body.style.cursor = 'nwse-resize';
      }
    }, true);

    // Mover Janela do Form pela Barra de Título (Titlebar)
    const titlebar = document.getElementById('formTitlebar');
    if (titlebar) {
      titlebar.addEventListener('mousedown', (e) => {
        if (e.target.closest('.delphi-form-sysbuttons')) return;
        e.preventDefault();
        e.stopPropagation();
        this.dragMode = 'form-move';
        this.dragStart = { x: e.clientX, y: e.clientY };
        this.formPosStart = {
          left: this.formWindow.offsetLeft,
          top: this.formWindow.offsetTop
        };
        this.selectComponent(null);
        document.body.style.userSelect = 'none';
        document.body.style.cursor = 'move';
      });
    }

    window.addEventListener('mousemove', (e) => {
      this.handleGlobalMouseMove(e);
    });

    window.addEventListener('mouseup', () => {
      if (this.dragMode) {
        const wasFormResize = (this.dragMode === 'form-resize');
        const wasFormMove = (this.dragMode === 'form-move');
        this.dragMode = null;
        this.resizeHandle = null;
        this.formResizeDir = null;
        document.body.style.userSelect = '';
        document.body.style.cursor = '';

        if (window.app) {
          window.app.onFormChanged();
          if (window.app.inspector) {
            if ((wasFormResize || wasFormMove) && !this.selectedComponent) {
              window.app.inspector.update(null);
            } else if (this.selectedComponent) {
              window.app.inspector.renderProperties();
            }
          }
        }
      }
    });

    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.hideContextMenu();
      }

      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)) return;
      if (document.activeElement.closest && document.activeElement.closest('.CodeMirror')) return;

      // Colar (Ctrl+V) funciona mesmo se nenhum componente estiver selecionado (cola no Form)
      if (e.ctrlKey && !e.shiftKey && !e.altKey && e.key.toLowerCase() === 'v') {
        if (window.app && window.app.currentView !== 'designer') return;
        e.preventDefault();
        this.pasteComponent();
        return;
      }

      if (!this.selectedComponent) return;

      if (e.ctrlKey && !e.shiftKey && !e.altKey && e.key.toLowerCase() === 'c') {
        if (window.app && window.app.currentView !== 'designer') return;
        e.preventDefault();
        this.copySelected();
        return;
      }

      if (e.ctrlKey && !e.shiftKey && !e.altKey && e.key.toLowerCase() === 'x') {
        if (window.app && window.app.currentView !== 'designer') return;
        e.preventDefault();
        this.cutSelected();
        return;
      }

      if (e.ctrlKey && !e.shiftKey && !e.altKey && e.key.toLowerCase() === 'd') {
        if (window.app && window.app.currentView !== 'designer') return;
        e.preventDefault();
        this.duplicateSelected();
        return;
      }

      const step = e.shiftKey ? 8 : 1;
      let moved = false;

      if (e.key === 'Delete' || e.key === 'Backspace') {
        this.deleteSelected();
        e.preventDefault();
        return;
      } else if (e.key === 'ArrowLeft') {
        this.selectedComponent.left = Math.max(0, this.selectedComponent.left - step);
        moved = true;
      } else if (e.key === 'ArrowRight') {
        this.selectedComponent.left += step;
        moved = true;
      } else if (e.key === 'ArrowUp') {
        this.selectedComponent.top = Math.max(0, this.selectedComponent.top - step);
        moved = true;
      } else if (e.key === 'ArrowDown') {
        this.selectedComponent.top += step;
        moved = true;
      }

      if (moved) {
        e.preventDefault();
        this.updateComponentElement(this.selectedComponent);
        if (window.app && window.app.inspector) window.app.inspector.update(this.selectedComponent);
      }
    });
  }

  isContainerComponent(type) {
    if (!type) return false;
    const meta = window.VOX_COMPONENTS[type];
    if (meta && meta.isContainer) return true;
    const containers = [
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
    ];
    return containers.includes(type);
  }

  isPageControlComponent(type) {
    if (!type) return false;
    return type === 'vox_PageControl' || type === 'TVoxPageControl' || type === 'TPageControl' || type.endsWith('PageControl');
  }

  isTabSheetComponent(type) {
    if (!type) return false;
    return type === 'vox_TabSheet' || type === 'TVoxTabSheet' || type === 'TTabSheet' || type.endsWith('TabSheet');
  }

  getComponentByName(name) {
    if (!name || name === this.form.name) return null;
    return this.form.components.find(c => c.name === name) || null;
  }

  getAbsoluteBounds(comp) {
    if (!comp) return { left: 0, top: 0, width: 0, height: 0, right: 0, bottom: 0 };
    let left = parseInt(comp.left, 10) || 0;
    let top = parseInt(comp.top, 10) || 0;
    let current = comp;
    while (current && current.parent && current.parent !== this.form.name) {
      const parentComp = this.getComponentByName(current.parent);
      if (parentComp) {
        left += (parseInt(parentComp.left, 10) || 0);
        top += (parseInt(parentComp.top, 10) || 0);
        current = parentComp;
      } else {
        break;
      }
    }
    const width = parseInt(comp.width, 10) || 0;
    const height = parseInt(comp.height, 10) || 0;
    return {
      left,
      top,
      width,
      height,
      right: left + width,
      bottom: top + height
    };
  }

  reparentComponent(comp, newParentName) {
    if (!comp) return;
    const formName = this.form.name;
    const currentParentName = comp.parent || formName;
    if (currentParentName === newParentName) return;

    // Calcular posição absoluta atual na tela
    const currentAbs = this.getAbsoluteBounds(comp);

    // Calcular posição absoluta do novo pai
    let newParentAbs = { left: 0, top: 0 };
    if (newParentName && newParentName !== formName) {
      const newParentComp = this.getComponentByName(newParentName);
      if (newParentComp) {
        newParentAbs = this.getAbsoluteBounds(newParentComp);
      }
    }

    // Novas coordenadas relativas ao novo contêiner
    comp.parent = (newParentName === formName ? null : newParentName);
    comp.left = Math.max(0, this.snap(currentAbs.left - newParentAbs.left));
    comp.top = Math.max(0, this.snap(currentAbs.top - newParentAbs.top));

    // Reconstruir a árvore no designer
    this.recalculateAlignments(false);
    this.renderForm();
    this.selectComponent(comp);

    if (window.app) {
      window.app.onFormChanged();
      window.app.updateStructureTree();
    }
  }

  generateUniqueComponentName(type) {
    let seq = 1;
    let raw = type.startsWith('vox_') ? type.substring(4) : (type.startsWith('TVox') ? type.substring(4) : (type.startsWith('T') ? type.substring(1) : type));
    let baseName = 'vox_' + raw.toLowerCase();
    while (this.form.components.some(c => (c.name || '').toLowerCase() === `${baseName}${seq}`.toLowerCase())) {
      seq++;
    }
    return `${baseName}${seq}`;
  }

  addComponent(type, left, top, parentName = null) {
    const meta = window.VOX_COMPONENTS[type];
    if (!meta) return null;

    const name = this.generateUniqueComponentName(type);

    // Se nenhum parentName foi passado mas há um contêiner selecionado
    if (!parentName && this.selectedComponent) {
      if (this.isTabSheetComponent(this.selectedComponent.type)) {
        parentName = this.selectedComponent.name;
      } else if (this.isPageControlComponent(this.selectedComponent.type)) {
        const pages = this.form.components.filter(c =>
          this.isTabSheetComponent(c.type) && c.parent === this.selectedComponent.name
        );
        const activeIdx = Math.min(pages.length - 1, Math.max(0, parseInt(this.selectedComponent.props.ActivePageIndex, 10) || 0));
        parentName = pages[activeIdx] ? pages[activeIdx].name : this.selectedComponent.name;
      } else if (this.isContainerComponent(this.selectedComponent.type) && type !== this.selectedComponent.type) {
        parentName = this.selectedComponent.name;
      }
    }

    const newComp = {
      id: this.generateUniqueId(),
      name: name,
      type: type,
      parent: parentName || null,
      left: Math.max(0, left),
      top: Math.max(0, top),
      width: meta.defaultWidth,
      height: meta.defaultHeight,
      props: JSON.parse(JSON.stringify(meta.defaultProps || {})),
      events: {}
    };

    if (newComp.props.Caption !== undefined && !newComp.props.Caption.includes('Button')) {
      newComp.props.Caption = name;
    }
    if (newComp.props.Text !== undefined) {
      newComp.props.Text = name;
    }
    newComp.props.Align = newComp.props.Align || 'alNone';

    if (this.isPageControlComponent(type)) {
      newComp.props.ActivePageIndex = 0;
      newComp.props.TabPosition = newComp.props.TabPosition || 'tpTop';
      this.form.components.push(newComp);

      const tab1Name = this.generateUniqueComponentName('vox_TabSheet');
      const tab1 = {
        id: this.generateUniqueId(),
        name: tab1Name,
        type: 'vox_TabSheet',
        parent: newComp.name,
        left: 0,
        top: 26,
        width: newComp.width,
        height: Math.max(20, newComp.height - 26),
        props: { Caption: 'Geral', PageIndex: 0, ImageIndex: -1, Align: 'alClient' },
        events: {}
      };
      this.form.components.push(tab1);

      const tab2Name = this.generateUniqueComponentName('vox_TabSheet');
      const tab2 = {
        id: this.generateUniqueId(),
        name: tab2Name,
        type: 'vox_TabSheet',
        parent: newComp.name,
        left: 0,
        top: 26,
        width: newComp.width,
        height: Math.max(20, newComp.height - 26),
        props: { Caption: 'Detalhes', PageIndex: 1, ImageIndex: -1, Align: 'alClient' },
        events: {}
      };
      this.form.components.push(tab2);

      this.recalculateAlignments(false);
      this.renderForm();
      this.selectComponent(newComp);

      if (window.app) {
        window.app.onFormChanged();
        window.app.updateStructureTree();
      }

      return newComp;
    }

    this.form.components.push(newComp);
    this.recalculateAlignments(false);
    this.renderForm();
    this.selectComponent(newComp);

    if (window.app) {
      window.app.onFormChanged();
      window.app.updateStructureTree();
    }

    return newComp;
  }

  deleteSelected() {
    if (!this.selectedComponent) return;

    // Coletar todos os filhos e descendentes para exclusão em cascata Delphi
    const idsToDelete = new Set();
    const collectDescendants = (compName) => {
      const children = this.form.components.filter(c => c.parent === compName);
      children.forEach(ch => {
        idsToDelete.add(ch.id);
        collectDescendants(ch.name);
      });
    };

    idsToDelete.add(this.selectedComponent.id);
    collectDescendants(this.selectedComponent.name);

    idsToDelete.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.remove();
    });

    this.form.components = this.form.components.filter(c => !idsToDelete.has(c.id));
    this.recalculateAlignments(false);
    this.selectComponent(null);

    if (window.app) {
      window.app.onFormChanged();
      window.app.updateStructureTree();
    }
  }

  copySelected() {
    if (!this.selectedComponent) {
      if (window.app) window.app.showToast('⚠️ Nenhum componente selecionado para copiar.');
      return;
    }
    const orig = this.selectedComponent;
    const clipboardData = {
      version: '1.0',
      type: 'VOX_COMPONENT_CLIPBOARD',
      root: JSON.parse(JSON.stringify(orig)),
      children: []
    };

    const collectChildren = (parentName) => {
      const children = this.form.components.filter(c => c.parent === parentName);
      children.forEach(ch => {
        clipboardData.children.push(JSON.parse(JSON.stringify(ch)));
        collectChildren(ch.name);
      });
    };
    collectChildren(orig.name);

    this.clipboard = clipboardData;
    window.voxClipboard = clipboardData;
    this.pasteOffsetCount = 0;

    try {
      if (navigator && navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(JSON.stringify(clipboardData, null, 2)).catch(() => {});
      }
    } catch (err) {}

    if (window.app) {
      window.app.showToast(`📋 Componente "${orig.name}" copiado.`);
    }
  }

  cutSelected() {
    if (!this.selectedComponent) {
      if (window.app) window.app.showToast('⚠️ Nenhum componente selecionado para recortar.');
      return;
    }
    const name = this.selectedComponent.name;
    this.copySelected();
    this.deleteSelected();
    if (window.app) {
      window.app.showToast(`✂️ Componente "${name}" recortado.`);
    }
  }

  pasteComponent() {
    const clip = this.clipboard || window.voxClipboard;
    if (!clip || !clip.root) {
      if (window.app) window.app.showToast('⚠️ Área de transferência vazia. Copie um componente primeiro (Ctrl+C).');
      return null;
    }

    this.pasteOffsetCount = (this.pasteOffsetCount || 0) + 1;
    const offset = this.pasteOffsetCount * 16;

    let targetParentName = null;
    let pasteLeft = 0;
    let pasteTop = 0;

    if (this.selectedComponent && this.isContainerComponent(this.selectedComponent.type)) {
      // Caso A: Colar dentro do contêiner selecionado (estilo Delphi)
      targetParentName = this.selectedComponent.name;
      pasteLeft = 16 + ((this.pasteOffsetCount - 1) * 16);
      pasteTop = 16 + ((this.pasteOffsetCount - 1) * 16);
      const parentWidth = parseInt(this.selectedComponent.width, 10) || 200;
      const parentHeight = parseInt(this.selectedComponent.height, 10) || 150;
      if (pasteLeft > parentWidth - 60) pasteLeft = 16;
      if (pasteTop > parentHeight - 40) pasteTop = 16;
    } else if (this.selectedComponent) {
      // Caso B: Colar como irmão do componente selecionado (+16 uniforme)
      targetParentName = this.selectedComponent.parent || null;
      pasteLeft = (parseInt(this.selectedComponent.left, 10) || 0) + 16;
      pasteTop = (parseInt(this.selectedComponent.top, 10) || 0) + 16;
    } else {
      // Caso C: Colar na raiz do formulário
      targetParentName = null;
      pasteLeft = (parseInt(clip.root.left, 10) || 20) + offset;
      pasteTop = (parseInt(clip.root.top, 10) || 20) + offset;
    }

    pasteLeft = Math.max(0, this.snap(pasteLeft));
    pasteTop = Math.max(0, this.snap(pasteTop));

    const newRootName = this.generateUniqueComponentName(clip.root.type);
    const nameMap = {};
    nameMap[clip.root.name] = newRootName;

    const newRootComp = {
      id: this.generateUniqueId(),
      name: newRootName,
      type: clip.root.type,
      parent: targetParentName,
      left: pasteLeft,
      top: pasteTop,
      width: clip.root.width,
      height: clip.root.height,
      props: JSON.parse(JSON.stringify(clip.root.props || {})),
      events: JSON.parse(JSON.stringify(clip.root.events || {}))
    };

    if (newRootComp.props.Name !== undefined) {
      newRootComp.props.Name = newRootName;
    }
    const cleanTypeName = clip.root.type.startsWith('vox_') ? clip.root.type.substring(4) : clip.root.type;
    if (newRootComp.props.Caption === clip.root.name || (newRootComp.props.Caption && newRootComp.props.Caption.startsWith(cleanTypeName))) {
      newRootComp.props.Caption = newRootName;
    }
    if (newRootComp.props.Text === clip.root.name || (newRootComp.props.Text && newRootComp.props.Text.startsWith(cleanTypeName))) {
      newRootComp.props.Text = newRootName;
    }

    this.form.components.push(newRootComp);

    // Clonar filhos recursivamente mapeando os nomes dos pais
    if (clip.children && clip.children.length > 0) {
      clip.children.forEach(child => {
        const newChildName = this.generateUniqueComponentName(child.type);
        nameMap[child.name] = newChildName;
        const parentName = nameMap[child.parent] || newRootName;

        const newChildComp = {
          id: this.generateUniqueId(),
          name: newChildName,
          type: child.type,
          parent: parentName,
          left: child.left,
          top: child.top,
          width: child.width,
          height: child.height,
          props: JSON.parse(JSON.stringify(child.props || {})),
          events: JSON.parse(JSON.stringify(child.events || {}))
        };

        if (newChildComp.props.Name !== undefined) {
          newChildComp.props.Name = newChildName;
        }
        const cleanChildType = child.type.startsWith('vox_') ? child.type.substring(4) : child.type;
        if (newChildComp.props.Caption === child.name || (newChildComp.props.Caption && newChildComp.props.Caption.startsWith(cleanChildType))) {
          newChildComp.props.Caption = newChildName;
        }
        if (newChildComp.props.Text === child.name || (newChildComp.props.Text && newChildComp.props.Text.startsWith(cleanChildType))) {
          newChildComp.props.Text = newChildName;
        }

        this.form.components.push(newChildComp);
      });
    }

    this.recalculateAlignments(false);
    this.renderForm();
    this.selectComponent(newRootComp);

    if (window.app) {
      window.app.onFormChanged();
      window.app.updateStructureTree();
      window.app.showToast(`📋 Componente "${newRootName}" colado com sucesso.`);
    }

    return newRootComp;
  }

  duplicateSelected() {
    if (!this.selectedComponent) return null;
    this.copySelected();
    return this.pasteComponent();
  }

  bringToFront() {
    if (!this.selectedComponent) return;
    const comp = this.selectedComponent;
    const idx = this.form.components.findIndex(c => c.id === comp.id);
    if (idx !== -1 && idx < this.form.components.length - 1) {
      this.form.components.splice(idx, 1);
      this.form.components.push(comp);
      this.renderForm();
      this.selectComponent(comp);
      if (window.app) {
        window.app.onFormChanged();
        window.app.showToast(`🔼 "${comp.name}" trazido para frente.`);
      }
    }
  }

  sendToBack() {
    if (!this.selectedComponent) return;
    const comp = this.selectedComponent;
    const idx = this.form.components.findIndex(c => c.id === comp.id);
    if (idx > 0) {
      this.form.components.splice(idx, 1);
      this.form.components.unshift(comp);
      this.renderForm();
      this.selectComponent(comp);
      if (window.app) {
        window.app.onFormChanged();
        window.app.showToast(`🔽 "${comp.name}" enviado para trás.`);
      }
    }
  }

  showContextMenu(x, y) {
    const menu = document.getElementById('delphiDesignerContextMenu');
    if (!menu) return;

    const hasSelection = !!this.selectedComponent;
    const hasClipboard = !!((this.clipboard && this.clipboard.root) || (window.voxClipboard && window.voxClipboard.root));

    const itemCut = document.getElementById('ctxCut');
    const itemCopy = document.getElementById('ctxCopy');
    const itemPaste = document.getElementById('ctxPaste');
    const itemDuplicate = document.getElementById('ctxDuplicate');
    const itemDelete = document.getElementById('ctxDelete');
    const itemBringFront = document.getElementById('ctxBringFront');
    const itemSendBack = document.getElementById('ctxSendBack');

    if (itemCut) itemCut.classList.toggle('disabled', !hasSelection);
    if (itemCopy) itemCopy.classList.toggle('disabled', !hasSelection);
    if (itemPaste) itemPaste.classList.toggle('disabled', !hasClipboard);
    if (itemDuplicate) itemDuplicate.classList.toggle('disabled', !hasSelection);
    if (itemDelete) itemDelete.classList.toggle('disabled', !hasSelection);
    if (itemBringFront) itemBringFront.classList.toggle('disabled', !hasSelection);
    if (itemSendBack) itemSendBack.classList.toggle('disabled', !hasSelection);

    // Itens de contexto específicos do PageControl / TabSheet
    const isPageControl = hasSelection && (
      this.selectedComponent.type.includes('PageControl') || this.selectedComponent.type.includes('TabSheet')
    );
    const ctxPcGroup = document.getElementById('ctxPageControlGroup');
    if (ctxPcGroup) {
      ctxPcGroup.style.display = isPageControl ? 'block' : 'none';
    }

    menu.style.left = `${Math.min(window.innerWidth - 230, Math.max(10, x))}px`;
    menu.style.top = `${Math.min(window.innerHeight - 290, Math.max(10, y))}px`;
    menu.classList.add('open');
  }

  hideContextMenu() {
    const menu = document.getElementById('delphiDesignerContextMenu');
    if (menu) menu.classList.remove('open');
  }

  // Ações Delphi clássicas do PageControl
  getPageControlTarget(target = null) {
    let comp = target || this.selectedComponent;
    if (!comp) return null;
    if (this.isPageControlComponent(comp.type)) return comp;
    if (this.isTabSheetComponent(comp.type) && comp.parent) {
      return this.getComponentByName(comp.parent);
    }
    return null;
  }

  addTabSheet(targetPc = null) {
    const pc = this.getPageControlTarget(targetPc);
    if (!pc) return null;

    const existingPages = this.form.components.filter(c =>
      this.isTabSheetComponent(c.type) && c.parent === pc.name
    );
    const newIdx = existingPages.length;
    const newName = this.generateUniqueComponentName('vox_TabSheet');
    const newTab = {
      id: this.generateUniqueId(),
      name: newName,
      type: 'vox_TabSheet',
      parent: pc.name,
      left: 0,
      top: 26,
      width: pc.width,
      height: Math.max(20, pc.height - 26),
      props: {
        Caption: `Aba ${newIdx + 1}`,
        PageIndex: newIdx,
        ImageIndex: -1,
        Align: 'alClient'
      },
      events: {}
    };

    this.form.components.push(newTab);
    pc.props.ActivePageIndex = newIdx;
    this.renderForm();
    this.selectComponent(newTab);

    if (window.app) {
      window.app.onFormChanged();
      window.app.updateStructureTree();
      window.app.showToast(`📑 Nova aba "${newTab.props.Caption}" adicionada ao ${pc.name}.`);
    }

    return newTab;
  }

  nextPage(targetPc = null) {
    const pc = this.getPageControlTarget(targetPc);
    if (!pc) return;

    const pages = this.form.components.filter(c =>
      (c.type === 'vox_TabSheet' || c.type === 'TTabSheet') && c.parent === pc.name
    );
    if (pages.length <= 1) return;

    const curIdx = parseInt(pc.props.ActivePageIndex, 10) || 0;
    pc.props.ActivePageIndex = (curIdx + 1) % pages.length;
    this.renderForm();
    const activeTab = pages[pc.props.ActivePageIndex];
    if (activeTab) this.selectComponent(activeTab);

    if (window.app) {
      window.app.onFormChanged();
      window.app.updateStructureTree();
    }
  }

  prevPage(targetPc = null) {
    const pc = this.getPageControlTarget(targetPc);
    if (!pc) return;

    const pages = this.form.components.filter(c =>
      (c.type === 'vox_TabSheet' || c.type === 'TTabSheet') && c.parent === pc.name
    );
    if (pages.length <= 1) return;

    const curIdx = parseInt(pc.props.ActivePageIndex, 10) || 0;
    pc.props.ActivePageIndex = (curIdx - 1 + pages.length) % pages.length;
    this.renderForm();
    const activeTab = pages[pc.props.ActivePageIndex];
    if (activeTab) this.selectComponent(activeTab);

    if (window.app) {
      window.app.onFormChanged();
      window.app.updateStructureTree();
    }
  }

  deleteCurrentPage(targetPc = null) {
    const pc = this.getPageControlTarget(targetPc);
    if (!pc) return;

    const pages = this.form.components.filter(c =>
      (c.type === 'vox_TabSheet' || c.type === 'TTabSheet') && c.parent === pc.name
    );
    if (pages.length === 0) return;

    const curIdx = Math.min(pages.length - 1, Math.max(0, parseInt(pc.props.ActivePageIndex, 10) || 0));
    const targetPage = pages[curIdx];
    if (targetPage) {
      const pageCaption = targetPage.props.Caption || targetPage.name;
      this.selectComponent(targetPage);
      this.deleteSelected();
      pc.props.ActivePageIndex = Math.max(0, curIdx - 1);
      this.renderForm();
      this.selectComponent(pc);

      if (window.app) {
        window.app.onFormChanged();
        window.app.updateStructureTree();
        window.app.showToast(`🗑️ Aba "${pageCaption}" removida.`);
      }
    }
  }

  selectComponent(comp) {
    this.canvas.querySelectorAll('.delphi-comp').forEach(el => el.classList.remove('selected'));

    this.selectedComponent = comp;
    if (comp) {
      // Se for uma TabSheet, sincronizar a aba ativa do PageControl pai
      if (this.isTabSheetComponent(comp.type) && comp.parent) {
        const pc = this.getComponentByName(comp.parent);
        if (pc) {
          const pages = this.form.components.filter(c =>
            this.isTabSheetComponent(c.type) && c.parent === pc.name
          );
          const tabIdx = pages.findIndex(p => p.id === comp.id);
          if (tabIdx !== -1 && pc.props.ActivePageIndex !== tabIdx) {
            pc.props.ActivePageIndex = tabIdx;
            this.renderForm();
          }
        }
      }

      const el = document.getElementById(comp.id);
      if (el) el.classList.add('selected');
    }

    if (window.app) {
      if (window.app.inspector) window.app.inspector.update(comp);
      window.app.updateStructureTree();
    }
  }

  recalculateAlignments(updateInspector = true) {
    if (!this.form || !this.form.components) return;

    const canvasW = (this.canvas && this.canvas.clientWidth > 0) ? this.canvas.clientWidth : Math.max(100, (parseInt(this.form.width, 10) || 700) - 2);
    const canvasH = (this.canvas && this.canvas.clientHeight > 0) ? this.canvas.clientHeight : Math.max(100, (parseInt(this.form.height, 10) || 480) - 30);

    const nonVisual = [
      'vox_DataSource', 'vox_Connection', 'vox_Query', 'vox_Timer', 'vox_OpenDialog', 'vox_SaveDialog',
      'vox_MemTable', 'vox_Transaction', 'vox_StoredProc', 'vox_SQLScript', 'vox_Table',
      'vox_ActionList', 'vox_PopupMenu', 'vox_RESTClient', 'vox_RESTRequest', 'vox_RESTAdapter',
      'TVoxDataSource', 'TVoxConnection', 'TVoxQuery', 'TVoxTimer', 'TVoxOpenDialog', 'TVoxSaveDialog',
      'TVoxMemTable', 'TVoxTransaction', 'TVoxStoredProc', 'TVoxSQLScript', 'TVoxTable',
      'TVoxActionList', 'TVoxPopupMenu', 'TVoxRESTClient', 'TVoxRESTRequest', 'TVoxRESTAdapter',
      'TDataSource', 'TFDConnection', 'TFDQuery', 'TTimer', 'TOpenDialog', 'TSaveDialog'
    ];

    const visualComps = this.form.components.filter(c => {
      const meta = window.VOX_COMPONENTS[c.type];
      return !(meta && meta.isNonVisual) && !nonVisual.includes(c.type);
    });
    const formName = this.form.name;

    const alignGroup = (controls, areaW, areaH, isRoot = false) => {
      let clientRect = {
        left: 0,
        top: 0,
        right: areaW,
        bottom: areaH
      };

      // Posicionar MainMenu se na raiz
      let mainMenu = null;
      if (isRoot) {
        mainMenu = controls.find(c => c.type === 'vox_MainMenu');
        if (mainMenu) {
          if (mainMenu.props && mainMenu.props.Layout === 'Left') {
            mainMenu.left = 0;
            mainMenu.top = 0;
            mainMenu.width = 180;
            mainMenu.height = areaH;
            clientRect.left = 180;
          } else {
            mainMenu.left = 0;
            mainMenu.top = 0;
            mainMenu.width = areaW;
            mainMenu.height = 38;
            clientRect.top = 38;
          }
        }
      }

      // 1. Processar alTop
      controls.filter(c => c !== mainMenu && c.props && c.props.Align === 'alTop').forEach(c => {
        c.left = clientRect.left;
        c.top = clientRect.top;
        c.width = Math.max(20, clientRect.right - clientRect.left);
        clientRect.top += (parseInt(c.height, 10) || 30);
      });

      // 2. Processar alBottom
      controls.filter(c => c !== mainMenu && c.props && c.props.Align === 'alBottom').forEach(c => {
        c.left = clientRect.left;
        c.width = Math.max(20, clientRect.right - clientRect.left);
        const h = parseInt(c.height, 10) || 30;
        clientRect.bottom -= h;
        c.top = Math.max(clientRect.top, clientRect.bottom);
      });

      // 3. Processar alLeft
      controls.filter(c => c !== mainMenu && c.props && c.props.Align === 'alLeft').forEach(c => {
        c.left = clientRect.left;
        c.top = clientRect.top;
        c.height = Math.max(20, clientRect.bottom - clientRect.top);
        const w = parseInt(c.width, 10) || 120;
        clientRect.left += w;
      });

      // 4. Processar alRight
      controls.filter(c => c !== mainMenu && c.props && c.props.Align === 'alRight').forEach(c => {
        c.top = clientRect.top;
        c.height = Math.max(20, clientRect.bottom - clientRect.top);
        const w = parseInt(c.width, 10) || 120;
        clientRect.right -= w;
        c.left = Math.max(clientRect.left, clientRect.right);
      });

      // 5. Processar alClient
      controls.filter(c => c !== mainMenu && c.props && c.props.Align === 'alClient').forEach(c => {
        c.left = clientRect.left;
        c.top = clientRect.top;
        c.width = Math.max(20, clientRect.right - clientRect.left);
        c.height = Math.max(20, clientRect.bottom - clientRect.top);
      });
    };

    // 1. Alinhar componentes na raiz do formulário
    const rootComps = visualComps.filter(c => !c.parent || c.parent === formName);
    alignGroup(rootComps, canvasW, canvasH, true);

    // 2. Alinhar componentes filhos de cada contêiner em ordem hierárquica (pais antes de filhos)
    const getDepth = (c) => {
      let depth = 0;
      let cur = c;
      while (cur && cur.parent && cur.parent !== formName) {
        depth++;
        cur = this.getComponentByName(cur.parent);
      }
      return depth;
    };

    const containers = visualComps
      .filter(c => this.isContainerComponent(c.type))
      .sort((a, b) => getDepth(a) - getDepth(b));

    containers.forEach(cont => {
      const childComps = visualComps.filter(c => c.parent === cont.name);
      if (this.isPageControlComponent(cont.type)) {
        const tabBarH = 26;
        const clientW = Math.max(20, parseInt(cont.width, 10) || 100);
        const clientH = Math.max(20, (parseInt(cont.height, 10) || 100) - tabBarH);
        const tabTop = (cont.props && cont.props.TabPosition === 'tpBottom') ? 0 : tabBarH;
        childComps.forEach(tab => {
          if (this.isTabSheetComponent(tab.type)) {
            tab.left = 0;
            tab.top = tabTop;
            tab.width = clientW;
            tab.height = clientH;
            if (!tab.props) tab.props = {};
            tab.props.Align = 'alClient';
          }
        });
      } else {
        alignGroup(childComps, parseInt(cont.width, 10) || 100, parseInt(cont.height, 10) || 100, false);
      }
    });

    // Atualizar no DOM os elementos visuais
    visualComps.forEach(c => {
      const el = document.getElementById(c.id);
      if (el) {
        if (this.isTabSheetComponent(c.type)) {
          el.style.left = '0px';
          el.style.top = '0px';
          el.style.width = '100%';
          el.style.height = '100%';
        } else {
          el.style.left = `${c.left}px`;
          el.style.top = `${c.top}px`;
          el.style.width = `${c.width}px`;
          el.style.height = `${c.height}px`;
        }

        const alignClass = c.props && c.props.Align ? c.props.Align.toLowerCase() : 'alnone';
        ['alnone', 'altop', 'albottom', 'alleft', 'alright', 'alclient'].forEach(a => {
          el.classList.remove(`delphi-comp-${a}`);
        });
        el.classList.add(`delphi-comp-${alignClass}`);
      }
    });

    if (updateInspector && this.selectedComponent && window.app && window.app.inspector) {
      window.app.inspector.renderProperties();
    }
  }

  renderForm() {
    this.form.width = parseInt(this.form.width, 10) || 700;
    this.form.height = parseInt(this.form.height, 10) || 480;
    this.formWindow.style.width = `${this.form.width}px`;
    this.formWindow.style.height = `${this.form.height}px`;
    if (this.form.left !== undefined) this.formWindow.style.left = `${this.form.left}px`;
    if (this.form.top !== undefined) this.formWindow.style.top = `${this.form.top}px`;
    const titleEl = document.getElementById('formTitleText');
    if (titleEl) titleEl.innerText = this.form.title || this.form.name || 'Form1';

    const sbStatus = document.getElementById('sbFormStatus');
    if (sbStatus) sbStatus.innerText = `${this.form.name} [${this.form.width} x ${this.form.height}]`;

    // Recalcular alinhamentos Delphi antes de renderizar
    this.recalculateAlignments(false);

    // Garantir IDs únicos para todos os componentes do formulário antes de renderizar
    this.syncIdCounter();
    const seenIds = new Set();
    this.form.components.forEach(c => {
      if (!c.id || seenIds.has(c.id)) {
        c.id = this.generateUniqueId();
      }
      seenIds.add(c.id);
    });

    // Limpeza rigorosa do canvas DOM para evitar qualquer nó órfão ou réplica fantasma
    while (this.canvas.firstChild) {
      this.canvas.removeChild(this.canvas.firstChild);
    }
    this.canvas.innerHTML = '';

    // Renderizar hierarquia: raízes primeiro, depois filhos de cada contêiner recursivamente
    const formName = this.form.name;
    const renderLevel = (parentName, targetContainerEl) => {
      const children = this.form.components.filter(c => {
        if (!parentName || parentName === formName) {
          return !c.parent || c.parent === formName;
        }
        return c.parent === parentName;
      });

      children.forEach(comp => {
        const compEl = this.renderComponent(comp, targetContainerEl);
        if (compEl && this.isContainerComponent(comp.type)) {
          const childrenSlot = compEl.querySelector('.delphi-comp-children') || compEl;
          renderLevel(comp.name, childrenSlot);
        }
      });
    };

    renderLevel(null, this.canvas);

    if (this.selectedComponent) {
      this.selectComponent(this.selectedComponent);
    }
  }

  renderComponent(comp, targetEl = null) {
    const meta = window.VOX_COMPONENTS[comp.type];
    if (!meta) return null;

    const alignClass = comp.props && comp.props.Align ? ` delphi-comp-${comp.props.Align.toLowerCase()}` : ' delphi-comp-alnone';
    const isContainer = this.isContainerComponent(comp.type);
    const isPageControl = this.isPageControlComponent(comp.type);
    const isTabSheet = this.isTabSheetComponent(comp.type);

    const extraClass = (isPageControl ? ' delphi-pagecontrol-comp' : '') +
                       (isTabSheet ? ' delphi-tabsheet-comp' : '');

    const div = document.createElement('div');
    div.id = comp.id;
    div.dataset.compId = comp.id;
    div.dataset.compName = comp.name;
    div.className = 'delphi-comp' + alignClass + (isContainer ? ' delphi-container-comp' : '') + extraClass;
    div.style.left = `${comp.left}px`;
    div.style.top = `${comp.top}px`;
    div.style.width = `${comp.width}px`;
    div.style.height = `${comp.height}px`;

    // Controle de visibilidade de TabSheet dentro do PageControl
    if (isTabSheet && comp.parent) {
      const pc = this.getComponentByName(comp.parent);
      if (pc) {
        const pages = this.form.components.filter(c =>
          this.isTabSheetComponent(c.type) && c.parent === pc.name
        );
        const activeIdx = Math.min(pages.length - 1, Math.max(0, parseInt(pc.props.ActivePageIndex, 10) || 0));
        const myIdx = pages.findIndex(p => p.id === comp.id);
        const isActive = (myIdx === activeIdx);
        div.style.display = isActive ? 'block' : 'none';
        div.style.left = '0px';
        div.style.top = '0px';
        div.style.width = '100%';
        div.style.height = '100%';
      }
    }

    div.innerHTML = `
      <div class="delphi-comp-visual">${meta.render(comp)}</div>
      <div class="delphi-comp-handles">${this.getHandlesHtml()}</div>
      ${isContainer ? '<div class="delphi-comp-children"></div>' : ''}
    `;

    div.addEventListener('click', (e) => {
      e.stopPropagation();

      // 1. Botão de adicionar nova aba (+) no PageControl
      const tabAddBtn = e.target.closest('.vcl-tab-add-btn');
      if (tabAddBtn) {
        const pcName = tabAddBtn.dataset.pagecontrol;
        const pc = this.getComponentByName(pcName) || comp;
        if (pc) this.addTabSheet(pc);
        return;
      }

      // 2. Clique em uma aba existente para alternar a página ativa
      const tabItem = e.target.closest('.vcl-tab-item');
      if (tabItem) {
        const pcName = tabItem.dataset.pagecontrol;
        const tabIdx = parseInt(tabItem.dataset.tabIndex, 10);
        const tabSheetName = tabItem.dataset.tabsheet;
        const pc = this.getComponentByName(pcName) || comp;
        if (pc) {
          const wasActive = pc.props.ActivePageIndex === tabIdx;
          const wasSelected = this.selectedComponent && (this.selectedComponent.name === tabSheetName);

          pc.props.ActivePageIndex = tabIdx;
          this.renderForm();

          // Padrão Delphi: Se clicou na aba que já estava ativa e selecionada, seleciona o PageControl pai!
          if (wasActive && wasSelected) {
            this.selectComponent(pc);
          } else {
            const tabSheet = this.getComponentByName(tabSheetName);
            if (tabSheet) {
              this.selectComponent(tabSheet);
            } else {
              this.selectComponent(pc);
            }
          }

          if (window.app) {
            window.app.onFormChanged();
            window.app.updateStructureTree();
          }
        }
        return;
      }

      // 3. Clique na barra de abas vazia (.vcl-tab-bar) fora das abas ou na borda do PageControl -> seleciona o PageControl!
      if (e.target.closest('.vcl-tab-bar') || (this.isPageControlComponent(comp.type) && !e.target.closest('.delphi-tabsheet-comp'))) {
        const pc = this.isPageControlComponent(comp.type) ? comp : (comp.parent ? this.getComponentByName(comp.parent) : comp);
        if (pc && this.isPageControlComponent(pc.type)) {
          this.selectComponent(pc);
          return;
        }
      }

      this.selectComponent(comp);
    });

    div.addEventListener('mousedown', (e) => {
      // Se clicou em uma aba ou no botão de adicionar aba (+), não iniciar arrasto do PageControl
      if (e.target.closest('.vcl-tab-add-btn') || e.target.closest('.vcl-tab-item')) {
        return;
      }

      e.stopPropagation();

      if (e.button === 2) {
        this.selectComponent(comp);
        return;
      }

      this.selectComponent(comp);

      if (e.target.classList.contains('delphi-handle')) {
        this.dragMode = 'resize';
        this.resizeHandle = e.target.dataset.handle;
      } else {
        this.dragMode = 'move';
      }

      this.dragStart = { x: e.clientX, y: e.clientY };
      this.compStart = { left: comp.left, top: comp.top, width: comp.width, height: comp.height };
    });

    // Duplo clique -> jump to OnClick
    div.addEventListener('dblclick', (e) => {
      e.stopPropagation();
      const defaultEvent = meta.events && meta.events[0] ? meta.events[0] : 'OnClick';
      if (window.app) {
        window.app.jumpToEvent(comp, defaultEvent);
      }
    });

    const parentContainer = targetEl || this.canvas;
    parentContainer.appendChild(div);
    return div;
  }

  updateComponentElement(comp) {
    const el = document.getElementById(comp.id);
    if (!el) return;

    if (this.isTabSheetComponent(comp.type)) {
      el.style.left = '0px';
      el.style.top = '0px';
      el.style.width = '100%';
      el.style.height = '100%';
    } else {
      el.style.left = `${comp.left}px`;
      el.style.top = `${comp.top}px`;
      el.style.width = `${comp.width}px`;
      el.style.height = `${comp.height}px`;
    }

    const alignClass = comp.props && comp.props.Align ? comp.props.Align.toLowerCase() : 'alnone';
    ['alnone', 'altop', 'albottom', 'alleft', 'alright', 'alclient'].forEach(a => {
      el.classList.remove(`delphi-comp-${a}`);
    });
    el.classList.add(`delphi-comp-${alignClass}`);

    const meta = window.VOX_COMPONENTS[comp.type];
    if (meta) {
      const visualEl = el.querySelector('.delphi-comp-visual');
      if (visualEl) {
        visualEl.innerHTML = meta.render(comp);
      }
    }

    if (this.isTabSheetComponent(comp.type) && comp.parent) {
      const pc = this.getComponentByName(comp.parent);
      if (pc) this.updateComponentElement(pc);
    }
    if (this.isPageControlComponent(comp.type)) {
      const tabs = this.form.components.filter(c => this.isTabSheetComponent(c.type) && c.parent === comp.name);
      tabs.forEach(t => {
        t.width = comp.width;
        t.height = Math.max(20, comp.height - 26);
      });
    }
  }

  getHandlesHtml() {
    return `
      <div class="delphi-handle dh-nw" data-handle="nw"></div>
      <div class="delphi-handle dh-n"  data-handle="n"></div>
      <div class="delphi-handle dh-ne" data-handle="ne"></div>
      <div class="delphi-handle dh-e"  data-handle="e"></div>
      <div class="delphi-handle dh-se" data-handle="se"></div>
      <div class="delphi-handle dh-s"  data-handle="s"></div>
      <div class="delphi-handle dh-sw" data-handle="sw"></div>
      <div class="delphi-handle dh-w"  data-handle="w"></div>
    `;
  }

  handleGlobalMouseMove(e) {
    if (!this.dragMode) return;

    const dx = e.clientX - this.dragStart.x;
    const dy = e.clientY - this.dragStart.y;

    // 1. Redimensionamento do Formulário via Mouse (Alças Delphi)
    if (this.dragMode === 'form-resize') {
      const dir = this.formResizeDir;

      if (dir === 'r' || dir === 'br') {
        const newW = Math.max(200, this.snap(this.formStart.width + dx));
        this.form.width = newW;
        this.formWindow.style.width = `${newW}px`;
      }
      if (dir === 'b' || dir === 'br') {
        const newH = Math.max(140, this.snap(this.formStart.height + dy));
        this.form.height = newH;
        this.formWindow.style.height = `${newH}px`;
      }

      // Recalcular todos os componentes alinhados (alTop, alBottom, alLeft, alRight, alClient) ao vivo!
      this.recalculateAlignments();

      // Atualizar status bar: Form1 [W x H]
      const sbStatus = document.getElementById('sbFormStatus');
      if (sbStatus) {
        sbStatus.innerText = `${this.form.name} [${this.form.width} x ${this.form.height}]`;
      }

      // Atualizar Object Inspector caso o Form esteja inspecionado
      if (window.app && window.app.inspector && !this.selectedComponent) {
        window.app.inspector.renderProperties();
      }
      return;
    }

    // 2. Mover Form pela Barra de Título (Titlebar)
    if (this.dragMode === 'form-move') {
      const newL = Math.max(10, this.snap(this.formPosStart.left + dx));
      const newT = Math.max(10, this.snap(this.formPosStart.top + dy));
      this.formWindow.style.left = `${newL}px`;
      this.formWindow.style.top = `${newT}px`;
      return;
    }

    // 3. Componentes no Form
    if (!this.selectedComponent) return;
    const comp = this.selectedComponent;
    const align = (comp.props && comp.props.Align) || 'alNone';

    if (this.dragMode === 'move') {
      if (align !== 'alNone') {
        // Componentes alinhados (alTop, alBottom, alLeft, alRight, alClient)
        // não podem ser movidos livremente com o mouse (Regra Delphi VCL)
        return;
      }
      comp.left = Math.max(0, this.snap(this.compStart.left + dx));
      comp.top = Math.max(0, this.snap(this.compStart.top + dy));
      this.updateComponentElement(comp);
    } else if (this.dragMode === 'resize') {
      const h = this.resizeHandle;

      if (align === 'alClient') {
        // alClient preenche o formulário por completo e não aceita resize manual de bordas
        return;
      }

      if (align === 'alTop') {
        // alTop só permite redimensionar a altura (puxando a alça sul 's')
        if (h && h.includes('s')) {
          comp.height = Math.max(16, this.snap(this.compStart.height + dy));
          this.recalculateAlignments();
        }
        return;
      }

      if (align === 'alBottom') {
        // alBottom só permite redimensionar a altura (puxando a alça norte 'n')
        if (h && h.includes('n')) {
          comp.height = Math.max(16, this.snap(this.compStart.height - dy));
          this.recalculateAlignments();
        }
        return;
      }

      if (align === 'alLeft') {
        // alLeft só permite redimensionar a largura (puxando a alça leste 'e')
        if (h && h.includes('e')) {
          comp.width = Math.max(16, this.snap(this.compStart.width + dx));
          this.recalculateAlignments();
        }
        return;
      }

      if (align === 'alRight') {
        // alRight só permite redimensionar a largura (puxando a alça oeste 'w')
        if (h && h.includes('w')) {
          comp.width = Math.max(16, this.snap(this.compStart.width - dx));
          this.recalculateAlignments();
        }
        return;
      }

      // alNone: redimensionamento manual livre em qualquer alça
      if (h.includes('e')) {
        comp.width = Math.max(16, this.snap(this.compStart.width + dx));
      }
      if (h.includes('s')) {
        comp.height = Math.max(14, this.snap(this.compStart.height + dy));
      }
      if (h.includes('w')) {
        const newW = Math.max(16, this.snap(this.compStart.width - dx));
        comp.left = this.snap(this.compStart.left + (this.compStart.width - newW));
        comp.width = newW;
      }
      if (h.includes('n')) {
        const newH = Math.max(14, this.snap(this.compStart.height - dy));
        comp.top = this.snap(this.compStart.top + (this.compStart.height - newH));
        comp.height = newH;
      }

      this.updateComponentElement(comp);
    }

    if (window.app && window.app.inspector) {
      window.app.inspector.update(comp);
    }
  }
}

window.VoxDesigner = VoxDesigner;
