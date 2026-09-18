// ============================================================
// reporter.ts — Formatador Visual e Renderizador de Erros do Vox
// Formato moderno estilo Rustc/Elm com linhas numeradas e squiggles (^^^^^)
// ============================================================

import { Diagnostic, DiagnosticSeverity, ErrorCode } from './diagnostic';
import { findBestMatch } from './levenshtein';

export interface ReporterOptions {
  useColors?: boolean;
  contextLines?: number;
}

export class DiagnosticReporter {
  private useColors: boolean;
  private contextLines: number;

  constructor(options: ReporterOptions = {}) {
    const isTTY = typeof process !== 'undefined' && process.stdout && Boolean(process.stdout.isTTY);
    this.useColors = options.useColors ?? isTTY;
    this.contextLines = options.contextLines ?? 1;
  }

  // ── Cores ANSI ───────────────────────────────────────────────

  private color(text: string, code: string): string {
    return this.useColors ? `\x1b[${code}m${text}\x1b[0m` : text;
  }

  private red(text: string): string    { return this.color(text, '31;1'); }
  private yellow(text: string): string { return this.color(text, '33;1'); }
  private cyan(text: string): string   { return this.color(text, '36;1'); }
  private green(text: string): string  { return this.color(text, '32;1'); }
  private dim(text: string): string    { return this.color(text, '2;37'); }
  private bold(text: string): string   { return this.color(text, '1'); }

  /**
   * Formata um único diagnóstico em string legível
   */
  format(diagnostic: Diagnostic, sourceCode: string, filePath: string = 'input.vox'): string {
    const lines: string[] = [];
    const span = diagnostic.span;
    const lineNum = span ? span.line : 1;
    const colNum = span ? span.col : 1;
    const len = span && span.length && span.length > 0 ? span.length : 1;

    // 1. Cabeçalho de Severidade e Código
    const sevLabel = this.getSeverityHeader(diagnostic.severity, diagnostic.code);
    lines.push(`${sevLabel}: ${this.bold(diagnostic.message)}`);

    // 2. Localização no arquivo
    const locFile = span?.file || filePath;
    lines.push(`  ${this.cyan('-->')} ${locFile}:${lineNum}:${colNum}`);

    // 3. Snippet de código com contexto
    const sourceLines = sourceCode.split(/\r?\n/);
    const maxDigits = String(lineNum + this.contextLines).length;
    const pad = (n: number | string) => String(n).padStart(maxDigits, ' ');
    const emptyPad = ' '.repeat(maxDigits);

    lines.push(`  ${this.dim(emptyPad)} ${this.dim('|')}`);

    // Linhas anteriores de contexto
    const startLine = Math.max(1, lineNum - this.contextLines);
    for (let i = startLine; i < lineNum; i++) {
      const prevLineText = sourceLines[i - 1] ?? '';
      lines.push(`  ${this.dim(pad(i))} ${this.dim('|')} ${prevLineText}`);
    }

    // Linha do erro
    const targetLineText = sourceLines[lineNum - 1] ?? '';
    lines.push(`  ${this.cyan(pad(lineNum))} ${this.cyan('|')} ${targetLineText}`);

    // Linha do squiggle / indicador (^^^^^)
    const indentCol = Math.max(0, colNum - 1);
    const squiggleChars = '^'.repeat(Math.max(1, len));
    const squiggleFormatted = this.getSquiggle(diagnostic.severity, squiggleChars);
    lines.push(`  ${this.dim(emptyPad)} ${this.cyan('|')} ${' '.repeat(indentCol)}${squiggleFormatted}`);

    // Linhas posteriores de contexto
    const endLine = Math.min(sourceLines.length, lineNum + this.contextLines);
    for (let i = lineNum + 1; i <= endLine; i++) {
      const nextLineText = sourceLines[i - 1] ?? '';
      lines.push(`  ${this.dim(pad(i))} ${this.dim('|')} ${nextLineText}`);
    }

    lines.push(`  ${this.dim(emptyPad)} ${this.dim('|')}`);

    // 4. Notas adicionais
    if (diagnostic.notes && diagnostic.notes.length > 0) {
      for (const note of diagnostic.notes) {
        lines.push(`  ${this.cyan('= note:')} ${note}`);
      }
    }

    // 5. Ajuda e Sugestões ("help")
    if (diagnostic.help) {
      lines.push(`  ${this.green('= help:')} ${diagnostic.help}`);
    } else if (diagnostic.suggestion) {
      lines.push(
        `  ${this.green('= help:')} ${diagnostic.suggestion.description || 'Você quis dizer:'} '${this.bold(diagnostic.suggestion.replacement)}'?`
      );
    }

    return lines.join('\n');
  }

  /**
   * Formata múltiplos diagnósticos
   */
  formatAll(diagnostics: Diagnostic[], sourceCode: string, filePath: string = 'input.vox'): string {
    return diagnostics.map(d => this.format(d, sourceCode, filePath)).join('\n\n');
  }

  /**
   * Imprime os diagnósticos no console
   */
  print(diagnostic: Diagnostic, sourceCode: string, filePath?: string): void {
    console.error(this.format(diagnostic, sourceCode, filePath));
  }

  printAll(diagnostics: Diagnostic[], sourceCode: string, filePath?: string): void {
    console.error(this.formatAll(diagnostics, sourceCode, filePath));
  }

