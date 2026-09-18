// ============================================================
// token.ts — Definição de todos os tokens da linguagem Kael
// ============================================================

export enum TokenType {
  // ── Literais ──────────────────────────────────────────────
  INTEGER    = 'INTEGER',
  FLOAT      = 'FLOAT',
  STRING     = 'STRING',
  CHAR       = 'CHAR',
  BOOL       = 'BOOL',
  NULL       = 'NULL',

  // ── Identificadores ───────────────────────────────────────
  IDENTIFIER = 'IDENTIFIER',

  // ── Palavras-chave ────────────────────────────────────────
  // Controle de fluxo
  IF         = 'if',
  ELSE       = 'else',
  ELIF       = 'elif',
  WHILE      = 'while',
  FOR        = 'for',
  IN         = 'in',
  BREAK      = 'break',
  CONTINUE   = 'continue',
  RETURN     = 'return',
  MATCH      = 'match',

  // Declarações
  LET        = 'let',
  CONST      = 'const',
  MUT        = 'mut',
  FN         = 'fn',
  STRUCT     = 'struct',
  TRAIT      = 'trait',
  IMPL       = 'impl',
  CLASS      = 'class',
  INTERFACE  = 'interface',
  MIXIN      = 'mixin',
  EXTENDS    = 'extends',
  IMPLEMENTS = 'implements',
  WITH       = 'with',
  NEW        = 'new',
  SELF       = 'self',
  SUPER      = 'super',
  STATIC     = 'stat',

  // Modificadores de acesso
  PUB        = 'pub',
  PRIV       = 'priv',
  PROT       = 'prot',

  // Tipos
  TYPE_INT   = 'int',
  TYPE_FLOAT = 'float',
  TYPE_BOOL  = 'bool',
  TYPE_STR   = 'str',
  TYPE_CHAR  = 'char',
  TYPE_VOID  = 'void',

  // Ownership
  OWN        = 'own',
  BORROW     = 'borrow',
  REF        = 'ref',

  // Async/Concorrência
  ASYNC      = 'async',
  AWAIT      = 'await',
  SPAWN      = 'spawn',
  CHAN       = 'chan',

  // Funcional
  MAP        = 'map',
  FILTER     = 'filter',
  REDUCE     = 'reduce',

  // Operadores especiais
  OPERATOR   = 'operator',
  MACRO      = 'macro',
  IMPORT     = 'import',
  FROM       = 'from',
  EXPORT     = 'export',
  SOME       = 'some',
  NONE       = 'none',
  OK         = 'ok',
  ERR        = 'err',

  // ── Operadores aritméticos ────────────────────────────────
  PLUS       = '+',
  MINUS      = '-',
  STAR       = '*',
  SLASH      = '/',
  PERCENT    = '%',
  POWER      = '**',

  // ── Operadores de comparação ──────────────────────────────
  EQ         = '==',
  NEQ        = '!=',
  LT         = '<',
  GT         = '>',
  LTE        = '<=',
  GTE        = '>=',

  // ── Operadores lógicos ────────────────────────────────────
  AND        = '&&',
  OR         = '||',
  NOT        = '!',

  // ── Operadores bitwise ────────────────────────────────────
  BIT_AND    = '&',
  BIT_OR     = '|',
  BIT_XOR    = '^',
  BIT_NOT    = '~',
  SHL        = '<<',
  SHR        = '>>',

  // ── Atribuição ────────────────────────────────────────────
  ASSIGN     = '=',
  PLUS_ASSIGN  = '+=',
  MINUS_ASSIGN = '-=',
  STAR_ASSIGN  = '*=',
  SLASH_ASSIGN = '/=',
  PERCENT_ASSIGN = '%=',

  // ── Setas e especiais ─────────────────────────────────────
  ARROW      = '->',
  FAT_ARROW  = '=>',
  DOUBLE_COLON = '::',
  PIPE       = '|>',
  RANGE      = '..',
  SPREAD     = '...',

  // ── Delimitadores ─────────────────────────────────────────
  LPAREN     = '(',
  RPAREN     = ')',
  LBRACE     = '{',
  RBRACE     = '}',
  LBRACKET   = '[',
  RBRACKET   = ']',
  COMMA      = ',',
  SEMICOLON  = ';',
  COLON      = ':',
  DOT        = '.',
  AT         = '@',
  HASH       = '#',
  QUESTION   = '?',
  DOUBLE_QUESTION = '??',
  BANG       = '!',

  // ── Especiais ─────────────────────────────────────────────
  EOF        = 'EOF',
  NEWLINE    = 'NEWLINE',
  UNKNOWN    = 'UNKNOWN',
}

// Conjunto de palavras-chave para lookup rápido
export const KEYWORDS: Map<string, TokenType> = new Map([
  ['if',         TokenType.IF],
  ['else',       TokenType.ELSE],
  ['elif',       TokenType.ELIF],
  ['while',      TokenType.WHILE],
  ['for',        TokenType.FOR],
  ['in',         TokenType.IN],
  ['break',      TokenType.BREAK],
  ['continue',   TokenType.CONTINUE],
  ['return',     TokenType.RETURN],
  ['match',      TokenType.MATCH],
  ['let',        TokenType.LET],
  ['const',      TokenType.CONST],
  ['mut',        TokenType.MUT],
  ['fn',         TokenType.FN],
  ['struct',     TokenType.STRUCT],
  ['trait',      TokenType.TRAIT],
  ['impl',       TokenType.IMPL],
  ['class',      TokenType.CLASS],
  ['interface',  TokenType.INTERFACE],
  ['mixin',      TokenType.MIXIN],
  ['extends',    TokenType.EXTENDS],
  ['implements', TokenType.IMPLEMENTS],
  ['with',       TokenType.WITH],
  ['new',        TokenType.NEW],
  ['self',       TokenType.SELF],
  ['super',      TokenType.SUPER],
  ['stat',       TokenType.STATIC],
  ['pub',        TokenType.PUB],
  ['priv',       TokenType.PRIV],
  ['prot',       TokenType.PROT],
  ['int',        TokenType.TYPE_INT],
  ['float',      TokenType.TYPE_FLOAT],
  ['bool',       TokenType.TYPE_BOOL],
  ['str',        TokenType.TYPE_STR],
  ['char',       TokenType.TYPE_CHAR],
  ['void',       TokenType.TYPE_VOID],
  ['own',        TokenType.OWN],
  ['move',       TokenType.OWN],
  ['borrow',     TokenType.BORROW],
  ['ref',        TokenType.REF],
  ['async',      TokenType.ASYNC],
  ['await',      TokenType.AWAIT],
  ['spawn',      TokenType.SPAWN],
  ['chan',       TokenType.CHAN],
  ['operator',   TokenType.OPERATOR],
  ['macro',      TokenType.MACRO],
  ['import',     TokenType.IMPORT],
  ['from',       TokenType.FROM],
  ['export',     TokenType.EXPORT],
  ['true',       TokenType.BOOL],
  ['false',      TokenType.BOOL],
  ['null',       TokenType.NULL],
  ['some',       TokenType.SOME],
  ['none',       TokenType.NONE],
  ['ok',         TokenType.OK],
  ['err',        TokenType.ERR],
]);

// Posição no código fonte
export interface Position {
  line:   number;
  column: number;
  offset: number;
}

// Token individual
export interface Token {
  type:     TokenType;
  value:    string;
  position: Position;
}

// Cria um token
export function createToken(
  type: TokenType,
  value: string,
  position: Position
): Token {
  return { type, value, position };
}
