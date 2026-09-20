// ============================================================
// parser.ts -- Parser Recursivo Descendente da linguagem Kael
// ============================================================

import { Token, TokenType } from "../lexer/token";
import {
  ASTNode, NodeKind, ProgramNode, VarDeclNode, FnDeclNode,
  StructDeclNode, StructFieldParam, TraitDeclNode, ImplDeclNode,
  ClassDeclNode, InterfaceDeclNode, MixinDeclNode, ImportDeclNode,
  ExportDeclNode, BlockNode, ReturnStmtNode, IfStmtNode,
  WhileStmtNode, ForStmtNode, BreakStmtNode, ContinueStmtNode,
  MatchStmtNode, MatchArmNode, SpawnStmtNode, ParamNode,
  FieldDeclNode, MethodDeclNode, ConstructorDeclNode, OperatorDeclNode,
  ClassMemberNode, DecoratorNode, ExprNode, TypeNode,
  IdentifierNode, MatchPattern, StmtNode, OwnershipKind, Visibility,
  LambdaExprNode, OwnershipExprNode, CoalesceExprNode,
  TryCatchStmtNode, ThrowStmtNode, TryPropagateExprNode,
} from "./ast";

export class ParseError extends Error {
  constructor(message: string, public token: Token) {
    super(`[ParseError] Line ${token.position.line}:${token.position.column} -- ${message} (got "${token.value}")`);
    this.name = "ParseError";
  }
}

export class Parser {
  private tokens: Token[];
  private pos: number = 0;
  private inMatchPattern: boolean = false;

  constructor(tokens: Token[]) {
    this.tokens = tokens;
  }

  parse(): ProgramNode {
    const body: ASTNode[] = [];
    while (!this.isAtEnd()) {
      const stmt = this.parseTopLevel();
      if (stmt) body.push(stmt);
    }
    return { kind: NodeKind.Program, body, position: { line: 1, column: 1, offset: 0 } };
  }

  private parseTopLevel(): ASTNode | null {
    const decorators = this.parseDecorators();
    if (this.check(TokenType.IMPORT)) return this.parseImport();
    if (this.check(TokenType.EXPORT)) return this.parseExport(decorators);
    if (this.check(TokenType.STRUCT)) return this.parseStruct(decorators);
    if (this.check(TokenType.TRAIT))  return this.parseTrait();
    if (this.check(TokenType.IMPL))   return this.parseImpl();
    if (this.check(TokenType.CLASS))  return this.parseClass(decorators);
    if (this.check(TokenType.INTERFACE)) return this.parseInterface();
    if (this.check(TokenType.MIXIN))  return this.parseMixin();
    // Handle visibility modifiers at top level
    if (
      this.check(TokenType.PUB) ||
      this.check(TokenType.PRIV) ||
      this.check(TokenType.PROT) ||
      this.check(TokenType.PUBLISHED)
    ) {
      const vis = this.parseVisibility();
      const isStatic = this.match(TokenType.STATIC);
      if (this.check(TokenType.STRUCT)) return this.parseStruct(decorators, vis);
      if (this.check(TokenType.CLASS))  return this.parseClass(decorators);
      if (this.check(TokenType.FN) || this.check(TokenType.ASYNC)) return this.parseFnDecl(decorators, vis, isStatic);
      return this.parseVarDecl(vis);
    }
    if (this.check(TokenType.FN) || this.check(TokenType.ASYNC)) return this.parseFnDecl(decorators, "pub", false);
    if (this.check(TokenType.LET) || this.check(TokenType.CONST)) return this.parseVarDecl();
    return this.parseStatement();
  }

  private parseDecorators(): DecoratorNode[] {
    const decorators: DecoratorNode[] = [];
    while (this.check(TokenType.AT)) {
      const pos = this.current().position;
      this.advance();
      const name = this.expect(TokenType.IDENTIFIER, "Decorator name expected").value;
      let args: ExprNode[] = [];
      if (this.check(TokenType.LPAREN)) {
        this.advance();
        args = this.parseArgList();
        this.expect(TokenType.RPAREN, "Expected ')'");
      }
      decorators.push({ kind: NodeKind.Decorator, name, args, position: pos });
    }
    return decorators;
  }

  private parseImport(): ImportDeclNode {
    const pos = this.current().position;
    this.advance(); // consume 'import'

    // Formato 1: import { a, b } from "caminho";
    if (this.check(TokenType.LBRACE)) {
      this.advance();
      const names: string[] = [];
      while (!this.check(TokenType.RBRACE) && !this.isAtEnd()) {
        names.push(this.expect(TokenType.IDENTIFIER, "Name expected").value);
        if (!this.match(TokenType.COMMA)) break;
      }
      this.expect(TokenType.RBRACE, "Expected '}'");
      this.expect(TokenType.FROM, "Expected 'from'");
      const source = this.expect(TokenType.STRING, "Module path expected").value;
      this.matchSemicolon();
      return { kind: NodeKind.ImportDecl, names, source, position: pos };
    }

    // Formato 2: import "caminho.vox";
    if (this.check(TokenType.STRING)) {
      const source = this.advance().value;
      this.matchSemicolon();
      return { kind: NodeKind.ImportDecl, names: [], source, position: pos };
    }

    // Formato 3: import Unit1, Unit2, UnitClientes; (estilo uses do Delphi)
    const units: string[] = [];
    while (!this.isAtEnd() && !this.check(TokenType.SEMICOLON)) {
      const unitName = this.expect(TokenType.IDENTIFIER, "Unit name expected in import").value;
      units.push(unitName);
      if (!this.match(TokenType.COMMA)) break;
    }
    this.matchSemicolon();
    return {
      kind: NodeKind.ImportDecl,
      names: units,
      units: units,
      source: units[0] || "",
      position: pos
    };
  }

  private parseExport(decorators: DecoratorNode[]): ExportDeclNode {
    const pos = this.current().position;
    this.advance();
    let decl: ASTNode;
    if (this.check(TokenType.STRUCT)) decl = this.parseStruct(decorators);
    else if (this.check(TokenType.TRAIT)) decl = this.parseTrait();
    else if (this.check(TokenType.IMPL)) decl = this.parseImpl();
    else if (this.check(TokenType.CLASS)) decl = this.parseClass(decorators);
    else if (this.check(TokenType.FN) || this.check(TokenType.ASYNC)) decl = this.parseFnDecl(decorators, "pub", false);
    else decl = this.parseVarDecl();
    return { kind: NodeKind.ExportDecl, decl, position: pos };
  }

