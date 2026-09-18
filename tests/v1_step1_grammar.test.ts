import { Lexer } from '../src/lexer/lexer';
import { Parser, ParseError } from '../src/parser/parser';
import {
  NodeKind, StructDeclNode, TraitDeclNode, ImplDeclNode,
  VarDeclNode, CallExprNode, CoalesceExprNode, OptionTypeNode,
  LambdaExprNode,
} from '../src/parser/ast';

function parseCode(code: string) {
  const lexer = new Lexer(code);
  const tokens = lexer.tokenize();
  const parser = new Parser(tokens);
  return parser.parse();
}

describe('Vox v1.0 — Passo 1: Gramática & AST', () => {

  describe('1. Structs com Construtor Primário', () => {
    test('parseia struct plana com construtor primário conciso', () => {
      const ast = parseCode('struct Vector(pub x: float, pub y: float);');
      expect(ast.body).toHaveLength(1);
      const structDecl = ast.body[0] as StructDeclNode;
      expect(structDecl.kind).toBe(NodeKind.StructDecl);
      expect(structDecl.name).toBe('Vector');
      expect(structDecl.params).toHaveLength(2);
      expect(structDecl.params[0].name).toBe('x');
      expect(structDecl.params[0].visibility).toBe('pub');
      expect(structDecl.params[0].typeAnnot.kind).toBe(NodeKind.TypeRef);
      expect(structDecl.params[1].name).toBe('y');
    });

    test('parseia struct genérica com campos mutáveis e imutáveis', () => {
      const ast = parseCode('struct Point<T>(pub mut x: T, pub y: T);');
      const structDecl = ast.body[0] as StructDeclNode;
      expect(structDecl.name).toBe('Point');
      expect(structDecl.generics).toEqual(['T']);
      expect(structDecl.params[0].isMut).toBe(true);
      expect(structDecl.params[1].isMut).toBe(false);
    });
  });

  describe('2. Traits e Blocos Impl Desacoplados', () => {
    test('parseia trait com assinaturas de métodos', () => {
      const ast = parseCode(`
        trait Printable {
          fn to_string(self) -> str;
          fn print(self);
        }
      `);
      const traitDecl = ast.body[0] as TraitDeclNode;
      expect(traitDecl.kind).toBe(NodeKind.TraitDecl);
      expect(traitDecl.name).toBe('Printable');
      expect(traitDecl.methods).toHaveLength(2);
      expect(traitDecl.methods[0].name).toBe('to_string');
      expect(traitDecl.methods[1].name).toBe('print');
    });

    test('parseia bloco impl Trait for Struct', () => {
      const ast = parseCode(`
        impl Printable for Vector {
          fn print(self) {
            println(self.x);
          }
        }
      `);
      const implDecl = ast.body[0] as ImplDeclNode;
      expect(implDecl.kind).toBe(NodeKind.ImplDecl);
      expect(implDecl.traitName).toBe('Printable');
      expect(implDecl.targetType).toBe('Vector');
      expect(implDecl.methods).toHaveLength(1);
      expect(implDecl.methods[0].name).toBe('print');
    });

    test('parseia bloco impl inerente (impl Struct)', () => {
      const ast = parseCode(`
        impl Vector {
          fn len(self) -> float {
            return sqrt(self.x * self.x + self.y * self.y);
          }
        }
      `);
      const implDecl = ast.body[0] as ImplDeclNode;
      expect(implDecl.kind).toBe(NodeKind.ImplDecl);
      expect(implDecl.traitName).toBeUndefined();
      expect(implDecl.targetType).toBe('Vector');
      expect(implDecl.methods).toHaveLength(1);
      expect(implDecl.methods[0].name).toBe('len');
    });
  });

  describe('3. Imutabilidade por Padrão (let vs. let mut)', () => {
    test('let define identificador imutável (isMut: false)', () => {
      const ast = parseCode('let x = 10;');
      const varDecl = ast.body[0] as VarDeclNode;
      expect(varDecl.kind).toBe(NodeKind.VarDecl);
      expect(varDecl.name).toBe('x');
      expect(varDecl.isConst).toBe(false);
      expect(varDecl.isMut).toBe(false);
    });

    test('let mut define identificador explicitamente mutável (isMut: true)', () => {
      const ast = parseCode('let mut counter: int = 0;');
      const varDecl = ast.body[0] as VarDeclNode;
      expect(varDecl.kind).toBe(NodeKind.VarDecl);
      expect(varDecl.name).toBe('counter');
      expect(varDecl.isConst).toBe(false);
      expect(varDecl.isMut).toBe(true);
    });
  });

  describe('4. Strict Null-Safety & Option<T> Desugaring', () => {
    test('rejeita palavra-chave null com mensagem instrutiva', () => {
      expect(() => parseCode('let x = null;')).toThrow(ParseError);
      expect(() => parseCode('let x = null;')).toThrow(/Strict Null-Safety \(Vox v1.0\)/);
    });

    test('desaçucara tipo T? para OptionTypeNode (Option<T>)', () => {
      const ast = parseCode('let mut maybe_val: int? = none;');
      const varDecl = ast.body[0] as VarDeclNode;
      expect(varDecl.typeAnnot?.kind).toBe(NodeKind.OptionType);
      const optType = varDecl.typeAnnot as OptionTypeNode;
      expect(optType.inner.kind).toBe(NodeKind.TypeRef);
      expect((optType.inner as any).name).toBe('int');
    });

    test('desaçucara tipo de struct personalizada Vector? para Option<Vector>', () => {
      const ast = parseCode('let pos: Vector? = some(v);');
      const varDecl = ast.body[0] as VarDeclNode;
      expect(varDecl.typeAnnot?.kind).toBe(NodeKind.OptionType);
      const optType = varDecl.typeAnnot as OptionTypeNode;
      expect((optType.inner as any).name).toBe('Vector');
    });
  });

  describe('5. Operador de Coalescência Nula (??)', () => {
    test('parseia operador ?? com precedência correta', () => {
      const ast = parseCode('let result = opt_val ?? 42;');
      const varDecl = ast.body[0] as VarDeclNode;
      const val = varDecl.value as CoalesceExprNode;
      expect(val.kind).toBe(NodeKind.CoalesceExpr);
      expect(val.left.kind).toBe(NodeKind.Identifier);
      expect(val.right.kind).toBe(NodeKind.IntLiteral);
    });
  });

  describe('6. Sintaxe Turbofish ::<T>()', () => {
    test('parseia chamada de função com turbofish add::<int>(1, 2)', () => {
      const ast = parseCode('let sum = add::<int>(1, 2);');
      const varDecl = ast.body[0] as VarDeclNode;
      const call = varDecl.value as CallExprNode;
      expect(call.kind).toBe(NodeKind.CallExpr);
      expect(call.typeArgs).toHaveLength(1);
      expect(call.typeArgs![0].kind).toBe(NodeKind.TypeRef);
      expect((call.typeArgs![0] as any).name).toBe('int');
      expect(call.args).toHaveLength(2);
    });

    test('parseia método com turbofish channel.send::<Message>(msg)', () => {
      const ast = parseCode('ch.send::<Message>(msg);');
      const exprStmt = ast.body[0] as any;
      const call = exprStmt.expr as CallExprNode;
      expect(call.kind).toBe(NodeKind.CallExpr);
      expect(call.typeArgs).toHaveLength(1);
      expect((call.typeArgs![0] as any).name).toBe('Message');
    });
  });

  describe('7. Closures com Parênteses Explícitos ((params) => expr)', () => {
    test('parseia closure de um parâmetro com parênteses', () => {
      const ast = parseCode('let double = (x) => x * 2;');
      const varDecl = ast.body[0] as VarDeclNode;
      const lambda = varDecl.value as LambdaExprNode;
      expect(lambda.kind).toBe(NodeKind.LambdaExpr);
      expect(lambda.params).toHaveLength(1);
      expect(lambda.params[0].name).toBe('x');
    });

    test('parseia closure com parâmetros tipados e bloco', () => {
      const ast = parseCode('let add = (a: int, b: int) => { return a + b; };');
      const varDecl = ast.body[0] as VarDeclNode;
      const lambda = varDecl.value as LambdaExprNode;
      expect(lambda.kind).toBe(NodeKind.LambdaExpr);
      expect(lambda.params).toHaveLength(2);
      expect(lambda.params[0].name).toBe('a');
      expect(lambda.params[1].name).toBe('b');
      expect(lambda.body.kind).toBe(NodeKind.Block);
    });
  });

  describe('8. Bloqueio de Herança Clássica (extends)', () => {
    test('bloqueia class Sub extends Super emitindo erro claro', () => {
      expect(() => parseCode('class Dog extends Animal {}')).toThrow(ParseError);
      expect(() => parseCode('class Dog extends Animal {}')).toThrow(/Classical inheritance \('extends'\) has been removed/);
    });
  });
});
