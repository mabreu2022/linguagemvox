// ==============================================================================
// tools/vox-rad/public/js/debugger.js — Motor de Depuração Delphi-Style para Vox
// ==============================================================================

class VoxDebugger {
  constructor(app) {
    this.app = app;
    this.breakpoints = new Map(); // line -> { line, file, enabled, condition }
    this.state = 'IDLE'; // 'IDLE' | 'RUNNING' | 'PAUSED' | 'STEPPING'
    this.currentFile = 'Unit1.vox';
    this.currentLine = null;
    this.callStack = [];
    this.locals = {};
    this.watches = [
      { id: 'w1', expr: 'sender', value: 'null', type: 'Any' },
      { id: 'w2', expr: 'this.caption', value: '"Form1"', type: 'String' }
    ];
    this.consoleLogs = [];

    // Linhas de execução do método em depuração
    this.steppingMethod = null;
    this.methodLines = [];
    this.currentMethodLineIndex = 0;

    this.activeTab = 'breakpoints'; // 'breakpoints' | 'watches' | 'callstack' | 'locals' | 'console'
  }

  // --------------------------------------------------------------------------
  // 1. Gerenciamento de Pontos de Parada (Breakpoints)
  // --------------------------------------------------------------------------
  toggleBreakpoint(line, file = this.currentFile) {
    line = parseInt(line, 10);
    if (!line || isNaN(line)) return;

    if (this.breakpoints.has(line)) {
      this.breakpoints.delete(line);
      this.logConsole(`Ponto de parada removido na linha ${line} (${file})`, 'info');
      if (this.app) this.app.log(`🔴 Breakpoint removido na linha ${line}`);
    } else {
      this.breakpoints.set(line, {
        line,
        file,
        enabled: true,
        condition: ''
      });
      this.logConsole(`Ponto de parada definido na linha ${line} (${file})`, 'info');
      if (this.app) this.app.log(`🔴 Breakpoint adicionado na linha ${line}`);
    }

    this.updateEditorHighlights();
    this.renderDebugDock();
  }

  setBreakpoint(line, file = this.currentFile, enabled = true, condition = '') {
    line = parseInt(line, 10);
    this.breakpoints.set(line, { line, file, enabled, condition });
    this.updateEditorHighlights();
    this.renderDebugDock();
  }

  removeBreakpoint(line) {
    this.breakpoints.delete(parseInt(line, 10));
    this.updateEditorHighlights();
    this.renderDebugDock();
  }

  clearAllBreakpoints() {
    this.breakpoints.clear();
    this.logConsole('Todos os pontos de parada foram removidos.', 'info');
    this.updateEditorHighlights();
    this.renderDebugDock();
    if (this.app) this.app.log('⚪ Todos os breakpoints foram limpos.');
  }

  toggleBreakpointCurrentLine() {
    if (!this.app || !this.app.editor) return;
    const line = this.app.editor.getCurrentCursorLine();
    if (line) {
      this.toggleBreakpoint(line);
    }
  }

  isBreakpoint(line) {
    const bp = this.breakpoints.get(parseInt(line, 10));
    return bp && bp.enabled;
  }

  getBreakpointsList() {
    return Array.from(this.breakpoints.values()).sort((a, b) => a.line - b.line);
  }

  // --------------------------------------------------------------------------
  // 2. Interceptação de Eventos e Ponto de Parada ao Vivo
  // --------------------------------------------------------------------------
  handleLiveEvent(compName, eventName, handlerName, eventData = {}) {
    if (!this.app || !this.app.editor) return false;

    const code = this.app.editor.getCode();
    const parsed = this.parseMethodRange(code, handlerName);

    if (!parsed) {
      // Método não encontrado no código
      return false;
    }

    const { startLine, endLine, lines } = parsed;

    // Verificar se existe algum breakpoint ativo dentro do método
    let hitLine = null;
    for (let l = startLine; l <= endLine; l++) {
      if (this.isBreakpoint(l)) {
        hitLine = l;
        break;
      }
    }

    if (!hitLine) {
      // Nenhum breakpoint nesta função, executa normalmente
      return false;
    }

    // BREAKPOINT ATINGIDO!
    this.pauseAtBreakpoint({
      line: hitLine,
      methodName: handlerName,
      compName,
      eventName,
      startLine,
      endLine,
      lines,
      eventData
    });

    return true;
  }

