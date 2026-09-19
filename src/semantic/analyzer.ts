// ============================================================
// analyzer.ts -- Analisador Semântico da linguagem Kael / Vox
// Fase 3: Tipagem Gradual, Generics & Type Checker Avançado
// ============================================================

import {
  ASTNode, NodeKind, ProgramNode, VarDeclNode, FnDeclNode,
  ClassDeclNode, BlockNode, ExprNode, ExprStmtNode,
  ReturnStmtNode, IfStmtNode, WhileStmtNode, ForStmtNode,
  MatchStmtNode, BinaryExprNode, UnaryExprNode, CallExprNode,
  MemberExprNode, IdentifierNode, IntLiteralNode, FloatLiteralNode,
  StringLiteralNode, BoolLiteralNode, AssignExprNode, TypeNode,
  TypeRefNode, GenericTypeNode, MethodDeclNode, FieldDeclNode,
  InterfaceDeclNode, MixinDeclNode, OperatorDeclNode, ConstructorDeclNode,
  ArrayLiteralNode, IndexExprNode, NewExprNode, Visibility,
  StructDeclNode, TraitDeclNode, ImplDeclNode, CoalesceExprNode,
} from '../parser/ast';
import { LifetimeChecker } from './lifetime';

// ── Tipos da linguagem ───────────────────────────────────────

export type KaelType =
  | { kind: 'primitive';  name: 'int' | 'float' | 'bool' | 'str' | 'char' | 'void' }
  | { kind: 'struct';     name: string; fields: Map<string, KaelType>; methods: Map<string, FnType>; generics?: string[] }
  | { kind: 'class';      name: string; fields: Map<string, KaelType>; methods: Map<string, FnType>; generics?: string[] }
  | { kind: 'function';   params: KaelType[]; returnType: KaelType; isAsync?: boolean; generics?: string[] }
  | { kind: 'generic';    base: string; params: KaelType[] }
  | { kind: 'option';     inner: KaelType }
  | { kind: 'result';     ok: KaelType; err: KaelType }
  | { kind: 'channel';    inner: KaelType }
  | { kind: 'type_param'; name: string }
  | { kind: 'unknown' };

export interface FnType {
  params: KaelType[];
  returnType: KaelType;
  isAsync: boolean;
  generics?: string[];
}

// ── Símbolo no escopo ────────────────────────────────────────

export interface Symbol {
  name:    string;
  type:    KaelType;
  isConst: boolean;
  isMut?:  boolean;
  defined: boolean;
}

// ── Escopo (tabela de símbolos) ──────────────────────────────

export class Scope {
  private symbols: Map<string, Symbol> = new Map();
  constructor(public parent?: Scope) {}

  define(sym: Symbol): void {
    this.symbols.set(sym.name, sym);
  }

  lookup(name: string): Symbol | undefined {
    return this.symbols.get(name) ?? this.parent?.lookup(name);
  }

  has(name: string): boolean {
    return this.symbols.has(name);
  }
}

// ── Erro semântico ────────────────────────────────────────────

export class SemanticError extends Error {
  constructor(message: string, public line?: number, public col?: number) {
    super(`[SemanticError]${line ? ` Line ${line}:${col}` : ''} -- ${message}`);
    this.name = 'SemanticError';
  }
}

// ── Analisador ────────────────────────────────────────────────

export class SemanticAnalyzer {
  private errors: SemanticError[] = [];
  private currentScope: Scope;
  private currentReturnType: KaelType | null = null;
  private currentClass: ClassDeclNode | null = null;
  private currentTypeParams: Set<string> = new Set();
  private classRegistry: Map<string, ClassDeclNode> = new Map();
  private interfaceRegistry: Map<string, InterfaceDeclNode> = new Map();
  private mixinRegistry: Map<string, MixinDeclNode> = new Map();
  private structRegistry: Map<string, StructDeclNode> = new Map();
  private traitRegistry: Map<string, TraitDeclNode> = new Map();
  private implRegistry: ImplDeclNode[] = [];

  constructor() {
    this.currentScope = new Scope();
    this.setupBuiltins();
  }

  // ── Builtins da linguagem ─────────────────────────────────

