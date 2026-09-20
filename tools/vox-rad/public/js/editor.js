// ==============================================================================
// tools/vox-rad/public/js/editor.js — Editor de Código com Calha de Breakpoints e Debug Delphi
// ==============================================================================

class VoxCodeEditor {
  constructor(containerElement, textareaElement, lineNumbersElement) {
    this.container = containerElement;
    this.textarea = textareaElement;
    this.lineNumbers = lineNumbersElement;
    this.highlightLayer = document.getElementById('codeHighlightLayer');
    this.currentCode = '';
    this.hoverTooltip = null;

    // Font size control (Delphi-style)
    this.fontSize = parseInt(localStorage.getItem('vox_editor_font_size')) || 13;
    this.fontFamily = localStorage.getItem('vox_editor_font_family') || "'JetBrains Mono', Consolas, monospace";
    this.minFontSize = 8;
    this.maxFontSize = 28;

    this.init();
    this.applyFontSettings();
  }

  init() {
    // Sincronização de texto
    this.textarea.addEventListener('input', () => {
      this.currentCode = this.textarea.value;
      this.renderGutterAndHighlights();
    });

    // Sincronização de rolagem (Scroll) entre Gutter, Realces e Textarea
    this.textarea.addEventListener('scroll', () => {
      if (this.lineNumbers) this.lineNumbers.scrollTop = this.textarea.scrollTop;
      if (this.highlightLayer) this.highlightLayer.scrollTop = this.textarea.scrollTop;
    });

    // Suporte a indentação com Tab e atalhos de depuração (F5, F8, F7, F9, Ctrl+F2)
    this.textarea.addEventListener('keydown', (e) => {
      if (e.key === 'Tab') {
        e.preventDefault();
        const start = this.textarea.selectionStart;
        const end = this.textarea.selectionEnd;
        this.textarea.value = this.textarea.value.substring(0, start) + '    ' + this.textarea.value.substring(end);
        this.textarea.selectionStart = this.textarea.selectionEnd = start + 4;
        this.renderGutterAndHighlights();
        return;
      }

      // F5: Toggle Breakpoint na linha atual (Delphi Style)
      if (e.key === 'F5') {
        e.preventDefault();
        if (window.app && window.app.debugger) {
          window.app.debugger.toggleBreakpointCurrentLine();
        }
        return;
      }

      // F8: Step Over
      if (e.key === 'F8') {
        e.preventDefault();
        if (window.app) window.app.stepOver();
        return;
      }

      // F7: Step Into
      if (e.key === 'F7') {
        e.preventDefault();
        if (window.app) window.app.stepInto();
        return;
      }

      // Ctrl+F2: Stop Debug (Program Reset)
      if (e.ctrlKey && e.key === 'F2') {
        e.preventDefault();
        if (window.app) window.app.stopDebug();
        return;
      }
    });

    // Delegação de clique na Gutter para alternar Breakpoint
    if (this.lineNumbers) {
      this.lineNumbers.addEventListener('click', (e) => {
        const lineRow = e.target.closest('.gutter-line');
        if (!lineRow) return;
        const line = parseInt(lineRow.dataset.line, 10);
        if (line && window.app && window.app.debugger) {
          window.app.debugger.toggleBreakpoint(line);
        }
      });
    }

    // Criar Tooltip de Inspeção Rápida no Hover (Delphi Evaluate Tooltip)
    this.createHoverTooltip();
  }

  setCode(code) {
    this.currentCode = code;
    this.textarea.value = code;
    this.renderGutterAndHighlights();
  }

  getCode() {
    return this.textarea.value;
  }

  getCurrentCursorLine() {
    const pos = this.textarea.selectionStart;
    return this.textarea.value.substring(0, pos).split('\n').length;
  }

  updateLineNumbers() {
    this.renderGutterAndHighlights();
  }

