// ============================================================
// ast.ts — Abstract Syntax Tree da linguagem Kael
// ============================================================

import { Position } from '../lexer/token';

// ── Nó base ──────────────────────────────────────────────────
export interface ASTNode {
  kind:     NodeKind;
  position: Position;
}

// ── Tipos de nós ─────────────────────────────────────────────
export enum NodeKind {
  // Programa
  Program              = 'Program',

  // Declarações
  VarDecl              = 'VarDecl',
  FnDecl               = 'FnDecl',
  StructDecl           = 'StructDecl',
  TraitDecl            = 'TraitDecl',
  ImplDecl             = 'ImplDecl',
  ClassDecl            = 'ClassDecl',
  InterfaceDecl        = 'InterfaceDecl',
  MixinDecl            = 'MixinDecl',
  ImportDecl           = 'ImportDecl',
  ExportDecl           = 'ExportDecl',

  // Membros de classe
  MethodDecl           = 'MethodDecl',
  FieldDecl            = 'FieldDecl',
  ConstructorDecl      = 'ConstructorDecl',
  OperatorDecl         = 'OperatorDecl',

  // Parâmetros
  Param                = 'Param',

  // Statements
  Block                = 'Block',
  ExprStmt             = 'ExprStmt',
  ReturnStmt           = 'ReturnStmt',
  IfStmt               = 'IfStmt',
  WhileStmt            = 'WhileStmt',
  ForStmt              = 'ForStmt',
  BreakStmt            = 'BreakStmt',
  ContinueStmt         = 'ContinueStmt',
  MatchStmt            = 'MatchStmt',
  MatchArm             = 'MatchArm',
  SpawnStmt            = 'SpawnStmt',

  // Expressões
  BinaryExpr           = 'BinaryExpr',
  CoalesceExpr         = 'CoalesceExpr',
  UnaryExpr            = 'UnaryExpr',
  AssignExpr           = 'AssignExpr',
  CallExpr             = 'CallExpr',
  MemberExpr           = 'MemberExpr',
  IndexExpr            = 'IndexExpr',
  LambdaExpr           = 'LambdaExpr',
  AwaitExpr            = 'AwaitExpr',
  NewExpr              = 'NewExpr',
  TypeCastExpr         = 'TypeCastExpr',
  PipeExpr             = 'PipeExpr',
  OwnershipExpr        = 'OwnershipExpr',

  // Literais
  IntLiteral           = 'IntLiteral',
  FloatLiteral         = 'FloatLiteral',
  StringLiteral        = 'StringLiteral',
  CharLiteral          = 'CharLiteral',
  BoolLiteral          = 'BoolLiteral',
  ArrayLiteral         = 'ArrayLiteral',
  MapLiteral           = 'MapLiteral',
  TupleLiteral         = 'TupleLiteral',
  StructLiteral        = 'StructLiteral',

  // Identificador
  Identifier           = 'Identifier',

  // Tipos
  TypeRef              = 'TypeRef',
  GenericType          = 'GenericType',
  FunctionType         = 'FunctionType',
  OptionType           = 'OptionType',
  ResultType           = 'ResultType',
  TupleType            = 'TupleType',

  // Decorador
  Decorator            = 'Decorator',

  // Macro
  MacroCall            = 'MacroCall',
}

// ── Tipos de Acesso ────────────────────────────────────────────
export type Visibility = 'pub' | 'priv' | 'prot';
export type OwnershipKind = 'own' | 'borrow' | 'ref' | 'none';

// ────────────────────────────────────────────────────────────────
// Nós concretos
// ────────────────────────────────────────────────────────────────

// Programa raiz
export interface ProgramNode extends ASTNode {
  kind:  NodeKind.Program;
  body:  ASTNode[];
}

// ── Declarações ──────────────────────────────────────────────

export interface VarDeclNode extends ASTNode {
  kind:       NodeKind.VarDecl;
  name:       string;
  isConst:    boolean;
  isMut:      boolean;
  typeAnnot?: TypeNode;
  value?:     ExprNode;
  ownership:  OwnershipKind;
}