  private parseClass(decorators: DecoratorNode[]): ClassDeclNode {
    const pos = this.current().position;
    this.advance();
    const name = this.expect(TokenType.IDENTIFIER, "Class name expected").value;
    const generics: string[] = [];
    if (this.check(TokenType.LT)) {
      this.advance();
      while (!this.check(TokenType.GT) && !this.isAtEnd()) {
        generics.push(this.expect(TokenType.IDENTIFIER, "Generic type").value);
        if (!this.match(TokenType.COMMA)) break;
      }
      this.expect(TokenType.GT, "Expected '>'");
    }
    let superClass: string | undefined;
    if (this.match(TokenType.EXTENDS) || this.match(TokenType.COLON)) {
      superClass = this.expect(TokenType.IDENTIFIER, "Superclass name expected").value;
    } else if (this.check(TokenType.IDENTIFIER) && this.peek().value === 'herda') {
      this.advance();
      superClass = this.expect(TokenType.IDENTIFIER, "Superclass name expected").value;
    } else if (this.check(TokenType.LPAREN)) {
      this.advance();
      superClass = this.expect(TokenType.IDENTIFIER, "Superclass name expected").value;
      this.expect(TokenType.RPAREN, "Expected ')'");
    }
    const interfaces: string[] = [];
    if (this.match(TokenType.IMPLEMENTS)) {
      interfaces.push(this.expect(TokenType.IDENTIFIER, "Interface expected").value);
      while (this.match(TokenType.COMMA)) interfaces.push(this.expect(TokenType.IDENTIFIER, "Interface").value);
    }
    const mixins: string[] = [];
    if (this.match(TokenType.WITH)) {
      mixins.push(this.expect(TokenType.IDENTIFIER, "Mixin expected").value);
      while (this.match(TokenType.COMMA)) mixins.push(this.expect(TokenType.IDENTIFIER, "Mixin").value);
    }
    this.expect(TokenType.LBRACE, "Expected '{'");
    const members: ClassMemberNode[] = [];
    let sectionVisibility: Visibility = 'pub';
    while (!this.check(TokenType.RBRACE) && !this.isAtEnd()) {
      // Seção de visibilidade estilo Delphi: private:, public:, published:, protected:
      if (
        (this.check(TokenType.PUB) ||
         this.check(TokenType.PRIV) ||
         this.check(TokenType.PROT) ||
         this.check(TokenType.PUBLISHED)) &&
        this.peekNext().type === TokenType.COLON
      ) {
        sectionVisibility = this.parseVisibility();
        this.expect(TokenType.COLON, "Expected ':' after visibility section");
        continue;
      }

      const memberDecorators = this.parseDecorators();
      let visibility: Visibility = sectionVisibility;
      let isStatic = false;
      let hasExplicitVis = false;
      while (
        this.check(TokenType.PUB) ||
        this.check(TokenType.PRIV) ||
        this.check(TokenType.PROT) ||
        this.check(TokenType.PUBLISHED) ||
        this.check(TokenType.STATIC)
      ) {
        if (this.match(TokenType.STATIC)) {
          isStatic = true;
        } else if (this.match(TokenType.PUB)) {
          visibility = 'pub';
          hasExplicitVis = true;
        } else if (this.match(TokenType.PRIV)) {
          visibility = 'priv';
          hasExplicitVis = true;
        } else if (this.match(TokenType.PROT)) {
          visibility = 'prot';
          hasExplicitVis = true;
        } else if (this.match(TokenType.PUBLISHED)) {
          visibility = 'published';
          hasExplicitVis = true;
        }
      }
      if (!hasExplicitVis) visibility = sectionVisibility;

      if (this.check(TokenType.FN) || this.check(TokenType.ASYNC)) {
        if (this.peekNext().value === "new" || this.peekNext().value === "constructor" || this.peekNext().value === "Create") {
          this.advance(); // consume fn
          if (this.peek().value === "constructor") {
            this.advance();
            if (this.peek().value === "Create") this.advance();
          }
          members.push(this.parseConstructor());
        } else {
          members.push(this.parseMethod(memberDecorators, visibility, isStatic));
        }
      } else if (this.check(TokenType.OPERATOR)) {
        members.push(this.parseOperator());
      } else if (this.peek().value === "new" || this.peek().value === "constructor" || (this.peek().value === "Create" && this.peekNext().type === TokenType.LPAREN)) {
        if (this.peek().value === "constructor") {
          this.advance();
          if (this.peek().value === "Create") this.advance();
        }
        members.push(this.parseConstructor());
      } else {
        members.push(this.parseField(visibility, isStatic));
      }
    }
    this.expect(TokenType.RBRACE, "Expected '}'");
    return { kind: NodeKind.ClassDecl, name, superClass, interfaces, mixins, members, decorators, generics, position: pos };
  }

  private parseStruct(decorators: DecoratorNode[], visibility: Visibility = 'pub'): StructDeclNode {
    const pos = this.current().position;
    this.advance(); // consume 'struct'
    const name = this.expect(TokenType.IDENTIFIER, "Struct name expected").value;
    const generics: string[] = [];
    if (this.match(TokenType.LT)) {
      while (!this.check(TokenType.GT) && !this.isAtEnd()) {
        generics.push(this.expect(TokenType.IDENTIFIER, "Generic type name").value);
        if (!this.match(TokenType.COMMA)) break;
      }
      this.expect(TokenType.GT, "Expected '>'");
    }

    const params: StructFieldParam[] = [];
    if (this.check(TokenType.LPAREN)) {
      this.advance(); // consume '('
      while (!this.check(TokenType.RPAREN) && !this.isAtEnd()) {
        const fieldPos = this.current().position;
        let fieldVis: Visibility = 'pub';
        if (this.match(TokenType.PUB)) fieldVis = 'pub';
        else if (this.match(TokenType.PRIV)) fieldVis = 'priv';

        const isMut = this.match(TokenType.MUT);
        const fieldName = this.expect(TokenType.IDENTIFIER, "Field name expected").value;
        this.expect(TokenType.COLON, "Expected ':' after field name");
        const typeAnnot = this.parseType();
        let defaultVal: ExprNode | undefined;
        if (this.match(TokenType.ASSIGN)) {
          defaultVal = this.parseExpression();
        }
        params.push({
          name: fieldName,
          typeAnnot,
          visibility: fieldVis,
          isMut,
          default: defaultVal,
          position: fieldPos
        });
        if (!this.match(TokenType.COMMA)) break;
      }
      this.expect(TokenType.RPAREN, "Expected ')'");
    }
    this.matchSemicolon();
    return {
      kind: NodeKind.StructDecl,
      name,
      generics,
      params,
      decorators,
      visibility,
      position: pos
    };
  }

