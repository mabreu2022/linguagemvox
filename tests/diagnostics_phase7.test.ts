// ============================================================
// diagnostics_phase7.test.ts — Testes da Fase 7:
// Friendly Error Reporting, Levenshtein Suggestions & LSP Server
// ============================================================

import { DiagnosticReporter } from '../src/diagnostics/reporter';
import { ErrorCode, Diagnostic } from '../src/diagnostics/diagnostic';
import { levenshteinDistance, findBestMatch } from '../src/diagnostics/levenshtein';
import { LanguageServer } from '../src/lsp/server';
import { SemanticError } from '../src/semantic/analyzer';

describe('Fase 7: Diagnostic Reporter & Code Frames', () => {
  const reporter = new DiagnosticReporter({ useColors: false, contextLines: 1 });

  test('formats single diagnostic with line numbers, squiggles and help', () => {
    const source = `let a = 10;\nlet b = ptintln(a);\nlet c = 30;`;
    const diag: Diagnostic = {
      code: ErrorCode.UNDEFINED_SYMBOL,
      severity: 'error',
      message: "Undefined variable 'ptintln'",
      span: { line: 2, col: 9, length: 7 },
      help: "Did you mean 'println'?",
    };

    const formatted = reporter.format(diag, source, 'test.vox');
    expect(formatted).toContain('error[E0102]: Undefined variable \'ptintln\'');
    expect(formatted).toContain('--> test.vox:2:9');
    expect(formatted).toContain('1 | let a = 10;');
    expect(formatted).toContain('2 | let b = ptintln(a);');
    expect(formatted).toContain('^^^^^^^');
    expect(formatted).toContain('3 | let c = 30;');
    expect(formatted).toContain('= help: Did you mean \'println\'?');
  });

  test('converts SemanticError into structured diagnostic with precise column', () => {
    const source = `let x = 10;\nlet y = unknownVar + 5;`;
    const err = new SemanticError("Undefined variable 'unknownVar'", 2, 1);
    const diag = DiagnosticReporter.fromSemanticError(err, source);

    expect(diag.code).toBe(ErrorCode.UNDEFINED_SYMBOL);
    expect(diag.span?.line).toBe(2);
    expect(diag.span?.col).toBe(9); // starts at column 9: 'unknownVar'
    expect(diag.span?.length).toBe(10);
  });

  test('detects use-after-move error category and attaches explanation', () => {
    const err = new SemanticError("Use of moved value 'data'", 4, 2);
    const diag = DiagnosticReporter.fromSemanticError(err);
    expect(diag.code).toBe(ErrorCode.USE_AFTER_MOVE);
    expect(diag.help).toContain('Valores movidos não podem ser acessados novamente');
  });

  test('detects borrow conflict error category and attaches explanation', () => {
    const err = new SemanticError("Cannot borrow 'data' as mutable while already borrowed", 5, 2);
    const diag = DiagnosticReporter.fromSemanticError(err);
    expect(diag.code).toBe(ErrorCode.BORROW_CONFLICT);
    expect(diag.help).toContain('Empréstimos mutáveis requerem acesso exclusivo');
  });

  test('detects visibility violation category', () => {
    const err = new SemanticError("Cannot access private member 'secret'", 10, 5);
    const diag = DiagnosticReporter.fromSemanticError(err);
    expect(diag.code).toBe(ErrorCode.VISIBILITY_VIOLATION);
    expect(diag.help).toContain('Membros privados');
  });
});

describe('Fase 7: Levenshtein Distance & Typo Suggestions', () => {
  test('calculates edit distance correctly', () => {
    expect(levenshteinDistance('kitten', 'sitting')).toBe(3);
    expect(levenshteinDistance('println', 'ptintln')).toBe(1);
    expect(levenshteinDistance('vox', 'vox')).toBe(0);
    expect(levenshteinDistance('', 'abc')).toBe(3);
  });

  test('finds closest matching symbol for suggestions', () => {
    const candidates = ['print', 'println', 'eprint', 'format', 'assert'];
    expect(findBestMatch('ptintln', candidates)).toBe('println');
    expect(findBestMatch('prnt', candidates)).toBe('print');
    expect(findBestMatch('asert', candidates)).toBe('assert');
  });

  test('returns null if typo distance is too large', () => {
    const candidates = ['println', 'format', 'assert'];
    expect(findBestMatch('completely_unrelated_xyz', candidates, 3)).toBeNull();
  });
});

