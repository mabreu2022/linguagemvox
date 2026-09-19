import { Lexer } from '../src/lexer/lexer';
import { Parser } from '../src/parser/parser';
import { SemanticAnalyzer } from '../src/semantic/analyzer';
import { Interpreter } from '../src/runtime/interpreter';
import * as fs from 'fs';
import * as path from 'path';

function run(code: string): { output: string[]; result: any; interpreter: Interpreter } {
  const tokens = new Lexer(code).tokenize();
  const ast = new Parser(tokens).parse();
  const analyzer = new SemanticAnalyzer();
  const errors = analyzer.analyze(ast);
  if (errors.length > 0) {
    throw new Error(`Semantic errors: ${errors.map(e => e.message).join('; ')}`);
  }
  const interpreter = new Interpreter();
  const output: string[] = [];
  interpreter.globals.set('print', {
    kind: 'function',
    name: 'print',
    params: ['v'],
    body: null as any,
    closure: interpreter.globals,
    isAsync: false,
    isNative: true,
    native: (v: any) => { output.push(interpreter.stringify(v)); return null; },
  });
  interpreter.globals.set('println', {
    kind: 'function',
    name: 'println',
    params: ['v'],
    body: null as any,
    closure: interpreter.globals,
    isAsync: false,
    isNative: true,
    native: (v: any) => { output.push(interpreter.stringify(v)); return null; },
  });
  const res = interpreter.run(ast);
  return { output, result: res, interpreter };
}