  private setupBuiltins(): void {
    const fn = (ret: string): KaelType => ({ kind: 'function', params: [{ kind: 'unknown' }], returnType: { kind: 'primitive', name: ret as any } });
    const builtins: Array<[string, KaelType]> = [
      // I/O
      ['print',   fn('void')], ['println', fn('void')], ['eprint', fn('void')],
      // Conversions (type keywords used as functions)
      ['int',   fn('int')], ['float', fn('float')], ['str', fn('str')],
      ['bool',  fn('bool')], ['char', fn('char')],
      // Utilities
      ['len',   fn('int')], ['panic', fn('void')], ['assert', fn('void')],
      // Math
      ['sqrt', fn('float')], ['abs', fn('float')], ['floor', fn('float')],
      ['ceil', fn('float')], ['min', fn('float')], ['max', fn('float')],
      ['pow', fn('float')], ['rand', fn('float')],
      // String
      ['upper', fn('str')], ['lower', fn('str')], ['trim', fn('str')],
      ['split', fn('str')], ['join', fn('str')], ['contains', fn('bool')],
      ['starts_with', fn('bool')], ['ends_with', fn('bool')],
      ['replace', fn('str')], ['char_at', fn('char')], ['substr', fn('str')],
      // Collections
      ['push', {
        kind: 'function',
        generics: ['T'],
        params: [
          { kind: 'generic', base: 'Array', params: [{ kind: 'type_param', name: 'T' }] },
          { kind: 'type_param', name: 'T' },
        ],
        returnType: { kind: 'primitive', name: 'void' },
        isAsync: false,
      }],
      ['pop', {
        kind: 'function',
        generics: ['T'],
        params: [{ kind: 'generic', base: 'Array', params: [{ kind: 'type_param', name: 'T' }] }],
        returnType: { kind: 'type_param', name: 'T' },
        isAsync: false,
      }],
      ['map_new', fn('void')],
      ['map_set', fn('void')], ['map_get', { kind: 'function', params: [{ kind: 'unknown' }, { kind: 'unknown' }], returnType: { kind: 'unknown' } }],
      // Option/Result constructors with generic type inference
      ['some', {
        kind: 'function',
        generics: ['T'],
        params: [{ kind: 'type_param', name: 'T' }],
        returnType: { kind: 'option', inner: { kind: 'type_param', name: 'T' } },
        isAsync: false,
      }],
      ['none', {
        kind: 'function',
        generics: ['T'],
        params: [],
        returnType: { kind: 'option', inner: { kind: 'unknown' } },
        isAsync: false,
      }],
      ['ok', {
        kind: 'function',
        generics: ['T'],
        params: [{ kind: 'type_param', name: 'T' }],
        returnType: { kind: 'result', ok: { kind: 'type_param', name: 'T' }, err: { kind: 'unknown' } },
        isAsync: false,
      }],
      ['err', {
        kind: 'function',
        generics: ['E'],
        params: [{ kind: 'type_param', name: 'E' }],
        returnType: { kind: 'result', ok: { kind: 'unknown' }, err: { kind: 'type_param', name: 'E' } },
        isAsync: false,
      }],
      // Debug
      ['is_null', fn('bool')], ['type_of', fn('str')],
      // Universal Multi-Database (SQLite, MySQL, SQL Server, Firebird)
      ['db_connect', { kind: 'function', params: [{ kind: 'primitive', name: 'str' }, { kind: 'primitive', name: 'str' }], returnType: { kind: 'primitive', name: 'int' }, isAsync: false }],
      ['db_exec', { kind: 'function', params: [{ kind: 'primitive', name: 'int' }, { kind: 'primitive', name: 'str' }], returnType: { kind: 'primitive', name: 'bool' }, isAsync: false }],
      ['db_query', { kind: 'function', params: [{ kind: 'primitive', name: 'int' }, { kind: 'primitive', name: 'str' }], returnType: { kind: 'generic', base: 'Array', params: [{ kind: 'unknown' }] }, isAsync: false }],
      ['db_close', { kind: 'function', params: [{ kind: 'primitive', name: 'int' }], returnType: { kind: 'primitive', name: 'bool' }, isAsync: false }],
      // SQLite
      ['sqlite_open', { kind: 'function', params: [{ kind: 'primitive', name: 'str' }], returnType: { kind: 'primitive', name: 'int' }, isAsync: false }],
      ['sqlite_exec', { kind: 'function', params: [{ kind: 'primitive', name: 'int' }, { kind: 'primitive', name: 'str' }], returnType: { kind: 'primitive', name: 'bool' }, isAsync: false }],
      ['sqlite_query', { kind: 'function', params: [{ kind: 'primitive', name: 'int' }, { kind: 'primitive', name: 'str' }], returnType: { kind: 'generic', base: 'Array', params: [{ kind: 'unknown' }] }, isAsync: false }],
      ['sqlite_close', { kind: 'function', params: [{ kind: 'primitive', name: 'int' }], returnType: { kind: 'primitive', name: 'bool' }, isAsync: false }],
      // MySQL
      ['mysql_connect', { kind: 'function', params: [{ kind: 'primitive', name: 'str' }], returnType: { kind: 'primitive', name: 'int' }, isAsync: false }],
      ['mysql_exec', { kind: 'function', params: [{ kind: 'primitive', name: 'int' }, { kind: 'primitive', name: 'str' }], returnType: { kind: 'primitive', name: 'bool' }, isAsync: false }],
      ['mysql_query', { kind: 'function', params: [{ kind: 'primitive', name: 'int' }, { kind: 'primitive', name: 'str' }], returnType: { kind: 'generic', base: 'Array', params: [{ kind: 'unknown' }] }, isAsync: false }],
      ['mysql_close', { kind: 'function', params: [{ kind: 'primitive', name: 'int' }], returnType: { kind: 'primitive', name: 'bool' }, isAsync: false }],
      // SQL Server (MSSQL)
      ['mssql_connect', { kind: 'function', params: [{ kind: 'primitive', name: 'str' }], returnType: { kind: 'primitive', name: 'int' }, isAsync: false }],
      ['mssql_exec', { kind: 'function', params: [{ kind: 'primitive', name: 'int' }, { kind: 'primitive', name: 'str' }], returnType: { kind: 'primitive', name: 'bool' }, isAsync: false }],
      ['mssql_query', { kind: 'function', params: [{ kind: 'primitive', name: 'int' }, { kind: 'primitive', name: 'str' }], returnType: { kind: 'generic', base: 'Array', params: [{ kind: 'unknown' }] }, isAsync: false }],
      ['mssql_close', { kind: 'function', params: [{ kind: 'primitive', name: 'int' }], returnType: { kind: 'primitive', name: 'bool' }, isAsync: false }],
      // Firebird
      ['firebird_connect', { kind: 'function', params: [{ kind: 'primitive', name: 'str' }], returnType: { kind: 'primitive', name: 'int' }, isAsync: false }],
      ['firebird_exec', { kind: 'function', params: [{ kind: 'primitive', name: 'int' }, { kind: 'primitive', name: 'str' }], returnType: { kind: 'primitive', name: 'bool' }, isAsync: false }],
      ['firebird_query', { kind: 'function', params: [{ kind: 'primitive', name: 'int' }, { kind: 'primitive', name: 'str' }], returnType: { kind: 'generic', base: 'Array', params: [{ kind: 'unknown' }] }, isAsync: false }],
      ['firebird_close', { kind: 'function', params: [{ kind: 'primitive', name: 'int' }], returnType: { kind: 'primitive', name: 'bool' }, isAsync: false }],
      // Concurrency & Channels
      ['sleep', fn('void')],
      ['chan_new', {
        kind: 'function',
        generics: ['T'],
        params: [{ kind: 'primitive', name: 'int' }],
        returnType: { kind: 'channel', inner: { kind: 'unknown' } },
        isAsync: false,
      }],
      ['chan_send', {
        kind: 'function',
        params: [
          { kind: 'channel', inner: { kind: 'unknown' } },
          { kind: 'unknown' }
        ],
        returnType: { kind: 'primitive', name: 'void' },
        isAsync: false,
      }],
      ['chan_recv', {
        kind: 'function',
        params: [
          { kind: 'channel', inner: { kind: 'unknown' } }
        ],
        returnType: { kind: 'unknown' },
        isAsync: false,
      }],
      ['chan_close', {
        kind: 'function',
        params: [{ kind: 'unknown' }],
        returnType: { kind: 'primitive', name: 'void' },
        isAsync: false,
      }],
      // File I/O
      ['file_read', fn('str')],
      ['file_write', fn('bool')],
      ['file_append', fn('bool')],
      ['file_exists', fn('bool')],
      ['file_delete', fn('bool')],
      ['dir_list', { kind: 'function', params: [{ kind: 'primitive', name: 'str' }], returnType: { kind: 'generic', base: 'Array', params: [{ kind: 'primitive', name: 'str' }] }, isAsync: false }],
      ['dir_create', fn('bool')],
      // HTTP
      ['http_get', fn('str')],
      ['http_post', fn('str')],
      // DateTime
      ['time_now', fn('int')],
      ['time_millis', fn('int')],
      ['time_format', fn('str')],
      // JSON
      ['json_parse', { kind: 'function', params: [{ kind: 'primitive', name: 'str' }], returnType: { kind: 'unknown' }, isAsync: false }],
      ['json_stringify', fn('str')],
      // Regex
      ['regex_test', fn('bool')],
      ['regex_match', { kind: 'function', params: [{ kind: 'primitive', name: 'str' }, { kind: 'primitive', name: 'str' }], returnType: { kind: 'generic', base: 'Array', params: [{ kind: 'primitive', name: 'str' }] }, isAsync: false }],
      ['regex_replace', fn('str')],
      // Set
      ['set_new', { kind: 'function', params: [], returnType: { kind: 'unknown' }, isAsync: false }],
      ['set_add', fn('void')],
      ['set_has', fn('bool')],
      ['set_delete', fn('bool')],
      ['set_size', fn('int')],
      ['set_to_array', { kind: 'function', params: [{ kind: 'unknown' }], returnType: { kind: 'generic', base: 'Array', params: [{ kind: 'unknown' }] }, isAsync: false }],
      // Threads & Mutex
      ['thread_spawn', { kind: 'function', params: [{ kind: 'unknown' }], returnType: { kind: 'unknown' }, isAsync: false }],
      ['thread_join', { kind: 'function', params: [{ kind: 'unknown' }], returnType: { kind: 'unknown' }, isAsync: false }],
      ['thread_id', fn('int')],
      ['mutex_new', { kind: 'function', params: [], returnType: { kind: 'unknown' }, isAsync: false }],
      ['mutex_lock', fn('void')],
      ['mutex_unlock', fn('void')],
    ];

    for (const [name, type] of builtins) {
      this.currentScope.define({ name, type, isConst: true, isMut: false, defined: true });
    }

    // Option, Result, and Channel namespaces
    this.currentScope.define({ name: 'Option', type: { kind: 'unknown' }, isConst: true, isMut: false, defined: true });
    this.currentScope.define({ name: 'Result', type: { kind: 'unknown' }, isConst: true, isMut: false, defined: true });
    this.currentScope.define({ name: 'Channel', type: { kind: 'unknown' }, isConst: true, isMut: false, defined: true });
  }

  // ── Subtyping & Hierarchy Helpers ─────────────────────────

  private isSubclassOf(subClassName?: string, superClassName?: string): boolean {
    if (!subClassName || !superClassName) return false;
    const cleanSub = subClassName.split('<')[0].trim();
    const cleanSuper = superClassName.split('<')[0].trim();
    if (cleanSub === cleanSuper) return true;
    const sub = this.classRegistry.get(cleanSub);
    if (sub) {
      if (sub.superClass && this.isSubclassOf(sub.superClass, cleanSuper)) return true;
      if (sub.interfaces.some(i => this.isSubclassOf(i, cleanSuper))) return true;
    }
    return false;
  }

  private isTypeAssignable(source: KaelType, target: KaelType): boolean {
    if (source.kind === 'unknown' || target.kind === 'unknown') return true;
    if (target.kind === 'primitive' && target.name === 'void') return true;

    if (source.kind === 'type_param' && target.kind === 'type_param') {
      return source.name === target.name;
    }
    if (source.kind === 'type_param' || target.kind === 'type_param') {
      return source.kind === target.kind && (source as any).name === (target as any).name;
    }

    if (source.kind === 'primitive' && target.kind === 'primitive') {
      return source.name === target.name;
    }

    if (source.kind === 'struct' && target.kind === 'struct') {
      return source.name === target.name;
    }

    if (source.kind === 'class' && target.kind === 'class') {
      if (source.name === target.name) return true;
      return this.isSubclassOf(source.name, target.name);
    }

    if (source.kind === 'generic' && target.kind === 'generic') {
      if (source.base !== target.base && !this.isSubclassOf(source.base, target.base)) {
        return false;
      }
      if (source.params.length !== target.params.length) return false;
      return source.params.every((p, i) => this.isTypeAssignable(p, target.params[i]));
    }

    // Gradual compatibility between generic and unparameterized class
    if (source.kind === 'generic' && target.kind === 'class') {
      return source.base === target.name || this.isSubclassOf(source.base, target.name);
    }
    if (source.kind === 'class' && target.kind === 'generic') {
      return source.name === target.base || this.isSubclassOf(source.name, target.base);
    }

    if (source.kind === 'option' && target.kind === 'option') {
      if (source.inner.kind === 'unknown') return true;
      return this.isTypeAssignable(source.inner, target.inner);
    }

    if (source.kind === 'result' && target.kind === 'result') {
      return this.isTypeAssignable(source.ok, target.ok) && this.isTypeAssignable(source.err, target.err);
    }

    if (source.kind === 'channel' && target.kind === 'channel') {
      return this.isTypeAssignable(source.inner, target.inner);
    }

    if (source.kind === 'function' && target.kind === 'function') {
      if (source.params.length === 0 && source.returnType.kind === 'unknown') return true;
      if (target.params.length === 0 && target.returnType.kind === 'unknown') return true;
      if (source.params.length !== target.params.length) return false;
      return source.params.every((p, i) => this.isTypeAssignable(target.params[i], p)) &&
             this.isTypeAssignable(source.returnType, target.returnType);
    }

    return false;
  }

  private typeToString(t: KaelType): string {
    switch (t.kind) {
      case 'primitive':  return t.name;
      case 'struct':     return t.name;
      case 'class':      return t.name;
      case 'generic':    return `${t.base}<${t.params.map(p => this.typeToString(p)).join(', ')}>`;
      case 'option':     return `Option<${this.typeToString(t.inner)}>`;
      case 'result':     return `Result<${this.typeToString(t.ok)}, ${this.typeToString(t.err)}>`;
      case 'channel':    return `Channel<${this.typeToString(t.inner)}>`;
      case 'type_param': return t.name;
      case 'function':   return `fn(${t.params.map(p => this.typeToString(p)).join(', ')}) -> ${this.typeToString(t.returnType)}`;
      default:           return 'unknown';
    }
  }

