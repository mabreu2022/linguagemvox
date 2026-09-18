// ============================================================
// lexer.ts — Lexer/Tokenizador da linguagem Kael
// ============================================================

import { Token, TokenType, Position, KEYWORDS, createToken } from './token';

export class LexerError extends Error {
  constructor(message: string, public position: Position) {
    super(`[LexerError] Line ${position.line}:${position.column} — ${message}`);
    this.name = 'LexerError';
  }
}

export class Lexer {
  private source: string;
  private pos:    number = 0;
  private line:   number = 1;
  private col:    number = 1;
  private tokens: Token[] = [];

  constructor(source: string) {
    this.source = source;
  }

  // ── Ponto de entrada ──────────────────────────────────────
  tokenize(): Token[] {
    while (!this.isAtEnd()) {
      this.skipWhitespaceAndComments();
      if (this.isAtEnd()) break;
      const token = this.nextToken();
      if (token) this.tokens.push(token);
    }
    this.tokens.push(createToken(TokenType.EOF, '', this.currentPosition()));
    return this.tokens;
  }

  private nextToken(): Token | null {
    const ch = this.peek();
    if (this.isDigit(ch)) return this.readNumber();
    if (ch === '"') return this.readString();
    if (ch === "'") return this.readChar();
    if (this.isAlpha(ch) || ch === '_') return this.readIdentifier();
    return this.readSymbol();
  }

  private readNumber(): Token {
    const start = this.currentPosition();
    let num = '';
    let isFloat = false;

    while (!this.isAtEnd() && (this.isDigit(this.peek()) || this.peek() === '_')) {
      if (this.peek() === '_') { this.advance(); continue; }
      num += this.advance();
    }

    if (this.peek() === '.' && this.peekNext() !== '.') {
      isFloat = true;
      num += this.advance();
      while (!this.isAtEnd() && this.isDigit(this.peek())) {
        num += this.advance();
      }
    }

    if (!this.isAtEnd() && (this.peek() === 'f' || this.peek() === 'i')) {
      this.advance();
    }

    return createToken(isFloat ? TokenType.FLOAT : TokenType.INTEGER, num, start);
  }

  private readString(): Token {
    const start = this.currentPosition();
    this.advance(); // "
    let str = '';

    while (!this.isAtEnd() && this.peek() !== '"') {
      if (this.peek() === '\\') {
        this.advance();
        switch (this.advance()) {
          case 'n':  str += '\n'; break;
          case 't':  str += '\t'; break;
          case 'r':  str += '\r'; break;
          case '"':  str += '"';  break;
          case '\\': str += '\\'; break;
          case '0':  str += '\0'; break;
          default:   str += '?';
        }
      } else {
        if (this.peek() === '\n') this.newline();
        str += this.advance();
      }
    }

    if (this.isAtEnd()) throw new LexerError('Unterminated string', start);
    this.advance(); // closing "
    return createToken(TokenType.STRING, str, start);
  }

  private readChar(): Token {
    const start = this.currentPosition();
    this.advance(); // '
    let ch = '';

    if (this.peek() === '\\') {
      this.advance();
      switch (this.advance()) {
        case 'n':  ch = '\n'; break;
        case 't':  ch = '\t'; break;
        case '\\': ch = '\\'; break;
        case "'":  ch = "'";  break;
        default:   ch = '?';
      }
    } else {
      ch = this.advance();
    }

    if (this.peek() !== "'") throw new LexerError('Char literal must have exactly one character', start);
    this.advance(); // closing '
    return createToken(TokenType.CHAR, ch, start);
  }

  private readIdentifier(): Token {
    const start = this.currentPosition();
    let id = '';

    while (!this.isAtEnd() && (this.isAlphaNum(this.peek()) || this.peek() === '_')) {
      id += this.advance();
    }

    if (id === 'true' || id === 'false') return createToken(TokenType.BOOL, id, start);
    if (id === 'null') return createToken(TokenType.NULL, id, start);

    const type = KEYWORDS.get(id) ?? TokenType.IDENTIFIER;

    // Macro: identifier/keyword followed immediately by '!' (e.g. assert!, dbg!, format!, panic!, todo!)
    // but not '!=' which is not-equal comparison
    if (!this.isAtEnd() && this.peek() === '!' && this.peekNext() !== '=') {
      this.advance();
      return createToken(TokenType.MACRO, id + '!', start);
    }

    return createToken(type, id, start);
  }