  private parseTrait(): TraitDeclNode {
    const pos = this.current().position;
    this.advance(); // consume 'trait'
    const name = this.expect(TokenType.IDENTIFIER, "Trait name expected").value;
    const generics: string[] = [];
    if (this.match(TokenType.LT)) {
      while (!this.check(TokenType.GT) && !this.isAtEnd()) {
        generics.push(this.expect(TokenType.IDENTIFIER, "Generic type name").value);
        if (!this.match(TokenType.COMMA)) break;
      }
      this.expect(TokenType.GT, "Expected '>'");
    }
    this.expect(TokenType.LBRACE, "Expected '{'");
    const methods: MethodDeclNode[] = [];
    while (!this.check(TokenType.RBRACE) && !this.isAtEnd()) {
      const decs = this.parseDecorators();
      const isAsync = this.match(TokenType.ASYNC);
      this.expect(TokenType.FN, "Expected 'fn' in trait");
      const methodName = this.expect(TokenType.IDENTIFIER, "Method name").value;
      const methodGenerics: string[] = [];
      if (this.match(TokenType.LT)) {
        while (!this.check(TokenType.GT) && !this.isAtEnd()) {
          methodGenerics.push(this.expect(TokenType.IDENTIFIER, "Method generic").value);
          if (!this.match(TokenType.COMMA)) break;
        }
        this.expect(TokenType.GT, "Expected '>'");
      }
      const mparams = this.parseParams();
      let returnType: TypeNode | undefined;
      if (this.match(TokenType.ARROW)) returnType = this.parseType();

      let body: BlockNode | ExprNode = { kind: NodeKind.Block, body: [], position: pos };
      if (this.check(TokenType.LBRACE)) {
        body = this.parseBlock();
      } else {
        this.matchSemicolon();
      }
      methods.push({
        kind: NodeKind.MethodDecl,
        name: methodName,
        params: mparams,
        returnType,
        body,
        isAsync,
        visibility: 'pub',
        isStatic: false,
        isAbstract: false,
        decorators: decs,
        generics: methodGenerics,
        position: pos
      });
    }
    this.expect(TokenType.RBRACE, "Expected '}'");
    return { kind: NodeKind.TraitDecl, name, generics, methods, position: pos };
  }

  private parseImpl(): ImplDeclNode {
    const pos = this.current().position;
    this.advance(); // consume 'impl'
    const generics: string[] = [];
    if (this.match(TokenType.LT)) {
      while (!this.check(TokenType.GT) && !this.isAtEnd()) {
        generics.push(this.expect(TokenType.IDENTIFIER, "Generic type name").value);
        if (!this.match(TokenType.COMMA)) break;
      }
      this.expect(TokenType.GT, "Expected '>'");
    }

    const firstId = this.expect(TokenType.IDENTIFIER, "Trait or struct name expected").value;
    let traitName: string | undefined;
    let targetType: string;

    if (this.match(TokenType.FOR)) {
      traitName = firstId;
      targetType = this.expect(TokenType.IDENTIFIER, "Struct name expected").value;
    } else {
      targetType = firstId;
    }

    this.expect(TokenType.LBRACE, "Expected '{'");
    const methods: MethodDeclNode[] = [];
    while (!this.check(TokenType.RBRACE) && !this.isAtEnd()) {
      const decs = this.parseDecorators();
      let visibility: Visibility = 'pub';
      let isStatic = false;
      while (this.check(TokenType.PUB) || this.check(TokenType.PRIV) || this.check(TokenType.STATIC)) {
        if (this.match(TokenType.STATIC)) isStatic = true;
        else if (this.match(TokenType.PUB)) visibility = 'pub';
        else if (this.match(TokenType.PRIV)) visibility = 'priv';
      }
      if (this.check(TokenType.FN) || this.check(TokenType.ASYNC)) {
        methods.push(this.parseMethod(decs, visibility, isStatic));
      } else {
        throw new ParseError("Expected method declaration inside impl block", this.peek());
      }
    }
    this.expect(TokenType.RBRACE, "Expected '}'");
    return { kind: NodeKind.ImplDecl, traitName, targetType, generics, methods, position: pos };
  }

  private parseInterface(): InterfaceDeclNode {
    const pos = this.current().position;
    this.advance();
    const name = this.expect(TokenType.IDENTIFIER, "Interface name").value;
    const generics: string[] = [];
    if (this.match(TokenType.LT)) {
      while (!this.check(TokenType.GT) && !this.isAtEnd()) {
        generics.push(this.expect(TokenType.IDENTIFIER, "Generic type name").value);
        if (!this.match(TokenType.COMMA)) break;
      }
      this.expect(TokenType.GT, "Expected '>'");
    }
    const extendsList: string[] = [];
    if (this.match(TokenType.EXTENDS)) {
      extendsList.push(this.expect(TokenType.IDENTIFIER, "Parent interface").value);
      while (this.match(TokenType.COMMA)) extendsList.push(this.expect(TokenType.IDENTIFIER, "Interface").value);
    }
    this.expect(TokenType.LBRACE, "Expected '{'");
    const members: FnDeclNode[] = [];
    while (!this.check(TokenType.RBRACE) && !this.isAtEnd()) {
      const vis = this.parseVisibility();
      members.push(this.parseFnDecl([], vis, false, true));
    }
    this.expect(TokenType.RBRACE, "Expected '}'");
    return { kind: NodeKind.InterfaceDecl, name, members, extends: extendsList, generics, position: pos };
  }

  private parseMixin(): MixinDeclNode {
    const pos = this.current().position;
    this.advance();
    const name = this.expect(TokenType.IDENTIFIER, "Mixin name").value;
    this.expect(TokenType.LBRACE, "Expected '{'");
    const members: ClassMemberNode[] = [];
    while (!this.check(TokenType.RBRACE) && !this.isAtEnd()) {
      const vis = this.parseVisibility();
      members.push(this.parseMethod([], vis, false));
    }
    this.expect(TokenType.RBRACE, "Expected '}'");
    return { kind: NodeKind.MixinDecl, name, members, position: pos };
  }

  private parseFnDecl(
    decorators: DecoratorNode[],
    visibility: Visibility,
    isStatic: boolean,
    isAbstract = false
  ): FnDeclNode {
    const pos = this.current().position;
    const isAsync = this.match(TokenType.ASYNC);
    this.expect(TokenType.FN, "Expected 'fn'");
    const name = this.expect(TokenType.IDENTIFIER, "Function name").value;
    const generics: string[] = [];
    if (this.match(TokenType.LT)) {
      while (!this.check(TokenType.GT) && !this.isAtEnd()) {
        generics.push(this.expect(TokenType.IDENTIFIER, "Generic type name").value);
        if (!this.match(TokenType.COMMA)) break;
      }
      this.expect(TokenType.GT, "Expected '>'");
    }
    const params = this.parseParams();
    let returnType: TypeNode | undefined;
    if (this.match(TokenType.ARROW)) returnType = this.parseType();
    let body: BlockNode | ExprNode;
    if (this.check(TokenType.LBRACE)) {
      body = this.parseBlock();
    } else if (this.match(TokenType.FAT_ARROW)) {
      body = this.parseExpression();
      this.matchSemicolon();
    } else if (isAbstract) {
      body = { kind: NodeKind.Block, body: [], position: pos };
      this.matchSemicolon();
    } else {
      throw new ParseError("Expected '{' or '=>'", this.current());
    }
    return { kind: NodeKind.FnDecl, name, params, returnType, body, isAsync, visibility, isStatic, decorators, generics, position: pos };
  }