  private substituteType(type: KaelType, typeMap: Map<string, KaelType>): KaelType {
    if (typeMap.size === 0) return type;
    switch (type.kind) {
      case 'type_param':
        return typeMap.get(type.name) ?? type;
      case 'generic':
        return {
          kind: 'generic',
          base: type.base,
          params: type.params.map(p => this.substituteType(p, typeMap)),
        };
      case 'option':
        return {
          kind: 'option',
          inner: this.substituteType(type.inner, typeMap),
        };
      case 'result':
        return {
          kind: 'result',
          ok: this.substituteType(type.ok, typeMap),
          err: this.substituteType(type.err, typeMap),
        };
      case 'channel':
        return {
          kind: 'channel',
          inner: this.substituteType(type.inner, typeMap),
        };
      case 'function':
        return {
          kind: 'function',
          params: type.params.map(p => this.substituteType(p, typeMap)),
          returnType: this.substituteType(type.returnType, typeMap),
          isAsync: type.isAsync,
          generics: type.generics,
        };
      default:
        return type;
    }
  }

  private unifyTypes(formal: KaelType, actual: KaelType, typeMap: Map<string, KaelType>): void {
    if (actual.kind === 'unknown') return;

    if (formal.kind === 'type_param') {
      if (!typeMap.has(formal.name)) {
        typeMap.set(formal.name, actual);
      }
      return;
    }

    if (formal.kind === 'option' && actual.kind === 'option') {
      this.unifyTypes(formal.inner, actual.inner, typeMap);
      return;
    }

    if (formal.kind === 'result' && actual.kind === 'result') {
      this.unifyTypes(formal.ok, actual.ok, typeMap);
      this.unifyTypes(formal.err, actual.err, typeMap);
      return;
    }

    if (formal.kind === 'channel' && actual.kind === 'channel') {
      this.unifyTypes(formal.inner, actual.inner, typeMap);
      return;
    }

    if (formal.kind === 'generic' && actual.kind === 'generic' && formal.base === actual.base) {
      for (let i = 0; i < Math.min(formal.params.length, actual.params.length); i++) {
        this.unifyTypes(formal.params[i], actual.params[i], typeMap);
      }
      return;
    }

    if (formal.kind === 'function' && actual.kind === 'function') {
      for (let i = 0; i < Math.min(formal.params.length, actual.params.length); i++) {
        this.unifyTypes(formal.params[i], actual.params[i], typeMap);
      }
      this.unifyTypes(formal.returnType, actual.returnType, typeMap);
      return;
    }
  }

  private resolveMember(classNode: ClassDeclNode, name: string): { member: FieldDeclNode | MethodDeclNode; declaringClass: ClassDeclNode } | null {
    for (const m of classNode.members) {
      if (m.kind === NodeKind.FieldDecl && (m as FieldDeclNode).name === name) {
        return { member: m as FieldDeclNode, declaringClass: classNode };
      }
      if (m.kind === NodeKind.MethodDecl && (m as MethodDeclNode).name === name) {
        return { member: m as MethodDeclNode, declaringClass: classNode };
      }
    }
    if (classNode.superClass) {
      const cleanSuper = classNode.superClass.split('<')[0].trim();
      const parent = this.classRegistry.get(cleanSuper);
      if (parent) return this.resolveMember(parent, name);
    }
    return null;
  }

  // ── Ponto de entrada ──────────────────────────────────────

  analyze(program: ProgramNode): SemanticError[] {
    // Primeira passagem: registrar interfaces, mixins, classes e funções
    for (const node of program.body) {
      this.hoistDeclaration(node);
    }
    // Segunda passagem: analisar tipos, escopos e membros
    for (const node of program.body) {
      this.analyzeNode(node);
    }
    // Terceira passagem: checagem de ownership, lifetimes e empréstimos
    const lifetimeErrors = new LifetimeChecker().check(program);
    this.errors.push(...lifetimeErrors);

    return this.errors;
  }

  // ── Hoisting de declarações ───────────────────────────────

  private hoistDeclaration(node: ASTNode): void {
    if (node.kind === NodeKind.InterfaceDecl) {
      const iface = node as InterfaceDeclNode;
      this.interfaceRegistry.set(iface.name, iface);
      this.currentScope.define({
        name: iface.name,
        type: { kind: 'class', name: iface.name, fields: new Map(), methods: new Map(), generics: iface.generics },
        isConst: true,
        defined: true,
      });
    }
    if (node.kind === NodeKind.MixinDecl) {
      const mixin = node as MixinDeclNode;
      this.mixinRegistry.set(mixin.name, mixin);
      this.currentScope.define({
        name: mixin.name,
        type: { kind: 'class', name: mixin.name, fields: new Map(), methods: new Map() },
        isConst: true,
        defined: true,
      });
    }
    if (node.kind === NodeKind.ClassDecl) {
      const c = node as ClassDeclNode;
      this.classRegistry.set(c.name, c);
      const prevParams = new Set(this.currentTypeParams);
      for (const g of c.generics) this.currentTypeParams.add(g);

      const fields = new Map<string, KaelType>();
      const methods = new Map<string, FnType>();
      for (const m of c.members) {
        if (m.kind === NodeKind.FieldDecl) {
          fields.set((m as FieldDeclNode).name, this.resolveType((m as FieldDeclNode).typeAnnot));
        } else if (m.kind === NodeKind.MethodDecl) {
          const method = m as MethodDeclNode;
          for (const mg of method.generics) this.currentTypeParams.add(mg);
          methods.set(method.name, {
            params: method.params.map(p => this.resolveType(p.typeAnnot)),
            returnType: this.resolveType(method.returnType),
            isAsync: method.isAsync,
            generics: method.generics,
          });
          for (const mg of method.generics) this.currentTypeParams.delete(mg);
        }
      }

      this.currentTypeParams = prevParams;

      const classType: KaelType = {
        kind: 'class',
        name: c.name,
        fields,
        methods,
        generics: c.generics,
      };
      this.currentScope.define({ name: c.name, type: classType, isConst: true, isMut: false, defined: true });
    }
    if (node.kind === NodeKind.StructDecl) {
      const s = node as StructDeclNode;
      this.structRegistry.set(s.name, s);

      const fields = new Map<string, KaelType>();
      for (const p of s.params) {
        fields.set(p.name, this.resolveType(p.typeAnnot, s.generics));
      }

      const structType: KaelType = {
        kind: 'struct',
        name: s.name,
        generics: s.generics,
        fields,
        methods: new Map(),
      };

      // Define struct constructor function in scope
      const ctorType: KaelType = {
        kind: 'function',
        params: s.params.map(p => this.resolveType(p.typeAnnot, s.generics)),
        returnType: structType,
        generics: s.generics,
      };
      this.currentScope.define({ name: s.name, type: ctorType, isConst: true, isMut: false, defined: true });
    }
    if (node.kind === NodeKind.TraitDecl) {
      const t = node as TraitDeclNode;
      this.traitRegistry.set(t.name, t);
    }
    if (node.kind === NodeKind.ImplDecl) {
      const impl = node as ImplDeclNode;
      this.implRegistry.push(impl);

      const s = this.structRegistry.get(impl.targetType);
      const structSym = this.currentScope.lookup(impl.targetType);
      const structType = (structSym && structSym.type.kind === 'function') ? (structSym.type.returnType as any) : undefined;
      const methodsMap = (structType && structType.kind === 'struct') ? structType.methods : new Map<string, FnType>();

      for (const m of impl.methods) {
        const allGenerics = [...(s?.generics ?? []), ...m.generics];
        methodsMap.set(m.name, {
          params: m.params.map(p => this.resolveType(p.typeAnnot, allGenerics)),
          returnType: this.resolveType(m.returnType, allGenerics),
          isAsync: m.isAsync,
          generics: m.generics,
        });
      }
    }
    if (node.kind === NodeKind.FnDecl) {
      const f = node as FnDeclNode;
      const prevParams = new Set(this.currentTypeParams);
      for (const g of f.generics) this.currentTypeParams.add(g);

      const fnType: KaelType = {
        kind: 'function',
        params: f.params.map(p => this.resolveType(p.typeAnnot)),
        returnType: this.resolveType(f.returnType),
        generics: f.generics,
        isAsync: f.isAsync,
      };

      this.currentTypeParams = prevParams;
      this.currentScope.define({ name: f.name, type: fnType, isConst: true, isMut: false, defined: true });
    }
    if (node.kind === NodeKind.ExportDecl) {
      this.hoistDeclaration((node as any).decl);
    }
  }

  // ── Análise de nós ────────────────────────────────────────

