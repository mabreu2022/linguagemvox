// ============================================================
// lexer.test.ts -- Testes do Lexer
// ============================================================

import { Lexer } from "../src/lexer/lexer";
import { TokenType } from "../src/lexer/token";

describe("Lexer", () => {

  test("tokeniza numeros inteiros e floats", () => {
    const tokens = new Lexer("42 3.14 0 100").tokenize();
    expect(tokens[0].type).toBe(TokenType.INTEGER);
    expect(tokens[0].value).toBe("42");
    expect(tokens[1].type).toBe(TokenType.FLOAT);
    expect(tokens[1].value).toBe("3.14");
  });

  test("tokeniza strings", () => {
    const tokens = new Lexer('"Hello, Kael!"').tokenize();
    expect(tokens[0].type).toBe(TokenType.STRING);
    expect(tokens[0].value).toBe("Hello, Kael!");
  });

  test("tokeniza palavras-chave", () => {
    const tokens = new Lexer("let const fn class if else return").tokenize();
    expect(tokens[0].type).toBe(TokenType.LET);
    expect(tokens[1].type).toBe(TokenType.CONST);
    expect(tokens[2].type).toBe(TokenType.FN);
    expect(tokens[3].type).toBe(TokenType.CLASS);
    expect(tokens[4].type).toBe(TokenType.IF);
    expect(tokens[5].type).toBe(TokenType.ELSE);
    expect(tokens[6].type).toBe(TokenType.RETURN);
  });

  test("tokeniza operadores", () => {
    const tokens = new Lexer("+ - * / == != <= >= -> =>").tokenize();
    expect(tokens[0].type).toBe(TokenType.PLUS);
    expect(tokens[1].type).toBe(TokenType.MINUS);
    expect(tokens[2].type).toBe(TokenType.STAR);
    expect(tokens[3].type).toBe(TokenType.SLASH);
    expect(tokens[4].type).toBe(TokenType.EQ);
    expect(tokens[5].type).toBe(TokenType.NEQ);
    expect(tokens[6].type).toBe(TokenType.LTE);
    expect(tokens[7].type).toBe(TokenType.GTE);
    expect(tokens[8].type).toBe(TokenType.ARROW);
    expect(tokens[9].type).toBe(TokenType.FAT_ARROW);
  });

  test("ignora comentarios de linha", () => {
    const tokens = new Lexer("let x = 42 // este e um comentario\nlet y = 1").tokenize();
    const ids = tokens.filter(t => t.type === TokenType.IDENTIFIER || t.type === TokenType.LET || t.type === TokenType.INTEGER);
    expect(ids.length).toBe(6); // let, x, 42, let, y, 1
  });

  test("ignora comentarios de bloco", () => {
    const tokens = new Lexer("let /* comentario */ x = 1").tokenize();
    const meaningful = tokens.filter(t => t.type !== TokenType.EOF);
    expect(meaningful.length).toBe(4); // let, x, =, 1
  });

  test("tokeniza booleanos", () => {
    const tokens = new Lexer("true false").tokenize();
    expect(tokens[0].type).toBe(TokenType.BOOL);
    expect(tokens[0].value).toBe("true");
    expect(tokens[1].type).toBe(TokenType.BOOL);
    expect(tokens[1].value).toBe("false");
  });

  test("tokeniza identificadores", () => {
    const tokens = new Lexer("minhaVariavel _privado CamelCase").tokenize();
    expect(tokens[0].type).toBe(TokenType.IDENTIFIER);
    expect(tokens[0].value).toBe("minhaVariavel");
    expect(tokens[1].type).toBe(TokenType.IDENTIFIER);
    expect(tokens[2].type).toBe(TokenType.IDENTIFIER);
  });

  test("tokeniza range ..", () => {
    const tokens = new Lexer("1..10").tokenize();
    expect(tokens[0].type).toBe(TokenType.INTEGER);
    expect(tokens[1].type).toBe(TokenType.RANGE);
    expect(tokens[2].type).toBe(TokenType.INTEGER);
  });

  test("rastreia posicao corretamente", () => {
    const tokens = new Lexer("let\nx").tokenize();
    expect(tokens[0].position.line).toBe(1);
    expect(tokens[1].position.line).toBe(2);
  });
});
