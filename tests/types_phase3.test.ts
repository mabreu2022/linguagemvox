// ============================================================
// types_phase3.test.ts -- Testes da Fase 3: Sistema de Tipos
// Tipagem Gradual, Generics, Type Checker & Inferência
// ============================================================

import { Lexer } from '../src/lexer/lexer';
import { Parser } from '../src/parser/parser';
import { SemanticAnalyzer, SemanticError } from '../src/semantic/analyzer';
import { Interpreter } from '../src/runtime/interpreter';

function analyze(code: string): SemanticError[] {
  const lexer = new Lexer(code);
  const tokens = lexer.tokenize();
  const parser = new Parser(tokens);
  const ast = parser.parse();
  const analyzer = new SemanticAnalyzer();
  return analyzer.analyze(ast);
}

function run(code: string): any {
  const lexer = new Lexer(code);
  const tokens = lexer.tokenize();
  const parser = new Parser(tokens);
  const ast = parser.parse();
  const analyzer = new SemanticAnalyzer();
  const errors = analyzer.analyze(ast);
  if (errors.length > 0) {
    throw new Error(`Semantic errors: ${errors.map(e => e.message).join('; ')}`);
  }
  const interp = new Interpreter();
  return interp.run(ast);
}

function runWithOutput(code: string): string[] {
  const output: string[] = [];
  const lexer = new Lexer(code);
  const tokens = lexer.tokenize();
  const parser = new Parser(tokens);
  const ast = parser.parse();
  const analyzer = new SemanticAnalyzer();
  const errors = analyzer.analyze(ast);
  if (errors.length > 0) {
    throw new Error(`Semantic errors: ${errors.map(e => e.message).join('; ')}`);
  }
  const interp = new Interpreter();
  (interp as any).defineNative('println', (v: any) => {
    output.push(interp.stringify(v));
    return null;
  });
  (interp as any).defineNative('print', (v: any) => {
    output.push(interp.stringify(v));
    return null;
  });
  interp.run(ast);
  return output;
}

