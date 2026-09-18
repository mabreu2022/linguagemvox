// ============================================================
// modern_features_phase5.test.ts -- Testes da Fase 5:
// Functional, CSP Concurrency, Pattern Matching & Metaprogramming
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

function runWithOutput(code: string): { result: any; logs: string[] } {
  const logs: string[] = [];
  const originalLog = console.log;
  console.log = (...args: any[]) => {
    logs.push(args.map(a => String(a)).join(' '));
  };
  try {
    const res = run(code);
    return { result: res, logs };
  } finally {
    console.log = originalLog;
  }
}

describe('Fase 5 — Features Modernas', () => {

  // ── 1. Lambdas & Programação Funcional ─────────────────────
  describe('Lambdas & High-Order Functions', () => {
    test('avalia lambda simples de uma linha', () => {
      const src = `
        let dobro = |x| => x * 2;
        dobro(21)
      `;
      expect(run(src)).toBe(42);
    });

    test('avalia lambda com multiplos parametros', () => {
      const src = `
        let somar = |a, b| => a + b;
        somar(15, 27)
      `;
      expect(run(src)).toBe(42);
    });

    test('avalia lambda com bloco de codigo e closure', () => {
      const src = `
        let multiplicador = 5;
        let operar = |x| {
          let extra = 2;
          return x * multiplicador + extra;
        };
        operar(8)
      `;
      expect(run(src)).toBe(42);
    });

    test('array .map() transforma elementos', () => {
      const src = `
        let nums = [1, 2, 3, 4];
        let dobrados = nums.map(|x| => x * 2);
        dobrados
      `;
      expect(run(src)).toEqual([2, 4, 6, 8]);
    });

    test('array .filter() filtra elementos', () => {
      const src = `
        let nums = [1, 2, 3, 4, 5, 6, 7, 8];
        let pares = nums.filter(|x| => x % 2 == 0);
        pares
      `;
      expect(run(src)).toEqual([2, 4, 6, 8]);
    });

    test('array .reduce() acumula valores', () => {
      const src = `
        let nums = [1, 2, 3, 4, 5];
        let soma = nums.reduce(|acc, x| => acc + x, 0);
        soma
      `;
      expect(run(src)).toBe(15);
    });

    test('array .find() encontra primeiro elemento correspondente', () => {
      const src = `
        let nums = [10, 20, 30, 40];
        let achado = nums.find(|x| => x > 25);
        achado
      `;
      expect(run(src)).toBe(30);
    });

    test('array .every() e .some() avaliam predicados', () => {
      const src = `
        let pares = [2, 4, 6, 8];
        let todosPares = pares.every(|x| => x % 2 == 0);
        let mistos = [1, 3, 5, 8];
        let temPar = mistos.some(|x| => x % 2 == 0);
        [todosPares, temPar]
      `;
      expect(run(src)).toEqual([true, true]);
    });

    test('array .for_each() itera com efeito colateral', () => {
      const src = `
        let total = 0;
        [10, 20, 30].for_each(|x| => total += x);
        total
      `;
      expect(run(src)).toBe(60);
    });

    test('operador pipeline (|>) encadeia funcoes', () => {
      const src = `
        fn somar_dez(x: int) -> int { return x + 10; }
        fn duplicar(x: int) -> int { return x * 2; }
        5 |> somar_dez |> duplicar
      `;
      expect(run(src)).toBe(30);
    });
  });

  // ── 2. Pattern Matching como Expressao ──────────────────────
  describe('Pattern Matching Avançado', () => {
    test('match como expressao atribuivel a variavel', () => {
      const src = `
        let status = 200;
        let descricao = match status {
          200 => "OK",
          404 => "Not Found",
          500 => "Internal Error",
          _ => "Unknown",
        };
        descricao
      `;
      expect(run(src)).toBe('OK');
    });

    test('match com guards (if)', () => {
      const src = `
        let idade = 25;
        let faixa = match idade {
          x if x < 12 => "crianca",
          x if x < 18 => "adolescente",
          x if x < 60 => "adulto",
          _ => "idoso",
        };
        faixa
      `;
      expect(run(src)).toBe('adulto');
    });

    test('match desestruturando Option (some / none)', () => {
      const src = `
        let algo = some(50);
        let resultado = match algo {
          some(v) => v * 2,
          none => 0,
        };
        resultado
      `;
      expect(run(src)).toBe(100);
    });

    test('match desestruturando Result (ok / err)', () => {
      const src = `
        let res = ok(100);
        let status = match res {
          ok(v) => v + 50,
          err(e) => -1,
        };
        status
      `;
      expect(run(src)).toBe(150);
    });

    test('match com ranges de numeros', () => {
      const src = `
        let nota = 85;
        let conceito = match nota {
          90..100 => "A",
          80..89  => "B",
          70..79  => "C",
          _       => "D",
        };
        conceito
      `;
      expect(run(src)).toBe('B');
    });

    test('match com tuplas literais', () => {
      const src = `
        let coord = (0, 0);
        let pos = match coord {
          (0, 0) => "origem",
          _ => "outro",
        };
        pos
      `;
      expect(run(src)).toBe('origem');
    });
  });

  // ── 3. Async / Await ───────────────────────────────────────
  describe('Async / Await', () => {
    test('declaracao async fn e chamada com await', () => {
      const src = `
        async fn buscar_usuario(id: int) -> str {
          return format!("User_{}", id);
        }
        let user = await buscar_usuario(101);
        user
      `;
      expect(run(src)).toBe('User_101');
    });

    test('async fn retornando calculos complexos', () => {
      const src = `
        async fn soma_async(a: int, b: int) -> int {
          return a + b;
        }
        let res = await soma_async(18, 24);
        res
      `;
      expect(run(src)).toBe(42);
    });
  });

  // ── 4. Goroutines & CSP Channels ───────────────────────────
  describe('Goroutines & Channels (CSP Concurrency)', () => {
    test('criacao e comunicacao basica em channel com buffer', () => {
      const src = `
        let ch = chan_new(5);
        ch.send(10);
        ch.send(20);
        ch.send(30);
        let a = ch.recv();
        let b = ch.recv();
        let c = ch.recv();
        a + b + c
      `;
      expect(run(src)).toBe(60);
    });

    test('propriedades do canal (len, capacity, close, is_closed)', () => {
      const src = `
        let ch = chan_new(10);
        ch.send(1);
        ch.send(2);
        let tam = ch.len;
        ch.close();
        let fechado = ch.is_closed;
        [tam, fechado]
      `;
      expect(run(src)).toEqual([2, true]);
    });

    test('instanciacao com new Channel()', () => {
      const src = `
        let ch = new Channel(4);
        ch.send("vox");
        ch.recv()
      `;
      expect(run(src)).toBe('vox');
    });

    test('funcoes globais chan_send e chan_recv', () => {
      const src = `
        let ch = chan_new(2);
        chan_send(ch, 77);
        let recebido = chan_recv(ch);
        chan_close(ch);
        recebido
      `;
      expect(run(src)).toBe(77);
    });

    test('comunicacao entre corotina spawn e canal', () => {
      const src = `
        let ch = chan_new(5);
        spawn {
          ch.send(999);
        }
        sleep(20);
        let v = ch.recv();
        v
      `;
      expect(run(src)).toBe(999);
    });
  });

  // ── 5. Decoradores & Metaprogramação ───────────────────────
  describe('Decoradores & Metaprogramação', () => {
    test('decorador @timed executa e preserva retorno', () => {
      const { result, logs } = runWithOutput(`
        @timed
        fn operacao_rapida(n: int) -> int {
          return n * 3;
        }
        operacao_rapida(14)
      `);
      expect(result).toBe(42);
      expect(logs.some(l => l.includes('[@timed] operacao_rapida'))).toBe(true);
    });

    test('decorador @logged registra chamada e retorno', () => {
      const { result, logs } = runWithOutput(`
        @logged
        fn saudacao(nome: str) -> str {
          return format!("Ola, {}!", nome);
        }
        saudacao("Vox")
      `);
      expect(result).toBe('Ola, Vox!');
      expect(logs.some(l => l.includes('[@logged] call saudacao(Vox)'))).toBe(true);
      expect(logs.some(l => l.includes('[@logged] return saudacao => Ola, Vox!'))).toBe(true);
    });

    test('decorador @memoize armazena resultado em cache', () => {
      const src = `
        let computacoes = 0;
        @memoize
        fn fib(n: int) -> int {
          computacoes += 1;
          return n * 2;
        }
        let r1 = fib(5);
        let r2 = fib(5);
        let r3 = fib(5);
        [r1, computacoes]
      `;
      expect(run(src)).toEqual([10, 1]);
    });

    test('decorador customizado de usuario', () => {
      const src = `
        fn dobrar_retorno(alvo: fn) -> fn {
          return |x| => alvo(x) * 2;
        }
        @dobrar_retorno
        fn base(x: int) -> int {
          return x + 5;
        }
        base(10)
      `;
      expect(run(src)).toBe(30);
    });

    test('decorador aplicado a metodos de classe', () => {
      const src = `
        class MathService {
          @memoize
          pub fn potencia_quadrada(n: int) -> int {
            return n * n;
          }
        }
        let serv = new MathService();
        serv.potencia_quadrada(6)
      `;
      expect(run(src)).toBe(36);
    });
  });

  // ── 6. Macros ──────────────────────────────────────────────
  describe('Macros', () => {
    test('macro format! interpola variaveis e expressoes', () => {
      const src = `
        let nome = "Kael";
        let pontuacao = 98;
        format!("Jogador {} atingiu {} pontos!", nome, pontuacao)
      `;
      expect(run(src)).toBe('Jogador Kael atingiu 98 pontos!');
    });

    test('macro assert! valida condicoes verdadeiras', () => {
      const src = `
        assert!(10 + 20 == 30, "Soma correta");
        "valido"
      `;
      expect(run(src)).toBe('valido');
    });

    test('macro assert! lanca erro quando condicao for falsa', () => {
      const src = `
        assert!(2 > 5, "Invalido");
      `;
      expect(() => run(src)).toThrow('Assertion failed');
    });

    test('macro dbg! avalia e retorna expressao', () => {
      const src = `
        let x = dbg!(25 * 4);
        x
      `;
      expect(run(src)).toBe(100);
    });
  });

});