describe('Fase 7: Language Server Protocol (LSP) Server', () => {
  let server: LanguageServer;
  const testUri = 'file:///workspace/example.vox';

  beforeEach(() => {
    server = new LanguageServer();
  });

  test('handles initialize handshake and announces capabilities', () => {
    const resp: any = server.handleMessage({
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: {},
    });

    expect(resp.result.capabilities.hoverProvider).toBe(true);
    expect(resp.result.capabilities.completionProvider).toBeDefined();
    expect(resp.result.capabilities.documentSymbolProvider).toBe(true);
    expect(resp.result.serverInfo.name).toBe('vox-lsp');
  });

  test('publishes empty diagnostics on valid document open', () => {
    server.handleMessage({ jsonrpc: '2.0', id: 1, method: 'initialize', params: {} });
    const notif: any = server.handleMessage({
      jsonrpc: '2.0',
      method: 'textDocument/didOpen',
      params: {
        textDocument: {
          uri: testUri,
          languageId: 'vox',
          version: 1,
          text: 'fn add(a: int, b: int) -> int { return a + b; }',
        },
      },
    });

    expect(notif.method).toBe('textDocument/publishDiagnostics');
    expect(notif.params.diagnostics).toHaveLength(0);
  });

  test('publishes diagnostics on semantic error in didChange', () => {
    server.handleMessage({ jsonrpc: '2.0', id: 1, method: 'initialize', params: {} });
    server.handleMessage({
      jsonrpc: '2.0',
      method: 'textDocument/didOpen',
      params: {
        textDocument: { uri: testUri, languageId: 'vox', version: 1, text: 'let x = 1;' },
      },
    });

    const notif: any = server.handleMessage({
      jsonrpc: '2.0',
      method: 'textDocument/didChange',
      params: {
        textDocument: { uri: testUri, version: 2 },
        contentChanges: [{ text: 'let x = 1;\nlet y = nonexistentVar + 10;' }],
      },
    });

    expect(notif.method).toBe('textDocument/publishDiagnostics');
    expect(notif.params.diagnostics.length).toBeGreaterThan(0);
    expect(notif.params.diagnostics[0].message).toContain('nonexistentVar');
  });

  test('provides hover documentation for keywords and types', () => {
    server.handleMessage({ jsonrpc: '2.0', id: 1, method: 'initialize', params: {} });
    server.handleMessage({
      jsonrpc: '2.0',
      method: 'textDocument/didOpen',
      params: {
        textDocument: {
          uri: testUri,
          languageId: 'vox',
          version: 1,
          text: 'class Entity {\n  pub health: int;\n}',
        },
      },
    });

    const hoverClass: any = server.handleMessage({
      jsonrpc: '2.0',
      id: 2,
      method: 'textDocument/hover',
      params: { textDocument: { uri: testUri }, position: { line: 0, character: 2 } },
    });
    expect(hoverClass.result.contents.value).toContain('class');

    const hoverType: any = server.handleMessage({
      jsonrpc: '2.0',
      id: 3,
      method: 'textDocument/hover',
      params: { textDocument: { uri: testUri }, position: { line: 1, character: 15 } },
    });
    expect(hoverType.result.contents.value).toContain('int');
  });

  test('provides completion items for keywords, types and builtins', () => {
    server.handleMessage({ jsonrpc: '2.0', id: 1, method: 'initialize', params: {} });
    server.handleMessage({
      jsonrpc: '2.0',
      method: 'textDocument/didOpen',
      params: {
        textDocument: { uri: testUri, languageId: 'vox', version: 1, text: 'let a = 1;' },
      },
    });

    const comp: any = server.handleMessage({
      jsonrpc: '2.0',
      id: 4,
      method: 'textDocument/completion',
      params: { textDocument: { uri: testUri }, position: { line: 1, character: 0 } },
    });

    const labels = comp.result.map((item: any) => item.label);
    expect(labels).toContain('class');
    expect(labels).toContain('fn');
    expect(labels).toContain('println');
    expect(labels).toContain('format!');
    expect(labels).toContain('chan_new');
    expect(labels).toContain('Option');
    expect(labels).toContain('@timed');
  });

  test('extracts document symbols (classes, methods, fields)', () => {
    server.handleMessage({ jsonrpc: '2.0', id: 1, method: 'initialize', params: {} });
    server.handleMessage({
      jsonrpc: '2.0',
      method: 'textDocument/didOpen',
      params: {
        textDocument: {
          uri: testUri,
          languageId: 'vox',
          version: 1,
          text: `
            class Player {
              pub score: int;
              pub fn get_score() -> int { return self.score; }
            }
            fn helper() -> void {}
          `,
        },
      },
    });

    const sym: any = server.handleMessage({
      jsonrpc: '2.0',
      id: 5,
      method: 'textDocument/documentSymbol',
      params: { textDocument: { uri: testUri } },
    });

    const names = sym.result.map((s: any) => s.name);
    expect(names).toContain('Player');
    expect(names).toContain('score');
    expect(names).toContain('get_score');
    expect(names).toContain('helper');
  });
});