describe('Fase 3: Sistema de Tipos (Gradual Typing & Generics)', () => {

  describe('1. Tipagem Gradual e Inferência Local', () => {
    it('infere tipo int a partir do literal e impede reatribuição para str', () => {
      const src = `
        let x = 42;
        x = "texto";
      `;
      const errors = analyze(src);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].message).toMatch(/Type mismatch: cannot assign 'str' to variable 'x' of type 'int'/i);
    });

    it('permite reatribuição compatível com o tipo inferido', () => {
      const src = `
        let x = 42;
        x = 100;
      `;
      const errors = analyze(src);
      expect(errors.length).toBe(0);
    });

    it('variáveis não tipadas e sem inicialização assumem tipagem gradual flexível', () => {
      const src = `
        let g;
        g = 42;
        g = "agora sou texto";
        g = true;
      `;
      const errors = analyze(src);
      expect(errors.length).toBe(0);
    });

    it('infere tipo homogêneo de array literal como Array<int>', () => {
      const src = `
        let numeros = [10, 20, 30];
        let n: int = numeros[0];
      `;
      const errors = analyze(src);
      expect(errors.length).toBe(0);
    });

    it('detecta erro ao tentar indexar array com chave não inteira', () => {
      const src = `
        let numeros = [10, 20, 30];
        let v = numeros["chave"];
      `;
      const errors = analyze(src);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].message).toMatch(/Array index must be int/i);
    });

    it('detecta tipo incompatível em atribuição de elemento de Array<int> para str', () => {
      const src = `
        let numeros = [10, 20, 30];
        let s: str = numeros[0];
      `;
      const errors = analyze(src);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].message).toMatch(/Type mismatch: cannot assign 'int' to 'str'/i);
    });
  });

  describe('2. Classes Genéricas', () => {
    it('permite instanciar classe genérica Box<T> e resolve o tipo de retorno de seus métodos', () => {
      const src = `
        class Box<T> {
          pub val: T;
          new(v: T) {
            self.val = v;
          }
          pub fn get() -> T => self.val;
        }

        let b = new Box<int>(42);
        let x: int = b.get();
      `;
      const errors = analyze(src);
      expect(errors.length).toBe(0);
    });

    it('detecta incompatibilidade ao atribuir retorno de Box<int>.get() para str', () => {
      const src = `
        class Box<T> {
          pub val: T;
          new(v: T) {
            self.val = v;
          }
          pub fn get() -> T => self.val;
        }

        let b = new Box<int>(42);
        let s: str = b.get();
      `;
      const errors = analyze(src);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].message).toMatch(/Type mismatch: cannot assign 'int' to 'str'/i);
    });

    it('detecta incompatibilidade no argumento do construtor genérico explícito', () => {
      const src = `
        class Box<T> {
          pub val: T;
          new(v: T) {
            self.val = v;
          }
        }

        let b = new Box<int>("invalido");
      `;
      const errors = analyze(src);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].message).toMatch(/Constructor argument 1 type mismatch: expected 'int', got 'str'/i);
    });

    it('suporta múltiplos parâmetros de tipo: Pair<K, V>', () => {
      const src = `
        class Pair<K, V> {
          pub key: K;
          pub value: V;
          new(k: K, v: V) {
            self.key = k;
            self.value = v;
          }
          pub fn get_key() -> K => self.key;
          pub fn get_val() -> V => self.value;
        }

        let p = new Pair<str, int>("idade", 30);
        let k: str = p.get_key();
        let v: int = p.get_val();
      `;
      const errors = analyze(src);
      expect(errors.length).toBe(0);
    });

    it('infere argumentos de tipo do construtor automaticamente quando omitidos', () => {
      const src = `
        class Pair<K, V> {
          pub key: K;
          pub value: V;
          new(k: K, v: V) {
            self.key = k;
            self.value = v;
          }
          pub fn get_key() -> K => self.key;
          pub fn get_val() -> V => self.value;
        }

        let p = new Pair("pontos", 100);
        let k: str = p.get_key();
        let v: int = p.get_val();
      `;
      const errors = analyze(src);
      expect(errors.length).toBe(0);
    });
  });

  describe('3. Funções e Métodos Genéricos', () => {
    it('chama função genérica identity com argumento de tipo explícito', () => {
      const src = `
        fn identity<T>(x: T) -> T => x;

        let num = identity<int>(42);
        let n: int = num;
      `;
      const errors = analyze(src);
      expect(errors.length).toBe(0);
    });

    it('infere automaticamente o tipo T em chamada a função genérica', () => {
      const src = `
        fn identity<T>(x: T) -> T => x;

        let num = identity(42);
        let txt = identity("vox");
        let n: int = num;
        let s: str = txt;
      `;
      const errors = analyze(src);
      expect(errors.length).toBe(0);
    });

    it('detecta erro de tipo com base na inferência de função genérica', () => {
      const src = `
        fn identity<T>(x: T) -> T => x;

        let num = identity(42);
        let s: str = num;
      `;
      const errors = analyze(src);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].message).toMatch(/Type mismatch: cannot assign 'int' to 'str'/i);
    });
  });

  describe('4. Option<T> e Result<T, E> com Type Checking Rigoroso', () => {
    it('infere tipo interno de Option a partir do construtor some()', () => {
      const src = `
        let opt = some(42);
        let val: int = opt.unwrap();
      `;
      const errors = analyze(src);
      expect(errors.length).toBe(0);
    });

    it('detecta erro ao desempacotar Option<int> em variável str', () => {
      const src = `
        let opt = some(42);
        let s: str = opt.unwrap();
      `;
      const errors = analyze(src);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].message).toMatch(/Type mismatch: cannot assign 'int' to 'str'/i);
    });

    it('verifica o tipo de argumento em unwrap_or()', () => {
      const src = `
        let opt = some(42);
        let res: int = opt.unwrap_or(0);
      `;
      const errors = analyze(src);
      expect(errors.length).toBe(0);
    });

    it('detecta erro de tipo no valor default de unwrap_or()', () => {
      const src = `
        let opt = some(42);
        let res = opt.unwrap_or("padrao");
      `;
      const errors = analyze(src);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].message).toMatch(/Argument 1 type mismatch: expected 'int', got 'str'/i);
    });

    it('infere tipo de ok() em Result<T, E>', () => {
      const src = `
        let res = ok(3.14);
        let f: float = res.unwrap();
      `;
      const errors = analyze(src);
      expect(errors.length).toBe(0);
    });
  });

  describe('5. Interfaces Genéricas', () => {
    it('aceita classe implementando interface genérica', () => {
      const src = `
        interface Repository<T> {
          pub fn find_by_id(id: int) -> Option<T>;
        }

        class User {
          pub name: str;
          new(n: str) { self.name = n; }
        }

        class UserRepository implements Repository {
          pub fn find_by_id(id: int) -> Option<User> {
            return some(new User("Alice"));
          }
        }
      `;
      const errors = analyze(src);
      expect(errors.length).toBe(0);
    });

    it('detecta interface genérica não implementada', () => {
      const src = `
        interface Repository<T> {
          pub fn find_by_id(id: int) -> Option<T>;
        }

        class EmptyRepo implements Repository {
        }
      `;
      const errors = analyze(src);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].message).toMatch(/does not implement interface method 'find_by_id'/i);
    });
  });

  describe('6. Execução em Runtime de Código Genérico', () => {
    it('executa pilha genérica Stack<T> com push, pop e len', () => {
      const src = `
        class Stack<T> {
          pub items: Array<T>;

          new() {
            self.items = [];
          }

          pub fn push_item(item: T) {
            push(self.items, item);
          }

          pub fn pop_item() -> Option<T> {
            if len(self.items) == 0 {
              return none();
            }
            return some(pop(self.items));
          }

          pub fn count() -> int => len(self.items);
        }

        let s = new Stack<int>();
        s.push_item(10);
        s.push_item(20);
        s.push_item(30);

        println(s.count());
        let top = s.pop_item();
        println(top.unwrap());
        println(s.count());
      `;
      const out = runWithOutput(src);
      expect(out).toEqual(['3', '30', '2']);
    });

    it('executa Pair<K, V> e método genérico identity', () => {
      const src = `
        fn identity<T>(x: T) -> T => x;

        class Pair<K, V> {
          pub first: K;
          pub second: V;
          new(f: K, s: V) {
            self.first = f;
            self.second = s;
          }
          pub fn info() -> str {
            return str(self.first) + " -> " + str(self.second);
          }
        }

        let p = new Pair<str, int>("Vox", 3);
        let id_val = identity(42);
        println(p.info());
        println(id_val);
      `;
      const out = runWithOutput(src);
      expect(out).toEqual(['Vox -> 3', '42']);
    });
  });

  describe('7. Recursos Adicionais de Generics & Tipagem Gradual', () => {
    it('suporta método com parâmetro genérico próprio dentro de classe genérica', () => {
      const src = `
        class Holder<T> {
          pub item: T;
          new(i: T) { self.item = i; }
          pub fn convert<U>(val: U) -> U {
            return val;
          }
        }
        let h = new Holder<int>(10);
        let res: str = h.convert<str>("texto");
      `;
      const errors = analyze(src);
      expect(errors.length).toBe(0);
    });

    it('valida tipo de argumento no método push() de Array<int>', () => {
      const src = `
        let arr: Array<int> = [1, 2, 3];
        arr.push(4);
      `;
      const errors = analyze(src);
      expect(errors.length).toBe(0);
    });

    it('detecta erro ao chamar push() de Array<int> com str', () => {
      const src = `
        let arr: Array<int> = [1, 2, 3];
        arr.push("quatro");
      `;
      const errors = analyze(src);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].message).toMatch(/Argument 1 type mismatch: expected 'int', got 'str'/i);
    });

    it('aceita função gradual sem tipos explícitos e executa normalmente', () => {
      const src = `
        fn somar(a, b) {
          return a + b;
        }
        let r = somar(10, 20);
        let s = somar("ola ", "mundo");
        println(r);
        println(s);
      `;
      const out = runWithOutput(src);
      expect(out).toEqual(['30', 'ola mundo']);
    });

    it('permite herança entre classes genéricas', () => {
      const src = `
        class Container<T> {
          pub val: T;
          new(v: T) { self.val = v; }
          pub fn get() -> T => self.val;
        }
        class NamedContainer<T> extends Container {
          pub name: str;
          new(n: str, v: T) {
            super.new(v);
            self.name = n;
          }
          pub fn get_name() -> str => self.name;
        }
        let nc = new NamedContainer<int>("meu_int", 99);
        let v: int = nc.get();
        let n: str = nc.get_name();
      `;
      const errors = analyze(src);
      expect(errors.length).toBe(0);
    });
  });
});
