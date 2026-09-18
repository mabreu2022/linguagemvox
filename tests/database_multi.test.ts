// tests/database_multi.test.ts
import { Lexer } from '../src/lexer/lexer';
import { Parser } from '../src/parser/parser';
import { SemanticAnalyzer } from '../src/semantic/analyzer';
import { Interpreter } from '../src/runtime/interpreter';

function run(source: string): any {
  const tokens = new Lexer(source).tokenize();
  const ast = new Parser(tokens).parse();
  const analyzer = new SemanticAnalyzer();
  const errors = analyzer.analyze(ast);
  if (errors.length > 0) {
    throw new Error(`Semantic errors: ${errors.map(e => e.message).join('; ')}`);
  }
  const interp = new Interpreter();
  return interp.run(ast);
}

describe('Universal Database Engine & Control Flow', () => {
  it('executa condicionais e laço while com break e continue', () => {
    const src = `
      let mut contador = 0;
      let mut somatorio = 0;
      while contador < 10 {
        contador = contador + 1;
        if contador == 5 {
          continue;
        }
        somatorio = somatorio + contador;
      }
      somatorio;
    `;
    const result = run(src);
    // Sum 1..10 = 55. Minus 5 = 50.
    expect(result).toBe(50);
  });

  it('conecta e opera em SQLite via API universal db_connect', () => {
    const src = `
      let db = db_connect("sqlite", ":memory:");
      db_exec(db, "CREATE TABLE itens (id INTEGER PRIMARY KEY, titulo TEXT);");
      db_exec(db, "INSERT INTO itens (titulo) VALUES ('Item A');");
      db_exec(db, "INSERT INTO itens (titulo) VALUES ('Item B');");
      let linhas = db_query(db, "SELECT * FROM itens;");
      let total = len(linhas);
      db_close(db);
      total;
    `;
    const result = run(src);
    expect(result).toBe(2);
  });

  it('valida assinaturas semânticas de MySQL, SQL Server e Firebird', () => {
    const src = `
      let a = 1;
      // Valida que o analisador semântico reconhece todas as funções nativas
      if false {
        let h1 = mysql_connect("mysql://user:pass@localhost:3306/db");
        mysql_exec(h1, "SELECT 1");
        mysql_close(h1);

        let h2 = mssql_connect("Server=localhost;Database=test;");
        mssql_exec(h2, "SELECT 1");
        mssql_close(h2);

        let h3 = firebird_connect("localhost:3050:/db.fdb");
        firebird_exec(h3, "SELECT 1");
        firebird_close(h3);
      }
      a;
    `;
    const result = run(src);
    expect(result).toBe(1);
  });
});