  parseMethodRange(code, methodName) {
    const lines = code.split('\n');
    let startLine = -1;
    let endLine = -1;
    let braceCount = 0;
    let methodFound = false;

    for (let i = 0; i < lines.length; i++) {
      const lineText = lines[i];
      const lineNum = i + 1;

      if (!methodFound) {
        if (lineText.includes(`pub fn ${methodName}`) || lineText.includes(`fn ${methodName}`)) {
          methodFound = true;
          startLine = lineNum;
          braceCount += (lineText.match(/\{/g) || []).length;
          braceCount -= (lineText.match(/\}/g) || []).length;
          if (braceCount === 0 && lineText.includes('{')) {
            endLine = lineNum;
            break;
          }
        }
      } else {
        braceCount += (lineText.match(/\{/g) || []).length;
        braceCount -= (lineText.match(/\}/g) || []).length;
        if (braceCount <= 0) {
          endLine = lineNum;
          break;
        }
      }
    }

    if (startLine !== -1) {
      if (endLine === -1) endLine = Math.min(lines.length, startLine + 10);
      return { startLine, endLine, lines };
    }

    return null;
  }

  pauseAtBreakpoint(context) {
    this.state = 'PAUSED';
    this.currentLine = context.line;
    this.steppingMethod = context;

    // Extrair lista de linhas executáveis dentro da função
    this.methodLines = [];
    for (let l = context.startLine; l <= context.endLine; l++) {
      const lineText = context.lines[l - 1] || '';
      const trimmed = lineText.trim();
      if (trimmed && !trimmed.startsWith('//') && !trimmed.startsWith('/*') && trimmed !== '}') {
        this.methodLines.push(l);
      }
    }
    this.currentMethodLineIndex = this.methodLines.indexOf(context.line);
    if (this.currentMethodLineIndex === -1) this.currentMethodLineIndex = 0;

    // Configurar Call Stack estilo Delphi
    this.callStack = [
      {
        fnName: `pub fn ${context.methodName}(sender: any)`,
        file: this.currentFile,
        line: this.currentLine,
        depth: 0
      },
      {
        fnName: `${context.compName}.${context.eventName} (VCL Dispatcher)`,
        file: 'vox_runtime.vcl',
        line: 142,
        depth: 1
      },
      {
        fnName: `Application.RunLoop()`,
        file: 'vox_app.vcl',
        line: 88,
        depth: 2
      }
    ];

    // Configurar variáveis locais do escopo
    this.locals = {
      'sender': { value: `${context.compName}`, type: 'Component' },
      'this': { value: `TVox${this.app.designer.form.name}`, type: 'TVoxForm' },
      'event': { value: `"${context.eventName}"`, type: 'String' },
      'time': { value: `"${new Date().toLocaleTimeString()}"`, type: 'String' }
    };

    // Analisar variáveis declaradas até a linha atual
    this.parseLocalVariablesUpToLine(context.lines, context.startLine, this.currentLine);

    // Avaliar watches
    this.refreshWatches();

    // Mensagem de log
    this.logConsole(`🛑 Pausado no ponto de parada: Linha ${this.currentLine} em ${context.methodName}()`, 'step');
    if (this.app) {
      this.app.log(`🛑 [DEBUG] Pausado no Breakpoint da linha ${this.currentLine}`);
      this.app.switchView('code');
      this.app.editor.scrollToLine(this.currentLine);
    }

    // Exibir dock de depuração e atualizar interface
    this.showDebugDock();
    this.updateEditorHighlights();
    this.renderDebugDock();
    this.updateToolbarState();
  }

  parseLocalVariablesUpToLine(lines, startLine, currentLine) {
    for (let l = startLine; l < currentLine; l++) {
      const text = lines[l - 1] || '';
      const matchLet = text.match(/let\s+(mut\s+)?([a-zA-Z0-9_]+)\s*(:\s*([a-zA-Z0-9_]+))?\s*=\s*([^;]+);/);
      if (matchLet) {
        const varName = matchLet[2];
        const varType = matchLet[4] || 'Any';
        const rawVal = matchLet[5].trim();
        this.locals[varName] = { value: rawVal, type: varType };
      }
    }
  }