export interface StructFieldParam {
  name:       string;
  typeAnnot:  TypeNode;
  visibility: Visibility;
  isMut?:     boolean;
  default?:   ExprNode;
  position:   Position;
}

export interface StructDeclNode extends ASTNode {
  kind:        NodeKind.StructDecl;
  name:        string;
  generics:    string[];
  params:      StructFieldParam[];
  decorators:  DecoratorNode[];
  visibility:  Visibility;
}

export interface TraitDeclNode extends ASTNode {
  kind:       NodeKind.TraitDecl;
  name:       string;
  generics:   string[];
  methods:    MethodDeclNode[];
}

export interface ImplDeclNode extends ASTNode {
  kind:        NodeKind.ImplDecl;
  traitName?:  string;
  targetType:  string;
  generics:    string[];
  methods:     MethodDeclNode[];
}

export interface FnDeclNode extends ASTNode {
  kind:       NodeKind.FnDecl;
  name:       string;
  params:     ParamNode[];
  returnType?: TypeNode;
  body:       BlockNode | ExprNode;  // fn curta: => expr
  isAsync:    boolean;
  visibility: Visibility;
  isStatic:   boolean;
  decorators: DecoratorNode[];
  generics:   string[];
}

export interface ClassDeclNode extends ASTNode {
  kind:        NodeKind.ClassDecl;
  name:        string;
  superClass?: string;
  interfaces:  string[];
  mixins:      string[];
  members:     ClassMemberNode[];
  decorators:  DecoratorNode[];
  generics:    string[];
}

export interface InterfaceDeclNode extends ASTNode {
  kind:    NodeKind.InterfaceDecl;
  name:    string;
  members: FnDeclNode[];
  extends: string[];
  generics: string[];
}

export interface MixinDeclNode extends ASTNode {
  kind:    NodeKind.MixinDecl;
  name:    string;
  members: ClassMemberNode[];
}

export interface ImportDeclNode extends ASTNode {
  kind:    NodeKind.ImportDecl;
  names:   string[];
  source:  string;
}

export interface ExportDeclNode extends ASTNode {
  kind: NodeKind.ExportDecl;
  decl: ASTNode;
}

// ── Membros de classe ─────────────────────────────────────────

export interface FieldDeclNode extends ASTNode {
  kind:       NodeKind.FieldDecl;
  name:       string;
  typeAnnot?: TypeNode;
  value?:     ExprNode;
  visibility: Visibility;
  isStatic:   boolean;
  ownership:  OwnershipKind;
}

export interface MethodDeclNode extends ASTNode {
  kind:       NodeKind.MethodDecl;
  name:       string;
  params:     ParamNode[];
  returnType?: TypeNode;
  body:       BlockNode | ExprNode;
  isAsync:    boolean;
  visibility: Visibility;
  isStatic:   boolean;
  isAbstract: boolean;
  decorators: DecoratorNode[];
  generics:   string[];
}

export interface ConstructorDeclNode extends ASTNode {
  kind:    NodeKind.ConstructorDecl;
  params:  ParamNode[];
  body:    BlockNode;
}

export interface OperatorDeclNode extends ASTNode {
  kind:       NodeKind.OperatorDecl;
  operator:   string;
  params:     ParamNode[];
  returnType?: TypeNode;
  body:       BlockNode;
}

export type ClassMemberNode =
  | FieldDeclNode
  | MethodDeclNode
  | ConstructorDeclNode
  | OperatorDeclNode;

// ── Parâmetro ─────────────────────────────────────────────────

export interface ParamNode extends ASTNode {
  kind:      NodeKind.Param;
  name:      string;
  typeAnnot?: TypeNode;
  ownership: OwnershipKind;
  default?:  ExprNode;
}

// ── Statements ────────────────────────────────────────────────

export interface BlockNode extends ASTNode {
  kind: NodeKind.Block;
  body: ASTNode[];
}

export interface ExprStmtNode extends ASTNode {
  kind: NodeKind.ExprStmt;
  expr: ExprNode;
}

export interface ReturnStmtNode extends ASTNode {
  kind:  NodeKind.ReturnStmt;
  value?: ExprNode;
}