  // ── Auxiliares de formatação ─────────────────────────────────

  private getSeverityHeader(severity: DiagnosticSeverity, code?: string): string {
    const codeTag = code ? `[${code}]` : '';
    switch (severity) {
      case 'error':   return this.red(`error${codeTag}`);
      case 'warning': return this.yellow(`warning${codeTag}`);
      case 'info':    return this.cyan(`info${codeTag}`);
      case 'hint':    return this.green(`hint${codeTag}`);
    }
  }

  private getSquiggle(severity: DiagnosticSeverity, chars: string): string {
    switch (severity) {
      case 'error':   return this.red(chars);
      case 'warning': return this.yellow(chars);
      default:        return this.cyan(chars);
    }
  }

  // ── Conversores de Erros do Compilador ────────────────────────

  /**
   * Converte qualquer erro do analisador semântico em Diagnostic estruturado
   */
  static fromSemanticError(err: any, sourceCode?: string, knownSymbols: string[] = []): Diagnostic {
    const rawMsg = err.message || String(err);
    const line = err.line ?? 1;

    const defaultSymbols = [
      'print', 'println', 'eprint', 'len', 'panic', 'assert',
      'format!', 'assert!', 'dbg!', 'panic!',
      'chan_new', 'chan_send', 'chan_recv', 'chan_close',
      'some', 'none', 'ok', 'err', 'sqrt', 'abs',
      'int', 'float', 'str', 'bool', 'char', 'void',
      'class', 'fn', 'let', 'const', 'pub', 'priv', 'match',
      ...knownSymbols,
    ];

    // Detectar código de erro com base na mensagem
    let code: string = ErrorCode.UNDEFINED_SYMBOL;
    let cleanMsg = rawMsg;
    let help: string | undefined;
    let suggestion: { replacement: string; description?: string } | undefined;

    if (rawMsg.includes('[SemanticError]')) {
      cleanMsg = rawMsg.replace(/\[SemanticError\]( Line \d+:(undefined|\d+))? -- /, '');
    }

    let col = typeof err.col === 'number' && !isNaN(err.col) ? err.col : 1;
    let length = 1;

    // Identificar categorias de erro
    if (/use of moved value|cannot borrow.*as mutable.*after move/i.test(cleanMsg)) {
      code = ErrorCode.USE_AFTER_MOVE;
      help = 'Valores movidos não podem ser acessados novamente. Considere clonar ou usar referências compartilhadas (&).';
    } else if (/cannot borrow.*as mutable.*already borrowed/i.test(cleanMsg)) {
      code = ErrorCode.BORROW_CONFLICT;
      help = 'Empréstimos mutáveis requerem acesso exclusivo. Encerre o empréstimo anterior antes de criar outro.';
    } else if (/private|protected/i.test(cleanMsg)) {
      code = ErrorCode.VISIBILITY_VIOLATION;
      help = 'Membros privados só podem ser acessados pela própria classe. Considere torná-lo `pub`.';
    } else if (/type.*not assignable|mismatch|expected type/i.test(cleanMsg)) {
      code = ErrorCode.TYPE_MISMATCH;
    } else if (/undefined|not defined|cannot find/i.test(cleanMsg)) {
      code = ErrorCode.UNDEFINED_SYMBOL;
      // Extrair o nome do identificador
      const match = cleanMsg.match(/'([^']+)'|"([^"]+)"|`([^`]+)`/);
      if (match) {
        const idName = match[1] || match[2] || match[3];
        if (sourceCode && line) {
          const sourceLines = sourceCode.split(/\r?\n/);
          const targetLine = sourceLines[line - 1];
          if (targetLine) {
            const foundCol = targetLine.indexOf(idName);
            if (foundCol >= 0) {
              col = foundCol + 1;
              length = idName.length;
            }
          }
        }
        const best = findBestMatch(idName, defaultSymbols);
        if (best) {
          suggestion = {
            replacement: best,
            description: `Você quis dizer`,
          };
        }
      }
    }

    return {
      code,
      severity: 'error',
      message: cleanMsg,
      span: { line, col, length },
      help,
      suggestion,
    };
  }

  /**
   * Converte erro de Parser em Diagnostic
   */
  static fromParseError(err: any): Diagnostic {
    const raw = err.message || String(err);
    const line = err.token?.position?.line ?? err.line ?? 1;
    const col = err.token?.position?.column ?? err.col ?? 1;
    const clean = raw.replace(/^Parse error: /i, '');

    return {
      code: ErrorCode.UNEXPECTED_TOKEN,
      severity: 'error',
      message: clean,
      span: { line, col, length: err.token?.lexeme?.length || 1 },
      help: 'Verifique a sintaxe esperada nesta posição.',
    };
  }

  /**
   * Converte erro de Lexer em Diagnostic
   */
  static fromLexerError(err: any): Diagnostic {
    const raw = err.message || String(err);
    const line = err.line ?? 1;
    const col = err.col ?? 1;

    return {
      code: ErrorCode.INVALID_CHARACTER,
      severity: 'error',
      message: raw,
      span: { line, col, length: 1 },
      help: 'Caracteres não reconhecidos devem ser removidos ou substituídos.',
    };
  }
}