  // --------------------------------------------------------------------------
  // 3. Execução Passo a Passo (Step Over, Step Into, Step Out, Continue, Stop)
  // --------------------------------------------------------------------------
  stepOver() {
    if (this.state !== 'PAUSED') {
      this.startDebug();
      return;
    }

    if (!this.steppingMethod || this.methodLines.length === 0) {
      this.stop();
      return;
    }

    // Executar a linha atual antes de avançar
    const currentCodeLine = this.app.editor.getCode().split('\n')[this.currentLine - 1] || '';
    this.executeSimulatedLine(currentCodeLine);

    this.currentMethodLineIndex++;

    if (this.currentMethodLineIndex < this.methodLines.length) {
      this.currentLine = this.methodLines[this.currentMethodLineIndex];
      if (this.callStack[0]) this.callStack[0].line = this.currentLine;

      this.logConsole(`⤵ Step Over ➔ Linha ${this.currentLine}`, 'step');
      if (this.app) {
        this.app.editor.scrollToLine(this.currentLine);
      }
      this.refreshWatches();
      this.updateEditorHighlights();
      this.renderDebugDock();
    } else {
      this.logConsole(`✔️ Fim do método ${this.steppingMethod.methodName}() alcançado.`, 'info');
      this.finishExecution();
    }
  }

  stepInto() {
    if (this.state !== 'PAUSED') {
      this.startDebug();
      return;
    }

    this.logConsole(`⤷ Step Into na linha ${this.currentLine}`, 'step');
    this.stepOver();
  }

  stepOut() {
    if (this.state !== 'PAUSED') return;

    this.logConsole(`⤴ Step Out: executando até o fim da função atual...`, 'step');
    this.finishExecution();
  }

  runToCursor() {
    if (!this.app || !this.app.editor) return;
    const targetLine = this.app.editor.getCurrentCursorLine();
    if (!targetLine) return;

    this.logConsole(`🎯 Executando até o cursor na linha ${targetLine}...`, 'info');

    if (this.state === 'PAUSED' && this.methodLines.includes(targetLine)) {
      while (this.currentLine !== targetLine && this.currentMethodLineIndex < this.methodLines.length - 1) {
        const lineText = this.app.editor.getCode().split('\n')[this.currentLine - 1] || '';
        this.executeSimulatedLine(lineText);
        this.currentMethodLineIndex++;
        this.currentLine = this.methodLines[this.currentMethodLineIndex];
      }
      if (this.callStack[0]) this.callStack[0].line = this.currentLine;
      this.app.editor.scrollToLine(this.currentLine);
      this.refreshWatches();
      this.updateEditorHighlights();
      this.renderDebugDock();
    } else {
      this.setBreakpoint(targetLine, this.currentFile, true);
      this.continueExecution();
    }
  }

  continueExecution() {
    if (this.state !== 'PAUSED') {
      this.startDebug();
      return;
    }

    this.logConsole(`▶ Continuando execução até o próximo ponto de parada...`, 'info');

    let nextBpLine = null;
    for (let i = this.currentMethodLineIndex + 1; i < this.methodLines.length; i++) {
      const l = this.methodLines[i];
      if (this.isBreakpoint(l)) {
        nextBpLine = l;
        this.currentMethodLineIndex = i;
        break;
      }
    }

    if (nextBpLine) {
      this.currentLine = nextBpLine;
      if (this.callStack[0]) this.callStack[0].line = this.currentLine;
      this.logConsole(`🛑 Pausado no próximo ponto de parada: Linha ${this.currentLine}`, 'step');
      if (this.app) this.app.editor.scrollToLine(this.currentLine);
      this.refreshWatches();
      this.updateEditorHighlights();
      this.renderDebugDock();
    } else {
      this.finishExecution();
    }
  }

