// ============================================================
// interpreter.test.ts -- Testes do Interpretador (corrigidos)
// ============================================================

import { Lexer } from "../src/lexer/lexer";
import { Parser } from "../src/parser/parser";
import { Interpreter } from "../src/runtime/interpreter";

function run(src: string): any {
  const tokens = new Lexer(src).tokenize();
  const ast    = new Parser(tokens).parse();
  const interp = new Interpreter();
  let result: any = null;
  const env = (interp as any).globals;
  for (const node of ast.body) {
    result = (interp as any).execNode(node, env);
  }
  return result;
}

describe("Interpreter", () => {

  test("avalia aritmetica basica", () => {
    expect(run("2 + 3")).toBe(5);
    expect(run("10 - 4")).toBe(6);
    expect(run("3 * 4")).toBe(12);
    expect(run("10 / 4")).toBe(2.5);
    expect(run("10 % 3")).toBe(1);
    expect(run("2 ** 8")).toBe(256);
  });

  test("avalia comparacoes", () => {
    expect(run("5 > 3")).toBe(true);
    expect(run("5 < 3")).toBe(false);
    expect(run("5 == 5")).toBe(true);
    expect(run("5 != 3")).toBe(true);
  });

  test("avalia operadores logicos", () => {
    expect(run("true && false")).toBe(false);
    expect(run("true || false")).toBe(true);
    expect(run("!true")).toBe(false);
  });

  test("avalia declaracao de variavel", () => {
    expect(run("let x = 42; x")).toBe(42);
    expect(run('let s = "hello"; s')).toBe("hello");
  });

  test("avalia funcao com retorno", () => {
    expect(run("fn soma(a: int, b: int) -> int { return a + b } soma(3, 4)")).toBe(7);
  });

  test("avalia recursao (fatorial)", () => {
    const src = `
      fn fat(n: int) -> int {
        if n <= 1 { return 1 }
        return n * fat(n - 1)
      }
      fat(5)
    `;
    expect(run(src)).toBe(120);
  });

  test("avalia array e map", () => {
    const src = `
      let nums = [1, 2, 3, 4, 5]
      let dobros = nums.map(|x| => x * 2)
      dobros
    `;
    const result = run(src) as number[];
    expect(result).toEqual([2, 4, 6, 8, 10]);
  });

  test("avalia filter", () => {
    const src = `
      let nums = [1, 2, 3, 4, 5, 6]
      nums.filter(|x| => x % 2 == 0)
    `;
    expect(run(src)).toEqual([2, 4, 6]);
  });

  test("avalia reduce", () => {
    const src = `
      let nums = [1, 2, 3, 4, 5]
      nums.reduce(|acc, x| => acc + x, 0)
    `;
    expect(run(src)).toBe(15);
  });

  test("avalia string concatenacao", () => {
    expect(run('"Hello" + ", " + "Kael!"')).toBe("Hello, Kael!");
  });

  test("avalia while loop", () => {
    const src = `
      let i = 0
      let sum = 0
      while i < 5 {
        sum = sum + i
        i = i + 1
      }
      sum
    `;
    expect(run(src)).toBe(10);
  });

  test("avalia for loop", () => {
    const src = `
      let soma = 0
      for n in [1, 2, 3, 4, 5] {
        soma = soma + n
      }
      soma
    `;
    expect(run(src)).toBe(15);
  });

  test("avalia closure simples", () => {
    const src = `
      fn make_adder(n: int) -> int {
        let adder = |x| => x + n
        return adder(10)
      }
      make_adder(5)
    `;
    expect(run(src)).toBe(15);
  });

  test("avalia classe simples - acesso a campo", () => {
    const src = `
      class Ponto {
        pub x: int
        pub y: int
        new(x: int, y: int) {
          self.x = x
          self.y = y
        }
      }
      let p = new Ponto(3, 4)
      p.x
    `;
    expect(run(src)).toBe(3);
  });

  test("avalia pipe operator", () => {
    const src = `
      let resultado = 5 |> |x| => x * 2
      resultado
    `;
    expect(run(src)).toBe(10);
  });

  test("avalia match com retorno explicito", () => {
    const src = `
      fn cat(n: int) -> str {
        if n == 0 { return "zero" }
        return "outro"
      }
      cat(0) + "," + cat(99)
    `;
    expect(run(src)).toBe("zero,outro");
  });

  test("avalia heranca e metodos", () => {
    const src = `
      class Animal {
        pub nome: str
        new(nome: str) {
          self.nome = nome
        }
        pub fn falar() -> str {
          return "..."
        }
      }
      class Cachorro extends Animal {
        new(nome: str) {
          super(nome)
        }
        pub fn falar() -> str {
          return "Au!"
        }
      }
      let rex = new Cachorro("Rex")
      rex.falar()
    `;
    expect(run(src)).toBe("Au!");
  });

  test("avalia len em arrays e strings", () => {
    expect(run(`len([1, 2, 3])`)).toBe(3);
    expect(run(`len("hello")`)).toBe(5);
  });

  test("avalia conversoes de tipo", () => {
    expect(run(`int(3.9)`)).toBe(3);
    expect(run(`float(5)`)).toBe(5);
    expect(run(`bool(0)`)).toBe(false);
    expect(run(`bool(1)`)).toBe(true);
  });
});
