import { Lexer } from '../src/lexer/lexer';
import { Parser } from '../src/parser/parser';
import { SemanticAnalyzer } from '../src/semantic/analyzer';

function analyzeCode(code: string) {
  const lexer = new Lexer(code);
  const tokens = lexer.tokenize();
  const parser = new Parser(tokens);
  const ast = parser.parse();
  const analyzer = new SemanticAnalyzer();
  return analyzer.analyze(ast);
}

describe('Vox v1.0 — Passo 2: Semantic & Move Checker', () => {

  describe('1. Imutabilidade por Padrão (let vs. let mut)', () => {
    test('emite erro ao reatribuir variável declarada com let imutável', () => {
      const errors = analyzeCode(`
        let x = 10;
        x = 20;
      `);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some(e => e.message.includes("Cannot assign to immutable variable 'x'"))).toBe(true);
    });

    test('permite reatribuição quando declarada explicitamente com let mut', () => {
      const errors = analyzeCode(`
        let mut x = 10;
        x = 20;
      `);
      expect(errors).toHaveLength(0);
    });
  });

  describe('2. Move Checker & Código E0103 (Use-After-Move)', () => {
    test('emite erro E0103 ao ler variável após transferência de posse (move)', () => {
      const errors = analyzeCode(`
        struct Buffer(pub size: int);
        let buf = Buffer(1024);
        let buf2 = move buf;
        let s = buf.size;
      `);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some(e => e.message.includes('[E0103]') && e.message.includes("Use of moved value 'buf'"))).toBe(true);
    });

    test('emite erro E0103 ao tentar mover novamente variável já movida', () => {
      const errors = analyzeCode(`
        struct Resource(pub id: int);
        let res = Resource(1);
        let r1 = move res;
        let r2 = move res;
      `);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some(e => e.message.includes('[E0103]'))).toBe(true);
    });
  });

  describe('3. Concorrência CSP Segura: ch.send(move val) com posse exclusiva', () => {
    test('ch.send(move val) consome posse e bloqueia reuso no remetente (E0103)', () => {
      const errors = analyzeCode(`
        struct Task(pub id: int);
        let ch = chan_new(10);
        let task = Task(42);
        ch.send(move task);
        let id = task.id;
      `);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some(e => e.message.includes('[E0103]') && e.message.includes("Use of moved value 'task'"))).toBe(true);
    });

    test('chan_send(ch, move val) consome posse e bloqueia reuso com E0103', () => {
      const errors = analyzeCode(`
        struct Packet(pub data: int);
        let ch = chan_new(10);
        let p = Packet(99);
        chan_send(ch, move p);
        let d = p.data;
      `);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some(e => e.message.includes('[E0103]') && e.message.includes("Use of moved value 'p'"))).toBe(true);
    });
  });

  describe('4. Strict Null-Safety & Option<T>', () => {
    test('atribuição de Option<T> com some e none é válida', () => {
      const errors = analyzeCode(`
        let mut a: int? = some(42);
        a = none;
      `);
      expect(errors).toHaveLength(0);
    });

    test('proíbe atribuir valor plano T diretamente a Option<T> sem construtor some', () => {
      const errors = analyzeCode(`
        let a: int? = 42;
      `);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some(e => e.message.includes('Type mismatch'))).toBe(true);
    });

    test('proíbe atribuir Option<T> diretamente a T sem operador ?? ou unwrap', () => {
      const errors = analyzeCode(`
        let opt: int? = some(10);
        let direct: int = opt;
      `);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some(e => e.message.includes('Type mismatch'))).toBe(true);
    });

    test('operador ?? desempacota Option<T> retornando T com verificação de tipo', () => {
      const errors = analyzeCode(`
        let opt: int? = some(10);
        let unwrapped: int = opt ?? 0;
      `);
      expect(errors).toHaveLength(0);
    });

    test('operador ?? emite erro se o fallback tiver tipo incompatível', () => {
      const errors = analyzeCode(`
        let opt: int? = some(10);
        let unwrapped = opt ?? "invalido";
      `);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some(e => e.message.includes("Type mismatch in coalescing operator '??'"))).toBe(true);
    });

    test('pattern matching exaustivo aceita some e none', () => {
      const errors = analyzeCode(`
        let opt: int? = some(10);
        let res = match (opt) {
          some(v) => v + 1,
          none => 0,
        };
      `);
      expect(errors).toHaveLength(0);
    });

    test('pattern matching não-exaustivo em Option acusa falta de variante', () => {
      const errors = analyzeCode(`
        let opt: int? = some(10);
        let res = match (opt) {
          some(v) => v + 1,
        };
      `);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some(e => e.message.includes("Non-exhaustive pattern matching for Option: missing 'none' variant"))).toBe(true);
    });
  });

  describe('5. Structs e Traits Desacoplados', () => {
    test('valida tipos dos campos no construtor primário de structs', () => {
      const errors = analyzeCode(`
        struct Vector(pub x: float, pub y: float);
        let v = Vector(1.0, 2.0);
        let x: float = v.x;
        let y: float = v.y;
      `);
      expect(errors).toHaveLength(0);
    });

    test('emite erro se construtor da struct for chamado com tipo incompatível', () => {
      const errors = analyzeCode(`
        struct Vector(pub x: float, pub y: float);
        let v = Vector(1.0, "invalido");
      `);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some(e => e.message.includes('type mismatch'))).toBe(true);
    });

    test('valida implementação completa de Trait em Struct', () => {
      const errors = analyzeCode(`
        struct Point(pub x: float, pub y: float);
        trait Printable {
          fn print(self);
        }
        impl Printable for Point {
          fn print(self) {
            println(self.x);
          }
        }
      `);
      expect(errors).toHaveLength(0);
    });

    test('emite erro se método obrigatório da Trait não for implementado', () => {
      const errors = analyzeCode(`
        struct Point(pub x: float, pub y: float);
        trait Display {
          fn show(self);
          fn hide(self);
        }
        impl Display for Point {
          fn show(self) {
            println(self.x);
          }
        }
      `);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some(e => e.message.includes("does not implement trait method 'hide'"))).toBe(true);
    });
  });
});
