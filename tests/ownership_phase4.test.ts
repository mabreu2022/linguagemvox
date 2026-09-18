// ============================================================
// ownership_phase4.test.ts -- Testes da Fase 4: Ownership & Memória
// Cobre: own / borrow / ref, Move Semantics, Lifetime / Borrow Checker
// ============================================================

import { Lexer } from '../src/lexer/lexer';
import { Parser } from '../src/parser/parser';
import { SemanticAnalyzer, SemanticError } from '../src/semantic/analyzer';
import { Interpreter, RuntimeError } from '../src/runtime/interpreter';

function check(code: string): SemanticError[] {
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

describe('Fase 4: Ownership, Borrowing & Lifetime Checker', () => {

  describe('1. Move Semantics & Use-After-Move', () => {
    it('detecta uso após movimento em atribuição simples', () => {
      const src = `
        class Recurso {
          pub id: int;
          new(i: int) { self.id = i; }
        }

        let own r1 = new Recurso(1);
        let own r2 = r1;
        let x = r1.id;
      `;
      const errors = check(src);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].message).toMatch(/Use of moved value 'r1'/i);
    });

    it('detecta passagem repetida para função com parâmetro own', () => {
      const src = `
        class Buffer {
          pub size: int;
          new(s: int) { self.size = s; }
        }

        fn consumir(own b: Buffer) {
        }

        let own buf = new Buffer(1024);
        consumir(buf);
        consumir(buf);
      `;
      const errors = check(src);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].message).toMatch(/Use of moved value 'buf'/i);
    });

    it('permite re-inicializar uma variável movida atribuindo novo valor', () => {
      const src = `
        class Buffer {
          pub size: int;
          new(s: int) { self.size = s; }
        }

        let own buf = new Buffer(100);
        let own b2 = buf; // buf movido
        buf = new Buffer(200); // re-inicializado
        let own b3 = buf; // permitido!
      `;
      const errors = check(src);
      expect(errors.length).toBe(0);
    });
  });

  describe('2. Empréstimo Imutável (borrow)', () => {
    it('permite múltiplos empréstimos imutáveis simultâneos', () => {
      const src = `
        class Documento {
          pub texto: str;
          new(t: str) { self.texto = t; }
        }

        let own doc = new Documento("Vox");
        let borrow b1 = doc;
        let borrow b2 = doc;
      `;
      const errors = check(src);
      expect(errors.length).toBe(0);
    });

    it('impede mover variável enquanto houver empréstimo ativo', () => {
      const src = `
        class Documento {
          pub texto: str;
          new(t: str) { self.texto = t; }
        }

        let own doc = new Documento("Vox");
        let borrow b = doc;
        let own novoDono = doc;
      `;
      const errors = check(src);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].message).toMatch(/Cannot move 'doc' because it is currently borrowed/i);
    });

    it('impede mutação de variável enquanto estiver emprestada', () => {
      const src = `
        class Documento {
          pub texto: str;
          new(t: str) { self.texto = t; }
        }

        let own doc = new Documento("Vox");
        let borrow b = doc;
        doc = new Documento("Novo");
      `;
      const errors = check(src);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].message).toMatch(/Cannot assign to 'doc' because it is currently borrowed/i);
    });

    it('impede empréstimo de variável já movida', () => {
      const src = `
        class Documento {
          pub texto: str;
          new(t: str) { self.texto = t; }
        }

        let own doc = new Documento("Vox");
        let own outro = doc; // doc movido
        let borrow b = doc; // erro!
      `;
      const errors = check(src);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].message).toMatch(/moved value 'doc'/i);
    });
  });

  describe('3. Referências Mutáveis Exclusivas (ref)', () => {
    it('permite uma única referência mutável ativa', () => {
      const src = `
        class Contador {
          pub valor: int;
          new(v: int) { self.valor = v; }
        }

        let own c = new Contador(0);
        let ref r = c;
      `;
      const errors = check(src);
      expect(errors.length).toBe(0);
    });

    it('impede duas referências mutáveis ativas simultâneas', () => {
      const src = `
        class Contador {
          pub valor: int;
          new(v: int) { self.valor = v; }
        }

        let own c = new Contador(0);
        let ref r1 = c;
        let ref r2 = c;
      `;
      const errors = check(src);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].message).toMatch(/Cannot borrow 'c' as mutable reference more than once/i);
    });

    it('impede criar referência mutável se já houver empréstimo imutável', () => {
      const src = `
        class Contador {
          pub valor: int;
          new(v: int) { self.valor = v; }
        }

        let own c = new Contador(0);
        let borrow b = c;
        let ref r = c;
      `;
      const errors = check(src);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].message).toMatch(/Cannot borrow 'c' as mutable reference because it is already borrowed/i);
    });

    it('impede criar empréstimo imutável se já houver referência mutável ativa', () => {
      const src = `
        class Contador {
          pub valor: int;
          new(v: int) { self.valor = v; }
        }

        let own c = new Contador(0);
        let ref r = c;
        let borrow b = c;
      `;
      const errors = check(src);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].message).toMatch(/Cannot borrow 'c' immutably because it is currently borrowed mutably/i);
    });
  });

  describe('4. Ciclo de Vida e Expiração de Lifetimes por Escopo', () => {
    it('libera o empréstimo imutável ao sair do bloco interno', () => {
      const src = `
        class Pacote {
          pub info: str;
          new(s: str) { self.info = s; }
        }

        let own p = new Pacote("dados");
        {
          let borrow b = p;
        } // b sai de escopo aqui!
        let own destino = p; // agora mover é permitido!
      `;
      const errors = check(src);
      expect(errors.length).toBe(0);
    });

    it('libera a referência mutável ao sair do bloco interno', () => {
      const src = `
        class Pacote {
          pub info: str;
          new(s: str) { self.info = s; }
        }

        let own p = new Pacote("dados");
        {
          let ref r = p;
        } // r sai de escopo aqui!
        let borrow b2 = p; // agora emprestar é permitido!
      `;
      const errors = check(src);
      expect(errors.length).toBe(0);
    });
  });

  describe('5. Tipos Primitivos (Semântica Copy)', () => {
    it('tipos int, float, bool e str não são movidos por padrão', () => {
      const src = `
        let a = 42;
        let b = a;
        let c = a; // permitido pois é cópia

        let s1 = "ola";
        let s2 = s1;
        let s3 = s1; // permitido pois é cópia
      `;
      const errors = check(src);
      expect(errors.length).toBe(0);
    });
  });

  describe('6. Execução em Runtime com Ownership', () => {
    it('executa programa completo com own, borrow e ref corretamente', () => {
      const src = `
        class Buffer {
          pub capacidade: int;
          new(cap: int) {
            self.capacidade = cap;
          }
          pub fn info() -> str {
            return "Buffer de " + str(self.capacidade) + " bytes";
          }
        }

        fn ler_tamanho(borrow b: Buffer) -> int {
          return b.capacidade;
        }

        let own buf = new Buffer(2048);
        println(buf.info());
        let cap = ler_tamanho(buf);
        println("Capacidade lida via borrow: " + str(cap));

        let own transferido = own buf;
        println("Transferido com sucesso: " + transferido.info());
      `;
      const out = runWithOutput(src);
      expect(out).toEqual([
        'Buffer de 2048 bytes',
        'Capacidade lida via borrow: 2048',
        'Transferido com sucesso: Buffer de 2048 bytes'
      ]);
    });

    it('lança RuntimeError ao tentar acessar valor movido em runtime', () => {
      const src = `
        class Item {
          pub nome: str;
          new(n: str) { self.nome = n; }
        }
        let own a = new Item("Reliquia");
        let own b = own a;
        println(a.nome);
      `;
      // Como o SemanticAnalyzer intercepta antes, invocamos diretamente o runtime sem analyzer para testar o fallback dinâmico
      const lexer = new Lexer(src);
      const parser = new Parser(lexer.tokenize());
      const ast = parser.parse();
      const interp = new Interpreter();
      expect(() => interp.run(ast)).toThrow(/Use of moved value 'a'/i);
    });
  });
});