  private analyzeNode(node: ASTNode): KaelType {
    switch (node.kind) {
      case NodeKind.VarDecl:       return this.analyzeVarDecl(node as VarDeclNode);
      case NodeKind.FnDecl:        return this.analyzeFnDecl(node as FnDeclNode);
      case NodeKind.StructDecl:    this.analyzeStructDecl(node as StructDeclNode); return { kind: 'primitive', name: 'void' };
      case NodeKind.TraitDecl:     this.analyzeTraitDecl(node as TraitDeclNode); return { kind: 'primitive', name: 'void' };
      case NodeKind.ImplDecl:      this.analyzeImplDecl(node as ImplDeclNode); return { kind: 'primitive', name: 'void' };
      case NodeKind.ClassDecl:     return this.analyzeClassDecl(node as ClassDeclNode);
      case NodeKind.InterfaceDecl: return { kind: 'primitive', name: 'void' };
      case NodeKind.MixinDecl:     return { kind: 'primitive', name: 'void' };
      case NodeKind.Block:         return this.analyzeBlock(node as BlockNode);
      case NodeKind.ExprStmt:      this.analyzeExpr((node as ExprStmtNode).expr); return { kind: 'primitive', name: 'void' };
      case NodeKind.ReturnStmt:    return this.analyzeReturn(node as ReturnStmtNode);
      case NodeKind.IfStmt:        return this.analyzeIf(node as IfStmtNode);
      case NodeKind.WhileStmt:     return this.analyzeWhile(node as WhileStmtNode);
      case NodeKind.ForStmt:       return this.analyzeFor(node as ForStmtNode);
      case NodeKind.MatchStmt:     return this.analyzeMatch(node as MatchStmtNode);
      case NodeKind.ExportDecl:    return this.analyzeNode((node as any).decl);
      case NodeKind.ImportDecl: {
        const imp = node as any;
        if (imp.names) {
          for (const name of imp.names) {
            this.currentScope.define({
              name,
              type: { kind: 'unknown' },
              isConst: false,
              isMut: false,
              defined: true,
            });
          }
        }
        return { kind: 'primitive', name: 'void' };
      }
      case NodeKind.BreakStmt:
      case NodeKind.ContinueStmt:
      case NodeKind.SpawnStmt:     return { kind: 'primitive', name: 'void' };
      case NodeKind.TryCatchStmt:  return this.analyzeTryCatch(node as any);
      case NodeKind.ThrowStmt:     return this.analyzeThrow(node as any);
      default:
        if (this.isExpr(node)) return this.analyzeExpr(node as ExprNode);
        return { kind: 'unknown' };
    }
  }

  private isExpr(node: ASTNode): boolean {
    return [
      NodeKind.BinaryExpr, NodeKind.UnaryExpr, NodeKind.CallExpr,
      NodeKind.MemberExpr, NodeKind.Identifier, NodeKind.IntLiteral,
      NodeKind.FloatLiteral, NodeKind.StringLiteral, NodeKind.BoolLiteral,
      NodeKind.AssignExpr, NodeKind.LambdaExpr,
      NodeKind.ArrayLiteral, NodeKind.NewExpr, NodeKind.IndexExpr,
      NodeKind.OwnershipExpr, NodeKind.MatchStmt, NodeKind.PipeExpr,
      NodeKind.MacroCall, NodeKind.AwaitExpr, NodeKind.CoalesceExpr,
      NodeKind.TryPropagateExpr,
    ].includes(node.kind);
  }

  // ── VarDecl ───────────────────────────────────────────────

  private analyzeVarDecl(node: VarDeclNode): KaelType {
    let inferredType: KaelType = { kind: 'unknown' };

    if (node.value) {
      inferredType = this.analyzeExpr(node.value);
    }

    const declaredType = this.resolveType(node.typeAnnot);
    const finalType = declaredType.kind !== 'unknown' ? declaredType : inferredType;

    if (this.currentScope.has(node.name)) {
      this.error(`Variable '${node.name}' already declared`, node.position?.line);
    }

    if (declaredType.kind !== 'unknown' && node.value && !this.isTypeAssignable(inferredType, declaredType)) {
      this.error(`Type mismatch: cannot assign '${this.typeToString(inferredType)}' to '${this.typeToString(declaredType)}'`, node.position?.line);
    }

    this.currentScope.define({
      name: node.name,
      type: finalType,
      isConst: node.isConst,
      isMut: node.isMut ?? false,
      defined: !!node.value,
    });

    return finalType;
  }

  private analyzeStructDecl(node: StructDeclNode): void {
    const prevParams = new Set(this.currentTypeParams);
    for (const g of node.generics) this.currentTypeParams.add(g);
    for (const p of node.params) {
      if (p.default) {
        const defaultType = this.analyzeExpr(p.default);
        const fieldType = this.resolveType(p.typeAnnot, node.generics);
        if (!this.isTypeAssignable(defaultType, fieldType)) {
          this.error(`Default value type mismatch for field '${p.name}': expected '${this.typeToString(fieldType)}', got '${this.typeToString(defaultType)}'`, p.position?.line);
        }
      }
    }
    this.currentTypeParams = prevParams;
  }

  private analyzeTraitDecl(node: TraitDeclNode): void {
    const prevParams = new Set(this.currentTypeParams);
    for (const g of node.generics) this.currentTypeParams.add(g);
    for (const m of node.methods) {
      for (const mg of m.generics) this.currentTypeParams.add(mg);
      this.resolveType(m.returnType, [...node.generics, ...m.generics]);
      for (const p of m.params) {
        this.resolveType(p.typeAnnot, [...node.generics, ...m.generics]);
      }
      for (const mg of m.generics) this.currentTypeParams.delete(mg);
    }
    this.currentTypeParams = prevParams;
  }

  private analyzeImplDecl(node: ImplDeclNode): void {
    const targetStruct = this.structRegistry.get(node.targetType);
    if (!targetStruct) {
      this.error(`Cannot impl for unknown struct '${node.targetType}'`, node.position?.line);
      return;
    }

    const prevParams = new Set(this.currentTypeParams);
    for (const g of [...targetStruct.generics, ...node.generics]) this.currentTypeParams.add(g);

    if (node.traitName) {
      const trait = this.traitRegistry.get(node.traitName);
      if (!trait) {
        this.error(`Trait '${node.traitName}' not found`, node.position?.line);
      } else {
        for (const traitMethod of trait.methods) {
          const implMethod = node.methods.find(m => m.name === traitMethod.name);
          if (!implMethod) {
            this.error(`Struct '${node.targetType}' does not implement trait method '${traitMethod.name}' from trait '${node.traitName}'`, node.position?.line);
          } else {
            if (implMethod.params.length !== traitMethod.params.length) {
              this.error(`Method '${traitMethod.name}' in impl '${node.traitName}' for '${node.targetType}' has ${implMethod.params.length} parameters, expected ${traitMethod.params.length}`, implMethod.position?.line);
            }
          }
        }
      }
    }

    const structSym = this.currentScope.lookup(node.targetType);
    const structType: KaelType = (structSym && structSym.type.kind === 'function')
      ? structSym.type.returnType
      : { kind: 'struct' as const, name: node.targetType, generics: targetStruct.generics, fields: new Map(), methods: new Map() };

    for (const method of node.methods) {
      const methodScope = new Scope(this.currentScope);
      methodScope.define({ name: 'self', type: structType, isConst: true, isMut: true, defined: true });
      for (const p of method.params) {
        if (p.name !== 'self') {
          methodScope.define({
            name: p.name,
            type: this.resolveType(p.typeAnnot, [...targetStruct.generics, ...node.generics, ...method.generics]),
            isConst: true,
            isMut: false,
            defined: true,
          });
        }
      }
      const outerScope = this.currentScope;
      const outerReturn = this.currentReturnType;
      this.currentScope = methodScope;
      this.currentReturnType = this.resolveType(method.returnType, [...targetStruct.generics, ...node.generics, ...method.generics]);
      if (method.body.kind === NodeKind.Block) {
        this.analyzeBlock(method.body as BlockNode);
      } else {
        this.analyzeExpr(method.body as ExprNode);
      }
      this.currentReturnType = outerReturn;
      this.currentScope = outerScope;
    }

    this.currentTypeParams = prevParams;
  }

  // ── FnDecl ────────────────────────────────────────────────

  private analyzeFnDecl(node: FnDeclNode): KaelType {
    const prevParams = new Set(this.currentTypeParams);
    for (const g of node.generics) this.currentTypeParams.add(g);

    const returnType = this.resolveType(node.returnType);
    const outerReturn = this.currentReturnType;
    this.currentReturnType = returnType;

    const fnScope = new Scope(this.currentScope);
    const outerScope = this.currentScope;
    this.currentScope = fnScope;

    for (const param of node.params) {
      const paramType = this.resolveType(param.typeAnnot);
      fnScope.define({ name: param.name, type: paramType, isConst: false, defined: true });
    }

    if (node.body.kind === NodeKind.Block) {
      this.analyzeBlock(node.body as BlockNode);
    } else {
      const bodyType = this.analyzeExpr(node.body as ExprNode);
      if (returnType.kind !== 'unknown' && !this.isTypeAssignable(bodyType, returnType)) {
        this.error(`Return type mismatch: expected '${this.typeToString(returnType)}', got '${this.typeToString(bodyType)}'`, node.position?.line);
      }
    }

    this.currentScope = outerScope;
    this.currentReturnType = outerReturn;
    this.currentTypeParams = prevParams;

    return {
      kind: 'function',
      params: node.params.map(p => this.resolveType(p.typeAnnot)),
      returnType,
      generics: node.generics,
      isAsync: node.isAsync,
    };
  }

  // ── ClassDecl ─────────────────────────────────────────────