export interface IfStmtNode extends ASTNode {
  kind:       NodeKind.IfStmt;
  condition:  ExprNode;
  then:       BlockNode;
  elif:       Array<{ condition: ExprNode; block: BlockNode }>;
  else?:      BlockNode;
}

export interface WhileStmtNode extends ASTNode {
  kind:      NodeKind.WhileStmt;
  condition: ExprNode;
  body:      BlockNode;
}

export interface ForStmtNode extends ASTNode {
  kind:     NodeKind.ForStmt;
  variable: string;
  iterable: ExprNode;
  body:     BlockNode;
}

export interface BreakStmtNode    extends ASTNode { kind: NodeKind.BreakStmt; }
export interface ContinueStmtNode extends ASTNode { kind: NodeKind.ContinueStmt; }

export interface MatchStmtNode extends ASTNode {
  kind:  NodeKind.MatchStmt;
  value: ExprNode;
  arms:  MatchArmNode[];
}

export interface MatchArmNode extends ASTNode {
  kind:    NodeKind.MatchArm;
  pattern: MatchPattern;
  guard?:  ExprNode;
  body:    ExprNode | BlockNode;
}

export type MatchPattern =
  | { kind: 'literal';    value: ExprNode }
  | { kind: 'range';      from: ExprNode; to: ExprNode }
  | { kind: 'identifier'; name: string }
  | { kind: 'wildcard' }
  | { kind: 'some';       name: string }
  | { kind: 'none' }
  | { kind: 'ok';         name: string }
  | { kind: 'err';        name: string }
  | { kind: 'tuple';      elements: MatchPattern[] };

export interface SpawnStmtNode extends ASTNode {
  kind: NodeKind.SpawnStmt;
  body: BlockNode;
}

// ── Expressões ────────────────────────────────────────────────

export interface BinaryExprNode extends ASTNode {
  kind:     NodeKind.BinaryExpr;
  operator: string;
  left:     ExprNode;
  right:    ExprNode;
}

export interface UnaryExprNode extends ASTNode {
  kind:     NodeKind.UnaryExpr;
  operator: string;
  operand:  ExprNode;
  prefix:   boolean;
}

export interface AssignExprNode extends ASTNode {
  kind:     NodeKind.AssignExpr;
  operator: string;
  target:   ExprNode;
  value:    ExprNode;
}

export interface CallExprNode extends ASTNode {
  kind:      NodeKind.CallExpr;
  callee:    ExprNode;
  args:      ExprNode[];
  typeArgs?: TypeNode[];
  isAwait:   boolean;
}

export interface MemberExprNode extends ASTNode {
  kind:       NodeKind.MemberExpr;
  object:     ExprNode;
  property:   string;
  isOptional: boolean;  // obj?.prop
}

export interface IndexExprNode extends ASTNode {
  kind:  NodeKind.IndexExpr;
  object: ExprNode;
  index:  ExprNode;
}

export interface LambdaExprNode extends ASTNode {
  kind:       NodeKind.LambdaExpr;
  params:     ParamNode[];
  body:       ExprNode | BlockNode;
  returnType?: TypeNode;
}

export interface AwaitExprNode extends ASTNode {
  kind:  NodeKind.AwaitExpr;
  value: ExprNode;
}

export interface NewExprNode extends ASTNode {
  kind:       NodeKind.NewExpr;
  className:  string;
  typeArgs?:  TypeNode[];
  args:       ExprNode[];
  structInit: Array<{ key: string; value: ExprNode }>;
}

export interface TypeCastExprNode extends ASTNode {
  kind:       NodeKind.TypeCastExpr;
  expression: ExprNode;
  targetType: TypeNode;
}

export interface PipeExprNode extends ASTNode {
  kind:  NodeKind.PipeExpr;
  left:  ExprNode;
  right: ExprNode;
}

export interface OwnershipExprNode extends ASTNode {
  kind:      NodeKind.OwnershipExpr;
  ownership: OwnershipKind;
  operand:   ExprNode;
}

export interface CoalesceExprNode extends ASTNode {
  kind:  NodeKind.CoalesceExpr;
  left:  ExprNode;
  right: ExprNode;
}

