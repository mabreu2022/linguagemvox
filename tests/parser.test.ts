// ============================================================
// parser.test.ts -- Testes do Parser
// ============================================================

import { Lexer } from "../src/lexer/lexer";
import { Parser } from "../src/parser/parser";
import { NodeKind } from "../src/parser/ast";

function parse(src: string) {
  const tokens = new Lexer(src).tokenize();
  return new Parser(tokens).parse();
}

describe("Parser", () => {

  test("parseia declaracao de variavel simples", () => {
    const ast = parse("let x = 42");
    expect(ast.body[0].kind).toBe(NodeKind.VarDecl);
    const decl = ast.body[0] as any;
    expect(decl.name).toBe("x");
    expect(decl.value.value).toBe(42);
  });

  test("parseia declaracao de constante com tipo", () => {
    const ast = parse("const PI: float = 3.14");
    const decl = ast.body[0] as any;
    expect(decl.isConst).toBe(true);
    expect(decl.typeAnnot.name).toBe("float");
  });

  test("parseia funcao simples", () => {
    const ast = parse("pub fn soma(a: int, b: int) -> int { return a + b }");
    const fn = ast.body[0] as any;
    expect(fn.kind).toBe(NodeKind.FnDecl);
    expect(fn.name).toBe("soma");
    expect(fn.params.length).toBe(2);
    expect(fn.returnType.name).toBe("int");
  });

  test("parseia funcao compacta com =>", () => {
    const ast = parse("pub fn dobro(x: int) -> int => x * 2");
    const fn = ast.body[0] as any;
    expect(fn.kind).toBe(NodeKind.FnDecl);
    expect(fn.body.kind).toBe(NodeKind.BinaryExpr);
  });

  test("parseia classe com heranca", () => {
    const ast = parse("class Dog extends Animal { pub fn bark() -> void { println(\"Au!\") } }");
    const cls = ast.body[0] as any;
    expect(cls.kind).toBe(NodeKind.ClassDecl);
    expect(cls.name).toBe("Dog");
    expect(cls.superClass).toBe("Animal");
    expect(cls.members.length).toBe(1);
  });

  test("parseia if/else", () => {
    const ast = parse("if x > 0 { println(\"pos\") } else { println(\"neg\") }");
    const stmt = ast.body[0] as any;
    expect(stmt.kind).toBe(NodeKind.IfStmt);
    expect(stmt.else).toBeDefined();
  });

  test("parseia while loop", () => {
    const ast = parse("while x < 10 { x = x + 1 }");
    const stmt = ast.body[0] as any;
    expect(stmt.kind).toBe(NodeKind.WhileStmt);
  });

  test("parseia for loop", () => {
    const ast = parse("for item in lista { println(item) }");
    const stmt = ast.body[0] as any;
    expect(stmt.kind).toBe(NodeKind.ForStmt);
    expect(stmt.variable).toBe("item");
  });

  test("parseia match", () => {
    const ast = parse("match x { 0 => println(\"zero\"), _ => println(\"outro\") }");
    const stmt = ast.body[0] as any;
    expect(stmt.kind).toBe(NodeKind.MatchStmt);
    expect(stmt.arms.length).toBe(2);
  });

  test("parseia lambda", () => {
    const ast = parse("let f = |x, y| => x + y");
    const decl = ast.body[0] as any;
    expect(decl.value.kind).toBe(NodeKind.LambdaExpr);
    expect(decl.value.params.length).toBe(2);
  });

  test("parseia array literal", () => {
    const ast = parse("let arr = [1, 2, 3]");
    const decl = ast.body[0] as any;
    expect(decl.value.kind).toBe(NodeKind.ArrayLiteral);
    expect(decl.value.elements.length).toBe(3);
  });

  test("parseia chamada de metodo encadeada", () => {
    const ast = parse("arr.map(|x| => x * 2).filter(|x| => x > 2)");
    const call = ast.body[0] as any;
    expect(call.kind).toBe(NodeKind.ExprStmt);
  });

  test("parseia new com argumentos", () => {
    const ast = parse('let d = new Dog("Rex", "Labrador")');
    const decl = ast.body[0] as any;
    expect(decl.value.kind).toBe(NodeKind.NewExpr);
    expect(decl.value.className).toBe("Dog");
    expect(decl.value.args.length).toBe(2);
  });
});