  private analyzeClassDecl(node: ClassDeclNode): KaelType {
    const prevClass = this.currentClass;
    this.currentClass = node;

    const prevParams = new Set(this.currentTypeParams);
    for (const g of node.generics) this.currentTypeParams.add(g);

    // Check superclass
    if (node.superClass) {
      const cleanSuper = node.superClass.split('<')[0].trim();
      if (!this.classRegistry.has(cleanSuper)) {
        this.error(`Superclass '${node.superClass}' not found`, node.position?.line);
      }
    }

    // Check interfaces implementation
    for (const ifaceName of node.interfaces) {
      const cleanIface = ifaceName.split('<')[0].trim();
      const iface = this.interfaceRegistry.get(cleanIface);
      if (!iface) {
        this.error(`Interface '${ifaceName}' not found`, node.position?.line);
        continue;
      }
      for (const ifaceMethod of iface.members) {
        const resolved = this.resolveMember(node, ifaceMethod.name);
        if (!resolved || resolved.member.kind !== NodeKind.MethodDecl) {
          this.error(`Class '${node.name}' does not implement interface method '${ifaceMethod.name}' from '${ifaceName}'`, node.position?.line);
        } else {
          const implMethod = resolved.member as MethodDeclNode;
          if (implMethod.params.length !== ifaceMethod.params.length) {
            this.error(`Method '${ifaceMethod.name}' in class '${node.name}' has ${implMethod.params.length} parameters, expected ${ifaceMethod.params.length}`, implMethod.position?.line);
          }
        }
      }
    }

    const classScope = new Scope(this.currentScope);
    const outerScope = this.currentScope;
    this.currentScope = classScope;

    // Define 'self' and 'super'
    const selfType: KaelType = node.generics.length > 0
      ? { kind: 'generic', base: node.name, params: node.generics.map(g => ({ kind: 'type_param' as const, name: g })) }
      : { kind: 'class', name: node.name, fields: new Map(), methods: new Map(), generics: node.generics };
    classScope.define({ name: 'self', type: selfType, isConst: false, defined: true });

    if (node.superClass) {
      const cleanSuper = node.superClass.split('<')[0].trim();
      const superType: KaelType = { kind: 'class', name: cleanSuper, fields: new Map(), methods: new Map() };
      classScope.define({ name: 'super', type: superType, isConst: false, defined: true });
    }

    for (const member of node.members) {
      if (member.kind === NodeKind.MethodDecl) {
        this.analyzeFnDecl(member as unknown as FnDeclNode);
      } else if (member.kind === NodeKind.FieldDecl) {
        const field = member as FieldDeclNode;
        const fieldType = this.resolveType(field.typeAnnot);
        if (field.value) {
          const initType = this.analyzeExpr(field.value);
          if (fieldType.kind !== 'unknown' && !this.isTypeAssignable(initType, fieldType)) {
            this.error(`Type mismatch: cannot assign '${this.typeToString(initType)}' to field '${field.name}' of type '${this.typeToString(fieldType)}'`, field.position?.line);
          }
        }
        classScope.define({ name: field.name, type: fieldType, isConst: false, defined: true });
      } else if (member.kind === NodeKind.ConstructorDecl) {
        const ctor = member as ConstructorDeclNode;
        const ctorScope = new Scope(classScope);
        for (const param of ctor.params) {
          ctorScope.define({ name: param.name, type: this.resolveType(param.typeAnnot), isConst: false, defined: true });
        }
        const outer = this.currentScope;
        this.currentScope = ctorScope;
        this.analyzeBlock(ctor.body);
        this.currentScope = outer;
      } else if (member.kind === NodeKind.OperatorDecl) {
        const op = member as OperatorDeclNode;
        const opScope = new Scope(classScope);
        for (const param of op.params) {
          opScope.define({ name: param.name, type: this.resolveType(param.typeAnnot), isConst: false, defined: true });
        }
        const outer = this.currentScope;
        this.currentScope = opScope;
        this.analyzeBlock(op.body);
        this.currentScope = outer;
      }
    }

    this.currentScope = outerScope;
    this.currentTypeParams = prevParams;
    this.currentClass = prevClass;
    return selfType;
  }

  // ── Block ─────────────────────────────────────────────────

  private analyzeBlock(node: BlockNode): KaelType {
    const blockScope = new Scope(this.currentScope);
    const outer = this.currentScope;
    this.currentScope = blockScope;
    let lastType: KaelType = { kind: 'primitive', name: 'void' };
    for (const stmt of node.body) {
      lastType = this.analyzeNode(stmt);
    }
    this.currentScope = outer;
    return lastType;
  }

  // ── Return ────────────────────────────────────────────────

  private analyzeReturn(node: ReturnStmtNode): KaelType {
    const returnedType = node.value ? this.analyzeExpr(node.value) : ({ kind: 'primitive', name: 'void' } as KaelType);
    if (this.currentReturnType && this.currentReturnType.kind !== 'unknown') {
      if (!this.isTypeAssignable(returnedType, this.currentReturnType)) {
        this.error(`Return type mismatch: expected '${this.typeToString(this.currentReturnType)}', got '${this.typeToString(returnedType)}'`, node.position?.line);
      }
    }
    return returnedType;
  }

  // ── If ────────────────────────────────────────────────────

  private analyzeIf(node: IfStmtNode): KaelType {
    const condType = this.analyzeExpr(node.condition);
    if (condType.kind === 'primitive' && condType.name !== 'bool') {
      this.error('If condition must be bool', node.position?.line);
    }
    this.analyzeBlock(node.then);
    for (const e of node.elif) {
      this.analyzeExpr(e.condition);
      this.analyzeBlock(e.block);
    }
    if (node.else) this.analyzeBlock(node.else);
    return { kind: 'primitive', name: 'void' };
  }

  // ── While ─────────────────────────────────────────────────

  private analyzeWhile(node: WhileStmtNode): KaelType {
    this.analyzeExpr(node.condition);
    this.analyzeBlock(node.body);
    return { kind: 'primitive', name: 'void' };
  }

  // ── For ───────────────────────────────────────────────────

  private analyzeFor(node: ForStmtNode): KaelType {
    const iterType = this.analyzeExpr(node.iterable);
    let itemType: KaelType = { kind: 'unknown' };
    if (iterType.kind === 'generic' && iterType.base === 'Array') {
      itemType = iterType.params[0] ?? { kind: 'unknown' };
    } else if (iterType.kind === 'primitive' && iterType.name === 'str') {
      itemType = { kind: 'primitive', name: 'char' };
    }

    const forScope = new Scope(this.currentScope);
    const outer = this.currentScope;
    this.currentScope = forScope;
    forScope.define({ name: node.variable, type: itemType, isConst: false, defined: true });
    this.analyzeBlock(node.body);
    this.currentScope = outer;
    return { kind: 'primitive', name: 'void' };
  }

  // ── Match ─────────────────────────────────────────────────

  private analyzeMatch(node: MatchStmtNode): KaelType {
    const valType = this.analyzeExpr(node.value);
    let commonArmType: KaelType = { kind: 'unknown' };

    for (const arm of node.arms) {
      const armScope = new Scope(this.currentScope);
      const outer = this.currentScope;
      this.currentScope = armScope;

      if (arm.pattern.kind === 'some') {
        const innerType = valType.kind === 'option' ? valType.inner : { kind: 'unknown' as const };
        armScope.define({ name: arm.pattern.name, type: innerType, isConst: false, defined: true });
      } else if (arm.pattern.kind === 'ok') {
        const okType = valType.kind === 'result' ? valType.ok : { kind: 'unknown' as const };
        armScope.define({ name: arm.pattern.name, type: okType, isConst: false, defined: true });
      } else if (arm.pattern.kind === 'err') {
        const errType = valType.kind === 'result' ? valType.err : { kind: 'unknown' as const };
        armScope.define({ name: arm.pattern.name, type: errType, isConst: false, defined: true });
      } else if (arm.pattern.kind === 'identifier') {
        armScope.define({ name: arm.pattern.name, type: valType, isConst: false, defined: true });
      }

      if (arm.guard) this.analyzeExpr(arm.guard);
      let armType: KaelType;
      if (arm.body.kind === NodeKind.Block) armType = this.analyzeBlock(arm.body as BlockNode);
      else armType = this.analyzeExpr(arm.body as ExprNode);

      if (commonArmType.kind === 'unknown') {
        commonArmType = armType;
      }

      this.currentScope = outer;
    }
    if (valType.kind === 'option') {
      const hasSome = node.arms.some(a => a.pattern.kind === 'some');
      const hasNone = node.arms.some(a => a.pattern.kind === 'none');
      const hasWildcard = node.arms.some(a => a.pattern.kind === 'wildcard' || a.pattern.kind === 'identifier');
      if (!hasWildcard && (!hasSome || !hasNone)) {
        this.error(`Non-exhaustive pattern matching for Option: missing ${!hasSome ? "'some'" : "'none'"} variant`, node.position?.line);
      }
    }

    return commonArmType;
  }

  // ── Expressões ────────────────────────────────────────────

