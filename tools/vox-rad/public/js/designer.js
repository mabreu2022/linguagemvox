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

    this.dragMode = null;
    this.resizeHandle = null;
    this.dragStart = { x: 0, y: 0 };
    this.compStart = { left: 0, top: 0, width: 0, height: 0 };

    this.initEvents();
    this.renderForm();
  }

  snap(val) {
    if (!this.isSnapping || this.gridSnap <= 1) return Math.round(val);
    return Math.round(val / this.gridSnap) * this.gridSnap;
  }

  initEvents() {
    this.canvas.addEventListener('mousedown', (e) => {
      if (e.target === this.canvas) {
        this.selectComponent(null);
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
        const rect = this.canvas.getBoundingClientRect();
        const dropX = this.snap(e.clientX - rect.left);
        const dropY = this.snap(e.clientY - rect.top);
        this.addComponent(compType, dropX, dropY);
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
          if ((wasFormResize || wasFormMove) && window.app.inspector && !this.selectedComponent) {
            window.app.inspector.update(null);
          }
        }
      }
    });

    window.addEventListener('keydown', (e) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)) return;
      if (!this.selectedComponent) return;

      const step = e.shiftKey ? 8 : 1;
      let moved = false;

      if (e.key === 'Delete' || e.key === 'Backspace') {
        this.deleteSelected();
        e.preventDefault();
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
      } else if (e.ctrlKey && e.key.toLowerCase() === 'd') {
        this.duplicateSelected();
        e.preventDefault();
      }

      if (moved) {
        e.preventDefault();
        this.updateComponentElement(this.selectedComponent);
        if (window.app && window.app.inspector) window.app.inspector.update(this.selectedComponent);
      }
    });
  }

  addComponent(type, left, top) {
    const meta = window.VOX_COMPONENTS[type];
    if (!meta) return;

    let seq = 1;
    let baseName = type.startsWith('T') ? type.substring(1) : type;
    while (this.form.components.some(c => c.name === `${baseName}${seq}`)) {
      seq++;
    }
    const name = `${baseName}${seq}`;

    const newComp = {
      id: 'comp_' + (this.idCounter++),
      name: name,
      type: type,
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

    this.form.components.push(newComp);
    this.recalculateAlignments(false);
    this.renderComponent(newComp);
    this.selectComponent(newComp);

    if (window.app) {
      window.app.onFormChanged();
      window.app.updateStructureTree();
    }

    return newComp;
  }

  deleteSelected() {
    if (!this.selectedComponent) return;
    const el = document.getElementById(this.selectedComponent.id);
    if (el) el.remove();

    this.form.components = this.form.components.filter(c => c.id !== this.selectedComponent.id);
    this.recalculateAlignments(false);
    this.selectComponent(null);

    if (window.app) {
      window.app.onFormChanged();
      window.app.updateStructureTree();
    }
  }

  duplicateSelected() {
    if (!this.selectedComponent) return;
    const clone = JSON.parse(JSON.stringify(this.selectedComponent));
    const comp = this.addComponent(clone.type, clone.left + 16, clone.top + 16);
    comp.props = clone.props;
    comp.width = clone.width;
    comp.height = clone.height;
    this.updateComponentElement(comp);
    if (window.app) window.app.onFormChanged();
  }

  selectComponent(comp) {
    this.canvas.querySelectorAll('.delphi-comp').forEach(el => el.classList.remove('selected'));

    this.selectedComponent = comp;
    if (comp) {
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

    const canvasW = (this.canvas && this.canvas.clientWidth > 0) ? this.canvas.clientWidth : (parseInt(this.form.width, 10) || 700);
    const canvasH = (this.canvas && this.canvas.clientHeight > 0) ? this.canvas.clientHeight : ((parseInt(this.form.height, 10) || 480) - 29);

    const nonVisual = [
      'vox_DataSource', 'vox_Connection', 'vox_Query', 'vox_Timer', 'vox_OpenDialog', 'vox_SaveDialog',
      'TDataSource', 'TFDConnection', 'TFDQuery'
    ];

    let clientRect = {
      left: 0,
      top: 0,
      right: canvasW,
      bottom: canvasH
    };

    const visualComps = this.form.components.filter(c => !nonVisual.includes(c.type));

    // Posicionar MainMenu se existir
    const mainMenu = visualComps.find(c => c.type === 'vox_MainMenu');
    if (mainMenu) {
      if (mainMenu.props && mainMenu.props.Layout === 'Left') {
        mainMenu.left = 0;
        mainMenu.top = 0;
        mainMenu.width = 180;
        mainMenu.height = canvasH;
        clientRect.left = 180;
      } else {
        mainMenu.left = 0;
        mainMenu.top = 0;
        mainMenu.width = canvasW;
        mainMenu.height = 38;
        clientRect.top = 38;
      }
    }

    // 1. Processar alTop
    visualComps.filter(c => c !== mainMenu && c.props && c.props.Align === 'alTop').forEach(c => {
      c.left = clientRect.left;
      c.top = clientRect.top;
      c.width = Math.max(20, clientRect.right - clientRect.left);
      clientRect.top += (parseInt(c.height, 10) || 30);
    });

    // 2. Processar alBottom
    visualComps.filter(c => c !== mainMenu && c.props && c.props.Align === 'alBottom').forEach(c => {
      c.left = clientRect.left;
      c.width = Math.max(20, clientRect.right - clientRect.left);
      const h = parseInt(c.height, 10) || 30;
      clientRect.bottom -= h;
      c.top = Math.max(clientRect.top, clientRect.bottom);
    });

    // 3. Processar alLeft
    visualComps.filter(c => c !== mainMenu && c.props && c.props.Align === 'alLeft').forEach(c => {
      c.left = clientRect.left;
      c.top = clientRect.top;
      c.height = Math.max(20, clientRect.bottom - clientRect.top);
      const w = parseInt(c.width, 10) || 120;
      clientRect.left += w;
    });

    // 4. Processar alRight
    visualComps.filter(c => c !== mainMenu && c.props && c.props.Align === 'alRight').forEach(c => {
      c.top = clientRect.top;
      c.height = Math.max(20, clientRect.bottom - clientRect.top);
      const w = parseInt(c.width, 10) || 120;
      clientRect.right -= w;
      c.left = Math.max(clientRect.left, clientRect.right);
    });

    // 5. Processar alClient (ex.: vox_DBGrid preenchendo toda a área útil restante)
    visualComps.filter(c => c !== mainMenu && c.props && c.props.Align === 'alClient').forEach(c => {
      c.left = clientRect.left;
      c.top = clientRect.top;
      c.width = Math.max(20, clientRect.right - clientRect.left);
      c.height = Math.max(20, clientRect.bottom - clientRect.top);
    });

    // Atualizar no DOM os elementos visuais
    visualComps.forEach(c => {
      const el = document.getElementById(c.id);
      if (el) {
        el.style.left = `${c.left}px`;
        el.style.top = `${c.top}px`;
        el.style.width = `${c.width}px`;
        el.style.height = `${c.height}px`;

        if (c.props && c.props.Align === 'alClient') {
          el.classList.add('delphi-comp-alclient');
        } else {
          el.classList.remove('delphi-comp-alclient');
        }
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

    this.canvas.innerHTML = '';
    this.form.components.forEach(comp => {
      this.renderComponent(comp);
    });

    if (this.selectedComponent) {
      this.selectComponent(this.selectedComponent);
    }
  }

  renderComponent(comp) {
    const meta = window.VOX_COMPONENTS[comp.type];
    if (!meta) return;

    const isClient = comp.props && comp.props.Align === 'alClient';
    const div = document.createElement('div');
    div.id = comp.id;
    div.className = 'delphi-comp' + (isClient ? ' delphi-comp-alclient' : '');
    div.style.left = `${comp.left}px`;
    div.style.top = `${comp.top}px`;
    div.style.width = `${comp.width}px`;
    div.style.height = `${comp.height}px`;

    div.innerHTML = meta.render(comp) + this.getHandlesHtml();

    div.addEventListener('mousedown', (e) => {
      e.stopPropagation();

      if (e.target.classList.contains('delphi-handle')) {
        this.dragMode = 'resize';
        this.resizeHandle = e.target.dataset.handle;
      } else {
        this.dragMode = 'move';
      }

      this.selectComponent(comp);
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

    this.canvas.appendChild(div);
  }

  updateComponentElement(comp) {
    const el = document.getElementById(comp.id);
    if (!el) return;

    el.style.left = `${comp.left}px`;
    el.style.top = `${comp.top}px`;
    el.style.width = `${comp.width}px`;
    el.style.height = `${comp.height}px`;

    if (comp.props && comp.props.Align === 'alClient') {
      el.classList.add('delphi-comp-alclient');
    } else {
      el.classList.remove('delphi-comp-alclient');
    }

    const meta = window.VOX_COMPONENTS[comp.type];
    if (meta) {
      el.innerHTML = meta.render(comp) + this.getHandlesHtml();
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