  private parseMethod(decorators: DecoratorNode[], visibility: Visibility, isStatic: boolean): MethodDeclNode {
    const pos = this.current().position;
    const isAsync = this.match(TokenType.ASYNC);
    this.expect(TokenType.FN, "Expected 'fn'");
    const name = this.expect(TokenType.IDENTIFIER, "Method name").value;
    const generics: string[] = [];
    if (this.match(TokenType.LT)) {
      while (!this.check(TokenType.GT) && !this.isAtEnd()) {
        generics.push(this.expect(TokenType.IDENTIFIER, "Generic type name").value);
        if (!this.match(TokenType.COMMA)) break;
      }
      this.expect(TokenType.GT, "Expected '>'");
    }
    const params = this.parseParams();
    let returnType: TypeNode | undefined;
    if (this.match(TokenType.ARROW)) returnType = this.parseType();
    let body: BlockNode | ExprNode;
    if (this.check(TokenType.LBRACE)) {
      body = this.parseBlock();
    } else if (this.match(TokenType.FAT_ARROW)) {
      body = this.parseExpression();
      this.matchSemicolon();
    } else {
      throw new ParseError("Expected '{' or '=>'", this.current());
    }
    return {
      kind: NodeKind.MethodDecl, name, params, returnType, body,
      isAsync, visibility, isStatic, isAbstract: false, decorators, generics, position: pos
    };
  }

  private parseConstructor(): ConstructorDeclNode {
    const pos = this.current().position;
    if (this.peek().value === "new" || this.peek().value === "constructor" || this.peek().value === "Create") {
      this.advance();
    }
    const params = this.parseParams();
    const body = this.parseBlock();
    return { kind: NodeKind.ConstructorDecl, params, body, position: pos };
  }

  private parseOperator(): OperatorDeclNode {
    const pos = this.current().position;
    this.advance(); // operator keyword
    let op: string;
    if (this.check(TokenType.LBRACKET)) {
      this.advance();
      this.expect(TokenType.RBRACKET, "Expected ']'");
      if (this.match(TokenType.ASSIGN)) {
        op = "[]=";
      } else {
        op = "[]";
      }
    } else {
      op = this.advance().value;
    }
    const params = this.parseParams();
    let returnType: TypeNode | undefined;
    if (this.match(TokenType.ARROW)) returnType = this.parseType();
    const body = this.parseBlock();
    return { kind: NodeKind.OperatorDecl, operator: op, params, returnType, body, position: pos };
  }

  private parseField(visibility: Visibility, isStatic: boolean): FieldDeclNode {
    const pos = this.current().position;
    this.match(TokenType.LET);
    this.match(TokenType.MUT);
    const ownership = this.parseOwnership();
    let name: string;
    if (this.check(TokenType.IDENTIFIER) || /^[a-zA-Z_\u00C0-\u017F][a-zA-Z0-9_\u00C0-\u017F]*$/.test(this.peek().value)) {
      name = this.advance().value;
    } else {
      name = this.expect(TokenType.IDENTIFIER, "Field name").value;
    }
    let typeAnnot: TypeNode | undefined;
    if (this.match(TokenType.COLON)) typeAnnot = this.parseType();
    let value: ExprNode | undefined;
    if (this.match(TokenType.ASSIGN)) value = this.parseExpression();
    this.matchSemicolon();
    return { kind: NodeKind.FieldDecl, name, typeAnnot, value, visibility, isStatic, ownership, position: pos };
  }

  private parseParams(): ParamNode[] {
    this.expect(TokenType.LPAREN, "Expected '('");
    const params: ParamNode[] = [];
    while (!this.check(TokenType.RPAREN) && !this.isAtEnd()) {
      const pos = this.current().position;
      const ownership = this.parseOwnership();
      const name = (this.check(TokenType.SELF) ? this.advance() : this.expect(TokenType.IDENTIFIER, "Parameter name")).value;
      let typeAnnot: TypeNode | undefined;
      if (this.match(TokenType.COLON)) typeAnnot = this.parseType();
      let defaultVal: ExprNode | undefined;
      if (this.match(TokenType.ASSIGN)) defaultVal = this.parseExpression();
      params.push({ kind: NodeKind.Param, name, typeAnnot, ownership, default: defaultVal, position: pos });
      if (!this.match(TokenType.COMMA)) break;
    }
    this.expect(TokenType.RPAREN, "Expected ')'");
    return params;
  }

  private parseVisibility(): Visibility {
    if (this.match(TokenType.PUB))  return "pub";
    if (this.match(TokenType.PRIV)) return "priv";
    if (this.match(TokenType.PROT)) return "prot";
    if (this.match(TokenType.PUBLISHED)) return "published";
    return "priv";
  }

  private parseOwnership(): OwnershipKind {
    if (this.match(TokenType.OWN))    return "own";
    if (this.match(TokenType.BORROW)) return "borrow";
    if (this.match(TokenType.REF))    return "ref";
    return "none";
  }

  private parseStatement(): StmtNode {
    if (this.check(TokenType.LET) || this.check(TokenType.CONST)) return this.parseVarDecl();
    if (this.check(TokenType.RETURN))   return this.parseReturn();
    if (this.check(TokenType.IF))       return this.parseIf();
    if (this.check(TokenType.WHILE))    return this.parseWhile();
    if (this.check(TokenType.FOR))      return this.parseFor();
    if (this.check(TokenType.MATCH))    return this.parseMatch();
    if (this.check(TokenType.SPAWN))    return this.parseSpawn();
    if (this.check(TokenType.TRY))      return this.parseTryCatch();
    if (this.check(TokenType.THROW))    return this.parseThrow();
    if (this.check(TokenType.BREAK)) {
      const pos = this.advance().position;
      this.matchSemicolon();
      return { kind: NodeKind.BreakStmt, position: pos };
    }
    if (this.check(TokenType.CONTINUE)) {
      const pos = this.advance().position;
      this.matchSemicolon();
      return { kind: NodeKind.ContinueStmt, position: pos };
    }
    if (this.check(TokenType.LBRACE)) return this.parseBlock();
    const expr = this.parseExpression();
    this.matchSemicolon();
    return { kind: NodeKind.ExprStmt, expr, position: expr.position };
  }