describe('Vox v1.1 — Novos Recursos da Linguagem', () => {

  describe('1. Tratamento Estruturado de Exceções (try / catch / finally / throw)', () => {
    it('captura exceção lançada com throw dentro do try/catch', () => {
      const code = `
        let mut status = "inicial";
        try {
          status = "tentando";
          throw "falha_critica";
          status = "depois_do_throw";
        } catch (e) {
          status = "capturado: " + str(e);
        }
        println(status);
      `;
      const { output } = run(code);
      expect(output).toContain('capturado: falha_critica');
    });

    it('executa o bloco finally independentemente de exceção', () => {
      const code = `
        let mut logs = [];
        try {
          logs.push("try");
          throw 404;
        } catch (e) {
          logs.push("catch");
        } finally {
          logs.push("finally");
        }
        println(logs.join("-"));
      `;
      const { output } = run(code);
      expect(output).toContain('try-catch-finally');
    });

    it('executa o bloco finally mesmo se não houver exceção', () => {
      const code = `
        let mut msg = "";
        try {
          msg = msg + "A";
        } finally {
          msg = msg + "B";
        }
        println(msg);
      `;
      const { output } = run(code);
      expect(output).toContain('AB');
    });
  });

  describe('2. Operador de Propagação de Erro (?)', () => {
    it('desempacota Option some(val) com ?', () => {
      const code = `
        fn obter_valor() -> Option<int> {
          return some(42);
        }
        fn calcular() -> Option<int> {
          let v = obter_valor()?;
          return some(v + 10);
        }
        let res = calcular();
        println(res);
      `;
      const { output } = run(code);
      expect(output).toContain('some(52)');
    });

    it('retorna none() antecipadamente ao encontrar none() com ?', () => {
      const code = `
        fn vazio() -> Option<int> {
          return none();
        }
        fn fluxo() -> Option<int> {
          let v = vazio()?;
          return some(v * 2);
        }
        let res = fluxo();
        println(res);
      `;
      const { output } = run(code);
      expect(output).toContain('none');
    });

    it('desempacota Result ok(val) e propaga err(e) com ?', () => {
      const code = `
        fn operacao_ok() -> Result<int, str> {
          return ok(100);
        }
        fn operacao_falha() -> Result<int, str> {
          return err("erro_rede");
        }
        fn teste_sucesso() -> Result<int, str> {
          let a = operacao_ok()?;
          return ok(a + 50);
        }
        fn teste_erro() -> Result<int, str> {
          let b = operacao_falha()?;
          return ok(b + 50);
        }
        println(teste_sucesso());
        println(teste_erro());
      `;
      const { output } = run(code);
      expect(output).toContain('ok(150)');
      expect(output).toContain('err(erro_rede)');
    });
  });

  describe('3. Sistema de Arquivos Nativo (File I/O)', () => {
    const testFile = path.resolve(process.cwd(), 'temp_test_vox_io.txt');

    afterEach(() => {
      if (fs.existsSync(testFile)) fs.unlinkSync(testFile);
    });

    it('escreve, verifica existência, anexa e lê arquivo', () => {
      const code = `
        let arq = "${testFile.replace(/\\/g, '/')}";
        file_write(arq, "Linha 1\\n");
        println(file_exists(arq));
        file_append(arq, "Linha 2\\n");
        let conteudo = file_read(arq);
        println(conteudo);
        file_delete(arq);
        println(file_exists(arq));
      `;
      const { output } = run(code);
      expect(output[0]).toBe('true');
      expect(output[1]).toContain('Linha 1\nLinha 2');
      expect(output[2]).toBe('false');
    });
  });

  describe('4. Datas, Horas & Sleep Real', () => {
    it('retorna timestamps válidos e formata data', () => {
      const code = `
        let agora = time_now();
        let agoraMs = time_millis();
        println(agora > 1000000);
        println(agoraMs >= agora);
        let formatada = time_format(agora, "YYYY-MM-DD");
        println(len(formatada));
      `;
      const { output } = run(code);
      expect(output[0]).toBe('true');
      expect(output[1]).toBe('true');
      expect(output[2]).toBe('10'); // YYYY-MM-DD = 10 chars
    });

    it('executa sleep sem erro', () => {
      const code = `
        let t0 = time_millis();
        sleep(20);
        let t1 = time_millis();
        println(t1 >= t0);
      `;
      const { output } = run(code);
      expect(output[0]).toBe('true');
    });
  });

  describe('5. Serialização e Desserialização JSON', () => {
    it('converte objetos para JSON e analisa JSON para Maps', () => {
      const code = `
        let jsonStr = "{\\"nome\\": \\"Vox Language\\", \\"versao\\": 1}";
        let dados = json_parse(jsonStr);
        println(dados["nome"]);
        println(dados["versao"]);
        let recriado = json_stringify(dados);
        println(recriado);
      `;
      const { output } = run(code);
      expect(output[0]).toBe('Vox Language');
      expect(output[1]).toBe('1');
      expect(output[2]).toContain('"nome":"Vox Language"');
    });
  });

  describe('6. Expressões Regulares (Regex)', () => {
    it('valida test, match e replace com regex', () => {
      const code = `
        let texto = "O compilador Vox versao 1.1 e rapido";
        let temVox = regex_test("Vox", texto);
        println(temVox);
        let alterado = regex_replace("versao 1.1", texto, "v2.0");
        println(alterado);
        let matches = regex_match("[0-9]+\\\\.[0-9]+", texto);
        println(matches[0]);
      `;
      const { output } = run(code);
      expect(output[0]).toBe('true');
      expect(output[1]).toContain('v2.0');
      expect(output[2]).toBe('1.1');
    });
  });

  describe('7. Coleção Set (Conjuntos)', () => {
    it('adiciona, verifica presença, remove e mede tamanho do Set', () => {
      const code = `
        let s = set_new();
        set_add(s, "alpha");
        set_add(s, "beta");
        set_add(s, "alpha"); // Duplicado, não deve aumentar
        println(set_size(s));
        println(set_has(s, "alpha"));
        println(set_has(s, "gama"));
        set_delete(s, "alpha");
        println(set_has(s, "alpha"));
        println(set_size(s));
      `;
      const { output } = run(code);
      expect(output[0]).toBe('2');
      expect(output[1]).toBe('true');
      expect(output[2]).toBe('false');
      expect(output[3]).toBe('false');
      expect(output[4]).toBe('1');
    });
  });

  describe('8. Threads Reais & Mutex', () => {
    it('dispara threads com thread_spawn e aguarda retorno com thread_join', () => {
      const code = `
        fn tarefa(x: int) -> int {
          return x * 10;
        }
        let t1 = thread_spawn(tarefa, 5);
        let t2 = thread_spawn(tarefa, 8);
        let r1 = thread_join(t1);
        let r2 = thread_join(t2);
        println(r1);
        println(r2);
      `;
      const { output } = run(code);
      expect(output[0]).toBe('50');
      expect(output[1]).toBe('80');
    });

    it('bloqueia e desbloqueia Mutex com segurança', () => {
      const code = `
        let m = mutex_new();
        mutex_lock(m);
        let tid = thread_id();
        mutex_unlock(m);
        println(tid > 0);
      `;
      const { output } = run(code);
      expect(output[0]).toBe('true');
    });
  });

  describe('9. Módulos Reais com Escopo Isolado (import { ... } from "...")', () => {
    const modFile = path.resolve(process.cwd(), 'temp_math_mod.vox');

    beforeAll(() => {
      fs.writeFileSync(modFile, `
        fn somar_dobro(a: int, b: int) -> int {
          return (a + b) * 2;
        }
        let multiplicador = 5;
      `, 'utf8');
    });

    afterAll(() => {
      if (fs.existsSync(modFile)) fs.unlinkSync(modFile);
    });

    it('importa funções selecionadas de módulo externo em ambiente isolado', () => {
      const code = `
        import { somar_dobro, multiplicador } from "${modFile.replace(/\\/g, '/')}";
        let res = somar_dobro(3, 7);
        println(res);
        println(multiplicador);
      `;
      const { output } = run(code);
      expect(output[0]).toBe('20');
      expect(output[1]).toBe('5');
    });
  });

});