  private readSymbol(): Token {
    const start = this.currentPosition();
    const ch = this.advance();

    switch (ch) {
      case '+': {
        if (this.matchChar('=')) return createToken(TokenType.PLUS_ASSIGN, '+=', start);
        return createToken(TokenType.PLUS, '+', start);
      }
      case '-': {
        if (this.matchChar('>')) return createToken(TokenType.ARROW,        '->', start);
        if (this.matchChar('=')) return createToken(TokenType.MINUS_ASSIGN, '-=', start);
        return createToken(TokenType.MINUS, '-', start);
      }
      case '*': {
        if (this.matchChar('*')) return createToken(TokenType.POWER,       '**', start);
        if (this.matchChar('=')) return createToken(TokenType.STAR_ASSIGN,  '*=', start);
        return createToken(TokenType.STAR, '*', start);
      }
      case '/': {
        if (this.matchChar('=')) return createToken(TokenType.SLASH_ASSIGN, '/=', start);
        return createToken(TokenType.SLASH, '/', start);
      }
      case '%': {
        if (this.matchChar('=')) return createToken(TokenType.PERCENT_ASSIGN, '%=', start);
        return createToken(TokenType.PERCENT, '%', start);
      }
      case '=': {
        if (this.matchChar('=')) return createToken(TokenType.EQ,        '==', start);
        if (this.matchChar('>')) return createToken(TokenType.FAT_ARROW, '=>', start);
        return createToken(TokenType.ASSIGN, '=', start);
      }
      case '!': {
        if (this.matchChar('=')) return createToken(TokenType.NEQ, '!=', start);
        return createToken(TokenType.NOT, '!', start);
      }
      case '<': {
        if (this.matchChar('<')) return createToken(TokenType.SHL, '<<', start);
        if (this.matchChar('=')) return createToken(TokenType.LTE, '<=', start);
        return createToken(TokenType.LT, '<', start);
      }
      case '>': {
        if (this.matchChar('>')) return createToken(TokenType.SHR, '>>', start);
        if (this.matchChar('=')) return createToken(TokenType.GTE, '>=', start);
        return createToken(TokenType.GT, '>', start);
      }
      case '&': {
        if (this.matchChar('&')) return createToken(TokenType.AND,     '&&', start);
        return createToken(TokenType.BIT_AND, '&', start);
      }
      case '|': {
        if (this.matchChar('|')) return createToken(TokenType.OR,    '||', start);
        if (this.matchChar('>')) return createToken(TokenType.PIPE,  '|>', start);
        return createToken(TokenType.BIT_OR, '|', start);
      }
      case '^': return createToken(TokenType.BIT_XOR, '^', start);
      case '~': return createToken(TokenType.BIT_NOT, '~', start);
      case '(': return createToken(TokenType.LPAREN,    '(', start);
      case ')': return createToken(TokenType.RPAREN,    ')', start);
      case '{': return createToken(TokenType.LBRACE,    '{', start);
      case '}': return createToken(TokenType.RBRACE,    '}', start);
      case '[': return createToken(TokenType.LBRACKET,  '[', start);
      case ']': return createToken(TokenType.RBRACKET,  ']', start);
      case ',': return createToken(TokenType.COMMA,     ',', start);
      case ';': return createToken(TokenType.SEMICOLON, ';', start);
      case '@': return createToken(TokenType.AT,        '@', start);
      case '#': return createToken(TokenType.HASH,      '#', start);
      case '?': {
        if (this.matchChar('?')) return createToken(TokenType.DOUBLE_QUESTION, '??', start);
        return createToken(TokenType.QUESTION,  '?', start);
      }
      case '.': {
        if (this.matchChar('.')) {
          if (this.matchChar('.')) return createToken(TokenType.SPREAD, '...', start);
          return createToken(TokenType.RANGE, '..', start);
        }
        return createToken(TokenType.DOT, '.', start);
      }
      case ':': {
        if (this.matchChar(':')) return createToken(TokenType.DOUBLE_COLON, '::', start);
        return createToken(TokenType.COLON, ':', start);
      }
      default:
        throw new LexerError(`Unknown character: '${ch}'`, start);
    }
  }

  private skipWhitespaceAndComments(): void {
    while (!this.isAtEnd()) {
      const ch = this.peek();
      if (ch === ' ' || ch === '\r' || ch === '\t') {
        this.advance();
      } else if (ch === '\n') {
        this.newline();
        this.advance();
      } else if (ch === '/' && this.peekNext() === '/') {
        while (!this.isAtEnd() && this.peek() !== '\n') this.advance();
      } else if (ch === '/' && this.peekNext() === '*') {
        this.advance(); this.advance();
        while (!this.isAtEnd()) {
          if (this.peek() === '\n') { this.newline(); }
          if (this.peek() === '*' && this.peekNext() === '/') {
            this.advance(); this.advance();
            break;
          }
          this.advance();
        }
      } else {
        break;
      }
    }
  }

  private advance(): string {
    const ch = this.source[this.pos++];
    this.col++;
    return ch;
  }

  private matchChar(expected: string): boolean {
    if (this.isAtEnd() || this.source[this.pos] !== expected) return false;
    this.advance();
    return true;
  }

  private peek(): string {
    if (this.isAtEnd()) return '\0';
    return this.source[this.pos];
  }

  private peekNext(): string {
    if (this.pos + 1 >= this.source.length) return '\0';
    return this.source[this.pos + 1];
  }

  private newline(): void {
    this.line++;
    this.col = 1;
  }

  private isAtEnd(): boolean {
    return this.pos >= this.source.length;
  }

  private isDigit(ch: string): boolean {
    return ch >= '0' && ch <= '9';
  }

  private isAlpha(ch: string): boolean {
    return (ch >= 'a' && ch <= 'z') || (ch >= 'A' && ch <= 'Z') || ch === '_';
  }

  private isAlphaNum(ch: string): boolean {
    return this.isAlpha(ch) || this.isDigit(ch);
  }

  private currentPosition(): Position {
    return { line: this.line, column: this.col, offset: this.pos };
  }
}
