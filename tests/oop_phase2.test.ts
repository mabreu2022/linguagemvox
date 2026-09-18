// ============================================================
// oop_phase2.test.ts -- Testes para a Fase 2: OOP Core
// Cobre: Operator Overloading, Access Control, Static Members,
//        super.method(), Option & Result, Interface Checking
// ============================================================

import { Lexer } from '../src/lexer/lexer';
import { Parser } from '../src/parser/parser';
import { Interpreter } from '../src/runtime/interpreter';
import { SemanticAnalyzer } from '../src/semantic/analyzer';

function run(source: string): { interpreter: Interpreter; output: string[] } {
  const output: string[] = [];
  const lexer = new Lexer(source);
  const parser = new Parser(lexer.tokenize());
  const ast = parser.parse();
  const interpreter = new Interpreter();

  // Redirect println and print to test buffer
  (interpreter as any).defineNative('println', (v: any) => {
    output.push(interpreter.stringify(v));
    return null;
  });
  (interpreter as any).defineNative('print', (v: any) => {
    output.push(interpreter.stringify(v));
    return null;
  });

  interpreter.run(ast);
  return { interpreter, output };
}

function check(source: string) {
  const lexer = new Lexer(source);
  const parser = new Parser(lexer.tokenize());
  const ast = parser.parse();
  const analyzer = new SemanticAnalyzer();
  return analyzer.analyze(ast);
}

