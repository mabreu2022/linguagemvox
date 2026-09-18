// ============================================================
// diagnostic.ts — Estruturas e Catálogo de Códigos de Erro do Vox
// ============================================================

export type DiagnosticSeverity = 'error' | 'warning' | 'info' | 'hint';

export interface SourceSpan {
  file?: string;
  line: number;
  col: number;
  length?: number;
}

export interface DiagnosticSuggestion {
  replacement: string;
  description?: string;
}

export interface Diagnostic {
  code?: string;
  severity: DiagnosticSeverity;
  message: string;
  span?: SourceSpan;
  help?: string;
  notes?: string[];
  suggestion?: DiagnosticSuggestion;
}

/**
 * Catálogo Oficial de Códigos de Erro da Linguagem Vox
 */
export const ErrorCode = {
  // Tipagem e Semântica (E01xx)
  TYPE_MISMATCH:            'E0101',
  UNDEFINED_SYMBOL:         'E0102',
  USE_AFTER_MOVE:           'E0103',
  BORROW_CONFLICT:          'E0104',
  VISIBILITY_VIOLATION:     'E0105',
  IMMUTABLE_ASSIGN:         'E0106',
  ARG_COUNT_MISMATCH:       'E0107',
  RETURN_TYPE_MISMATCH:     'E0108',
  UNKNOWN_FIELD_OR_METHOD:  'E0109',
  DUPLICATE_DECLARATION:    'E0110',

  // Sintaxe e Parsing (E02xx)
  UNEXPECTED_TOKEN:         'E0201',
  UNCLOSED_DELIMITER:       'E0202',
  INVALID_ASSIGN_TARGET:    'E0203',
  MISSING_SEMICOLON_OR_NL:  'E0204',

  // Léxico (E03xx)
  INVALID_CHARACTER:        'E0301',
  UNCLOSED_STRING:          'E0302',
  INVALID_NUMBER_FORMAT:    'E0303',

  // Runtime / Execução (E04xx)
  PANIC:                    'E0401',
  ASSERTION_FAILED:         'E0402',
  INDEX_OUT_OF_BOUNDS:      'E0403',
  NULL_POINTER_DEREF:       'E0404',
  CLOSED_CHANNEL_OP:        'E0405',
} as const;

export type ErrorCodeKey = keyof typeof ErrorCode;
