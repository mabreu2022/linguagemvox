#!/usr/bin/env node
// ============================================================
// cli/index.ts -- CLI da linguagem Kael
// Uso: kael run <file.kael>
//      kael parse <file.kael>
//      kael check <file.kael>
// ============================================================

import * as fs from "fs";
import * as path from "path";
import * as child_process from "child_process";
import { Lexer } from "../lexer/lexer";
import { Parser } from "../parser/parser";
import { SemanticAnalyzer } from "../semantic/analyzer";
import { Interpreter } from "../runtime/interpreter";
import { CGenerator } from "../codegen/c_generator";
import { Compiler } from "../codegen/compiler";
import { DiagnosticReporter } from "../diagnostics/reporter";
import { LanguageServer } from "../lsp/server";

const VERSION = "0.7.0";

function banner(): void {
  console.log(`
  ██╗   ██╗ ██████╗ ██╗  ██╗
  ██║   ██║██╔═══██╗╚██╗██╔╝
  ██║   ██║██║   ██║ ╚███╔╝ 
  ╚██╗ ██╔╝██║   ██║ ██╔██╗ 
   ╚████╔╝ ╚██████╔╝██╔╝ ██╗
    ╚═══╝   ╚═════╝ ╚═╝  ╚═╝   v${VERSION}

  Vox — Modern Object-Oriented Language (Fase 7: Production-Ready & Tooling)
  `);
}

function help(): void {
  console.log(`Usage: vox <command> [options] [file] (or: kael <command>)

Commands:
  run <file.vox|kael>    Run a Vox/Kael source file with the interpreter
  build <file.vox|kael>  Compile to native binary via C99 transpilation
                         Options: -o <path>, --emit-c, --run, --opt
  check <file.vox|kael>  Type-check without running (with friendly diagnostics)
  parse <file.vox|kael>  Parse and print the AST
  lsp                    Start the Language Server Protocol (LSP) over stdio
  repl                   Start the interactive REPL
  version                Show version information
  help                   Show this help message

Examples:
  vox run examples/phase2_oop.vox
  vox build examples/phase2_oop.vox --run
  vox build examples/phase5_modern.vox -o app.exe --emit-c
  vox check examples/classes.kael
  vox repl
`);
}

function readFile(filePath: string, visited: Set<string> = new Set()): string {
  const absPath = path.resolve(filePath);
  if (visited.has(absPath)) return "";
  visited.add(absPath);

  if (!fs.existsSync(absPath)) {
    console.error(`Error: File not found: ${filePath}`);
    process.exit(1);
  }
  const ext = path.extname(absPath);
  if (ext !== ".vox" && ext !== ".kael") {
    console.warn(`Warning: File extension is '${ext}', expected '.vox' or '.kael'`);
  }
  let content = fs.readFileSync(absPath, "utf-8");
  const dir = path.dirname(absPath);

  // Suporte modular a include / import de arquivos relativos
  content = content.replace(/^[ \t]*(?:include|import)[ \t]+["']([^"']+)["'];?/gm, (_match, relPath) => {
    const target = path.resolve(dir, relPath);
    return readFile(target, visited);
  });

  return content;
}

function runFile(filePath: string): void {
  const source = readFile(filePath);

  try {
    // 1. Lexer
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();

    // 2. Parser
    const parser = new Parser(tokens);
    const ast = parser.parse();

    // 3. Semantic analysis
    const analyzer = new SemanticAnalyzer();
    const errors = analyzer.analyze(ast);
    if (errors.length > 0) {
      const reporter = new DiagnosticReporter();
      for (const err of errors) {
        reporter.print(DiagnosticReporter.fromSemanticError(err, source), source, filePath);
      }
      process.exit(1);
    }

    // 4. Interpret
    const interpreter = new Interpreter();
    interpreter.run(ast);

  } catch (error: any) {
    const reporter = new DiagnosticReporter();
    if (error.name === 'ParseError' || error.token) {
      reporter.print(DiagnosticReporter.fromParseError(error), source, filePath);
    } else if (error.name === 'LexerError') {
      reporter.print(DiagnosticReporter.fromLexerError(error), source, filePath);
    } else {
      console.error(error.message);
    }
    if (process.env.KAEL_STACKTRACE) console.error(error.stack);
    process.exit(1);
  }
}

function parseFile(filePath: string): void {
  const source = readFile(filePath);
  try {
    const tokens = new Lexer(source).tokenize();
    const ast = new Parser(tokens).parse();
    console.log(JSON.stringify(ast, null, 2));
  } catch (e: any) {
    const reporter = new DiagnosticReporter();
    reporter.print(DiagnosticReporter.fromParseError(e), source, filePath);
    process.exit(1);
  }
}

