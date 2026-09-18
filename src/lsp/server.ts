// ============================================================
// server.ts — Servidor LSP (Language Server Protocol) para Vox
// Suporta Hover, Autocomplete, Diagnostics em tempo real e Document Symbols
// ============================================================

import {
  RequestMessage, ResponseMessage, NotificationMessage,
  Position, Range, LSPDiagnostic, DiagnosticSeverity,
  CompletionItem, CompletionItemKind, Hover,
  SymbolInformation, SymbolKind,
} from './protocol';
import { Lexer } from '../lexer/lexer';
import { Parser } from '../parser/parser';
import { SemanticAnalyzer } from '../semantic/analyzer';
import { NodeKind, ProgramNode, ClassDeclNode, FnDeclNode, FieldDeclNode, MethodDeclNode, VarDeclNode } from '../parser/ast';

export class LanguageServer {
  private documents: Map<string, string> = new Map();
  private isInitialized = false;

  // ── Handlers JSON-RPC ────────────────────────────────────────

  /**
   * Processa uma mensagem JSON-RPC recebida (para testes ou stdin)
   */
  handleMessage(message: RequestMessage | NotificationMessage): ResponseMessage | NotificationMessage | null {
    const method = message.method;

    if ('id' in message && message.id !== undefined) {
      // É uma Requisição
      const id = message.id;
      switch (method) {
        case 'initialize':
          this.isInitialized = true;
          return {
            jsonrpc: '2.0',
            id,
            result: {
              capabilities: {
                textDocumentSync: 1, // Full sync
                hoverProvider: true,
                completionProvider: {
                  resolveProvider: false,
                  triggerCharacters: ['.', ':', '@', '!'],
                },
                documentSymbolProvider: true,
              },
              serverInfo: {
                name: 'vox-lsp',
                version: '0.7.0',
              },
            },
          };

        case 'shutdown':
          return { jsonrpc: '2.0', id, result: null };

        case 'textDocument/hover': {
          const params = message.params;
          const hover = this.getHover(params.textDocument.uri, params.position);
          return { jsonrpc: '2.0', id, result: hover };
        }

        case 'textDocument/completion': {
          const params = message.params;
          const items = this.getCompletions(params.textDocument.uri, params.position);
          return { jsonrpc: '2.0', id, result: items };
        }

        case 'textDocument/documentSymbol': {
          const params = message.params;
          const symbols = this.getDocumentSymbols(params.textDocument.uri);
          return { jsonrpc: '2.0', id, result: symbols };
        }

        default:
          return {
            jsonrpc: '2.0',
            id,
            error: { code: -32601, message: `Método não implementado: ${method}` },
          };
      }
    } else {
      // É uma Notificação
      switch (method) {
        case 'textDocument/didOpen': {
          const params = message.params;
          this.documents.set(params.textDocument.uri, params.textDocument.text);
          return this.validateDocument(params.textDocument.uri, params.textDocument.text);
        }

        case 'textDocument/didChange': {
          const params = message.params;
          const text = params.contentChanges[0]?.text ?? '';
          this.documents.set(params.textDocument.uri, text);
          return this.validateDocument(params.textDocument.uri, text);
        }

        case 'textDocument/didClose': {
          const params = message.params;
          this.documents.delete(params.textDocument.uri);
          return null;
        }

        case 'exit':
          return null;

        default:
          return null;
      }
    }
  }

  // ── Análise e Diagnósticos ───────────────────────────────────

  /**
   * Valida o documento e gera diagnósticos de erro/aviso
   */
  validateDocument(uri: string, text: string): NotificationMessage {
    const diagnostics: LSPDiagnostic[] = [];

    try {
      // 1. Lexer
      const lexer = new Lexer(text);
      const tokens = lexer.tokenize();

      // 2. Parser
      const parser = new Parser(tokens);
      const ast = parser.parse();

      // 3. Semântica
      const analyzer = new SemanticAnalyzer();
      const errors = analyzer.analyze(ast);

      for (const err of errors) {
        const line = Math.max(0, (err.line ?? 1) - 1);
        const col = Math.max(0, (err.col ?? 1) - 1);
        diagnostics.push({
          range: {
            start: { line, character: col },
            end: { line, character: col + 1 },
          },
          severity: DiagnosticSeverity.Error,
          source: 'vox-semantic',
          message: err.message,
        });
      }
    } catch (e: any) {
      const line = Math.max(0, (e.token?.position?.line ?? e.line ?? 1) - 1);
      const col = Math.max(0, (e.token?.position?.column ?? e.col ?? 1) - 1);
      diagnostics.push({
        range: {
          start: { line, character: col },
          end: { line, character: col + 1 },
        },
        severity: DiagnosticSeverity.Error,
        source: 'vox-parser',
        message: e.message || String(e),
      });
    }

    return {
      jsonrpc: '2.0',
      method: 'textDocument/publishDiagnostics',
      params: { uri, diagnostics },
    };
  }