// ── Literais ──────────────────────────────────────────────────

export interface IntLiteralNode    extends ASTNode { kind: NodeKind.IntLiteral;    value: number; }
export interface FloatLiteralNode  extends ASTNode { kind: NodeKind.FloatLiteral;  value: number; }
export interface StringLiteralNode extends ASTNode { kind: NodeKind.StringLiteral; value: string; }
export interface CharLiteralNode   extends ASTNode { kind: NodeKind.CharLiteral;   value: string; }
export interface BoolLiteralNode   extends ASTNode { kind: NodeKind.BoolLiteral;   value: boolean; }

export interface ArrayLiteralNode extends ASTNode {
  kind:     NodeKind.ArrayLiteral;
  elements: ExprNode[];
}

export interface MapLiteralNode extends ASTNode {
  kind:    NodeKind.MapLiteral;
  entries: Array<{ key: ExprNode; value: ExprNode }>;
}

export interface TupleLiteralNode extends ASTNode {
  kind:     NodeKind.TupleLiteral;
  elements: ExprNode[];
}

export interface StructLiteralNode extends ASTNode {
  kind:   NodeKind.StructLiteral;
  name:   string;
  fields: Array<{ key: string; value: ExprNode }>;
}

export interface IdentifierNode extends ASTNode {
  kind: NodeKind.Identifier;
  name: string;
}

// ── Tipos ─────────────────────────────────────────────────────

export interface TypeRefNode extends ASTNode {
  kind: NodeKind.TypeRef;
  name: string;
}

export interface GenericTypeNode extends ASTNode {
  kind:     NodeKind.GenericType;
  base:     string;
  params:   TypeNode[];
}

export interface FunctionTypeNode extends ASTNode {
  kind:       NodeKind.FunctionType;
  params:     TypeNode[];
  returnType: TypeNode;
}

export interface OptionTypeNode extends ASTNode {
  kind:  NodeKind.OptionType;
  inner: TypeNode;
}

export interface ResultTypeNode extends ASTNode {
  kind:  NodeKind.ResultType;
  ok:    TypeNode;
  err:   TypeNode;
}

export interface TupleTypeNode extends ASTNode {
  kind:     NodeKind.TupleType;
  elements: TypeNode[];
}

// ── Decorador e Macro ────────────────────────────────────────

export interface DecoratorNode extends ASTNode {
  kind: NodeKind.Decorator;
  name: string;
  args: ExprNode[];
}

export interface MacroCallNode extends ASTNode {
  kind: NodeKind.MacroCall;
  name: string;
  args: ExprNode[];
}

// ── Union types ───────────────────────────────────────────────

export type TypeNode =
  | TypeRefNode
  | GenericTypeNode
  | FunctionTypeNode
  | OptionTypeNode
  | ResultTypeNode
  | TupleTypeNode;

export type ExprNode =
  | BinaryExprNode
  | CoalesceExprNode
  | UnaryExprNode
  | AssignExprNode
  | CallExprNode
  | MemberExprNode
  | IndexExprNode
  | LambdaExprNode
  | AwaitExprNode
  | NewExprNode
  | TypeCastExprNode
  | PipeExprNode
  | OwnershipExprNode
  | IntLiteralNode
  | FloatLiteralNode
  | StringLiteralNode
  | CharLiteralNode
  | BoolLiteralNode
  | ArrayLiteralNode
  | MapLiteralNode
  | TupleLiteralNode
  | StructLiteralNode
  | IdentifierNode
  | MacroCallNode
  | MatchStmtNode;

export type StmtNode =
  | VarDeclNode
  | FnDeclNode
  | StructDeclNode
  | TraitDeclNode
  | ImplDeclNode
  | ClassDeclNode
  | InterfaceDeclNode
  | MixinDeclNode
  | ImportDeclNode
  | ExportDeclNode
  | BlockNode
  | ExprStmtNode
  | ReturnStmtNode
  | IfStmtNode
  | WhileStmtNode
  | ForStmtNode
  | BreakStmtNode
  | ContinueStmtNode
  | MatchStmtNode
  | SpawnStmtNode;