  executeSimulatedLine(lineText) {
    if (!lineText) return;
    const trimmed = lineText.trim();

    const printMatch = trimmed.match(/println\s*\((.*)\);?/);
    if (printMatch) {
      let content = printMatch[1].replace(/^"(.*)"$/, '$1');
      Object.keys(this.locals).forEach(k => {
        content = content.replace(new RegExp(`\\b${k}\\b`, 'g'), this.locals[k].value);
      });
      this.logConsole(`[CONSOLE VOX] ${content}`, 'info');
    }

    const matchLet = trimmed.match(/let\s+(mut\s+)?([a-zA-Z0-9_]+)\s*(:\s*([a-zA-Z0-9_]+))?\s*=\s*([^;]+);/);
    if (matchLet) {
      const varName = matchLet[2];
      const varType = matchLet[4] || 'Any';
      let rawVal = matchLet[5].trim();
      this.locals[varName] = { value: rawVal, type: varType };
      this.logConsole(`[Variável] ${varName}: ${varType} = ${rawVal}`, 'info');
    }

    const matchThis = trimmed.match(/this\.([a-zA-Z0-9_]+)\s*=\s*([^;]+);/);
    if (matchThis) {
      const prop = matchThis[1];
      const val = matchThis[2].trim();
      this.locals[`this.${prop}`] = { value: val, type: 'Property' };
    }
  }

  finishExecution() {
    this.state = 'IDLE';
    this.currentLine = null;
    this.steppingMethod = null;
    this.methodLines = [];
    this.currentMethodLineIndex = 0;
    this.callStack = [];

    this.logConsole(`Sessão de depuração finalizada com sucesso.`, 'info');
    if (this.app) {
      this.app.log(`🏁 Sessão de depuração concluída.`);
    }

    this.updateEditorHighlights();
    this.renderDebugDock();
    this.updateToolbarState();
  }

  stop() {
    this.state = 'IDLE';
    this.currentLine = null;
    this.steppingMethod = null;
    this.methodLines = [];
    this.currentMethodLineIndex = 0;
    this.callStack = [];

    this.logConsole(`⏹ Depuração interrompida pelo usuário (Program Reset).`, 'warn');
    if (this.app) {
      this.app.log(`⏹ Depuração interrompida (Ctrl+F2).`);
    }

    this.updateEditorHighlights();
    this.renderDebugDock();
    this.updateToolbarState();
  }

  startDebug() {
    if (this.breakpoints.size === 0) {
      if (this.app) {
        this.app.log(`💡 Dica: Clique na margem das linhas do código para marcar pontos de parada (🔴) e pressione F8 para passo a passo.`);
        this.app.switchView('code');
      }
      this.logConsole(`Iniciando depuração... Nenhum breakpoint definido. Marcando linha atual como demonstração.`, 'info');
      const current = (this.app && this.app.editor && this.app.editor.getCurrentCursorLine()) || 10;
      this.setBreakpoint(current, this.currentFile, true);
    }

    const firstBp = this.getBreakpointsList()[0];
    if (firstBp) {
      const code = (this.app && this.app.editor && this.app.editor.getCode()) || '';
      const lines = code.split('\n');

      let foundMethod = 'MainFormExecute';
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes('pub fn ') && i < firstBp.line) {
          const m = lines[i].match(/pub fn ([a-zA-Z0-9_]+)/);
          if (m) foundMethod = m[1];
        }
      }