  private analyzeExpr(node: ExprNode): KaelType {
    switch (node.kind) {
      case NodeKind.IntLiteral:    return { kind: 'primitive', name: 'int' };
      case NodeKind.FloatLiteral:  return { kind: 'primitive', name: 'float' };
      case NodeKind.StringLiteral: return { kind: 'primitive', name: 'str' };
      case NodeKind.CharLiteral:   return { kind: 'primitive', name: 'char' };
      case NodeKind.BoolLiteral:   return { kind: 'primitive', name: 'bool' };

      case NodeKind.Identifier: {
        const id = node as IdentifierNode;
        if (id.name === 'none') {
          return { kind: 'option', inner: { kind: 'unknown' } };
        }
        const sym = this.currentScope.lookup(id.name);
        if (!sym) {
          if (this.classRegistry.has(id.name)) {
            const c = this.classRegistry.get(id.name)!;
            return { kind: 'class', name: c.name, fields: new Map(), methods: new Map(), generics: c.generics };
          }
          this.error(`Undefined variable '${id.name}'`, node.position?.line);
          return { kind: 'unknown' };
        }
        return sym.type;
      }

      case NodeKind.AssignExpr: {
        const assign = node as AssignExprNode;
        const valType = this.analyzeExpr(assign.value);
        if (assign.target.kind === NodeKind.Identifier) {
          const id = assign.target as IdentifierNode;
          const targetSym = this.currentScope.lookup(id.name);
          if (targetSym) {
            if (targetSym.isConst) {
              this.error(`Cannot assign to const '${id.name}'`, node.position?.line);
            } else if (!targetSym.isMut) {
              this.error(`[E0106] Cannot assign to immutable variable '${id.name}'. Use 'let mut' to declare mutable variables.`, node.position?.line);
            } else if (targetSym.type.kind !== 'unknown' && !this.isTypeAssignable(valType, targetSym.type)) {
              this.error(`Type mismatch: cannot assign '${this.typeToString(valType)}' to variable '${id.name}' of type '${this.typeToString(targetSym.type)}'`, node.position?.line);
            }
          }
        } else if (assign.target.kind === NodeKind.MemberExpr) {
          const member = assign.target as MemberExprNode;
          const memberType = this.analyzeExpr(member);
          if (memberType.kind !== 'unknown' && !this.isTypeAssignable(valType, memberType)) {
            this.error(`Type mismatch: cannot assign '${this.typeToString(valType)}' to member '${member.property}' of type '${this.typeToString(memberType)}'`, node.position?.line);
          }
        } else if (assign.target.kind === NodeKind.IndexExpr) {
          const idx = assign.target as IndexExprNode;
          const elemType = this.analyzeExpr(idx);
          if (elemType.kind !== 'unknown' && !this.isTypeAssignable(valType, elemType)) {
            this.error(`Type mismatch: cannot assign '${this.typeToString(valType)}' to indexed element of type '${this.typeToString(elemType)}'`, node.position?.line);
          }
        }
        return valType;
      }

      case NodeKind.CoalesceExpr: {
        const coalesce = node as CoalesceExprNode;
        const leftType = this.analyzeExpr(coalesce.left);
        const rightType = this.analyzeExpr(coalesce.right);
        if (leftType.kind === 'option') {
          if (rightType.kind !== 'unknown' && !this.isTypeAssignable(rightType, leftType.inner)) {
            this.error(`Type mismatch in coalescing operator '??': right operand '${this.typeToString(rightType)}' is not assignable to Option inner type '${this.typeToString(leftType.inner)}'`, coalesce.position?.line);
          }
          return leftType.inner;
        }
        return leftType.kind !== 'unknown' ? leftType : rightType;
      }

      case NodeKind.BinaryExpr: {
        const bin = node as BinaryExprNode;
        const lt = this.analyzeExpr(bin.left);
        const rt = this.analyzeExpr(bin.right);
        if (['==', '!=', '<', '>', '<=', '>='].includes(bin.operator)) {
          return { kind: 'primitive', name: 'bool' };
        }
        if (['&&', '||'].includes(bin.operator)) {
          return { kind: 'primitive', name: 'bool' };
        }
        return lt;
      }

      case NodeKind.UnaryExpr: {
        return this.analyzeExpr((node as any).operand);
      }

      case NodeKind.CallExpr: {
        const call = node as CallExprNode;
        const calleeType = this.analyzeExpr(call.callee);
        const argTypes = call.args.map(a => this.analyzeExpr(a));

        if (calleeType.kind === 'function') {
          const typeMap = new Map<string, KaelType>();

          // Explicit type arguments: e.g. identity<int>(42)
          if (call.typeArgs && call.typeArgs.length > 0 && calleeType.generics && calleeType.generics.length > 0) {
            for (let i = 0; i < Math.min(call.typeArgs.length, calleeType.generics.length); i++) {
              typeMap.set(calleeType.generics[i], this.resolveType(call.typeArgs[i]));
            }
          } else if (calleeType.generics && calleeType.generics.length > 0) {
            // Type argument inference from actual arguments
            for (let i = 0; i < Math.min(call.args.length, calleeType.params.length); i++) {
              this.unifyTypes(calleeType.params[i], argTypes[i], typeMap);
            }
          }

          const substitutedParams = calleeType.params.map(p => this.substituteType(p, typeMap));
          const substitutedReturn = this.substituteType(calleeType.returnType, typeMap);

          for (let i = 0; i < Math.min(call.args.length, substitutedParams.length); i++) {
            const expected = substitutedParams[i];
            const actual = argTypes[i];
            if (!this.isTypeAssignable(actual, expected)) {
              this.error(`Argument ${i + 1} type mismatch: expected '${this.typeToString(expected)}', got '${this.typeToString(actual)}'`, call.position?.line);
            }
          }

          return substitutedReturn;
        }
        return { kind: 'unknown' };
      }

      case NodeKind.MemberExpr: {
        const member = node as MemberExprNode;

        // Static access via class name: ClassName.member
        if (member.object.kind === NodeKind.Identifier) {
          const className = (member.object as IdentifierNode).name;
          const classDecl = this.classRegistry.get(className);
          if (classDecl) {
            const resolved = this.resolveMember(classDecl, member.property);
            if (resolved) {
              const vis = resolved.member.visibility;
              if (vis === 'priv') {
                if (this.currentClass?.name !== resolved.declaringClass.name) {
                  this.error(`Cannot access private member '${member.property}' of class '${resolved.declaringClass.name}'`, member.position?.line);
                }
              } else if (vis === 'prot') {
                if (!this.isSubclassOf(this.currentClass?.name, resolved.declaringClass.name)) {
                  this.error(`Cannot access protected member '${member.property}' of class '${resolved.declaringClass.name}'`, member.position?.line);
                }
              }
              if (resolved.member.kind === NodeKind.FieldDecl && resolved.member.isStatic) {
                return this.resolveType(resolved.member.typeAnnot, classDecl.generics);
              }
              if (resolved.member.kind === NodeKind.MethodDecl && resolved.member.isStatic) {
                const m = resolved.member as MethodDeclNode;
                return {
                  kind: 'function',
                  params: m.params.map(p => this.resolveType(p.typeAnnot, [...classDecl.generics, ...m.generics])),
                  returnType: this.resolveType(m.returnType, [...classDecl.generics, ...m.generics]),
                  generics: m.generics,
                  isAsync: m.isAsync,
                };
              }
            }
          }
        }

        // super.method()
        if (member.object.kind === NodeKind.Identifier && (member.object as IdentifierNode).name === 'super') {
          if (this.currentClass?.superClass) {
            const cleanSuper = this.currentClass.superClass.split('<')[0].trim();
            const parent = this.classRegistry.get(cleanSuper);
            if (parent) {
              const resolved = this.resolveMember(parent, member.property);
              if (resolved && resolved.member.kind === NodeKind.MethodDecl) {
                const m = resolved.member as MethodDeclNode;
                return {
                  kind: 'function',
                  params: m.params.map(p => this.resolveType(p.typeAnnot, [...parent.generics, ...m.generics])),
                  returnType: this.resolveType(m.returnType, [...parent.generics, ...m.generics]),
                  generics: m.generics,
                  isAsync: m.isAsync,
                };
              }
            }
          }
        }

        const objType = this.analyzeExpr(member.object);

        // Standard class instance access
        if (objType.kind === 'class') {
          const classDecl = this.classRegistry.get(objType.name);
          if (classDecl) {
            const resolved = this.resolveMember(classDecl, member.property);
            if (resolved) {
              const vis = resolved.member.visibility;
              if (vis === 'priv') {
                if (this.currentClass?.name !== resolved.declaringClass.name) {
                  this.error(`Cannot access private member '${member.property}' of class '${resolved.declaringClass.name}'`, member.position?.line);
                }
              } else if (vis === 'prot') {
                if (!this.isSubclassOf(this.currentClass?.name, resolved.declaringClass.name)) {
                  this.error(`Cannot access protected member '${member.property}' of class '${resolved.declaringClass.name}'`, member.position?.line);
                }
              }
              if (resolved.member.kind === NodeKind.FieldDecl) {
                return this.resolveType(resolved.member.typeAnnot, classDecl.generics);
              } else {
                const m = resolved.member as MethodDeclNode;
                return {
                  kind: 'function',
                  params: m.params.map(p => this.resolveType(p.typeAnnot, [...classDecl.generics, ...m.generics])),
                  returnType: this.resolveType(m.returnType, [...classDecl.generics, ...m.generics]),
                  generics: m.generics,
                  isAsync: m.isAsync,
                };
              }
            }
          }
        }

        // Struct instance access
        if (objType.kind === 'struct') {
          const fieldType = objType.fields.get(member.property);
          if (fieldType) return fieldType;
          const method = objType.methods.get(member.property);
          if (method) {
            return {
              kind: 'function',
              params: method.params.filter((_, idx) => idx > 0),
              returnType: method.returnType,
              isAsync: method.isAsync,
              generics: method.generics,
            };
          }
          this.error(`Struct '${objType.name}' has no field or method '${member.property}'`, member.position?.line);
          return { kind: 'unknown' };
        }

        // Generic class instance access or generic built-in collections
        if (objType.kind === 'generic') {
          // Array<T>
          if (objType.base === 'Array') {
            const elemType = objType.params[0] ?? { kind: 'unknown' as const };
            const intType: KaelType = { kind: 'primitive', name: 'int' };
            const boolType: KaelType = { kind: 'primitive', name: 'bool' };
            const strType: KaelType = { kind: 'primitive', name: 'str' };
            const voidType: KaelType = { kind: 'primitive', name: 'void' };

            switch (member.property) {
              case 'len': return intType;
              case 'push': return { kind: 'function', params: [elemType], returnType: voidType };
              case 'pop':  return { kind: 'function', params: [], returnType: elemType };
              case 'get':  return { kind: 'function', params: [intType], returnType: elemType };
              case 'contains': return { kind: 'function', params: [elemType], returnType: boolType };
              case 'join': return { kind: 'function', params: [strType], returnType: strType };
              case 'slice': return { kind: 'function', params: [intType, intType], returnType: objType };
              case 'reverse': return { kind: 'function', params: [], returnType: objType };
              case 'map': return {
                kind: 'function',
                generics: ['U'],
                params: [{ kind: 'function', params: [elemType], returnType: { kind: 'type_param', name: 'U' } }],
                returnType: { kind: 'generic', base: 'Array', params: [{ kind: 'type_param', name: 'U' }] }
              };
              case 'filter': return {
                kind: 'function',
                params: [{ kind: 'function', params: [elemType], returnType: boolType }],
                returnType: objType
              };
              case 'reduce': return {
                kind: 'function',
                generics: ['Acc'],
                params: [
                  { kind: 'function', params: [{ kind: 'type_param', name: 'Acc' }, elemType], returnType: { kind: 'type_param', name: 'Acc' } },
                  { kind: 'type_param', name: 'Acc' }
                ],
                returnType: { kind: 'type_param', name: 'Acc' }
              };
              case 'find': return {
                kind: 'function',
                params: [{ kind: 'function', params: [elemType], returnType: boolType }],
                returnType: { kind: 'option', inner: elemType }
              };
              case 'every':
              case 'all': return {
                kind: 'function',
                params: [{ kind: 'function', params: [elemType], returnType: boolType }],
                returnType: boolType
              };
              case 'some':
              case 'any': return {
                kind: 'function',
                params: [{ kind: 'function', params: [elemType], returnType: boolType }],
                returnType: boolType
              };
              case 'for_each':
              case 'forEach': return {
                kind: 'function',
                params: [{ kind: 'function', params: [elemType], returnType: voidType }],
                returnType: voidType
              };
            }
          }

          // Map<K, V>
          if (objType.base === 'Map') {
            const keyType = objType.params[0] ?? { kind: 'unknown' as const };
            const valType = objType.params[1] ?? { kind: 'unknown' as const };
            const intType: KaelType = { kind: 'primitive', name: 'int' };
            const boolType: KaelType = { kind: 'primitive', name: 'bool' };
            const voidType: KaelType = { kind: 'primitive', name: 'void' };

            switch (member.property) {
              case 'len':
              case 'size': return intType;
              case 'get': return { kind: 'function', params: [keyType], returnType: { kind: 'option', inner: valType } };
              case 'set': return { kind: 'function', params: [keyType, valType], returnType: voidType };
              case 'has': return { kind: 'function', params: [keyType], returnType: boolType };
              case 'delete': return { kind: 'function', params: [keyType], returnType: boolType };
            }
          }

          // User-defined generic class (e.g. Box<int>, Pair<str, int>)
          const classDecl = this.classRegistry.get(objType.base);
          if (classDecl) {
            const typeMap = new Map<string, KaelType>();
            for (let i = 0; i < classDecl.generics.length; i++) {
              typeMap.set(classDecl.generics[i], objType.params[i] ?? { kind: 'unknown' });
            }

            const resolved = this.resolveMember(classDecl, member.property);
            if (resolved) {
              const vis = resolved.member.visibility;
              if (vis === 'priv') {
                if (this.currentClass?.name !== resolved.declaringClass.name) {
                  this.error(`Cannot access private member '${member.property}' of class '${resolved.declaringClass.name}'`, member.position?.line);
                }
              } else if (vis === 'prot') {
                if (!this.isSubclassOf(this.currentClass?.name, resolved.declaringClass.name)) {
                  this.error(`Cannot access protected member '${member.property}' of class '${resolved.declaringClass.name}'`, member.position?.line);
                }
              }
              if (resolved.member.kind === NodeKind.FieldDecl) {
                const rawType = this.resolveType(resolved.member.typeAnnot, classDecl.generics);
                return this.substituteType(rawType, typeMap);
              } else {
                const m = resolved.member as MethodDeclNode;
                const allGenerics = [...classDecl.generics, ...m.generics];
                const rawParams = m.params.map(p => this.resolveType(p.typeAnnot, allGenerics));
                const rawReturn = this.resolveType(m.returnType, allGenerics);
                return {
                  kind: 'function',
                  params: rawParams.map(p => this.substituteType(p, typeMap)),
                  returnType: this.substituteType(rawReturn, typeMap),
                  generics: m.generics,
                  isAsync: m.isAsync,
                };
              }
            }
          }
        }

        // Option<T> methods
        if (objType.kind === 'option') {
          const boolType: KaelType = { kind: 'primitive', name: 'bool' };
          switch (member.property) {
            case 'is_some': return { kind: 'function', params: [], returnType: boolType };
            case 'is_none': return { kind: 'function', params: [], returnType: boolType };
            case 'unwrap':  return { kind: 'function', params: [], returnType: objType.inner };
            case 'unwrap_or': return { kind: 'function', params: [objType.inner], returnType: objType.inner };
            case 'map': return {
              kind: 'function',
              generics: ['U'],
              params: [{ kind: 'function', params: [objType.inner], returnType: { kind: 'type_param', name: 'U' } }],
              returnType: { kind: 'option', inner: { kind: 'type_param', name: 'U' } }
            };
          }
        }

        // Result<T, E> methods
        if (objType.kind === 'result') {
          const boolType: KaelType = { kind: 'primitive', name: 'bool' };
          switch (member.property) {
            case 'is_ok': return { kind: 'function', params: [], returnType: boolType };
            case 'is_err': return { kind: 'function', params: [], returnType: boolType };
            case 'unwrap': return { kind: 'function', params: [], returnType: objType.ok };
            case 'unwrap_err': return { kind: 'function', params: [], returnType: objType.err };
            case 'unwrap_or': return { kind: 'function', params: [objType.ok], returnType: objType.ok };
            case 'map': return {
              kind: 'function',
              generics: ['U'],
              params: [{ kind: 'function', params: [objType.ok], returnType: { kind: 'type_param', name: 'U' } }],
              returnType: { kind: 'result', ok: { kind: 'type_param', name: 'U' }, err: objType.err }
            };
          }
        }

        // Channel<T> methods
        if (objType.kind === 'channel' || (objType.kind === 'generic' && (objType.base === 'Channel' || objType.base === 'chan'))) {
          const elemType = (objType.kind === 'channel' ? objType.inner : objType.params[0]) ?? { kind: 'unknown' as const };
          const sendType = (elemType.kind === 'type_param' || elemType.kind === 'unknown') ? { kind: 'unknown' as const } : elemType;
          const intType: KaelType = { kind: 'primitive', name: 'int' };
          const boolType: KaelType = { kind: 'primitive', name: 'bool' };
          const voidType: KaelType = { kind: 'primitive', name: 'void' };

          switch (member.property) {
            case 'send': return { kind: 'function', params: [sendType], returnType: voidType };
            case 'recv': return { kind: 'function', params: [], returnType: elemType };
            case 'close': return { kind: 'function', params: [], returnType: voidType };
            case 'len': return intType;
            case 'capacity': return intType;
            case 'is_closed': return boolType;
          }
        }

        // String methods
        if (objType.kind === 'primitive' && objType.name === 'str') {
          const intType: KaelType = { kind: 'primitive', name: 'int' };
          const boolType: KaelType = { kind: 'primitive', name: 'bool' };
          const strType: KaelType = { kind: 'primitive', name: 'str' };
          const charType: KaelType = { kind: 'primitive', name: 'char' };
          switch (member.property) {
            case 'len': return intType;
            case 'upper': return { kind: 'function', params: [], returnType: strType };
            case 'lower': return { kind: 'function', params: [], returnType: strType };
            case 'trim': return { kind: 'function', params: [], returnType: strType };
            case 'split': return { kind: 'function', params: [strType], returnType: { kind: 'generic', base: 'Array', params: [strType] } };
            case 'contains': return { kind: 'function', params: [strType], returnType: boolType };
            case 'starts_with': return { kind: 'function', params: [strType], returnType: boolType };
            case 'ends_with': return { kind: 'function', params: [strType], returnType: boolType };
            case 'char_at': return { kind: 'function', params: [intType], returnType: charType };
            case 'substr': return { kind: 'function', params: [intType, intType], returnType: strType };
          }
        }

        return { kind: 'unknown' };
      }

      case NodeKind.IndexExpr: {
        const idx = node as IndexExprNode;
        const objType = this.analyzeExpr(idx.object);
        const indexType = this.analyzeExpr(idx.index);

        if (objType.kind === 'generic' && objType.base === 'Array') {
          if (indexType.kind !== 'unknown' && (indexType.kind !== 'primitive' || indexType.name !== 'int')) {
            this.error(`Array index must be int, got '${this.typeToString(indexType)}'`, node.position?.line);
          }
          return objType.params[0] ?? { kind: 'unknown' };
        }
        if (objType.kind === 'generic' && objType.base === 'Map') {
          const keyType = objType.params[0] ?? { kind: 'unknown' };
          if (indexType.kind !== 'unknown' && !this.isTypeAssignable(indexType, keyType)) {
            this.error(`Map key mismatch: expected '${this.typeToString(keyType)}', got '${this.typeToString(indexType)}'`, node.position?.line);
          }
          return objType.params[1] ?? { kind: 'unknown' };
        }
        if (objType.kind === 'primitive' && objType.name === 'str') {
          return { kind: 'primitive', name: 'char' };
        }
        if (objType.kind === 'class') {
          const classDecl = this.classRegistry.get(objType.name);
          if (classDecl) {
            const op = classDecl.members.find(m => m.kind === NodeKind.OperatorDecl && (m as OperatorDeclNode).operator === '[]') as OperatorDeclNode | undefined;
            if (op && op.returnType) {
              return this.resolveType(op.returnType, classDecl.generics);
            }
          }
        }
        return { kind: 'unknown' };
      }

      case NodeKind.NewExpr: {
        const newExpr = node as NewExprNode;
        const argTypes = newExpr.args.map(a => this.analyzeExpr(a));
        for (const f of newExpr.structInit) this.analyzeExpr(f.value);

        const classDecl = this.classRegistry.get(newExpr.className);
        if (!classDecl) {
          const classSym = this.currentScope.lookup(newExpr.className);
          return classSym?.type ?? { kind: 'unknown' };
        }

        const typeMap = new Map<string, KaelType>();

        if (classDecl.generics && classDecl.generics.length > 0) {
          // Explicit type arguments: new Box<int>(42)
          if (newExpr.typeArgs && newExpr.typeArgs.length > 0) {
            for (let i = 0; i < Math.min(newExpr.typeArgs.length, classDecl.generics.length); i++) {
              typeMap.set(classDecl.generics[i], this.resolveType(newExpr.typeArgs[i]));
            }
          } else {
            // Infer type parameters from constructor arguments
            const ctor = classDecl.members.find(m => m.kind === NodeKind.ConstructorDecl) as ConstructorDeclNode | undefined;
            if (ctor) {
              for (let i = 0; i < Math.min(argTypes.length, ctor.params.length); i++) {
                const formalType = this.resolveType(ctor.params[i].typeAnnot, classDecl.generics);
                this.unifyTypes(formalType, argTypes[i], typeMap);
              }
            }
          }

          const concreteParams: KaelType[] = classDecl.generics.map(g => typeMap.get(g) ?? { kind: 'unknown' });

          // Validate constructor arguments against substituted constructor params
          const ctor = classDecl.members.find(m => m.kind === NodeKind.ConstructorDecl) as ConstructorDeclNode | undefined;
          if (ctor) {
            for (let i = 0; i < Math.min(argTypes.length, ctor.params.length); i++) {
              const formalType = this.resolveType(ctor.params[i].typeAnnot, classDecl.generics);
              const substituted = this.substituteType(formalType, typeMap);
              const actual = argTypes[i];
              if (!this.isTypeAssignable(actual, substituted)) {
                this.error(`Constructor argument ${i + 1} type mismatch: expected '${this.typeToString(substituted)}', got '${this.typeToString(actual)}'`, newExpr.position?.line);
              }
            }
          }

          return { kind: 'generic', base: classDecl.name, params: concreteParams };
        }

        // Non-generic class
        const ctor = classDecl.members.find(m => m.kind === NodeKind.ConstructorDecl) as ConstructorDeclNode | undefined;
        if (ctor) {
          for (let i = 0; i < Math.min(argTypes.length, ctor.params.length); i++) {
            const formalType = this.resolveType(ctor.params[i].typeAnnot);
            const actual = argTypes[i];
            if (!this.isTypeAssignable(actual, formalType)) {
              this.error(`Constructor argument ${i + 1} type mismatch: expected '${this.typeToString(formalType)}', got '${this.typeToString(actual)}'`, newExpr.position?.line);
            }
          }
        }

        const classSym = this.currentScope.lookup(newExpr.className);
        return classSym?.type ?? { kind: 'class', name: classDecl.name, fields: new Map(), methods: new Map() };
      }

      case NodeKind.ArrayLiteral: {
        const arr = node as ArrayLiteralNode;
        if (arr.elements.length === 0) {
          return { kind: 'generic', base: 'Array', params: [{ kind: 'unknown' }] };
        }
        const elemTypes = arr.elements.map(el => this.analyzeExpr(el));
        const firstType = elemTypes.find(t => t.kind !== 'unknown');
        if (!firstType) {
          return { kind: 'generic', base: 'Array', params: [{ kind: 'unknown' }] };
        }
        const isHomogeneous = elemTypes.every(t => this.isTypeAssignable(t, firstType));
        if (isHomogeneous) {
          return { kind: 'generic', base: 'Array', params: [firstType] };
        }
        return { kind: 'generic', base: 'Array', params: [{ kind: 'unknown' }] };
      }

      case NodeKind.LambdaExpr: {
        return { kind: 'function', params: [], returnType: { kind: 'unknown' } };
      }

      case NodeKind.AwaitExpr: {
        return this.analyzeExpr((node as any).value);
      }

      case NodeKind.OwnershipExpr: {
        return this.analyzeExpr((node as any).operand);
      }

      case NodeKind.MatchStmt:
        return this.analyzeMatch(node as MatchStmtNode);

      case NodeKind.PipeExpr: {
        const leftType = this.analyzeExpr((node as any).left);
        const rightType = this.analyzeExpr((node as any).right);
        if (rightType.kind === 'function') {
          return rightType.returnType;
        }
        return { kind: 'unknown' };
      }

      case NodeKind.MacroCall: {
        const macro = node as any;
        for (const arg of macro.args) this.analyzeExpr(arg);
        if (macro.name === 'format!') return { kind: 'primitive', name: 'str' };
        if (macro.name === 'assert!') return { kind: 'primitive', name: 'void' };
        if (macro.name === 'dbg!') {
          return macro.args.length > 0 ? this.analyzeExpr(macro.args[0]) : { kind: 'primitive', name: 'void' };
        }
        return { kind: 'unknown' };
      }

      case NodeKind.TryPropagateExpr: {
        const inner = this.analyzeExpr((node as any).expr);
        if (inner.kind === 'option') return (inner as any).inner ?? { kind: 'unknown' };
        if (inner.kind === 'result') return (inner as any).ok ?? { kind: 'unknown' };
        return inner;
      }

      default:
        return { kind: 'unknown' };
    }
  }

