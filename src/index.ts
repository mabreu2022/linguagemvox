// ============================================================
// index.ts -- Ponto de entrada principal da linguagem Kael
// ============================================================

export { Lexer, LexerError } from "./lexer/lexer";
export { Token, TokenType, KEYWORDS, createToken } from "./lexer/token";
export { Parser, ParseError } from "./parser/parser";
export { SemanticAnalyzer, SemanticError, Scope } from "./semantic/analyzer";
export { Interpreter, Environment, RuntimeError } from "./runtime/interpreter";
export { CGenerator } from "./codegen/c_generator";
export { Compiler, CompileOptions, CompileResult } from "./codegen/compiler";
export { Diagnostic, DiagnosticSeverity, ErrorCode } from "./diagnostics/diagnostic";
export { DiagnosticReporter } from "./diagnostics/reporter";
export { levenshteinDistance, findBestMatch } from "./diagnostics/levenshtein";
export { LanguageServer } from "./lsp/server";
export * from "./parser/ast";