  private parseVarDecl(visibility?: Visibility): VarDeclNode {
    const pos = this.current().position;
    const leadTok = this.advance();
    const isConst = leadTok.type === TokenType.CONST;
    const isMut = this.match(TokenType.MUT) || leadTok.value === 'var';
    const ownership = this.parseOwnership();
    const name = this.expect(TokenType.IDENTIFIER, "Variable name").value;
    let typeAnnot: TypeNode | undefined;
    if (this.match(TokenType.COLON)) typeAnnot = this.parseType();
    let value: ExprNode | undefined;
    if (this.match(TokenType.ASSIGN)) value = this.parseExpression();
    this.matchSemicolon();
    return { kind: NodeKind.VarDecl, name, isConst, isMut, typeAnnot, value, ownership, visibility, position: pos };
  }

  private parseReturn(): ReturnStmtNode {
    const pos = this.advance().position;
    let value: ExprNode | undefined;
    if (!this.check(TokenType.RBRACE) && !this.check(TokenType.SEMICOLON) && !this.isAtEnd()) {
      value = this.parseExpression();
    }
    this.matchSemicolon();
    return { kind: NodeKind.ReturnStmt, value, position: pos };
  }

  private parseIf(): IfStmtNode {
    const pos = this.advance().position;
    const condition = this.parseExpression();
    const then = this.parseBlock();
    const elif: Array<{ condition: ExprNode; block: BlockNode }> = [];
    while (this.check(TokenType.ELIF) || (this.check(TokenType.ELSE) && this.peekNext().type === TokenType.IF)) {
      if (this.check(TokenType.ELIF)) {
        this.advance();
      } else {
        this.advance(); // consume 'else'
        this.advance(); // consume 'if'
      }
      elif.push({ condition: this.parseExpression(), block: this.parseBlock() });
    }
    let elseBlock: BlockNode | undefined;
    if (this.match(TokenType.ELSE)) elseBlock = this.parseBlock();
    return { kind: NodeKind.IfStmt, condition, then, elif, else: elseBlock, position: pos };
  }

  private parseWhile(): WhileStmtNode {
    const pos = this.advance().position;
    const condition = this.parseExpression();
    const body = this.parseBlock();
    return { kind: NodeKind.WhileStmt, condition, body, position: pos };
  }

  private parseFor(): ForStmtNode {
    const pos = this.advance().position;
    const variable = this.expect(TokenType.IDENTIFIER, "For variable").value;
    this.expect(TokenType.IN, "Expected 'in'");
    const iterable = this.parseExpression();
    const body = this.parseBlock();
    return { kind: NodeKind.ForStmt, variable, iterable, body, position: pos };
  }

  private parseMatch(): MatchStmtNode {
    const pos = this.advance().position;
    const value = this.parseExpression();
    this.expect(TokenType.LBRACE, "Expected '{'");
    const arms: MatchArmNode[] = [];
    while (!this.check(TokenType.RBRACE) && !this.isAtEnd()) {
      const armPos = this.current().position;
      const pattern = this.parseMatchPattern();
      let guard: ExprNode | undefined;
      if (this.match(TokenType.IF)) guard = this.parseExpression();
      this.expect(TokenType.FAT_ARROW, "Expected '=>'");
      let body: ExprNode | BlockNode;
      if (this.check(TokenType.LBRACE)) body = this.parseBlock();
      else body = this.parseExpression();
      this.match(TokenType.COMMA);
      arms.push({ kind: NodeKind.MatchArm, pattern, guard, body, position: armPos });
    }
    this.expect(TokenType.RBRACE, "Expected '}'");
    return { kind: NodeKind.MatchStmt, value, arms, position: pos };
  }

  private parseMatchPattern(): MatchPattern {
    this.inMatchPattern = true;
    try {
      return this.doParseMatchPattern();
    } finally {
      this.inMatchPattern = false;
    }
  }

  private doParseMatchPattern(): MatchPattern {
    if (this.check(TokenType.IDENTIFIER) && this.peek().value === "_") {
      this.advance();
      return { kind: "wildcard" };
    }
    if (this.check(TokenType.NONE)) { this.advance(); return { kind: "none" }; }
    if (this.check(TokenType.SOME)) {
      this.advance();
      this.expect(TokenType.LPAREN, "Expected '('");
      const name = this.expect(TokenType.IDENTIFIER, "Name").value;
      this.expect(TokenType.RPAREN, "Expected ')'");
      return { kind: "some", name };
    }
    if (this.check(TokenType.OK)) {
      this.advance();
      this.expect(TokenType.LPAREN, "Expected '('");
      const name = this.expect(TokenType.IDENTIFIER, "Name").value;
      this.expect(TokenType.RPAREN, "Expected ')'");
      return { kind: "ok", name };
    }
    if (this.check(TokenType.ERR)) {
      this.advance();
      this.expect(TokenType.LPAREN, "Expected '('");
      const name = this.expect(TokenType.IDENTIFIER, "Name").value;
      this.expect(TokenType.RPAREN, "Expected ')'");
      return { kind: "err", name };
    }
    const expr = this.parseExpression();
    if (this.check(TokenType.RANGE)) {
      this.advance();
      return { kind: "range", from: expr, to: this.parseExpression() };
    }
    if (expr.kind === NodeKind.Identifier) return { kind: "identifier", name: (expr as IdentifierNode).name };
    return { kind: "literal", value: expr };
  }

  private parseSpawn(): SpawnStmtNode {
    const pos = this.advance().position;
    return { kind: NodeKind.SpawnStmt, body: this.parseBlock(), position: pos };
  }

  private parseTryCatch(): TryCatchStmtNode {
    const pos = this.advance().position; // consume 'try'
    const tryBlock = this.parseBlock();
    let catchParam: string | undefined;
    let catchBlock: BlockNode | undefined;
    if (this.check(TokenType.CATCH)) {
      this.advance(); // consume 'catch'
      if (this.match(TokenType.LPAREN)) {
        catchParam = this.expect(TokenType.IDENTIFIER, "Expected catch parameter name").value;
        this.expect(TokenType.RPAREN, "Expected ')' after catch parameter");
      }
      catchBlock = this.parseBlock();
    }
    let finallyBlock: BlockNode | undefined;
    if (this.check(TokenType.FINALLY)) {
      this.advance(); // consume 'finally'
      finallyBlock = this.parseBlock();
    }
    return {
      kind: NodeKind.TryCatchStmt,
      tryBlock,
      catchParam,
      catchBlock,
      finallyBlock,
      position: pos,
    };
  }

  private parseThrow(): ThrowStmtNode {
    const pos = this.advance().position; // consume 'throw'
    const value = this.parseExpression();
    this.matchSemicolon();
    return { kind: NodeKind.ThrowStmt, value, position: pos };
  }

