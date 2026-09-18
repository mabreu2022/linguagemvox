// ============================================================
// codegen_phase6.test.ts — Testes da Fase 6:
// C99 Transpilation & Native Compilation
// ============================================================

import * as fs from 'fs';
import * as path from 'path';
import * as child_process from 'child_process';
import { Lexer } from '../src/lexer/lexer';
import { Parser } from '../src/parser/parser';
import { SemanticAnalyzer } from '../src/semantic/analyzer';
import { CGenerator } from '../src/codegen/c_generator';
import { Compiler } from '../src/codegen/compiler';

function parseAndGenerate(code: string): string {
  const lexer = new Lexer(code);
  const tokens = lexer.tokenize();
  const parser = new Parser(tokens);
  const ast = parser.parse();
  const analyzer = new SemanticAnalyzer();
  const errors = analyzer.analyze(ast);
  if (errors.length > 0) {
    throw new Error(`Semantic errors: ${errors.map(e => e.message).join('; ')}`);
  }
  const gen = new CGenerator();
  return gen.generate(ast);
}

function compileAndRunNative(code: string): string {
  const cSource = parseAndGenerate(code);
  const tmpDir = path.resolve(__dirname, '..', 'tmp_test_codegen');
  fs.mkdirSync(tmpDir, { recursive: true });
  const cFile = path.join(tmpDir, `test_${Date.now()}_${Math.floor(Math.random() * 100000)}.c`);
  const exeFile = cFile.replace(/\.c$/, process.platform === 'win32' ? '.exe' : '');
  fs.writeFileSync(cFile, cSource, 'utf-8');

  try {
    const compiler = new Compiler();
    const res = compiler.compile(cFile, { outputExe: exeFile });
    const output = child_process.execSync(`"${res.exePath}"`, { encoding: 'utf-8' });
    return output.trim();
  } finally {
    try { if (fs.existsSync(cFile)) fs.unlinkSync(cFile); } catch {}
    try { if (fs.existsSync(exeFile)) fs.unlinkSync(exeFile); } catch {}
  }
}

afterAll(() => {
  const tmpDir = path.resolve(__dirname, '..', 'tmp_test_codegen');
  if (fs.existsSync(tmpDir)) {
    try { fs.rmdirSync(tmpDir, { recursive: true }); } catch {}
  }
});

describe('Fase 6: C99 Code Generator (AST -> C)', () => {
  test('emits runtime header and main entrypoint', () => {
    const c = parseAndGenerate('let x = 42;');
    expect(c).toContain('#include "vox_runtime.h"');
    expect(c).toContain('int main(int argc, char** argv)');
    expect(c).toContain('vox_int x = ((vox_int)42LL);');
    expect(c).toContain('return 0;');
  });

  test('transpiles free functions and prototypes', () => {
    const code = `
      fn multiply(a: int, b: int) -> int {
        return a * b;
      }
      let res = multiply(6, 7);
    `;
    const c = parseAndGenerate(code);
    expect(c).toContain('vox_int multiply(vox_int a, vox_int b);');
    expect(c).toContain('vox_int multiply(vox_int a, vox_int b) {');
    expect(c).toContain('return (a * b);');
    expect(c).toContain('vox_int res = multiply(((vox_int)6LL), ((vox_int)7LL));');
  });

  test('transpiles OOP class, constructor and methods', () => {
    const code = `
      class BankAccount {
        pub balance: int;

        pub new(initial: int) {
          self.balance = initial;
        }

        pub fn deposit(amount: int) -> int {
          self.balance = self.balance + amount;
          return self.balance;
        }
      }

      let acc = new BankAccount(100);
      acc.deposit(50);
    `;
    const c = parseAndGenerate(code);
    expect(c).toContain('typedef struct Vox_BankAccount Vox_BankAccount;');
    expect(c).toContain('struct Vox_BankAccount {');
    expect(c).toContain('vox_int balance;');
    expect(c).toContain('Vox_BankAccount* Vox_BankAccount_new(vox_int initial);');
    expect(c).toContain('vox_int Vox_BankAccount_deposit(Vox_BankAccount* self, vox_int amount);');
    expect(c).toContain('Vox_BankAccount* acc = Vox_BankAccount_new(((vox_int)100LL));');
    expect(c).toContain('Vox_BankAccount_deposit(acc, ((vox_int)50LL));');
  });

  test('transpiles loops and conditionals', () => {
    const code = `
      let i = 0;
      while i < 10 {
        if i == 5 {
          break;
        }
        i = i + 1;
      }
    `;
    const c = parseAndGenerate(code);
    expect(c).toContain('while ((i < ((vox_int)10LL)))');
    expect(c).toContain('if ((i == ((vox_int)5LL)))');
    expect(c).toContain('break;');
  });

  test('transpiles pattern matching expressions', () => {
    const code = `
      let score = 95;
      let grade = match score {
        90..100 => "A",
        _ => "B"
      };
    `;
    const c = parseAndGenerate(code);
    expect(c).toContain('vox_str* grade = ({ vox_int _match_val_');
    expect(c).toContain('vox_str_new("A")');
    expect(c).toContain('vox_str_new("B")');
  });

  test('transpiles macros (format!, assert!, dbg!)', () => {
    const code = `
      let name = "Vox";
      let msg = format!("Hello {}", name);
      assert!(1 == 1, "math works");
      let d = dbg!(42);
    `;
    const c = parseAndGenerate(code);
    expect(c).toContain('vox_str_format("Hello %s", name->data)');
    expect(c).toContain('vox_assert((((vox_int)1LL) == ((vox_int)1LL)), "math works");');
    expect(c).toContain('printf("[dbg!] %lld\\n"');
  });

  test('transpiles CSP channel operations', () => {
    const code = `
      let ch = chan_new(2);
      ch.send(10);
      let v = ch.recv();
      ch.close();
    `;
    const c = parseAndGenerate(code);
    expect(c).toContain('vox_chan_new(((vox_int)2LL))');
    expect(c).toContain('vox_chan_send(ch, (void*)(intptr_t)((vox_int)10LL))');
    expect(c).toContain('(intptr_t)vox_chan_recv(ch)');
    expect(c).toContain('vox_chan_close(ch)');
  });
});