  // ── Hover ───────────────────────────────────────────────────

  getHover(uri: string, pos: Position): Hover | null {
    const text = this.documents.get(uri);
    if (!text) return null;

    const word = this.getWordAtPosition(text, pos);
    if (!word) return null;

    // Palavras-chave conhecidas
    const keywordDocs: Record<string, string> = {
      class: '**class** — Declaração de classe orientada a objetos no Vox.',
      interface: '**interface** — Declaração de contrato de tipos e métodos.',
      fn: '**fn** — Declaração de função ou método.',
      let: '**let** — Declaração de variável com escopo léxico.',
      const: '**const** — Declaração de constante imutável.',
      pub: '**pub** — Modificador de visibilidade pública.',
      priv: '**priv** — Modificador de visibilidade privada.',
      prot: '**prot** — Modificador de visibilidade protegida.',
      stat: '**stat** — Declaração de membro estático.',
      new: '**new** — Instanciação de classe ou chamada de construtor.',
      self: '**self** — Referência à instância atual do objeto.',
      super: '**super** — Acesso a métodos da superclasse.',
      match: '**match** — Expressão de pattern matching exaustivo.',
      spawn: '**spawn** — Disparo de corotina/tarefa concorrente estilo Go/CSP.',
      chan_new: '**chan_new(cap)** — Criação de canal de comunicação concorrente CSP.',
      format: '**format!(fmt, ...args)** — Macro de formatação e interpolação de strings.',
      assert: '**assert!(cond, msg)** — Macro de asserção em tempo de compilação ou execução.',
      dbg: '**dbg!(expr)** — Macro de depuração e inspeção de valores.',
      Option: '**Option<T>** — Tipo monádico que representa um valor presente (`some`) ou ausente (`none`).',
      Result: '**Result<T, E>** — Tipo monádico que representa sucesso (`ok`) ou erro (`err`).',
      Channel: '**Channel<T>** — Canal tipado para sincronização concorrente CSP.',
      int: '**int** — Inteiro de 64 bits com sinal (`int64_t`).',
      float: '**float** — Ponto flutuante de precisão dupla (`double`).',
      str: '**str** — String codificada em UTF-8 com alocação dinâmica.',
      bool: '**bool** — Valor booleano (`true` ou `false`).',
      char: '**char** — Caractere único.',
    };

    if (keywordDocs[word]) {
      return {
        contents: { kind: 'markdown', value: keywordDocs[word] },
      };
    }

    return {
      contents: { kind: 'markdown', value: `\`${word}\` (símbolo Vox)` },
    };
  }

  // ── Autocomplete ─────────────────────────────────────────────

  getCompletions(uri: string, pos: Position): CompletionItem[] {
    const items: CompletionItem[] = [];

    // Keywords
    const keywords = [
      'class', 'interface', 'mixin', 'fn', 'let', 'const',
      'pub', 'priv', 'prot', 'stat', 'new', 'self', 'super',
      'if', 'elif', 'else', 'while', 'for', 'in', 'match',
      'async', 'await', 'spawn', 'return', 'break', 'continue',
      'own', 'borrow', 'ref', 'move'
    ];
    for (const kw of keywords) {
      items.push({ label: kw, kind: CompletionItemKind.Keyword });
    }

    // Tipos primitivos e monádicos
    const types = ['int', 'float', 'str', 'bool', 'char', 'void', 'Option', 'Result', 'Channel', 'Array'];
    for (const t of types) {
      items.push({ label: t, kind: CompletionItemKind.Class, detail: `Tipo ${t}` });
    }

    // Builtins & Macros
    const builtins = [
      { label: 'println', detail: 'println(val: any) -> void' },
      { label: 'print', detail: 'print(val: any) -> void' },
      { label: 'format!', detail: 'format!(fmt: str, ...args) -> str' },
      { label: 'assert!', detail: 'assert!(cond: bool, msg?: str)' },
      { label: 'dbg!', detail: 'dbg!(expr: any) -> any' },
      { label: 'panic!', detail: 'panic!(msg: str) -> void' },
      { label: 'chan_new', detail: 'chan_new(cap: int) -> Channel<T>' },
      { label: 'some', detail: 'some(val: T) -> Option<T>' },
      { label: 'none', detail: 'none() -> Option<T>' },
      { label: 'ok', detail: 'ok(val: T) -> Result<T, E>' },
      { label: 'err', detail: 'err(val: E) -> Result<T, E>' },
    ];
    for (const b of builtins) {
      items.push({ label: b.label, kind: CompletionItemKind.Function, detail: b.detail });
    }

    // Decoradores
    const decorators = ['@timed', '@logged', '@memoize'];
    for (const d of decorators) {
      items.push({ label: d, kind: CompletionItemKind.Property, detail: `Decorador Vox ${d}` });
    }

    return items;
  }