      this.pauseAtBreakpoint({
        line: firstBp.line,
        methodName: foundMethod,
        compName: 'Form1',
        eventName: 'OnExecute',
        startLine: Math.max(1, firstBp.line - 2),
        endLine: Math.min(lines.length, firstBp.line + 8),
        lines: lines,
        eventData: {}
      });
    }
  }

  // --------------------------------------------------------------------------
  // 4. Watches & Expressões
  // --------------------------------------------------------------------------
  addWatch(expr) {
    if (!expr || !expr.trim()) return;
    expr = expr.trim();
    const id = 'w_' + Date.now();
    const { value, type } = this.evaluate(expr);
    this.watches.push({ id, expr, value, type });
    this.logConsole(`Watch adicionado: "${expr}" = ${value}`, 'info');
    this.renderDebugDock();
  }

  removeWatch(id) {
    this.watches = this.watches.filter(w => w.id !== id);
    this.renderDebugDock();
  }

  refreshWatches() {
    this.watches.forEach(w => {
      const res = this.evaluate(w.expr);
      w.value = res.value;
      w.type = res.type;
    });
  }

  evaluate(expr) {
    if (!expr) return { value: 'undefined', type: 'undefined' };

    if (this.locals[expr]) {
      return { value: this.locals[expr].value, type: this.locals[expr].type };
    }

    if (expr.startsWith('this.')) {
      const prop = expr.replace('this.', '');
      const form = this.app ? this.app.designer.form : null;
      if (form && form[prop] !== undefined) {
        return { value: JSON.stringify(form[prop]), type: typeof form[prop] };
      }
    }

    if (expr === 'this') {
      return { value: `{ name: "${this.app?.designer?.form?.name || 'vox_form1'}" }`, type: 'TVoxForm' };
    }

    if (expr === 'sender') {
      return { value: `"${this.locals['sender']?.value || 'btnSalvar'}"`, type: 'Component' };
    }

    try {
      if (/^[0-9+\-*/().\s]+$/.test(expr)) {
        return { value: String(Function(`return (${expr})`)()), type: 'Number' };
      }
    } catch (e) {}

    return { value: `"${expr}"`, type: 'String' };
  }

  // --------------------------------------------------------------------------
  // 5. Console de Depuração
  // --------------------------------------------------------------------------
  logConsole(msg, type = 'info') {
    const time = new Date().toLocaleTimeString();
    this.consoleLogs.push({ time, type, msg });
    if (this.consoleLogs.length > 200) this.consoleLogs.shift();

    const consoleBody = document.getElementById('debugConsoleBody');
    if (consoleBody) {
      const row = document.createElement('div');
      row.className = `debug-console-row ${type}`;
      row.innerHTML = `<span class="log-time">[${time}]</span> <span class="log-msg">${msg}</span>`;
      consoleBody.appendChild(row);
      consoleBody.scrollTop = consoleBody.scrollHeight;
    }
  }

  clearConsole() {
    this.consoleLogs = [];
    const consoleBody = document.getElementById('debugConsoleBody');
    if (consoleBody) consoleBody.innerHTML = '';
  }

  // --------------------------------------------------------------------------
  // 6. Sincronização Visual com Editor e Toolbar
  // --------------------------------------------------------------------------
  updateEditorHighlights() {
    if (this.app && this.app.editor) {
      this.app.editor.renderGutterAndHighlights();
    }
  }

  updateToolbarState() {
    const isPaused = this.state === 'PAUSED';

    const btnStepOver = document.getElementById('tbBtnStepOver');
    const btnStepInto = document.getElementById('tbBtnStepInto');
    const btnStop = document.getElementById('tbBtnStop');
    const btnPause = document.getElementById('tbBtnPause');

    if (btnStepOver) btnStepOver.classList.toggle('active-debug-btn', isPaused);
    if (btnStepInto) btnStepInto.classList.toggle('active-debug-btn', isPaused);
    if (btnStop) btnStop.classList.toggle('active-debug-btn', isPaused);
    if (btnPause) btnPause.classList.toggle('active-debug-btn', this.state === 'RUNNING');

    const sbStatus = document.getElementById('sbFormStatus');
    if (sbStatus && isPaused) {
      sbStatus.innerHTML = `<span style="color:#f59e0b; font-weight:700;">⏸ PAUSADO NA LINHA ${this.currentLine}</span>`;
    }
  }

  // --------------------------------------------------------------------------
  // 7. Renderização do Painel Delphi de Depuração (Dock Inferior)
  // --------------------------------------------------------------------------
  showDebugDock() {
    const dock = document.getElementById('delphiDebugDock');
    if (dock) {
      dock.style.display = 'flex';
      dock.classList.remove('collapsed');
    }
  }

  hideDebugDock() {
    const dock = document.getElementById('delphiDebugDock');
    if (dock) dock.style.display = 'none';
  }

  toggleDebugDock() {
    const dock = document.getElementById('delphiDebugDock');
    if (!dock) return;
    if (dock.style.display === 'none' || !dock.style.display) {
      this.showDebugDock();
    } else {
      dock.classList.toggle('collapsed');
    }
  }

  switchDebugTab(tabName) {
    this.activeTab = tabName;
    document.querySelectorAll('.debug-dock-tab').forEach(tab => {
      tab.classList.toggle('active', tab.dataset.tab === tabName);
    });

    document.querySelectorAll('.debug-dock-page').forEach(page => {
      page.style.display = page.id === `debugPage_${tabName}` ? 'block' : 'none';
    });

    this.renderDebugDock();
  }

  renderDebugDock() {
    const bpCount = this.breakpoints.size;
    const badgeBp = document.getElementById('debugTabBpCount');
    if (badgeBp) badgeBp.innerText = bpCount > 0 ? `(${bpCount})` : '';

    const watchCount = this.watches.length;
    const badgeWatches = document.getElementById('debugTabWatchCount');
    if (badgeWatches) badgeWatches.innerText = watchCount > 0 ? `(${watchCount})` : '';

    if (this.activeTab === 'breakpoints') this.renderBreakpointsTab();
    else if (this.activeTab === 'watches') this.renderWatchesTab();
    else if (this.activeTab === 'callstack') this.renderCallStackTab();
    else if (this.activeTab === 'locals') this.renderLocalsTab();
  }

  renderBreakpointsTab() {
    const container = document.getElementById('debugPage_breakpoints');
    if (!container) return;

    const list = this.getBreakpointsList();

    if (list.length === 0) {
      container.innerHTML = `
        <div class="debug-empty-state">
          <span>🔴 Nenhum ponto de parada definido.</span>
          <span style="font-size:11px; color:#6c7889;">Clique na calha lateral esquerda do editor de código ou pressione F5 para adicionar.</span>
        </div>
      `;
      return;
    }

    let rowsHtml = '';
    list.forEach(bp => {
      const isCurrent = this.currentLine === bp.line;
      rowsHtml += `
        <div class="debug-table-row ${isCurrent ? 'current-bp-row' : ''}">
          <div style="width: 28px; text-align: center;">
            <input type="checkbox" ${bp.enabled ? 'checked' : ''} onchange="window.app.debugger.setBreakpoint(${bp.line}, '${bp.file}', this.checked)">
          </div>
          <div style="width: 32px; text-align: center;">
            ${isCurrent ? '➡️🔴' : '🔴'}
          </div>
          <div style="width: 80px; font-weight: 600; color: #38bdf8; cursor: pointer;" onclick="window.app.editor.scrollToLine(${bp.line})">
            Linha ${bp.line}
          </div>
          <div style="flex: 1; color: #94a3b8; font-family: monospace;">
            ${bp.file}
          </div>
          <div style="width: 140px; color: #64748b; font-size: 11px;">
            ${bp.condition || 'Sem condição (Sempre)'}
          </div>
          <div style="width: 40px; text-align: right;">
            <button class="tool-btn" style="height: 20px; padding: 0 4px; font-size: 10px;" onclick="window.app.debugger.removeBreakpoint(${bp.line})" title="Remover Ponto de Parada">🗑️</button>
          </div>
        </div>
      `;
    });

    container.innerHTML = `
      <div class="debug-table">
        <div class="debug-table-header">
          <div style="width: 28px; text-align: center;">Ativo</div>
          <div style="width: 32px; text-align: center;">Tipo</div>
          <div style="width: 80px;">Linha</div>
          <div style="flex: 1;">Arquivo</div>
          <div style="width: 140px;">Condição</div>
          <div style="width: 40px; text-align: right;">Ação</div>
        </div>
        <div class="debug-table-body">${rowsHtml}</div>
      </div>
    `;
  }

  renderWatchesTab() {
    const container = document.getElementById('debugPage_watches');
    if (!container) return;

    let rowsHtml = '';
    this.watches.forEach(w => {
      rowsHtml += `
        <div class="debug-table-row">
          <div style="width: 180px; font-weight: 600; color: #38bdf8; font-family: monospace;">
            ${w.expr}
          </div>
          <div style="flex: 1; color: #22c55e; font-family: monospace;">
            ${w.value}
          </div>
          <div style="width: 100px; color: #94a3b8; font-size: 11px;">
            ${w.type}
          </div>
          <div style="width: 40px; text-align: right;">
            <button class="tool-btn" style="height: 20px; padding: 0 4px; font-size: 10px;" onclick="window.app.debugger.removeWatch('${w.id}')" title="Excluir Watch">✕</button>
          </div>
        </div>
      `;
    });

    container.innerHTML = `
      <div style="display: flex; gap: 8px; padding: 6px 8px; background: #161a22; border-bottom: 1px solid #282f3a;">
        <input type="text" id="inputNewWatch" class="oi-search-input" placeholder="Nova expressão (ex: sender.caption, total, this.width)..." onkeydown="if(event.key==='Enter') window.app.debugger.addWatch(this.value)">
        <button class="tool-btn btn-run-delphi" style="padding: 2px 10px; font-size: 11px;" onclick="window.app.debugger.addWatch(document.getElementById('inputNewWatch').value)">➕ Inspecionar</button>
      </div>
      <div class="debug-table">
        <div class="debug-table-header">
          <div style="width: 180px;">Expressão (Watch)</div>
          <div style="flex: 1;">Valor Atual</div>
          <div style="width: 100px;">Tipo</div>
          <div style="width: 40px; text-align: right;">Ação</div>
        </div>
        <div class="debug-table-body">${rowsHtml || '<div style="padding:12px; color:#64748b; text-align:center;">Nenhum watch configurado. Adicione expressões acima.</div>'}</div>
      </div>
    `;
  }

  renderCallStackTab() {
    const container = document.getElementById('debugPage_callstack');
    if (!container) return;

    if (this.callStack.length === 0) {
      container.innerHTML = `<div class="debug-empty-state"><span>🥞 Pilha de chamadas vazia (O programa não está pausado).</span></div>`;
      return;
    }

    let rowsHtml = '';
    this.callStack.forEach(frame => {
      rowsHtml += `
        <div class="debug-table-row" style="cursor: pointer;" onclick="window.app.editor.scrollToLine(${frame.line})">
          <div style="width: 30px; color: #f59e0b; font-weight: 700;">#${frame.depth}</div>
          <div style="flex: 1; font-weight: 600; color: #e2e8f0; font-family: monospace;">${frame.fnName}</div>
          <div style="width: 140px; color: #94a3b8;">${frame.file}</div>
          <div style="width: 80px; color: #38bdf8;">Linha ${frame.line}</div>
        </div>
      `;
    });

    container.innerHTML = `
      <div class="debug-table">
        <div class="debug-table-header">
          <div style="width: 30px;">#</div>
          <div style="flex: 1;">Função / Método</div>
          <div style="width: 140px;">Módulo / Unit</div>
          <div style="width: 80px;">Linha</div>
        </div>
        <div class="debug-table-body">${rowsHtml}</div>
      </div>
    `;
  }

  renderLocalsTab() {
    const container = document.getElementById('debugPage_locals');
    if (!container) return;

    const keys = Object.keys(this.locals);
    if (keys.length === 0) {
      container.innerHTML = `<div class="debug-empty-state"><span>📦 Nenhuma variável local no escopo atual.</span></div>`;
      return;
    }

    let rowsHtml = '';
    keys.forEach(k => {
      const item = this.locals[k];
      rowsHtml += `
        <div class="debug-table-row">
          <div style="width: 160px; font-weight: 600; color: #38bdf8; font-family: monospace;">${k}</div>
          <div style="flex: 1; color: #22c55e; font-family: monospace;">${item.value}</div>
          <div style="width: 120px; color: #94a3b8; font-size: 11px;">${item.type}</div>
        </div>
      `;
    });

    container.innerHTML = `
      <div class="debug-table">
        <div class="debug-table-header">
          <div style="width: 160px;">Nome da Variável</div>
          <div style="flex: 1;">Valor Atual</div>
          <div style="width: 120px;">Tipo</div>
        </div>
        <div class="debug-table-body">${rowsHtml}</div>
      </div>
    `;
  }
}

window.VoxDebugger = VoxDebugger;