  private parseBlock(): BlockNode {
    const pos = this.expect(TokenType.LBRACE, "Expected '{'").position;
    const body: StmtNode[] = [];
    while (!this.check(TokenType.RBRACE) && !this.isAtEnd()) {
      const decorators = this.parseDecorators();
      if (this.check(TokenType.FN) || this.check(TokenType.ASYNC)) {
        const vis = this.parseVisibility();
        body.push(this.parseFnDecl(decorators, vis, false));
      } else {
        body.push(this.parseStatement());
      }
    }
    this.expect(TokenType.RBRACE, "Expected '}'");
    return { kind: NodeKind.Block, body, position: pos };
  }

  // ── Expression parsing (Pratt / recursive descent) ────────

  private parseExpression(): ExprNode { return this.parseAssignment(); }

  private parseAssignment(): ExprNode {
    const left = this.parseCoalesce();
    const assignOps = ["=", "+=", "-=", "*=", "/=", "%="];
    if (assignOps.includes(this.peek().value)) {
      const op = this.advance().value;
      return { kind: NodeKind.AssignExpr, operator: op, target: left, value: this.parseAssignment(), position: left.position };
    }
    return left;
  }

  private parseCoalesce(): ExprNode {
    let left = this.parsePipe();
    while (this.check(TokenType.DOUBLE_QUESTION)) {
      this.advance();
      const right = this.parsePipe();
      left = { kind: NodeKind.CoalesceExpr, left, right, position: left.position };
    }
    return left;
  }

  private parsePipe(): ExprNode {
    let left = this.parseOr();
    while (this.check(TokenType.PIPE)) {
      this.advance();
      left = { kind: NodeKind.PipeExpr, left, right: this.parseOr(), position: left.position };
    }
    return left;
  }

  private parseOr(): ExprNode {
    let left = this.parseAnd();
    while (this.check(TokenType.OR)) {
      const op = this.advance().value;
      left = { kind: NodeKind.BinaryExpr, operator: op, left, right: this.parseAnd(), position: left.position };
    }
    return left;
  }

  private parseAnd(): ExprNode {
    let left = this.parseEquality();
    while (this.check(TokenType.AND)) {
      const op = this.advance().value;
      left = { kind: NodeKind.BinaryExpr, operator: op, left, right: this.parseEquality(), position: left.position };
    }
    return left;
  }

  private parseEquality(): ExprNode {
    let left = this.parseComparison();
    while (this.check(TokenType.EQ) || this.check(TokenType.NEQ)) {
      const op = this.advance().value;
      left = { kind: NodeKind.BinaryExpr, operator: op, left, right: this.parseComparison(), position: left.position };
    }
    return left;
  }

  private parseComparison(): ExprNode {
    let left = this.parseAddSub();
    while ([TokenType.LT, TokenType.GT, TokenType.LTE, TokenType.GTE].includes(this.peek().type)) {
      const op = this.advance().value;
      left = { kind: NodeKind.BinaryExpr, operator: op, left, right: this.parseAddSub(), position: left.position };
    }
    return left;
  }

  private parseAddSub(): ExprNode {
    let left = this.parseMulDiv();
    while (this.check(TokenType.PLUS) || this.check(TokenType.MINUS)) {
      const op = this.advance().value;
      left = { kind: NodeKind.BinaryExpr, operator: op, left, right: this.parseMulDiv(), position: left.position };
    }
    return left;
  }

  private parseMulDiv(): ExprNode {
    let left = this.parseUnary();
    while ([TokenType.STAR, TokenType.SLASH, TokenType.PERCENT, TokenType.POWER].includes(this.peek().type)) {
      const op = this.advance().value;
      left = { kind: NodeKind.BinaryExpr, operator: op, left, right: this.parseUnary(), position: left.position };
    }
    return left;
  }

  private parseUnary(): ExprNode {
    const pos = this.current().position;
    if (this.check(TokenType.NOT)) {
      return { kind: NodeKind.UnaryExpr, operator: this.advance().value, operand: this.parseUnary(), prefix: true, position: pos };
    }
    if (this.check(TokenType.MINUS)) {
      this.advance();
      return { kind: NodeKind.UnaryExpr, operator: "-", operand: this.parseUnary(), prefix: true, position: pos };
    }
    if (this.check(TokenType.AWAIT)) {
      this.advance();
      return { kind: NodeKind.AwaitExpr, value: this.parseUnary(), position: pos };
    }
    if (this.check(TokenType.OWN) || this.check(TokenType.BORROW) || this.check(TokenType.REF)) {
      const ownership = this.parseOwnership();
      return { kind: NodeKind.OwnershipExpr, ownership, operand: this.parseUnary(), position: pos };
    }
    return this.parsePostfix();
  }

  private parsePostfix(): ExprNode {
    let expr = this.parsePrimary();
    while (true) {
      // Turbofish generic call: func::<TypeArgs>(...) or obj.method::<TypeArgs>(...)
      if (this.check(TokenType.DOUBLE_COLON) && (expr.kind === NodeKind.Identifier || expr.kind === NodeKind.MemberExpr)) {
        const savedPos = this.pos;
        this.advance(); // consume '::'
        if (this.match(TokenType.LT)) {
          const typeArgs: TypeNode[] = [];
          while (!this.check(TokenType.GT) && !this.isAtEnd()) {
            typeArgs.push(this.parseType());
            if (!this.match(TokenType.COMMA)) break;
          }
          this.expect(TokenType.GT, "Expected '>' after turbofish type arguments");
          this.expect(TokenType.LPAREN, "Expected '(' after turbofish");
          const args = this.parseArgList();
          this.expect(TokenType.RPAREN, "Expected ')'");
          expr = { kind: NodeKind.CallExpr, callee: expr, args, typeArgs, isAwait: false, position: expr.position };
          continue;
        } else {
          this.pos = savedPos; // not turbofish, backtrack
        }
      }

      // Check for generic function call: func<TypeArgs>(...)
      if (this.check(TokenType.LT) && (expr.kind === NodeKind.Identifier || expr.kind === NodeKind.MemberExpr)) {
        const savedPos = this.pos;
        let isGenericCall = false;
        const typeArgs: TypeNode[] = [];
        try {
          this.advance(); // consume '<'
          while (!this.check(TokenType.GT) && !this.isAtEnd()) {
            typeArgs.push(this.parseType());
            if (!this.match(TokenType.COMMA)) break;
          }
          if (this.match(TokenType.GT) && this.check(TokenType.LPAREN)) {
            isGenericCall = true;
          }
        } catch {
          isGenericCall = false;
        }
        if (isGenericCall) {
          this.advance(); // consume '('
          const args = this.parseArgList();
          this.expect(TokenType.RPAREN, "Expected ')'");
          expr = { kind: NodeKind.CallExpr, callee: expr, args, typeArgs, isAwait: false, position: expr.position };
          continue;
        } else {
          this.pos = savedPos;
        }
      }

      if (this.check(TokenType.LPAREN)) {
        this.advance();
        const args = this.parseArgList();
        this.expect(TokenType.RPAREN, "Expected ')'");
        expr = { kind: NodeKind.CallExpr, callee: expr, args, isAwait: false, position: expr.position };
      } else if (this.check(TokenType.DOT)) {
        this.advance();
        const prop = this.parsePropertyName();
        expr = { kind: NodeKind.MemberExpr, object: expr, property: prop, isOptional: false, position: expr.position };
      } else if (this.check(TokenType.QUESTION) && this.peekNext().type === TokenType.DOT) {
        this.advance(); this.advance();
        const prop = this.parsePropertyName();
        expr = { kind: NodeKind.MemberExpr, object: expr, property: prop, isOptional: true, position: expr.position };
      } else if (this.check(TokenType.QUESTION) && this.peekNext().type !== TokenType.QUESTION) {
        const qPos = this.advance().position;
        expr = { kind: NodeKind.TryPropagateExpr, expr, position: qPos };
      } else if (this.check(TokenType.LBRACKET)) {
        this.advance();
        const index = this.parseExpression();
        this.expect(TokenType.RBRACKET, "Expected ']'");
        expr = { kind: NodeKind.IndexExpr, object: expr, index, position: expr.position };
      } else {
        break;
      }
    }
    return expr;
  }

