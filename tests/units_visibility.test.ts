import { Lexer } from '../src/lexer/lexer';
import { Parser } from '../src/parser/parser';
import { SemanticAnalyzer } from '../src/semantic/analyzer';
import { Interpreter } from '../src/runtime/interpreter';
import { TokenType } from '../src/lexer/token';
import { NodeKind, ClassDeclNode, FieldDeclNode, MethodDeclNode, ImportDeclNode } from '../src/parser/ast';

describe('Vox Language: Delphi-style Unit Imports & Visibility (Public, Private, Published)', () => {

  describe('1. Lexer & Keyword Aliases', () => {
    it('deve tokenizar modificadores de visibilidade ingles e portugues', () => {
      const code = 'pub public publico priv private privado prot protected protegido published publicado';
      const tokens = new Lexer(code).tokenize();

      expect(tokens[0].type).toBe(TokenType.PUB);
      expect(tokens[1].type).toBe(TokenType.PUB);
      expect(tokens[2].type).toBe(TokenType.PUB);
      expect(tokens[3].type).toBe(TokenType.PRIV);
      expect(tokens[4].type).toBe(TokenType.PRIV);
      expect(tokens[5].type).toBe(TokenType.PRIV);
      expect(tokens[6].type).toBe(TokenType.PROT);
      expect(tokens[7].type).toBe(TokenType.PROT);
      expect(tokens[8].type).toBe(TokenType.PROT);
      expect(tokens[9].type).toBe(TokenType.PUBLISHED);
      expect(tokens[10].type).toBe(TokenType.PUBLISHED);
    });

    it('deve tokenizar procedure, procedimento, function e var', () => {
      const code = 'procedure Executar() procedimento Salvar() function Calcular() var x = 10';
      const tokens = new Lexer(code).tokenize();

      expect(tokens[0].type).toBe(TokenType.FN);
      expect(tokens[4].type).toBe(TokenType.FN);
      expect(tokens[8].type).toBe(TokenType.FN);
      expect(tokens[12].type).toBe(TokenType.LET);
    });
  });

  describe('2. Parser: Import estilo uses do Delphi', () => {
    it('deve fazer o parse de import Unit1, Unit2, UnitClientes;', () => {
      const code = 'import Unit1, Unit2, UnitClientes;';
      const tokens = new Lexer(code).tokenize();
      const ast = new Parser(tokens).parse();

      expect(ast.body.length).toBe(1);
      expect(ast.body[0].kind).toBe(NodeKind.ImportDecl);
      const imp = ast.body[0] as ImportDeclNode;
      expect(imp.units).toEqual(['Unit1', 'Unit2', 'UnitClientes']);
      expect(imp.names).toEqual(['Unit1', 'Unit2', 'UnitClientes']);
    });

    it('deve manter compatibilidade com import { a, b } from "modulo";', () => {
      const code = 'import { FuncaoA, FuncaoB } from "modulo";';
      const tokens = new Lexer(code).tokenize();
      const ast = new Parser(tokens).parse();

      expect(ast.body.length).toBe(1);
      const imp = ast.body[0] as ImportDeclNode;
      expect(imp.names).toEqual(['FuncaoA', 'FuncaoB']);
      expect(imp.source).toBe('modulo');
    });
  });

  describe('3. Parser: Classes com seções Delphi (private:, public:, published:)', () => {
    it('deve atribuir a visibilidade correta com base na seção', () => {
      const code = `
      class FormClientes {
        private:
          var fSegredo: str;
          fn validarInterno() {}
        public:
          var Nome: str;
          fn executarAcao() {}
        published:
          var Titulo: str;
          var Saldo: float;
          fn onClique() {}
      }
      `;
      const tokens = new Lexer(code).tokenize();
      const ast = new Parser(tokens).parse();

      expect(ast.body.length).toBe(1);
      const cls = ast.body[0] as ClassDeclNode;
      expect(cls.name).toBe('FormClientes');

      const fSegredo = cls.members.find(m => (m as any).name === 'fSegredo') as FieldDeclNode;
      const validar = cls.members.find(m => (m as any).name === 'validarInterno') as MethodDeclNode;
      const nome = cls.members.find(m => (m as any).name === 'Nome') as FieldDeclNode;
      const executar = cls.members.find(m => (m as any).name === 'executarAcao') as MethodDeclNode;
      const titulo = cls.members.find(m => (m as any).name === 'Titulo') as FieldDeclNode;
      const saldo = cls.members.find(m => (m as any).name === 'Saldo') as FieldDeclNode;
      const onClique = cls.members.find(m => (m as any).name === 'onClique') as MethodDeclNode;

      expect(fSegredo.visibility).toBe('priv');
      expect(validar.visibility).toBe('priv');

      expect(nome.visibility).toBe('pub');
      expect(executar.visibility).toBe('pub');

      expect(titulo.visibility).toBe('published');
      expect(saldo.visibility).toBe('published');
      expect(onClique.visibility).toBe('published');
    });

    it('deve suportar modificadores inline public, private e published', () => {
      const code = `
      class Componente {
        private var id: int;
        public var descricao: str;
        published var ativo: bool;
        public fn salvar() {}
        private fn logInterno() {}
      }
      `;
      const tokens = new Lexer(code).tokenize();
      const ast = new Parser(tokens).parse();

      const cls = ast.body[0] as ClassDeclNode;
      const id = cls.members.find(m => (m as any).name === 'id') as FieldDeclNode;
      const desc = cls.members.find(m => (m as any).name === 'descricao') as FieldDeclNode;
      const ativo = cls.members.find(m => (m as any).name === 'ativo') as FieldDeclNode;
      const salvar = cls.members.find(m => (m as any).name === 'salvar') as MethodDeclNode;
      const log = cls.members.find(m => (m as any).name === 'logInterno') as MethodDeclNode;

      expect(id.visibility).toBe('priv');
      expect(desc.visibility).toBe('pub');
      expect(ativo.visibility).toBe('published');
      expect(salvar.visibility).toBe('pub');
      expect(log.visibility).toBe('priv');
    });
  });

  describe('4. Semantic Analyzer: Acesso a membros private vs. public vs. published', () => {
    it('deve permitir acesso a membros public e published', () => {
      const code = `
      class Servico {
        public:
          var publico: int;
        published:
          var publicado: int;
        private:
          var privado: int;
      }
      let s = new Servico();
      let a = s.publico;
      let b = s.publicado;
      `;
      const tokens = new Lexer(code).tokenize();
      const ast = new Parser(tokens).parse();
      const analyzer = new SemanticAnalyzer();
      const errors = analyzer.analyze(ast);

      expect(errors).toHaveLength(0);
    });

    it('deve acusar erro ao tentar acessar membro private fora da classe', () => {
      const code = `
      class Servico {
        private:
          var segredo: int;
      }
      let s = new Servico();
      let x = s.segredo;
      `;
      const tokens = new Lexer(code).tokenize();
      const ast = new Parser(tokens).parse();
      const analyzer = new SemanticAnalyzer();
      const errors = analyzer.analyze(ast);

      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].message).toContain("Cannot access private member 'segredo'");
    });
  });

  describe('5. Interpretador: Variáveis e procedures com import', () => {
    it('deve executar procedures e funções publicas e privadas internamente', () => {
      const code = `
      class Conta {
        private:
          var saldo: int;
        public:
          fn new(inicial: int) {
            this.saldo = inicial;
          }
          fn depositar(val: int) {
            this.saldo = this.saldo + val;
          }
          fn getSaldo() -> int {
            return this.saldo;
          }
        published:
          var Titular: str;
      }
      let c = new Conta(500);
      c.depositar(250);
      c.Titular = "Mauricio";
      let resultado = c.getSaldo();
      `;
      const tokens = new Lexer(code).tokenize();
      const ast = new Parser(tokens).parse();
      const interp = new Interpreter();
      const env = (interp as any).globals;
      for (const node of ast.body) {
        (interp as any).execNode(node, env);
      }

      expect(env.get('resultado')).toBe(750);
    });

    it('deve aceitar import de units com múltiplos identificadores sem erros', () => {
      const code = `
      import Unit1, Unit2;
      let valor = 42;
      `;
      const tokens = new Lexer(code).tokenize();
      const ast = new Parser(tokens).parse();
      const interp = new Interpreter();
      const env = (interp as any).globals;
      for (const node of ast.body) {
        (interp as any).execNode(node, env);
      }

      expect(env.get('valor')).toBe(42);
      expect(env.has('Unit1')).toBe(true);
      expect(env.has('Unit2')).toBe(true);
    });
  });
});