function checkFile(filePath: string): void {
  const source = readFile(filePath);
  try {
    const tokens = new Lexer(source).tokenize();
    const ast    = new Parser(tokens).parse();
    const analyzer = new SemanticAnalyzer();
    const errors   = analyzer.analyze(ast);
    if (errors.length === 0) {
      console.log("OK -- No semantic errors found.");
    } else {
      const reporter = new DiagnosticReporter();
      for (const e of errors) {
        reporter.print(DiagnosticReporter.fromSemanticError(e, source), source, filePath);
      }
      process.exit(1);
    }
  } catch (e: any) {
    const reporter = new DiagnosticReporter();
    if (e.name === 'ParseError' || e.token) {
      reporter.print(DiagnosticReporter.fromParseError(e), source, filePath);
    } else if (e.name === 'LexerError') {
      reporter.print(DiagnosticReporter.fromLexerError(e), source, filePath);
    } else {
      console.error(e.message);
    }
    process.exit(1);
  }
}

function buildFile(args: string[]): void {
  let filePath = "";
  let outputExe = "";
  let emitC = false;
  let runAfter = false;
  let optimize = false;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "-o" && i + 1 < args.length) {
      outputExe = args[++i];
    } else if (arg === "--emit-c") {
      emitC = true;
    } else if (arg === "--run") {
      runAfter = true;
    } else if (arg === "--opt") {
      optimize = true;
    } else if (!arg.startsWith("-") && !filePath) {
      filePath = arg;
    }
  }

  if (!filePath) {
    console.error("Error: No file specified for build");
    process.exit(1);
  }

  const source = readFile(filePath);

  try {
    // 1. Lexer
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();

    // 2. Parser
    const parser = new Parser(tokens);
    const ast = parser.parse();

    // 3. Semantic analysis
    const analyzer = new SemanticAnalyzer();
    const errors = analyzer.analyze(ast);
    if (errors.length > 0) {
      const reporter = new DiagnosticReporter();
      for (const err of errors) {
        reporter.print(DiagnosticReporter.fromSemanticError(err, source), source, filePath);
      }
      process.exit(1);
    }

    // 4. Code Generation (Vox -> C99)
    const generator = new CGenerator();
    const cSource = generator.generate(ast);

    // Determine paths
    const absPath = path.resolve(filePath);
    const cFilePath = absPath.replace(/\.(vox|kael)$/i, ".c");
    fs.writeFileSync(cFilePath, cSource, "utf-8");

    // 5. Compile to native binary
    const compiler = new Compiler();
    const detected = compiler.detectCompiler();
    if (detected.type === "none") {
      console.error("Error: No C compiler found (TCC, GCC, Clang, or MSVC).");
      process.exit(1);
    }

    console.log(`[Vox] Transpiling ${path.basename(filePath)} to C99...`);
    const res = compiler.compile(cFilePath, {
      outputExe: outputExe || undefined,
      optimize,
    });

    console.log(`[Vox] Native build successful: ${res.exePath} (${res.timeMs}ms using ${res.compiler})`);

    // Clean up .c if --emit-c was not passed
    if (!emitC) {
      try { fs.unlinkSync(cFilePath); } catch {}
    } else {
      console.log(`[Vox] Intermediate C file saved: ${cFilePath}`);
    }

    // 6. Run if requested
    if (runAfter) {
      console.log(`[Vox] Running ${path.basename(res.exePath)}:`);
      console.log("----------------------------------------");
      child_process.spawnSync(res.exePath, [], { stdio: "inherit" });
    }
  } catch (error: any) {
    console.error(`[Vox Error] ${error.message}`);
    if (process.env.KAEL_STACKTRACE) console.error(error.stack);
    process.exit(1);
  }
}

async function repl(): Promise<void> {
  const readline = await import("readline");
  const interpreter = new Interpreter();
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

  console.log(`Kael REPL v${VERSION}  (type 'exit' to quit, 'help' for commands)`);

  const prompt = () => rl.question("kael> ", (line) => {
    const input = line.trim();
    if (!input) return prompt();
    if (input === "exit" || input === "quit") { console.log("Goodbye!"); rl.close(); return; }
    if (input === "help") { help(); return prompt(); }

    try {
      const tokens = new Lexer(input).tokenize();
      const ast    = new Parser(tokens).parse();
      const result = (interpreter as any).execNode(ast.body[0], (interpreter as any).globals);
      if (result !== null && result !== undefined) {
        console.log("=> " + interpreter.stringify(result));
      }
    } catch (e: any) {
      console.error(e.message);
    }
    prompt();
  });

  prompt();
}

// ── Main ──────────────────────────────────────────────────────

const [, , command, ...args] = process.argv;

switch (command) {
  case "run":
    if (!args[0]) { console.error("Error: No file specified"); process.exit(1); }
    runFile(args[0]);
    break;
  case "build":
    buildFile(args);
    break;
  case "parse":
    if (!args[0]) { console.error("Error: No file specified"); process.exit(1); }
    parseFile(args[0]);
    break;
  case "check":
    if (!args[0]) { console.error("Error: No file specified"); process.exit(1); }
    checkFile(args[0]);
    break;
  case "repl":
    repl();
    break;
  case "lsp": {
    const server = new LanguageServer();
    server.startStdio();
    break;
  }
  case "version":
    console.log(`Kael v${VERSION}`);
    break;
  case "help":
  case "--help":
  case "-h":
    help();
    break;
  default:
    if (!command) { banner(); help(); }
    else { console.error(`Unknown command: ${command}`); help(); process.exit(1); }
}