  private parsePrimary(): ExprNode {
    const tok = this.peek();
    const pos = tok.position;
    if (tok.type === TokenType.INTEGER) { this.advance(); return { kind: NodeKind.IntLiteral, value: parseInt(tok.value, 10), position: pos }; }
    if (tok.type === TokenType.FLOAT)   { this.advance(); return { kind: NodeKind.FloatLiteral, value: parseFloat(tok.value), position: pos }; }
    if (tok.type === TokenType.STRING)  { this.advance(); return { kind: NodeKind.StringLiteral, value: tok.value, position: pos }; }
    if (tok.type === TokenType.CHAR)    { this.advance(); return { kind: NodeKind.CharLiteral, value: tok.value, position: pos }; }
    if (tok.type === TokenType.BOOL)    { this.advance(); return { kind: NodeKind.BoolLiteral, value: tok.value === "true", position: pos }; }
    if (tok.type === TokenType.NULL) {
      throw new ParseError(
        "Strict Null-Safety (Vox v1.0): 'null' has been removed from the language. Use 'none' or 'Option<T>' instead.",
        tok
      );
    }
    if (tok.type === TokenType.LBRACKET) {
      this.advance();
      const elements: ExprNode[] = [];
      while (!this.check(TokenType.RBRACKET) && !this.isAtEnd()) {
        elements.push(this.parseExpression());
        if (!this.match(TokenType.COMMA)) break;
      }
      this.expect(TokenType.RBRACKET, "Expected ']'");
      return { kind: NodeKind.ArrayLiteral, elements, position: pos };
    }
    if (tok.type === TokenType.HASH) {
      this.advance();
      this.expect(TokenType.LBRACE, "Expected '{'");
      const entries: Array<{ key: ExprNode; value: ExprNode }> = [];
      while (!this.check(TokenType.RBRACE) && !this.isAtEnd()) {
        const key = this.parseExpression();
        this.expect(TokenType.COLON, "Expected ':'");
        entries.push({ key, value: this.parseExpression() });
        if (!this.match(TokenType.COMMA)) break;
      }
      this.expect(TokenType.RBRACE, "Expected '}'");
      return { kind: NodeKind.MapLiteral, entries, position: pos };
    }
    if (tok.type === TokenType.BIT_OR) return this.parseLambda();
    if (tok.type === TokenType.LPAREN && this.isParenthesizedLambda()) {
      return this.parseParenthesizedLambda();
    }
    if (tok.type === TokenType.LPAREN) {
      this.advance();
      if (this.check(TokenType.RPAREN)) { this.advance(); return { kind: NodeKind.TupleLiteral, elements: [], position: pos }; }
      const expr = this.parseExpression();
      if (this.match(TokenType.COMMA)) {
        const elements = [expr];
        while (!this.check(TokenType.RPAREN) && !this.isAtEnd()) {
          elements.push(this.parseExpression());
          if (!this.match(TokenType.COMMA)) break;
        }
        this.expect(TokenType.RPAREN, "Expected ')'");
        return { kind: NodeKind.TupleLiteral, elements, position: pos };
      }
      this.expect(TokenType.RPAREN, "Expected ')'");
      return expr;
    }
    if (tok.type === TokenType.NEW) {
      this.advance();
      const className = this.expect(TokenType.IDENTIFIER, "Class name").value;
      let typeArgs: TypeNode[] | undefined;
      if (this.match(TokenType.LT)) {
        typeArgs = [];
        while (!this.check(TokenType.GT) && !this.isAtEnd()) {
          typeArgs.push(this.parseType());
          if (!this.match(TokenType.COMMA)) break;
        }
        this.expect(TokenType.GT, "Expected '>'");
      }
      if (this.check(TokenType.LBRACE)) {
        this.advance();
        const fields: Array<{ key: string; value: ExprNode }> = [];
        while (!this.check(TokenType.RBRACE) && !this.isAtEnd()) {
          const key = this.expect(TokenType.IDENTIFIER, "Field").value;
          this.expect(TokenType.COLON, "Expected ':'");
          fields.push({ key, value: this.parseExpression() });
          if (!this.match(TokenType.COMMA)) break;
        }
        this.expect(TokenType.RBRACE, "Expected '}'");
        return { kind: NodeKind.NewExpr, className, typeArgs, args: [], structInit: fields, position: pos };
      }
      this.expect(TokenType.LPAREN, "Expected '('");
      const args = this.parseArgList();
      this.expect(TokenType.RPAREN, "Expected ')'");
      return { kind: NodeKind.NewExpr, className, typeArgs, args, structInit: [], position: pos };
    }
    if (tok.type === TokenType.MACRO) {
      this.advance();
      this.expect(TokenType.LPAREN, "Expected '('");
      const args = this.parseArgList();
      this.expect(TokenType.RPAREN, "Expected ')'");
      return { kind: NodeKind.MacroCall, name: tok.value, args, position: pos };
    }
    if (tok.type === TokenType.MATCH) return this.parseMatch();
    if (tok.type === TokenType.SELF)  { this.advance(); return { kind: NodeKind.Identifier, name: "self", position: pos }; }
    if (tok.type === TokenType.SUPER) { this.advance(); return { kind: NodeKind.Identifier, name: "super", position: pos }; }
    if (tok.type === TokenType.IDENTIFIER) { this.advance(); return { kind: NodeKind.Identifier, name: tok.value, position: pos }; }
    // Keywords usable as identifiers or functions
    const allowedIdTokens = [
      TokenType.TYPE_INT, TokenType.TYPE_FLOAT, TokenType.TYPE_STR, TokenType.TYPE_BOOL, TokenType.TYPE_CHAR,
      TokenType.SOME, TokenType.NONE, TokenType.OK, TokenType.ERR
    ];
    if (allowedIdTokens.includes(tok.type)) {
      this.advance();
      return { kind: NodeKind.Identifier, name: tok.value, position: pos };
    }
    throw new ParseError("Unexpected expression", tok);
  }