describe('Fase 6: Compiler Toolchain Integration', () => {
  test('detects an available C compiler', () => {
    const compiler = new Compiler();
    const info = compiler.detectCompiler();
    expect(info.type).not.toBe('none');
    expect(['tcc', 'gcc', 'clang', 'msvc']).toContain(info.type);
    expect(info.path.length).toBeGreaterThan(0);
  });

  test('compiles a minimal C file to native executable', () => {
    const compiler = new Compiler();
    const tmpDir = path.resolve(__dirname, '..', 'tmp_test_codegen');
    fs.mkdirSync(tmpDir, { recursive: true });
    const cFile = path.join(tmpDir, 'test_minimal.c');
    const exeFile = cFile.replace(/\.c$/, process.platform === 'win32' ? '.exe' : '');

    const minimalC = `
      #include "vox_runtime.h"
      int main() {
        vox_println("Minimal C OK");
        return 0;
      }
    `;
    fs.writeFileSync(cFile, minimalC, 'utf-8');

    try {
      const res = compiler.compile(cFile, { outputExe: exeFile });
      expect(res.success).toBe(true);
      expect(fs.existsSync(res.exePath)).toBe(true);
      const out = child_process.execSync(`"${res.exePath}"`, { encoding: 'utf-8' }).trim();
      expect(out).toBe('Minimal C OK');
    } finally {
      try { if (fs.existsSync(cFile)) fs.unlinkSync(cFile); } catch {}
      try { if (fs.existsSync(exeFile)) fs.unlinkSync(exeFile); } catch {}
    }
  });
});

describe('Fase 6: Native Binary Execution End-to-End', () => {
  test('compiles and runs basic arithmetic and functions', () => {
    const code = `
      fn calculate(a: int, b: int) -> int {
        return (a * b) + 10;
      }
      let r = calculate(5, 6);
      println(r);
    `;
    const out = compileAndRunNative(code);
    expect(out).toBe('40');
  });

  test('compiles and runs OOP class instantiation and method dispatch', () => {
    const code = `
      class Counter {
        pub count: int;

        pub new(start: int) {
          self.count = start;
        }

        pub fn increment(by: int) -> int {
          self.count = self.count + by;
          return self.count;
        }
      }

      let c = new Counter(100);
      let v = c.increment(25);
      println(v);
    `;
    const out = compileAndRunNative(code);
    expect(out).toBe('125');
  });

  test('compiles and runs string concatenation and format! macro', () => {
    const code = `
      let name = "Vox";
      let version = 6;
      let msg = format!("Lang: {}, Phase: {}", name, version);
      println(msg);
    `;
    const out = compileAndRunNative(code);
    expect(out).toBe('Lang: Vox, Phase: 6');
  });

  test('compiles and runs pattern matching expression', () => {
    const code = `
      let n = 15;
      let category = match n {
        1..10 => "small",
        11..20 => "medium",
        _ => "large"
      };
      println(category);
    `;
    const out = compileAndRunNative(code);
    expect(out).toBe('medium');
  });

  test('compiles and runs CSP concurrency channel', () => {
    const code = `
      let ch = chan_new(4);
      ch.send(101);
      ch.send(202);
      let a = ch.recv();
      let b = ch.recv();
      println(a + b);
    `;
    const out = compileAndRunNative(code);
    expect(out).toBe('303');
  });
});