  // --------------------------------------------------------------------------
  // Renderização da Calha (Gutter) e da Camada de Realce (Highlight Layer)
  // --------------------------------------------------------------------------
  renderGutterAndHighlights() {
    if (!this.lineNumbers) return;

    const lines = this.textarea.value.split('\n');
    const totalLines = lines.length;

    const dbg = window.app ? window.app.debugger : null;
    const currentExecLine = dbg ? dbg.currentLine : null;

    let gutterHtml = '';
    let highlightHtml = '';

    for (let i = 1; i <= totalLines; i++) {
      const isBp = dbg ? dbg.isBreakpoint(i) : false;
      const isExec = currentExecLine === i;

      let gutterClasses = 'gutter-line';
      let hlClasses = 'code-hl-line';

      if (isBp && isExec) {
        gutterClasses += ' has-bp has-exec';
        hlClasses += ' bp-exec-line';
      } else if (isExec) {
        gutterClasses += ' has-exec';
        hlClasses += ' exec-line';
      } else if (isBp) {
        gutterClasses += ' has-bp';
        hlClasses += ' bp-line';
      }

      gutterHtml += `
        <div class="${gutterClasses}" data-line="${i}">
          <div class="gutter-bp-slot" title="Clique para alternar ponto de parada (F5)">
            ${isExec ? '<span class="exec-arrow-icon">➡️</span>' : (isBp ? '<span class="bp-dot-icon">🔴</span>' : '')}
          </div>
          <div class="gutter-line-num">${i}</div>
        </div>
      `;

      highlightHtml += `<div class="${hlClasses}"></div>`;
    }

    this.lineNumbers.innerHTML = gutterHtml;

    if (!this.highlightLayer) {
      this.highlightLayer = document.getElementById('codeHighlightLayer');
    }
    if (this.highlightLayer) {
      this.highlightLayer.innerHTML = highlightHtml;
    }
  }

  // --------------------------------------------------------------------------
  // Rolar até a Linha (com Suavidade e Centralização)
  // --------------------------------------------------------------------------
  scrollToLine(lineNumber) {
    lineNumber = parseInt(lineNumber, 10);
    if (!lineNumber || isNaN(lineNumber)) return;

    const lineHeight = 22; // altura de cada linha em px
    const targetScroll = Math.max(0, (lineNumber - 5) * lineHeight);

    this.textarea.scrollTop = targetScroll;
    if (this.lineNumbers) this.lineNumbers.scrollTop = targetScroll;
    if (this.highlightLayer) this.highlightLayer.scrollTop = targetScroll;

    // Posicionar cursor na linha
    const lines = this.textarea.value.split('\n');
    let charPos = 0;
    for (let i = 0; i < lineNumber - 1 && i < lines.length; i++) {
      charPos += lines[i].length + 1;
    }
    this.textarea.focus();
    this.textarea.setSelectionRange(charPos, charPos + (lines[lineNumber - 1] || '').length);

    this.renderGutterAndHighlights();
  }

  // --------------------------------------------------------------------------
  // Pular direto para um Método de Evento no Código
  // --------------------------------------------------------------------------
  jumpToMethod(methodName) {
    const code = this.textarea.value;
    const targetStr = `pub fn ${methodName}`;
    const index = code.indexOf(targetStr);

    if (index !== -1) {
      const line = code.substring(0, index).split('\n').length;
      this.scrollToLine(line);

      if (window.app) {
        window.app.log(`Editor focado no método [${methodName}] na linha ${line}`);
      }
    }
  }