describe('Fase 2: OOP Core', () => {

  describe('1. Operator Overloading', () => {
    it('sobrecarrega operadores aritméticos (+, -, *)', () => {
      const src = `
        class Vec2 {
            pub x: int
            pub y: int

            new(x: int, y: int) {
                self.x = x
                self.y = y
            }

            operator +(other: Vec2) -> Vec2 {
                return new Vec2(self.x + other.x, self.y + other.y)
            }

            operator -(other: Vec2) -> Vec2 {
                return new Vec2(self.x - other.x, self.y - other.y)
            }

            operator *(scalar: int) -> Vec2 {
                return new Vec2(self.x * scalar, self.y * scalar)
            }
        }

        let v1 = new Vec2(10, 20)
        let v2 = new Vec2(5, 7)
        let soma = v1 + v2
        let sub  = v1 - v2
        let mult = v1 * 3

        println(str(soma.x) + "," + str(soma.y))
        println(str(sub.x) + "," + str(sub.y))
        println(str(mult.x) + "," + str(mult.y))
      `;
      const { output } = run(src);
      expect(output).toEqual(['15,27', '5,13', '30,60']);
    });

    it('sobrecarrega operadores de igualdade (==, !=)', () => {
      const src = `
        class Item {
            pub id: int
            pub nome: str

            new(id: int, nome: str) {
                self.id = id
                self.nome = nome
            }

            operator ==(other: Item) -> bool {
                return self.id == other.id
            }
        }

        let a = new Item(1, "Espada")
        let b = new Item(1, "Espada Diferente")
        let c = new Item(2, "Escudo")

        println(str(a == b))
        println(str(a != c))
        println(str(a == c))
      `;
      const { output } = run(src);
      expect(output).toEqual(['true', 'true', 'false']);
    });

    it('sobrecarrega operador de indexação ([] e []=)', () => {
      const src = `
        class Buffer {
            priv dados: Array<int>

            new() {
                self.dados = [0, 0, 0]
            }

            operator [](idx: int) -> int {
                return self.dados[idx]
            }

            operator []=(idx: int, val: int) -> void {
                self.dados[idx] = val
            }
        }

        let buf = new Buffer()
        buf[1] = 42
        println(str(buf[0]))
        println(str(buf[1]))
      `;
      const { output } = run(src);
      expect(output).toEqual(['0', '42']);
    });
  });

  describe('2. Access Control (priv, prot, pub)', () => {
    it('permite acesso a membros privados dentro da própria classe', () => {
      const src = `
        class Conta {
            priv saldo: int

            new(inicial: int) {
                self.saldo = inicial
            }

            pub fn depositar(val: int) -> void {
                self.saldo = self.saldo + val
            }

            pub fn verSaldo() -> int {
                return self.saldo
            }
        }

        let c = new Conta(100)
        c.depositar(50)
        println(str(c.verSaldo()))
      `;
      const { output } = run(src);
      expect(output).toEqual(['150']);
    });

    it('bloqueia acesso a campo privado fora da classe em runtime', () => {
      const src = `
        class Segredo {
            priv chave: str
            new(k: str) { self.chave = k }
        }
        let s = new Segredo("12345")
        println(s.chave)
      `;
      expect(() => run(src)).toThrow(/private/i);
    });

    it('permite acesso a membros protegidos (prot) por subclasses', () => {
      const src = `
        class Base {
            prot valor: int
            new(v: int) { self.valor = v }
        }

        class Derivada extends Base {
            new(v: int) {
                super(v)
            }

            pub fn dobrar() -> int {
                return self.valor * 2
            }
        }

        let d = new Derivada(21)
        println(str(d.dobrar()))
      `;
      const { output } = run(src);
      expect(output).toEqual(['42']);
    });

    it('bloqueia acesso a campo protegido (prot) fora da hierarquia', () => {
      const src = `
        class Base {
            prot valor: int
            new(v: int) { self.valor = v }
        }
        let b = new Base(10)
        println(str(b.valor))
      `;
      expect(() => run(src)).toThrow(/protected/i);
    });
  });

  describe('3. Static Members (stat)', () => {
    it('executa métodos estáticos chamados pela classe', () => {
      const src = `
        class MathUtils {
            pub stat fn quadrado(x: int) -> int {
                return x * x
            }

            pub stat fn cubo(x: int) -> int {
                return x * x * x
            }
        }

        println(str(MathUtils.quadrado(5)))
        println(str(MathUtils.cubo(3)))
      `;
      const { output } = run(src);
      expect(output).toEqual(['25', '27']);
    });

    it('acessa e modifica campos estáticos na classe', () => {
      const src = `
        class Contador {
            pub stat total: int = 0

            pub stat fn incrementar() -> void {
                Contador.total = Contador.total + 1
            }
        }

        println(str(Contador.total))
        Contador.incrementar()
        Contador.incrementar()
        println(str(Contador.total))
      `;
      const { output } = run(src);
      expect(output).toEqual(['0', '2']);
    });
  });

  describe('4. super.method() Calls', () => {
    it('invoca método da superclasse explicitamente com super.method()', () => {
      const src = `
        class Animal {
            pub fn speak() -> str {
                return "Som de animal"
            }
        }

        class Gato extends Animal {
            pub fn speak() -> str {
                return super.speak() + " -> Miau!"
            }
        }

        let g = new Gato()
        println(g.speak())
      `;
      const { output } = run(src);
      expect(output).toEqual(['Som de animal -> Miau!']);
    });

    it('funciona em múltiplos níveis de herança', () => {
      const src = `
        class A {
            pub fn tag() -> str => "A"
        }
        class B extends A {
            pub fn tag() -> str => super.tag() + "-B"
        }
        class C extends B {
            pub fn tag() -> str => super.tag() + "-C"
        }

        let c = new C()
        println(c.tag())
      `;
      const { output } = run(src);
      expect(output).toEqual(['A-B-C']);
    });
  });

  describe('5. Option<T> e Result<T, E>', () => {
    it('cria e manipula Option (is_some, is_none, unwrap, unwrap_or)', () => {
      const src = `
        let algum = some("Vox")
        let nenhum = none()

        println(str(algum.is_some()))
        println(str(algum.is_none()))
        println(algum.unwrap())
        println(str(nenhum.is_none()))
        println(nenhum.unwrap_or("padrao"))
      `;
      const { output } = run(src);
      expect(output).toEqual(['true', 'false', 'Vox', 'true', 'padrao']);
    });

    it('cria e manipula Result (is_ok, is_err, unwrap, unwrap_err, unwrap_or)', () => {
      const src = `
        let sucesso = ok(200)
        let falha = err("Erro 404")

        println(str(sucesso.is_ok()))
        println(str(sucesso.unwrap()))
        println(str(falha.is_err()))
        println(falha.unwrap_err())
        println(str(falha.unwrap_or(500)))
      `;
      const { output } = run(src);
      expect(output).toEqual(['true', '200', 'true', 'Erro 404', '500']);
    });

    it('pattern matching com Option (some e none)', () => {
      const src = `
        fn verificar(opt: Option<str>) -> void {
            match opt {
                some(val) => println("Presente: " + val),
                none      => println("Vazio"),
            }
        }

        verificar(some("ativo"))
        verificar(none())
      `;
      const { output } = run(src);
      expect(output).toEqual(['Presente: ativo', 'Vazio']);
    });

    it('pattern matching com Result (ok e err)', () => {
      const src = `
        fn processar(res: Result<int, str>) -> void {
            match res {
                ok(n)  => println("Valor: " + str(n)),
                err(e) => println("Falha: " + e),
            }
        }

        processar(ok(42))
        processar(err("conexao perdida"))
      `;
      const { output } = run(src);
      expect(output).toEqual(['Valor: 42', 'Falha: conexao perdida']);
    });
  });

  describe('6. Semantic Analyzer / Type Checker OOP', () => {
    it('valida implementação completa de interface', () => {
      const src = `
        interface Dispositivo {
            pub fn ligar() -> void
            pub fn desligar() -> void
        }

        class Lampada implements Dispositivo {
            pub fn ligar() -> void {}
            pub fn desligar() -> void {}
        }
      `;
      const errors = check(src);
      expect(errors).toHaveLength(0);
    });

    it('detecta método de interface faltante', () => {
      const src = `
        interface Dispositivo {
            pub fn ligar() -> void
            pub fn desligar() -> void
        }

        class LampadaIncompleta implements Dispositivo {
            pub fn ligar() -> void {}
        }
      `;
      const errors = check(src);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].message).toMatch(/does not implement interface method 'desligar'/i);
    });

    it('detecta acesso estático inválido a membro privado', () => {
      const src = `
        class Cofre {
            priv stat segredo: str = "abc"
        }
        let s = Cofre.segredo
      `;
      const errors = check(src);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].message).toMatch(/Cannot access private member 'segredo'/i);
    });

    it('permite passar subclasse para função esperando superclasse (polimorfismo)', () => {
      const src = `
        class Base {
            pub fn id() -> int => 1
        }
        class Sub extends Base {
            pub fn id() -> int => 2
        }

        fn inspecionar(b: Base) -> int {
            return b.id()
        }

        let s = new Sub()
        let res = inspecionar(s)
      `;
      const errors = check(src);
      expect(errors).toHaveLength(0);
    });
  });
});