  private analyzeTryCatch(node: any): KaelType {
    if (node.tryBlock) this.analyzeBlock(node.tryBlock);
    if (node.catchBlock) {
      this.currentScope = new Scope(this.currentScope);
      if (node.catchParam) {
        this.currentScope.define({
          name: node.catchParam,
          type: { kind: 'unknown' },
          isConst: false,
          isMut: true,
          defined: true,
        });
      }
      for (const stmt of node.catchBlock.body) this.analyzeNode(stmt);
      this.currentScope = this.currentScope.parent!;
    }
    if (node.finallyBlock) {
      this.analyzeBlock(node.finallyBlock);
    }
    return { kind: 'primitive', name: 'void' };
  }

  private analyzeThrow(node: any): KaelType {
    if (node.value) this.analyzeExpr(node.value);
    return { kind: 'primitive', name: 'void' };
  }

  // ── Resolver tipo da anotação ─────────────────────────────

  private resolveType(typeNode?: TypeNode, extraTypeParams?: string[]): KaelType {
    if (!typeNode) return { kind: 'unknown' };

    const isTypeParam = (name: string) =>
      (extraTypeParams && extraTypeParams.includes(name)) || this.currentTypeParams.has(name);

    switch (typeNode.kind) {
      case NodeKind.TypeRef: {
        const name = (typeNode as TypeRefNode).name;
        if (isTypeParam(name)) {
          return { kind: 'type_param', name };
        }
        const primitives = ['int', 'float', 'bool', 'str', 'char', 'void', 'null'];
        if (primitives.includes(name)) return { kind: 'primitive', name: name as any };
        if (name === 'fn') return { kind: 'function', params: [], returnType: { kind: 'unknown' } };
        if (this.structRegistry.has(name)) {
          const s = this.structRegistry.get(name)!;
          const fields = new Map<string, KaelType>();
          for (const p of s.params) fields.set(p.name, this.resolveType(p.typeAnnot, s.generics));
          const structSym = this.currentScope.lookup(name);
          const methods = (structSym && structSym.type.kind === 'function' && (structSym.type.returnType as any).kind === 'struct')
            ? (structSym.type.returnType as any).methods
            : new Map();
          return { kind: 'struct', name: s.name, generics: s.generics, fields, methods };
        }
        return { kind: 'class', name, fields: new Map(), methods: new Map() };
      }
      case NodeKind.GenericType: {
        const g = typeNode as GenericTypeNode;
        if (g.base === 'Option') {
          return { kind: 'option', inner: this.resolveType(g.params[0], extraTypeParams) };
        }
        if (g.base === 'Result') {
          return {
            kind: 'result',
            ok: this.resolveType(g.params[0], extraTypeParams),
            err: this.resolveType(g.params[1], extraTypeParams),
          };
        }
        if (g.base === 'Channel' || g.base === 'chan') {
          return { kind: 'channel', inner: this.resolveType(g.params[0], extraTypeParams) };
        }
        return {
          kind: 'generic',
          base: g.base,
          params: g.params.map(p => this.resolveType(p, extraTypeParams)),
        };
      }
      case NodeKind.OptionType: {
        return { kind: 'option', inner: this.resolveType((typeNode as any).inner, extraTypeParams) };
      }
      case NodeKind.ResultType: {
        const r = typeNode as any;
        return {
          kind: 'result',
          ok: this.resolveType(r.ok, extraTypeParams),
          err: this.resolveType(r.err, extraTypeParams),
        };
      }
      default:
        return { kind: 'unknown' };
    }
  }

  // ── Utilitários ───────────────────────────────────────────

  private error(message: string, line?: number, col?: number): void {
    this.errors.push(new SemanticError(message, line, col));
  }

  getErrors(): SemanticError[] {
    return this.errors;
  }
}