  // --------------------------------------------------------------------------
  // Tooltip de Avaliação Rápida ao Passar o Mouse (Hover Evaluate)
  // --------------------------------------------------------------------------
  createHoverTooltip() {
    this.hoverTooltip = document.createElement('div');
    this.hoverTooltip.className = 'delphi-evaluate-tooltip';
    this.hoverTooltip.style.display = 'none';
    document.body.appendChild(this.hoverTooltip);

    this.textarea.addEventListener('mousemove', (e) => {
      const dbg = window.app ? window.app.debugger : null;
      if (!dbg || dbg.state !== 'PAUSED') {
        this.hoverTooltip.style.display = 'none';
        return;
      }

      // Estimar palavra sob o cursor do mouse
      const rect = this.textarea.getBoundingClientRect();
      const x = e.clientX - rect.left - 16;
      const y = e.clientY - rect.top - 12 + this.textarea.scrollTop;

      const lineIdx = Math.floor(y / 22);
      const lines = this.textarea.value.split('\n');
      const lineText = lines[lineIdx] || '';

      const charWidth = 7.8; // aprox largura de caractere JetBrains Mono 13px
      const colIdx = Math.floor(x / charWidth);

      if (colIdx >= 0 && colIdx < lineText.length) {
        // Encontrar palavra sob a coluna
        const before = lineText.substring(0, colIdx);
        const after = lineText.substring(colIdx);
        const wordBefore = (before.match(/[a-zA-Z0-9_]+$/) || [''])[0];
        const wordAfter = (after.match(/^[a-zA-Z0-9_]+/) || [''])[0];
        const fullWord = wordBefore + wordAfter;

        if (fullWord && dbg.locals[fullWord]) {
          const item = dbg.locals[fullWord];
          this.hoverTooltip.innerHTML = `
            <div style="font-weight:700; color:#38bdf8;">${fullWord}</div>
            <div style="color:#22c55e;">Valor: <strong>${item.value}</strong></div>
            <div style="color:#94a3b8; font-size:10px;">Tipo: ${item.type}</div>
          `;
          this.hoverTooltip.style.left = `${e.clientX + 14}px`;
          this.hoverTooltip.style.top = `${e.clientY + 14}px`;
          this.hoverTooltip.style.display = 'block';
          return;
        }
      }

      this.hoverTooltip.style.display = 'none';
    });

    this.textarea.addEventListener('mouseleave', () => {
      if (this.hoverTooltip) this.hoverTooltip.style.display = 'none';
    });
  }

  // --------------------------------------------------------------------------
  // Controles de Fonte do Editor (Delphi-style +/- Font Size)
  // --------------------------------------------------------------------------
  applyFontSettings() {
    const lineHeight = Math.round(this.fontSize * 1.7);
    const style = `font-family: ${this.fontFamily}; font-size: ${this.fontSize}px; line-height: ${lineHeight}px;`;

    if (this.textarea) {
      this.textarea.style.fontFamily = this.fontFamily;
      this.textarea.style.fontSize = this.fontSize + 'px';
      this.textarea.style.lineHeight = lineHeight + 'px';
    }
    if (this.lineNumbers) {
      this.lineNumbers.style.fontSize = this.fontSize + 'px';
      this.lineNumbers.style.lineHeight = lineHeight + 'px';
    }
    if (this.highlightLayer) {
      this.highlightLayer.style.lineHeight = lineHeight + 'px';
    }

    // Update the gutter line height for breakpoints
    const gutterLines = this.lineNumbers ? this.lineNumbers.querySelectorAll('.gutter-line') : [];
    gutterLines.forEach(gl => {
      gl.style.height = lineHeight + 'px';
    });

    // Update highlight layer lines
    const hlLines = this.highlightLayer ? this.highlightLayer.querySelectorAll('.code-hl-line') : [];
    hlLines.forEach(hl => {
      hl.style.height = lineHeight + 'px';
    });

    // Persist
    try {
      localStorage.setItem('vox_editor_font_size', this.fontSize);
      localStorage.setItem('vox_editor_font_family', this.fontFamily);
    } catch(e) {}

    // Update font size indicator in toolbar
    const indicator = document.getElementById('editorFontSizeLabel');
    if (indicator) indicator.innerText = this.fontSize + 'px';
    const famSelect = document.getElementById('editorFontFamilySelect');
    if (famSelect && famSelect.value !== this.fontFamily) {
      famSelect.value = this.fontFamily;
    }
  }

  increaseFontSize() {
    if (this.fontSize < this.maxFontSize) {
      this.fontSize++;
      this.applyFontSettings();
      this.renderGutterAndHighlights();
    }
  }

  decreaseFontSize() {
    if (this.fontSize > this.minFontSize) {
      this.fontSize--;
      this.applyFontSettings();
      this.renderGutterAndHighlights();
    }
  }

  setFontSize(size) {
    size = parseInt(size, 10);
    if (isNaN(size)) return;
    this.fontSize = Math.max(this.minFontSize, Math.min(this.maxFontSize, size));
    this.applyFontSettings();
    this.renderGutterAndHighlights();
  }

  setFontFamily(family) {
    this.fontFamily = family || "'JetBrains Mono', Consolas, monospace";
    this.applyFontSettings();
  }
}

window.VoxCodeEditor = VoxCodeEditor;