  // ── Document Symbols (Outline) ───────────────────────────────

  getDocumentSymbols(uri: string): SymbolInformation[] {
    const text = this.documents.get(uri);
    if (!text) return [];

    const symbols: SymbolInformation[] = [];

    try {
      const lexer = new Lexer(text);
      const parser = new Parser(lexer.tokenize());
      const ast = parser.parse();

      for (const node of ast.body) {
        if (node.kind === NodeKind.ClassDecl) {
          const cls = node as ClassDeclNode;
          const line = Math.max(0, cls.position.line - 1);
          symbols.push({
            name: cls.name,
            kind: SymbolKind.Class,
            location: {
              uri,
              range: { start: { line, character: 0 }, end: { line, character: cls.name.length } },
            },
          });

          // Membros da classe
          for (const member of cls.members) {
            if (member.kind === NodeKind.MethodDecl) {
              const m = member as MethodDeclNode;
              const mLine = Math.max(0, m.position.line - 1);
              symbols.push({
                name: m.name,
                kind: SymbolKind.Method,
                containerName: cls.name,
                location: {
                  uri,
                  range: { start: { line: mLine, character: 0 }, end: { line: mLine, character: m.name.length } },
                },
              });
            } else if (member.kind === NodeKind.FieldDecl) {
              const f = member as FieldDeclNode;
              const fLine = Math.max(0, f.position.line - 1);
              symbols.push({
                name: f.name,
                kind: SymbolKind.Field,
                containerName: cls.name,
                location: {
                  uri,
                  range: { start: { line: fLine, character: 0 }, end: { line: fLine, character: f.name.length } },
                },
              });
            }
          }
        } else if (node.kind === NodeKind.FnDecl) {
          const fn = node as FnDeclNode;
          const line = Math.max(0, fn.position.line - 1);
          symbols.push({
            name: fn.name,
            kind: SymbolKind.Function,
            location: {
              uri,
              range: { start: { line, character: 0 }, end: { line, character: fn.name.length } },
            },
          });
        }
      }
    } catch {}

    return symbols;
  }

  // ── Servidor Stdio para Editores ─────────────────────────────

  /**
   * Inicia o servidor LSP lendo stdin e escrevendo em stdout
   */
  startStdio(): void {
    let buffer = '';

    process.stdin.setEncoding('utf-8');
    process.stdin.on('data', (chunk: string) => {
      buffer += chunk;

      while (true) {
        const headerEnd = buffer.indexOf('\r\n\r\n');
        if (headerEnd === -1) break;

        const header = buffer.slice(0, headerEnd);
        const match = header.match(/Content-Length:\s*(\d+)/i);
        if (!match) {
          buffer = buffer.slice(headerEnd + 4);
          continue;
        }

        const contentLength = parseInt(match[1], 10);
        const bodyStart = headerEnd + 4;
        if (buffer.length < bodyStart + contentLength) {
          // Aguardando restante do pacote
          break;
        }

        const jsonBody = buffer.slice(bodyStart, bodyStart + contentLength);
        buffer = buffer.slice(bodyStart + contentLength);

        try {
          const message = JSON.parse(jsonBody);
          const response = this.handleMessage(message);
          if (response) {
            this.send(response);
          }
        } catch (e: any) {
          console.error('[LSP Error]', e.message);
        }
      }
    });
  }

  private send(msg: ResponseMessage | NotificationMessage): void {
    const json = JSON.stringify(msg);
    const byteLen = Buffer.byteLength(json, 'utf-8');
    const header = `Content-Length: ${byteLen}\r\n\r\n`;
    process.stdout.write(header + json);
  }

  private getWordAtPosition(text: string, pos: Position): string | null {
    const lines = text.split(/\r?\n/);
    const line = lines[pos.line];
    if (!line) return null;

    let start = pos.character;
    let end = pos.character;

    const isIdentChar = (c: string) => /[a-zA-Z0-9_!@]/.test(c);

    while (start > 0 && isIdentChar(line[start - 1])) start--;
    while (end < line.length && isIdentChar(line[end])) end++;

    return line.slice(start, end) || null;
  }
}