  private parsePropertyName(): string {
    const tok = this.peek();
    const allowed = [
      TokenType.IDENTIFIER, TokenType.SOME, TokenType.NONE, TokenType.OK, TokenType.ERR,
      TokenType.TYPE_INT, TokenType.TYPE_FLOAT, TokenType.TYPE_STR, TokenType.TYPE_BOOL,
      TokenType.TYPE_CHAR, TokenType.NEW, TokenType.PUB, TokenType.PRIV, TokenType.PROT, TokenType.PUBLISHED
    ];
    if (allowed.includes(tok.type) || /^[a-zA-Z_\u00C0-\u017F][a-zA-Z0-9_\u00C0-\u017F]*$/.test(tok.value)) {
      this.advance();
      return tok.value;
    }
    return this.expect(TokenType.IDENTIFIER, "Property expected").value;
  }

  private parseLambda(): LambdaExprNode {
    const pos = this.current().position;
    this.advance(); // '|'
    const params: ParamNode[] = [];
    while (!this.check(TokenType.BIT_OR) && !this.isAtEnd()) {
      const ppos = this.current().position;
      const name = this.expect(TokenType.IDENTIFIER, "Lambda param").value;
      let typeAnnot: TypeNode | undefined;
      if (this.match(TokenType.COLON)) typeAnnot = this.parseType();
      params.push({ kind: NodeKind.Param, name, typeAnnot, ownership: "none", position: ppos });
      if (!this.match(TokenType.COMMA)) break;
    }
    this.expect(TokenType.BIT_OR, "Expected '|'");
    if (this.match(TokenType.FAT_ARROW)) {
      // optional => consumed
    } else if (!this.check(TokenType.LBRACE)) {
      this.expect(TokenType.FAT_ARROW, "Expected '=>' or '{'");
    }
    const body = this.check(TokenType.LBRACE) ? this.parseBlock() : this.parseExpression();
    return { kind: NodeKind.LambdaExpr, params, body, position: pos };
  }

  private parseArgList(): ExprNode[] {
    const args: ExprNode[] = [];
    while (!this.check(TokenType.RPAREN) && !this.isAtEnd()) {
      args.push(this.parseExpression());
      if (!this.match(TokenType.COMMA)) break;
    }
    return args;
  }

  private parseType(): TypeNode {
    const pos = this.current().position;
    let typeNode: TypeNode;
    const name = this.advance().value;
    if (name === "Option" && this.check(TokenType.LT)) {
      this.advance();
      const inner = this.parseType();
      this.expect(TokenType.GT, "Expected '>'");
      typeNode = { kind: NodeKind.OptionType, inner, position: pos };
    } else if (name === "Result" && this.check(TokenType.LT)) {
      this.advance();
      const ok = this.parseType();
      this.expect(TokenType.COMMA, "Expected ',' between Result types");
      const err = this.parseType();
      this.expect(TokenType.GT, "Expected '>'");
      typeNode = { kind: NodeKind.ResultType, ok, err, position: pos };
    } else if (this.check(TokenType.LT)) {
      this.advance();
      const params: TypeNode[] = [this.parseType()];
      while (this.match(TokenType.COMMA)) params.push(this.parseType());
      this.expect(TokenType.GT, "Expected '>'");
      typeNode = { kind: NodeKind.GenericType, base: name, params, position: pos };
    } else {
      typeNode = { kind: NodeKind.TypeRef, name, position: pos };
    }
    // T? desugars to Option<T>
    while (this.match(TokenType.QUESTION)) {
      typeNode = { kind: NodeKind.OptionType, inner: typeNode, position: pos };
    }
    return typeNode;
  }

  private isParenthesizedLambda(): boolean {
    if (this.inMatchPattern) return false;
    let depth = 0;
    let i = this.pos;
    let hasInvalidParamToken = false;
    while (i < this.tokens.length) {
      const t = this.tokens[i];
      if (t.type === TokenType.LPAREN) {
        depth++;
      } else if (t.type === TokenType.RPAREN) {
        depth--;
        if (depth === 0) {
          return !hasInvalidParamToken && i + 1 < this.tokens.length && this.tokens[i + 1].type === TokenType.FAT_ARROW;
        }
      } else if (depth === 1) {
        if (
          t.type === TokenType.INTEGER ||
          t.type === TokenType.FLOAT ||
          t.type === TokenType.STRING ||
          t.type === TokenType.CHAR ||
          t.type === TokenType.BOOL
        ) {
          hasInvalidParamToken = true;
        }
      }
      i++;
    }
    return false;
  }

  private parseParenthesizedLambda(): LambdaExprNode {
    const pos = this.current().position;
    const params = this.parseParams();
    this.expect(TokenType.FAT_ARROW, "Expected '=>'");
    const body = this.check(TokenType.LBRACE) ? this.parseBlock() : this.parseExpression();
    return { kind: NodeKind.LambdaExpr, params, body, position: pos };
  }

  // ── Token helpers ─────────────────────────────────────────
  private advance(): Token { if (!this.isAtEnd()) this.pos++; return this.tokens[this.pos - 1]; }
  private peek(): Token { return this.tokens[this.pos]; }
  private peekNext(): Token { return this.pos + 1 < this.tokens.length ? this.tokens[this.pos + 1] : this.tokens[this.tokens.length - 1]; }
  private current(): Token { return this.tokens[Math.max(0, this.pos - 1)]; }
  private check(type: TokenType): boolean { return this.peek().type === type; }
  private match(...types: TokenType[]): boolean {
    for (const t of types) { if (this.check(t)) { this.advance(); return true; } }
    return false;
  }
  private expect(type: TokenType, message: string): Token {
    if (this.check(type)) return this.advance();
    throw new ParseError(message, this.peek());
  }
  private matchSemicolon(): void { this.match(TokenType.SEMICOLON); }
  private isAtEnd(): boolean { return this.peek().type === TokenType.EOF; }
}
