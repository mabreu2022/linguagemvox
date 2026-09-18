// ============================================================
// interpreter.ts -- Interpretador Tree-Walking para Kael / Vox
// Executa código diretamente sem compilação
// ============================================================

import {
  ASTNode, NodeKind, ProgramNode, VarDeclNode, FnDeclNode,
  ClassDeclNode, BlockNode, ExprNode, ExprStmtNode,
  ReturnStmtNode, IfStmtNode, WhileStmtNode, ForStmtNode,
  MatchStmtNode, BinaryExprNode, UnaryExprNode, CallExprNode,
  MemberExprNode, IndexExprNode, IdentifierNode, LambdaExprNode,
  AssignExprNode, NewExprNode, MethodDeclNode, FieldDeclNode,
  MatchArmNode, BreakStmtNode, ContinueStmtNode, SpawnStmtNode,
  ConstructorDeclNode, MapLiteralNode, OperatorDeclNode, Visibility,
  OwnershipExprNode, OwnershipKind, DecoratorNode,
} from '../parser/ast';

// ── Valores em runtime ────────────────────────────────────────

export interface KaelChannel {
  kind: 'channel';
  buffer: KaelValue[];
  capacity: number;
  closed: boolean;
}

export interface KaelFuture {
  kind: 'future';
  value: KaelValue;
  isResolved: boolean;
}

export type KaelValue =
  | number
  | string
  | boolean
  | null
  | KaelValue[]
  | Map<KaelValue, KaelValue>
  | KaelFunction
  | KaelInstance
  | KaelClass
  | KaelSuper
  | KaelChannel
  | KaelFuture
  | { kind: 'mixin'; name: string; node: any }
  | { kind: 'option'; value: KaelValue | null }
  | { kind: 'result'; ok: boolean; value: KaelValue }
  | { kind: 'moved'; name: string; __vox_moved: true };

export interface KaelSuper {
  kind: 'super';
  instance: KaelInstance;
  declaringClass: string;
}

export interface KaelFunction {
  kind:    'function';
  name:    string;
  params:  string[];
  body:    ASTNode;
  closure: Environment;
  isAsync: boolean;
  isNative?: boolean;
  native?: (...args: KaelValue[]) => KaelValue;
  declaringClassName?: string;
}

export interface KaelClass {
  kind:         'class';
  name:         string;
  node:         ClassDeclNode;
  closure:      Environment;
  staticFields: Map<string, KaelValue>;
}

export interface KaelInstance {
  kind:    'instance';
  class:   KaelClass;
  fields:  Map<string, KaelValue>;
}

// ── Sinais de controle de fluxo ──────────────────────────────

class ReturnSignal   { constructor(public value: KaelValue) {} }
class BreakSignal    {}
class ContinueSignal {}

// ── Ambiente (Escopo) ─────────────────────────────────────────

export class Environment {
  private values: Map<string, KaelValue> = new Map();
  constructor(public parent?: Environment) {}

  get(name: string): KaelValue {
    if (this.values.has(name)) return this.values.get(name)!;
    if (this.parent) return this.parent.get(name);
    throw new RuntimeError(`Undefined variable '${name}'`);
  }

  set(name: string, value: KaelValue): void {
    this.values.set(name, value);
  }

  assign(name: string, value: KaelValue): void {
    if (this.values.has(name)) { this.values.set(name, value); return; }
    if (this.parent) { this.parent.assign(name, value); return; }
    throw new RuntimeError(`Cannot assign to undefined variable '${name}'`);
  }

  has(name: string): boolean {
    return this.values.has(name) || (this.parent?.has(name) ?? false);
  }

  child(): Environment {
    return new Environment(this);
  }
}

export class RuntimeError extends Error {
  constructor(message: string) {
    super(`[RuntimeError] ${message}`);
    this.name = 'RuntimeError';
  }
}

// ── Interpretador ─────────────────────────────────────────────

export class Interpreter {
  private globals: Environment;
  private callingClassStack: string[] = [];

  constructor() {
    this.globals = new Environment();
    this.setupBuiltins();
  }

  // ── Builtins ─────────────────────────────────────────────

  private setupBuiltins(): void {
    // I/O
    this.defineNative('print', (v) => { process.stdout.write(this.stringify(v)); return null; });
    this.defineNative('println', (v) => { console.log(this.stringify(v)); return null; });
    this.defineNative('eprint', (v) => { process.stderr.write(this.stringify(v)); return null; });

    // Conversões
    this.defineNative('int',   (v) => Math.trunc(Number(v)));
    this.defineNative('float', (v) => Number(v));
    this.defineNative('str',   (v) => this.stringify(v));
    this.defineNative('bool',  (v) => !!v);
    this.defineNative('char',  (v) => String(v)[0] ?? '\0');

    // Coleções
    this.defineNative('len', (v) => {
      if (Array.isArray(v)) return v.length;
      if (typeof v === 'string') return v.length;
      if (v instanceof Map) return v.size;
      throw new RuntimeError(`'len' not supported for ${typeof v}`);
    });

    this.defineNative('push', (arr, val) => {
      if (Array.isArray(arr)) { (arr as KaelValue[]).push(val); return null; }
      throw new RuntimeError('push requires an Array');
    });

    this.defineNative('pop', (arr) => {
      if (Array.isArray(arr)) return (arr as KaelValue[]).pop() ?? null;
      throw new RuntimeError('pop requires an Array');
    });

    this.defineNative('map_new', () => new Map<KaelValue, KaelValue>());
    this.defineNative('map_set', (m, k, v) => { (m as Map<KaelValue, KaelValue>).set(k, v); return null; });
    this.defineNative('map_get', (m, k) => (m as Map<KaelValue, KaelValue>).get(k) ?? null);

    // Controle
    this.defineNative('panic', (msg) => { throw new RuntimeError(`PANIC: ${this.stringify(msg)}`); });
    this.defineNative('assert', (cond, msg) => {
      if (!cond) throw new RuntimeError(`ASSERTION FAILED: ${this.stringify(msg)}`);
      return null;
    });

    // Math
    this.defineNative('sqrt',  (v) => Math.sqrt(Number(v)));
    this.defineNative('abs',   (v) => Math.abs(Number(v)));
    this.defineNative('floor', (v) => Math.floor(Number(v)));
    this.defineNative('ceil',  (v) => Math.ceil(Number(v)));
    this.defineNative('min',   (a, b) => Math.min(Number(a), Number(b)));
    this.defineNative('max',   (a, b) => Math.max(Number(a), Number(b)));
    this.defineNative('pow',   (a, b) => Math.pow(Number(a), Number(b)));
    this.defineNative('rand',  () => Math.random());

    // String
    this.defineNative('upper', (s) => String(s).toUpperCase());
    this.defineNative('lower', (s) => String(s).toLowerCase());
    this.defineNative('trim',  (s) => String(s).trim());

    // Option / Result constructors
    const makeOption = (val: KaelValue | null) => ({ kind: 'option', value: val } as KaelValue);
    const makeResult = (ok: boolean, val: KaelValue) => ({ kind: 'result', ok, value: val } as KaelValue);

    this.defineNative('some', (v) => makeOption(v));
    this.defineNative('none', () => makeOption(null));
    this.defineNative('ok',   (v) => makeResult(true, v));
    this.defineNative('err',  (e) => makeResult(false, e));

    // Option namespace
    const optMap = new Map<KaelValue, KaelValue>();
    optMap.set('some', { kind: 'function', name: 'some', params: ['v'], body: null as any, closure: this.globals, isAsync: false, isNative: true, native: (v: KaelValue) => makeOption(v) } as KaelFunction);
    optMap.set('none', { kind: 'function', name: 'none', params: [], body: null as any, closure: this.globals, isAsync: false, isNative: true, native: () => makeOption(null) } as KaelFunction);
    this.globals.set('Option', optMap);

    // Result namespace
    const resMap = new Map<KaelValue, KaelValue>();
    resMap.set('ok',  { kind: 'function', name: 'ok', params: ['v'], body: null as any, closure: this.globals, isAsync: false, isNative: true, native: (v: KaelValue) => makeResult(true, v) } as KaelFunction);
    resMap.set('err', { kind: 'function', name: 'err', params: ['e'], body: null as any, closure: this.globals, isAsync: false, isNative: true, native: (e: KaelValue) => makeResult(false, e) } as KaelFunction);
    this.globals.set('Result', resMap);

    // ── SQLite Database Built-ins ───────────────────────────
    let dbCounter = 1;
    const dbRegistry = new Map<number, any>();

    this.defineNative('sqlite_open', (pathStr) => {
      try {
        const { DatabaseSync } = require('node:sqlite');
        const db = new DatabaseSync(String(pathStr));
        const id = dbCounter++;
        dbRegistry.set(id, db);
        return id;
      } catch (err: any) {
        throw new RuntimeError(`sqlite_open error: ${err.message}`);
      }
    });

    this.defineNative('sqlite_exec', (handle, sql) => {
      const db = dbRegistry.get(Number(handle));
      if (!db) throw new RuntimeError(`Invalid database handle: ${handle}`);
      try {
        db.exec(String(sql));
        return true;
      } catch (err: any) {
        throw new RuntimeError(`sqlite_exec error: ${err.message}`);
      }
    });

    this.defineNative('sqlite_query', (handle, sql) => {
      const db = dbRegistry.get(Number(handle));
      if (!db) throw new RuntimeError(`Invalid database handle: ${handle}`);
      try {
        const stmt = db.prepare(String(sql));
        const rows = stmt.all();
        return rows.map((row: any) => {
          const map = new Map<KaelValue, KaelValue>();
          for (const [k, v] of Object.entries(row)) {
            map.set(k, v as KaelValue);
          }
          return map;
        });
      } catch (err: any) {
        throw new RuntimeError(`sqlite_query error: ${err.message}`);
      }
    });

    this.defineNative('sqlite_close', (handle) => {
      const db = dbRegistry.get(Number(handle));
      if (!db) return false;
      try {
        db.close();
        dbRegistry.delete(Number(handle));
        return true;
      } catch (err: any) {
        throw new RuntimeError(`sqlite_close error: ${err.message}`);
      }
    });

    // Channels & Concurrency
    const makeChannel = (cap?: KaelValue) => {
      const capacity = (cap !== undefined && cap !== null) ? Number(cap) : Infinity;
      return {
        kind: 'channel',
        buffer: [] as KaelValue[],
        capacity: capacity > 0 ? capacity : Infinity,
        closed: false,
      } as KaelChannel;
    };

    this.defineNative('chan_new', (cap) => makeChannel(cap));
    this.defineNative('chan_send', (ch, val) => {
      if (!ch || typeof ch !== 'object' || (ch as any).kind !== 'channel') {
        throw new RuntimeError('chan_send requires a Channel');
      }
      const channel = ch as KaelChannel;
      if (channel.closed) throw new RuntimeError('Cannot send on closed channel');
      if (channel.buffer.length >= channel.capacity) {
        throw new RuntimeError(`Channel buffer overflow (capacity ${channel.capacity})`);
      }
      channel.buffer.push(val);
      return null;
    });

    this.defineNative('chan_recv', (ch) => {
      if (!ch || typeof ch !== 'object' || (ch as any).kind !== 'channel') {
        throw new RuntimeError('chan_recv requires a Channel');
      }
      const channel = ch as KaelChannel;
      if (channel.buffer.length > 0) {
        return channel.buffer.shift()!;
      }
      return null;
    });

    this.defineNative('chan_close', (ch) => {
      if (!ch || typeof ch !== 'object' || (ch as any).kind !== 'channel') {
        throw new RuntimeError('chan_close requires a Channel');
      }
      (ch as KaelChannel).closed = true;
      return null;
    });

    this.defineNative('sleep', (ms) => {
      const waitMs = Number(ms) || 0;
      if (waitMs > 0) {
        const start = Date.now();
        while (Date.now() - start < waitMs) {
          // busy wait
        }
      }
      return null;
    });

    const chanMap = new Map<KaelValue, KaelValue>();
    chanMap.set('new', { kind: 'function', name: 'new', params: ['cap'], body: null as any, closure: this.globals, isAsync: false, isNative: true, native: (cap?: KaelValue) => makeChannel(cap) } as KaelFunction);
    this.globals.set('Channel', chanMap);
  }

  private defineNative(name: string, fn: (...args: KaelValue[]) => KaelValue): void {
    const native: KaelFunction = {
      kind: 'function',
      name,
      params: ['...args'],
      body: null as unknown as ASTNode,
      closure: this.globals,
      isAsync: false,
      isNative: true,
      native: fn,
    };
    this.globals.set(name, native);
  }

  // ── Hierarchy & Access Control Helpers ───────────────────

  private isSubclassOf(subClass: string, superClass: string): boolean {
    if (subClass === superClass) return true;
    const subVal = this.globals.has(subClass) ? this.globals.get(subClass) : null;
    if (subVal && typeof subVal === 'object' && (subVal as any).kind === 'class') {
      const cls = subVal as KaelClass;
      if (cls.node.superClass) {
        return this.isSubclassOf(cls.node.superClass, superClass);
      }
    }
    return false;
  }

  private checkAccess(visibility: Visibility, declaringClass: string, memberName: string): void {
    if (visibility === 'pub') return;
    const currentClass = this.callingClassStack[this.callingClassStack.length - 1];
    const visName = visibility === 'priv' ? 'private' : visibility === 'prot' ? 'protected' : 'public';
    if (!currentClass) {
      throw new RuntimeError(`Cannot access ${visName} member '${memberName}' of class '${declaringClass}' from outside class`);
    }
    if (visibility === 'priv') {
      if (currentClass !== declaringClass) {
        throw new RuntimeError(`Cannot access private member '${memberName}' of class '${declaringClass}' from '${currentClass}'`);
      }
    } else if (visibility === 'prot') {
      if (!this.isSubclassOf(currentClass, declaringClass)) {
        throw new RuntimeError(`Cannot access protected member '${memberName}' of class '${declaringClass}' from '${currentClass}'`);
      }
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
      const parentVal = this.globals.has(classNode.superClass) ? this.globals.get(classNode.superClass) : null;
      if (parentVal && typeof parentVal === 'object' && (parentVal as KaelClass).kind === 'class') {
        return this.resolveMember((parentVal as KaelClass).node, name);
      }
    }
    return null;
  }

  private findOperator(classNode: ClassDeclNode, op: string): { operator: OperatorDeclNode; declaringClass: ClassDeclNode } | null {
    for (const m of classNode.members) {
      if (m.kind === NodeKind.OperatorDecl && (m as OperatorDeclNode).operator === op) {
        return { operator: m as OperatorDeclNode, declaringClass: classNode };
      }
    }
    if (classNode.superClass) {
      const parentVal = this.globals.has(classNode.superClass) ? this.globals.get(classNode.superClass) : null;
      if (parentVal && typeof parentVal === 'object' && (parentVal as KaelClass).kind === 'class') {
        return this.findOperator((parentVal as KaelClass).node, op);
      }
    }
    return null;
  }

  private invokeOperator(inst: KaelInstance, op: string, ...args: KaelValue[]): KaelValue {
    const found = this.findOperator(inst.class.node, op);
    if (!found) {
      throw new RuntimeError(`Operator '${op}' not supported for '${inst.class.name}'`);
    }
    const opNode = found.operator;
    const declaringCls = this.globals.has(found.declaringClass.name) ? (this.globals.get(found.declaringClass.name) as KaelClass) : inst.class;
    const opEnv = declaringCls.closure.child();
    opEnv.set('self', inst);
    for (let i = 0; i < opNode.params.length; i++) {
      opEnv.set(opNode.params[i].name, args[i] ?? null);
    }
    this.callingClassStack.push(found.declaringClass.name);
    try {
      this.execBlock(opNode.body, opEnv);
    } catch (e) {
      if (e instanceof ReturnSignal) return e.value;
      throw e;
    } finally {
      this.callingClassStack.pop();
    }
    return null;
  }

  // ── Execução ──────────────────────────────────────────────

  run(program: ProgramNode): KaelValue {
    const env = this.globals;
    // Hoist mixins first (so classes can reference them)
    for (const node of program.body) {
      if (node.kind === NodeKind.MixinDecl) {
        const mixin = node as any;
        env.set(mixin.name, { kind: 'mixin', name: mixin.name, node: mixin });
      }
    }
    // Hoist functions and classes
    for (const node of program.body) {
      if (node.kind === NodeKind.FnDecl) this.hoistFn(node as FnDeclNode, env);
      if (node.kind === NodeKind.ClassDecl) this.hoistClass(node as ClassDeclNode, env);
      if (node.kind === NodeKind.ExportDecl) {
        const decl = (node as any).decl;
        if (decl.kind === NodeKind.FnDecl) this.hoistFn(decl, env);
        if (decl.kind === NodeKind.ClassDecl) this.hoistClass(decl, env);
        if (decl.kind === NodeKind.MixinDecl) env.set(decl.name, { kind: 'mixin', name: decl.name, node: decl });
      }
    }
    // Then execute
    let lastResult: KaelValue = null;
    for (const node of program.body) {
      lastResult = this.execNode(node, env);
    }
    return lastResult;
  }

  private hoistFn(node: FnDeclNode, env: Environment): void {
    let fn: KaelFunction = {
      kind: 'function',
      name: node.name,
      params: node.params.map(p => p.name),
      body: node.body,
      closure: env,
      isAsync: node.isAsync,
    };
    if (node.decorators && node.decorators.length > 0) {
      fn = this.applyDecorators(fn, node.decorators, env);
    }
    env.set(node.name, fn);
  }

  private hoistClass(node: ClassDeclNode, env: Environment): void {
    // Merge mixin methods into the class
    for (const mixinName of node.mixins) {
      const mixinVal = env.has(mixinName) ? env.get(mixinName) : (this.globals.has(mixinName) ? this.globals.get(mixinName) : null);
      if (mixinVal && typeof mixinVal === 'object' && (mixinVal as any).kind === 'mixin') {
        const mixinNode = (mixinVal as any).node;
        for (const member of mixinNode.members) {
          // Only add if not already overridden in this class
          const alreadyDefined = node.members.some(m =>
            m.kind === NodeKind.MethodDecl && (m as MethodDeclNode).name === (member as MethodDeclNode).name
          );
          if (!alreadyDefined) {
            (node.members as any[]).push(member);
          }
        }
      }
    }
    const cls: KaelClass = {
      kind: 'class',
      name: node.name,
      node,
      closure: env,
      staticFields: new Map(),
    };
    // Initialize static fields
    for (const member of node.members) {
      if (member.kind === NodeKind.FieldDecl && (member as FieldDeclNode).isStatic) {
        const field = member as FieldDeclNode;
        const val = field.value ? this.evalExpr(field.value, env) : null;
        cls.staticFields.set(field.name, val);
      }
    }
    if (node.decorators && node.decorators.length > 0) {
      for (const dec of node.decorators) {
        const decVal = env.has(dec.name) ? env.get(dec.name) : (this.globals.has(dec.name) ? this.globals.get(dec.name) : null);
        if (decVal && typeof decVal === 'object' && (decVal as any).kind === 'function') {
          this.callFn(decVal as KaelFunction, [cls]);
        }
      }
    }
    env.set(node.name, cls);
  }

  private applyDecorators(fn: KaelFunction, decorators: DecoratorNode[], env: Environment): KaelFunction {
    let currentFn = fn;
    for (let i = decorators.length - 1; i >= 0; i--) {
      const dec = decorators[i];
      if (dec.name === 'timed') {
        const targetFn = currentFn;
        currentFn = {
          kind: 'function',
          name: targetFn.name,
          params: targetFn.params,
          body: null as any,
          closure: env,
          isAsync: targetFn.isAsync,
          isNative: true,
          native: (...args: KaelValue[]) => {
            const start = performance.now();
            const res = this.callFn(targetFn, args);
            const elapsed = (performance.now() - start).toFixed(2);
            console.log(`[@timed] ${targetFn.name || 'anonymous'} took ${elapsed}ms`);
            return res;
          },
          declaringClassName: targetFn.declaringClassName,
        };
      } else if (dec.name === 'logged') {
        const targetFn = currentFn;
        currentFn = {
          kind: 'function',
          name: targetFn.name,
          params: targetFn.params,
          body: null as any,
          closure: env,
          isAsync: targetFn.isAsync,
          isNative: true,
          native: (...args: KaelValue[]) => {
            const argStrs = args.map(a => this.stringify(a)).join(', ');
            console.log(`[@logged] call ${targetFn.name}(${argStrs})`);
            const res = this.callFn(targetFn, args);
            console.log(`[@logged] return ${targetFn.name} => ${this.stringify(res)}`);
            return res;
          },
          declaringClassName: targetFn.declaringClassName,
        };
      } else if (dec.name === 'memoize') {
        const targetFn = currentFn;
        const memoCache = new Map<string, KaelValue>();
        currentFn = {
          kind: 'function',
          name: targetFn.name,
          params: targetFn.params,
          body: null as any,
          closure: env,
          isAsync: targetFn.isAsync,
          isNative: true,
          native: (...args: KaelValue[]) => {
            const key = args.map(a => this.stringify(a)).join('|');
            if (memoCache.has(key)) {
              return memoCache.get(key)!;
            }
            const res = this.callFn(targetFn, args);
            memoCache.set(key, res);
            return res;
          },
          declaringClassName: targetFn.declaringClassName,
        };
      } else {
        // User-defined decorator
        const decVal = env.has(dec.name) ? env.get(dec.name) : (this.globals.has(dec.name) ? this.globals.get(dec.name) : null);
        if (decVal && typeof decVal === 'object' && (decVal as any).kind === 'function') {
          const decArgs = dec.args.map(a => this.evalExpr(a, env));
          if (decArgs.length > 0) {
            const wrapperGen = this.callFn(decVal as KaelFunction, decArgs);
            if (wrapperGen && typeof wrapperGen === 'object' && (wrapperGen as any).kind === 'function') {
              const wrapped = this.callFn(wrapperGen as KaelFunction, [currentFn]);
              if (wrapped && typeof wrapped === 'object' && (wrapped as any).kind === 'function') {
                currentFn = wrapped as KaelFunction;
              }
            }
          } else {
            const wrapped = this.callFn(decVal as KaelFunction, [currentFn]);
            if (wrapped && typeof wrapped === 'object' && (wrapped as any).kind === 'function') {
              currentFn = wrapped as KaelFunction;
            }
          }
        }
      }
    }
    return currentFn;
  }

  private execNode(node: ASTNode, env: Environment): KaelValue {
    switch (node.kind) {
      case NodeKind.VarDecl:    return this.execVarDecl(node as VarDeclNode, env);
      case NodeKind.FnDecl:     this.hoistFn(node as FnDeclNode, env); return null;
      case NodeKind.ClassDecl:  this.hoistClass(node as ClassDeclNode, env); return null;
      case NodeKind.ExportDecl: return this.execNode((node as any).decl, env);
      case NodeKind.ImportDecl:    return null; // TODO
      case NodeKind.InterfaceDecl: return null; // compile-time only
      case NodeKind.MixinDecl:     return null; // mixins are hoisted
      case NodeKind.Block:      return this.execBlock(node as BlockNode, env);
      case NodeKind.ExprStmt:   return this.evalExpr((node as ExprStmtNode).expr, env);
      case NodeKind.ReturnStmt: {
        const val = (node as ReturnStmtNode).value ? this.evalExpr((node as ReturnStmtNode).value!, env) : null;
        throw new ReturnSignal(val);
      }
      case NodeKind.IfStmt:     return this.execIf(node as IfStmtNode, env);
      case NodeKind.WhileStmt:  return this.execWhile(node as WhileStmtNode, env);
      case NodeKind.ForStmt:    return this.execFor(node as ForStmtNode, env);
      case NodeKind.MatchStmt:  return this.execMatch(node as MatchStmtNode, env);
      case NodeKind.BreakStmt:  throw new BreakSignal();
      case NodeKind.ContinueStmt: throw new ContinueSignal();
      case NodeKind.SpawnStmt:  return this.execSpawn(node as SpawnStmtNode, env);
      default:
        throw new RuntimeError(`Unknown node kind in execNode: ${node.kind}`);
    }
  }

  private execVarDecl(node: VarDeclNode, env: Environment): KaelValue {
    const val = node.value ? this.evalExpr(node.value, env) : null;
    if (node.value) {
      this.checkRuntimeMove(node.value, node.ownership, env);
    }
    env.set(node.name, val);
    return val;
  }

  private execBlock(node: BlockNode, env: Environment): KaelValue {
    const local = env.child();
    let result: KaelValue = null;
    for (const stmt of node.body) {
      result = this.execNode(stmt, local);
    }
    return result;
  }

  private execIf(node: IfStmtNode, env: Environment): KaelValue {
    if (this.isTruthy(this.evalExpr(node.condition, env))) {
      return this.execBlock(node.then, env);
    }
    for (const elif of node.elif) {
      if (this.isTruthy(this.evalExpr(elif.condition, env))) {
        return this.execBlock(elif.block, env);
      }
    }
    if (node.else) return this.execBlock(node.else, env);
    return null;
  }

  private execWhile(node: WhileStmtNode, env: Environment): KaelValue {
    while (this.isTruthy(this.evalExpr(node.condition, env))) {
      try { this.execBlock(node.body, env); }
      catch (e) {
        if (e instanceof BreakSignal) break;
        if (e instanceof ContinueSignal) continue;
        throw e;
      }
    }
    return null;
  }

  private execFor(node: ForStmtNode, env: Environment): KaelValue {
    const iterable = this.evalExpr(node.iterable, env);
    const items = Array.isArray(iterable) ? iterable : typeof iterable === 'string' ? [...iterable] : [];
    for (const item of items) {
      const loopEnv = env.child();
      loopEnv.set(node.variable, item);
      try { this.execBlock(node.body, loopEnv); }
      catch (e) {
        if (e instanceof BreakSignal) break;
        if (e instanceof ContinueSignal) continue;
        throw e;
      }
    }
    return null;
  }

  private execMatch(node: MatchStmtNode, env: Environment): KaelValue {
    const value = this.evalExpr(node.value, env);
    for (const arm of node.arms) {
      const armEnv = env.child();
      if (this.matchPattern(arm.pattern, value, armEnv)) {
        if (arm.guard && !this.isTruthy(this.evalExpr(arm.guard, armEnv))) continue;
        if (arm.body.kind === NodeKind.Block) return this.execBlock(arm.body as BlockNode, armEnv);
        return this.evalExpr(arm.body as ExprNode, armEnv);
      }
    }
    return null;
  }

  private matchPattern(pattern: any, value: KaelValue, env: Environment): boolean {
    switch (pattern.kind) {
      case 'wildcard':    return true;
      case 'none':        return value === null || (typeof value === 'object' && (value as any)?.kind === 'option' && (value as any).value === null);
      case 'some': {
        const isOption = typeof value === 'object' && value !== null && (value as any)?.kind === 'option' && (value as any).value !== null;
        if (isOption) env.set(pattern.name, (value as any).value);
        return isOption;
      }
      case 'ok': {
        const isResult = typeof value === 'object' && value !== null && (value as any)?.kind === 'result' && (value as any).ok === true;
        if (isResult) env.set(pattern.name, (value as any).value);
        return isResult;
      }
      case 'err': {
        const isResult = typeof value === 'object' && value !== null && (value as any)?.kind === 'result' && (value as any).ok === false;
        if (isResult) env.set(pattern.name, (value as any).value);
        return isResult;
      }
      case 'literal': {
        const lit = this.evalExpr(pattern.value, env);
        if (Array.isArray(lit) && Array.isArray(value)) {
          if (lit.length !== value.length) return false;
          return lit.every((v, i) => v === value[i]);
        }
        return lit === value;
      }
      case 'identifier':  { env.set(pattern.name, value); return true; }
      case 'range':       {
        const from = Number(this.evalExpr(pattern.from, env));
        const to   = Number(this.evalExpr(pattern.to, env));
        return Number(value) >= from && Number(value) <= to;
      }
      default: return false;
    }
  }

  private execSpawn(node: SpawnStmtNode, env: Environment): KaelValue {
    try {
      this.execBlock(node.body, env.child());
    } catch (e) {
      if (!(e instanceof ReturnSignal)) throw e;
    }
    return null;
  }

  // ── Avaliação de expressões ───────────────────────────────

  private evalExpr(node: ExprNode, env: Environment): KaelValue {
    switch (node.kind) {
      case NodeKind.IntLiteral:    return (node as any).value;
      case NodeKind.FloatLiteral:  return (node as any).value;
      case NodeKind.StringLiteral: return (node as any).value;
      case NodeKind.CharLiteral:   return (node as any).value;
      case NodeKind.BoolLiteral:   return (node as any).value;
      case NodeKind.CoalesceExpr: {
        const left = this.evalExpr((node as any).left, env);
        if (left && typeof left === 'object' && (left as any).kind === 'option') {
          return (left as any).value !== null ? (left as any).value : this.evalExpr((node as any).right, env);
        }
        return left !== null && left !== undefined ? left : this.evalExpr((node as any).right, env);
      }

      case NodeKind.Identifier: {
        const name = (node as IdentifierNode).name;
        const val = env.has(name) ? env.get(name) : this.globals.get(name);
        if (val && typeof val === 'object' && (val as any).__vox_moved) {
          throw new RuntimeError(`Use of moved value '${name}'`);
        }
        return val;
      }

      case NodeKind.ArrayLiteral:
        return (node as any).elements.map((el: ExprNode) => this.evalExpr(el, env));

      case NodeKind.MapLiteral: {
        const m = new Map<KaelValue, KaelValue>();
        for (const entry of (node as MapLiteralNode).entries) {
          m.set(this.evalExpr(entry.key, env), this.evalExpr(entry.value, env));
        }
        return m;
      }

      case NodeKind.TupleLiteral:
        return (node as any).elements.map((el: ExprNode) => this.evalExpr(el, env));

      case NodeKind.BinaryExpr:   return this.evalBinary(node as BinaryExprNode, env);
      case NodeKind.UnaryExpr:    return this.evalUnary(node as UnaryExprNode, env);
      case NodeKind.AssignExpr:   return this.evalAssign(node as AssignExprNode, env);
      case NodeKind.CallExpr:     return this.evalCall(node as CallExprNode, env);
      case NodeKind.MemberExpr:   return this.evalMember(node as MemberExprNode, env);
      case NodeKind.IndexExpr:    return this.evalIndex(node as IndexExprNode, env);
      case NodeKind.LambdaExpr:   return this.evalLambda(node as LambdaExprNode, env);
      case NodeKind.NewExpr:      return this.evalNew(node as NewExprNode, env);
      case NodeKind.AwaitExpr: {
        const val = this.evalExpr((node as any).value, env);
        if (val && typeof val === 'object' && (val as any).kind === 'future') {
          return (val as any).value;
        }
        return val;
      }
      case NodeKind.MatchStmt:    return this.execMatch(node as MatchStmtNode, env);
      case NodeKind.PipeExpr:     return this.evalPipe(node as any, env);
      case NodeKind.MacroCall:    return this.evalMacro(node as any, env);
      case NodeKind.OwnershipExpr: return this.evalExpr((node as any).operand, env);

      default:
        throw new RuntimeError(`Unknown expression kind: ${node.kind}`);
    }
  }

  private checkRuntimeMove(expr: ExprNode, targetOwnership: OwnershipKind, env: Environment): void {
    let sourceId: string | undefined;
    let explicitOwn: boolean = targetOwnership === 'own';

    if (expr.kind === NodeKind.OwnershipExpr) {
      const o = expr as OwnershipExprNode;
      if (o.ownership === 'own') explicitOwn = true;
      if (o.operand.kind === NodeKind.Identifier) sourceId = (o.operand as IdentifierNode).name;
    } else if (expr.kind === NodeKind.Identifier) {
      sourceId = (expr as IdentifierNode).name;
    }

    if (sourceId && explicitOwn) {
      if (env.has(sourceId)) {
        env.assign(sourceId, { kind: 'moved', name: sourceId, __vox_moved: true });
      } else if (this.globals.has(sourceId)) {
        this.globals.assign(sourceId, { kind: 'moved', name: sourceId, __vox_moved: true });
      }
    }
  }

  private evalBinary(node: BinaryExprNode, env: Environment): KaelValue {
    // Short-circuit operators
    if (node.operator === '&&') {
      const l = this.evalExpr(node.left, env);
      return this.isTruthy(l) ? this.evalExpr(node.right, env) : l;
    }
    if (node.operator === '||') {
      const l = this.evalExpr(node.left, env);
      return this.isTruthy(l) ? l : this.evalExpr(node.right, env);
    }

    const left  = this.evalExpr(node.left, env);
    const right = this.evalExpr(node.right, env);

    // Operator overloading on left instance
    if (left && typeof left === 'object' && (left as any).kind === 'instance') {
      const inst = left as KaelInstance;
      if (node.operator === '==') {
        const opFound = this.findOperator(inst.class.node, '==');
        if (opFound) return this.invokeOperator(inst, '==', right);
      } else if (node.operator === '!=') {
        const opFound = this.findOperator(inst.class.node, '!=');
        if (opFound) return this.invokeOperator(inst, '!=', right);
        const eqFound = this.findOperator(inst.class.node, '==');
        if (eqFound) return !this.invokeOperator(inst, '==', right);
      } else {
        const opFound = this.findOperator(inst.class.node, node.operator);
        if (opFound) return this.invokeOperator(inst, node.operator, right);
      }
    }

    switch (node.operator) {
      case '+':  return typeof left === 'string' || typeof right === 'string'
                   ? this.stringify(left) + this.stringify(right)
                   : (left as number) + (right as number);
      case '-':  return (left as number) - (right as number);
      case '*':  return (left as number) * (right as number);
      case '/':  {
        if (right === 0) throw new RuntimeError('Division by zero');
        return (left as number) / (right as number);
      }
      case '%':  return (left as number) % (right as number);
      case '**': return Math.pow(left as number, right as number);
      case '==': return left === right;
      case '!=': return left !== right;
      case '<':  return (left as number) < (right as number);
      case '>':  return (left as number) > (right as number);
      case '<=': return (left as number) <= (right as number);
      case '>=': return (left as number) >= (right as number);
      case '&':  return (left as number) & (right as number);
      case '|':  return (left as number) | (right as number);
      case '^':  return (left as number) ^ (right as number);
      case '<<': return (left as number) << (right as number);
      case '>>': return (left as number) >> (right as number);
      default:   throw new RuntimeError(`Unknown operator: ${node.operator}`);
    }
  }

  private evalUnary(node: UnaryExprNode, env: Environment): KaelValue {
    const val = this.evalExpr(node.operand, env);
    if (val && typeof val === 'object' && (val as any).kind === 'instance') {
      const inst = val as KaelInstance;
      const opFound = this.findOperator(inst.class.node, node.operator);
      if (opFound) return this.invokeOperator(inst, node.operator);
    }
    switch (node.operator) {
      case '-': return -(val as number);
      case '!': return !this.isTruthy(val);
      case '~': return ~(val as number);
      default:  throw new RuntimeError(`Unknown unary operator: ${node.operator}`);
    }
  }

  private evalAssign(node: AssignExprNode, env: Environment): KaelValue {
    let value = this.evalExpr(node.value, env);

    if (node.operator !== '=') {
      const current = this.evalExpr(node.target, env);
      switch (node.operator) {
        case '+=': value = typeof current === 'string' ? (current + value) : ((current as number) + (value as number)); break;
        case '-=': value = (current as number) - (value as number); break;
        case '*=': value = (current as number) * (value as number); break;
        case '/=': value = (current as number) / (value as number); break;
        case '%=': value = (current as number) % (value as number); break;
      }
    }

    if (node.target.kind === NodeKind.Identifier) {
      const name = (node.target as IdentifierNode).name;
      if (node.value) {
        this.checkRuntimeMove(node.value, 'none', env);
      }
      if (env.has(name)) env.assign(name, value);
      else this.globals.assign(name, value);
    } else if (node.target.kind === NodeKind.MemberExpr) {
      const member = node.target as MemberExprNode;
      const obj = this.evalExpr(member.object, env);
      if (obj && typeof obj === 'object') {
        if ((obj as any).kind === 'instance') {
          const inst = obj as KaelInstance;
          const resolved = this.resolveMember(inst.class.node, member.property);
          if (resolved) {
            this.checkAccess(resolved.member.visibility, resolved.declaringClass.name, member.property);
          }
          inst.fields.set(member.property, value);
        } else if ((obj as any).kind === 'class') {
          const cls = obj as KaelClass;
          const resolved = this.resolveMember(cls.node, member.property);
          if (resolved) {
            this.checkAccess(resolved.member.visibility, resolved.declaringClass.name, member.property);
          }
          cls.staticFields.set(member.property, value);
        }
      }
    } else if (node.target.kind === NodeKind.IndexExpr) {
      const idx = node.target as IndexExprNode;
      const arr = this.evalExpr(idx.object, env);
      const i   = this.evalExpr(idx.index, env);
      if (arr && typeof arr === 'object' && (arr as any).kind === 'instance') {
        const inst = arr as KaelInstance;
        const opFound = this.findOperator(inst.class.node, '[]=');
        if (opFound) return this.invokeOperator(inst, '[]=', i, value);
      }
      if (Array.isArray(arr)) arr[Number(i)] = value;
      else if (arr instanceof Map) arr.set(i, value);
    }

    return value;
  }

  private evalCall(node: CallExprNode, env: Environment): KaelValue {
    let callee: KaelValue;
    let thisVal: KaelValue = null;

    if (node.callee.kind === NodeKind.MemberExpr) {
      const member = node.callee as MemberExprNode;
      thisVal = this.evalExpr(member.object, env);
      callee = this.getMember(thisVal, member.property, env);
      if (thisVal && typeof thisVal === 'object' && (thisVal as any).kind === 'super') {
        thisVal = (thisVal as KaelSuper).instance;
      }
    } else {
      callee = this.evalExpr(node.callee, env);
    }

    const args = node.args.map(a => this.evalExpr(a, env));

    // Handle runtime moves for arguments passed with 'own'
    for (const arg of node.args) {
      if (arg.kind === NodeKind.OwnershipExpr) {
        const o = arg as OwnershipExprNode;
        if (o.ownership === 'own' && o.operand.kind === NodeKind.Identifier) {
          const sourceId = (o.operand as IdentifierNode).name;
          if (env.has(sourceId)) {
            env.assign(sourceId, { kind: 'moved', name: sourceId, __vox_moved: true });
          } else if (this.globals.has(sourceId)) {
            this.globals.assign(sourceId, { kind: 'moved', name: sourceId, __vox_moved: true });
          }
        }
      }
    }

    if (!callee || typeof callee !== 'object' || (callee as any).kind !== 'function') {
      throw new RuntimeError(`'${JSON.stringify(callee)}' is not callable`);
    }

    const fn = callee as KaelFunction;
    if (fn.isNative && fn.native) return fn.native(...args);

    // Call user-defined function
    const fnEnv = fn.closure.child();
    if (thisVal !== null) {
      fnEnv.set('self', thisVal);
      // Bind super if method belongs to a class with a superclass
      if (fn.declaringClassName) {
        const declaringClsVal = this.globals.has(fn.declaringClassName) ? this.globals.get(fn.declaringClassName) : null;
        if (declaringClsVal && typeof declaringClsVal === 'object' && (declaringClsVal as KaelClass).node.superClass) {
          const superObj: KaelSuper = {
            kind: 'super',
            instance: thisVal as KaelInstance,
            declaringClass: fn.declaringClassName,
          };
          fnEnv.set('super', superObj);
        }
      }
    }
    for (let i = 0; i < fn.params.length; i++) {
      fnEnv.set(fn.params[i], args[i] ?? null);
    }

    if (fn.declaringClassName) {
      this.callingClassStack.push(fn.declaringClassName);
    }
    try {
      let result: KaelValue;
      if (fn.body.kind === NodeKind.Block) {
        result = this.execBlock(fn.body as BlockNode, fnEnv);
      } else {
        result = this.evalExpr(fn.body as ExprNode, fnEnv);
      }
      return fn.isAsync ? { kind: 'future', value: result, isResolved: true } : result;
    } catch (e) {
      if (e instanceof ReturnSignal) return fn.isAsync ? { kind: 'future', value: e.value, isResolved: true } : e.value;
      throw e;
    } finally {
      if (fn.declaringClassName) {
        this.callingClassStack.pop();
      }
    }
  }

  private evalMember(node: MemberExprNode, env: Environment): KaelValue {
    const obj = this.evalExpr(node.object, env);
    if (obj === null && !node.isOptional) throw new RuntimeError(`Cannot access '${node.property}' on null`);
    if (obj === null && node.isOptional) return null;
    return this.getMember(obj, node.property, env);
  }

  private getMember(obj: KaelValue, property: string, env: Environment): KaelValue {
    if (obj === null) return null;

    // Super call access
    if (typeof obj === 'object' && (obj as any).kind === 'super') {
      const sup = obj as KaelSuper;
      const declaringClsVal = this.globals.has(sup.declaringClass) ? this.globals.get(sup.declaringClass) : null;
      if (!declaringClsVal || typeof declaringClsVal !== 'object' || (declaringClsVal as any).kind !== 'class') {
        throw new RuntimeError(`Class '${sup.declaringClass}' not found for super call`);
      }
      const declaringCls = declaringClsVal as KaelClass;
      const parentName = declaringCls.node.superClass;
      if (!parentName) {
        throw new RuntimeError(`Class '${sup.declaringClass}' has no superclass`);
      }
      const parentClsVal = this.globals.has(parentName) ? this.globals.get(parentName) : null;
      if (!parentClsVal || typeof parentClsVal !== 'object' || (parentClsVal as any).kind !== 'class') {
        throw new RuntimeError(`Superclass '${parentName}' not found`);
      }
      const parentCls = parentClsVal as KaelClass;
      const resolved = this.resolveMember(parentCls.node, property);
      if (resolved) {
        if (resolved.member.visibility === 'priv') {
          throw new RuntimeError(`Cannot access private member '${property}' of superclass '${resolved.declaringClass.name}'`);
        }
        if (resolved.member.kind === NodeKind.FieldDecl) {
          return sup.instance.fields.get(property) ?? null;
        } else {
          const method = resolved.member as MethodDeclNode;
          const fn: KaelFunction = {
            kind: 'function',
            name: method.name,
            params: method.params.map(p => p.name),
            body: method.body,
            closure: parentCls.closure,
            isAsync: method.isAsync,
            declaringClassName: resolved.declaringClass.name,
          };
          return fn;
        }
      }
      throw new RuntimeError(`Method '${property}' not found in superclass chain of '${sup.declaringClass}'`);
    }

    // Static member access on class
    if (typeof obj === 'object' && (obj as any).kind === 'class') {
      const cls = obj as KaelClass;
      if (cls.staticFields && cls.staticFields.has(property)) {
        const resolved = this.resolveMember(cls.node, property);
        if (resolved) this.checkAccess(resolved.member.visibility, resolved.declaringClass.name, property);
        return cls.staticFields.get(property)!;
      }
      const resolved = this.resolveMember(cls.node, property);
      if (resolved && resolved.member.kind === NodeKind.MethodDecl && (resolved.member as MethodDeclNode).isStatic) {
        this.checkAccess(resolved.member.visibility, resolved.declaringClass.name, property);
        const method = resolved.member as MethodDeclNode;
        let fn: KaelFunction = {
          kind: 'function',
          name: method.name,
          params: method.params.map(p => p.name),
          body: method.body,
          closure: cls.closure,
          isAsync: method.isAsync,
          declaringClassName: resolved.declaringClass.name,
        };
        if (method.decorators && method.decorators.length > 0) {
          fn = this.applyDecorators(fn, method.decorators, cls.closure);
        }
        return fn;
      }
      throw new RuntimeError(`Static member '${property}' not found on class '${cls.name}'`);
    }

    // Instance member access
    if (typeof obj === 'object' && (obj as any).kind === 'instance') {
      const inst = obj as KaelInstance;
      const resolved = this.resolveMember(inst.class.node, property);
      if (resolved) {
        this.checkAccess(resolved.member.visibility, resolved.declaringClass.name, property);
        if (resolved.member.kind === NodeKind.FieldDecl) {
          return inst.fields.get(property) ?? null;
        } else {
          const method = resolved.member as MethodDeclNode;
          let fn: KaelFunction = {
            kind: 'function',
            name: method.name,
            params: method.params.map(p => p.name),
            body: method.body,
            closure: inst.class.closure,
            isAsync: method.isAsync,
            declaringClassName: resolved.declaringClass.name,
          };
          if (method.decorators && method.decorators.length > 0) {
            fn = this.applyDecorators(fn, method.decorators, inst.class.closure);
          }
          return fn;
        }
      }
      if (inst.class.staticFields && inst.class.staticFields.has(property)) {
        return inst.class.staticFields.get(property)!;
      }
      throw new RuntimeError(`Property '${property}' not found on '${inst.class.name}'`);
    }

    // Option methods
    if (typeof obj === 'object' && (obj as any).kind === 'option') {
      const opt = obj as { kind: 'option'; value: KaelValue | null };
      const native = (fn: (...args: KaelValue[]) => KaelValue) =>
        ({ kind: 'function', name: property, params: [], body: null as unknown as ASTNode, closure: this.globals, isAsync: false, isNative: true, native: fn } as KaelFunction);
      switch (property) {
        case 'is_some': return native(() => opt.value !== null);
        case 'is_none': return native(() => opt.value === null);
        case 'unwrap': return native(() => {
          if (opt.value === null) throw new RuntimeError("Called unwrap() on none");
          return opt.value;
        });
        case 'unwrap_or': return native((def) => opt.value !== null ? opt.value : (def ?? null));
        case 'map': return native((fn) => {
          if (opt.value === null) return opt;
          return { kind: 'option', value: this.callFn(fn as KaelFunction, [opt.value]) };
        });
        default: throw new RuntimeError(`Option has no method '${property}'`);
      }
    }

    // Result methods
    if (typeof obj === 'object' && (obj as any).kind === 'result') {
      const res = obj as { kind: 'result'; ok: boolean; value: KaelValue };
      const native = (fn: (...args: KaelValue[]) => KaelValue) =>
        ({ kind: 'function', name: property, params: [], body: null as unknown as ASTNode, closure: this.globals, isAsync: false, isNative: true, native: fn } as KaelFunction);
      switch (property) {
        case 'is_ok': return native(() => res.ok);
        case 'is_err': return native(() => !res.ok);
        case 'unwrap': return native(() => {
          if (!res.ok) throw new RuntimeError(`Called unwrap() on err: ${this.stringify(res.value)}`);
          return res.value;
        });
        case 'unwrap_err': return native(() => {
          if (res.ok) throw new RuntimeError(`Called unwrap_err() on ok: ${this.stringify(res.value)}`);
          return res.value;
        });
        case 'unwrap_or': return native((def) => res.ok ? res.value : (def ?? null));
        case 'map': return native((fn) => {
          if (!res.ok) return res;
          return { kind: 'result', ok: true, value: this.callFn(fn as KaelFunction, [res.value]) };
        });
        default: throw new RuntimeError(`Result has no method '${property}'`);
      }
    }

    // Map properties / methods
    if (obj instanceof Map) {
      if (obj.has(property)) return obj.get(property) ?? null;
      if (property === 'len' || property === 'size') return obj.size;
    }

    // Channel properties / methods
    if (typeof obj === 'object' && (obj as any).kind === 'channel') {
      const ch = obj as KaelChannel;
      const native = (fn: (...args: KaelValue[]) => KaelValue) =>
        ({ kind: 'function', name: property, params: [], body: null as unknown as ASTNode, closure: this.globals, isAsync: false, isNative: true, native: fn } as KaelFunction);

      switch (property) {
        case 'send': return native((val) => {
          if (ch.closed) throw new RuntimeError('Cannot send on closed channel');
          if (ch.buffer.length >= ch.capacity) {
            throw new RuntimeError(`Channel buffer overflow (capacity ${ch.capacity})`);
          }
          ch.buffer.push(val);
          return null;
        });
        case 'recv': return native(() => {
          if (ch.buffer.length > 0) return ch.buffer.shift()!;
          return null;
        });
        case 'close': return native(() => {
          ch.closed = true;
          return null;
        });
        case 'len': return ch.buffer.length;
        case 'capacity': return ch.capacity === Infinity ? -1 : ch.capacity;
        case 'is_closed': return ch.closed;
        default: throw new RuntimeError(`Channel has no property '${property}'`);
      }
    }

    // String methods
    if (typeof obj === 'string') {
      return this.stringMethod(obj, property);
    }

    // Array methods
    if (Array.isArray(obj)) {
      return this.arrayMethod(obj as KaelValue[], property);
    }

    throw new RuntimeError(`Cannot access property '${property}' on ${typeof obj}`);
  }

  private stringMethod(str: string, method: string): KaelValue {
    const native = (fn: (...args: KaelValue[]) => KaelValue) =>
      ({ kind: 'function', name: method, params: [], body: null as unknown as ASTNode, closure: this.globals, isAsync: false, isNative: true, native: fn } as KaelFunction);

    switch (method) {
      case 'len':         return str.length;
      case 'upper':       return str.toUpperCase();
      case 'lower':       return str.toLowerCase();
      case 'trim':        return str.trim();
      case 'split':       return native((sep) => str.split(String(sep)));
      case 'contains':    return native((sub) => str.includes(String(sub)));
      case 'starts_with': return native((pre) => str.startsWith(String(pre)));
      case 'ends_with':   return native((suf) => str.endsWith(String(suf)));
      case 'replace':     return native((f, t) => str.replaceAll(String(f), String(t)));
      case 'char_at':     return native((i) => str[Number(i)] ?? null);
      case 'substr':      return native((s, e) => str.slice(Number(s), Number(e)));
      case 'chars':       return [...str];
      case 'bytes':       return [...Buffer.from(str)].map(Number);
      default: throw new RuntimeError(`String has no method '${method}'`);
    }
  }

  private arrayMethod(arr: KaelValue[], method: string): KaelValue {
    const native = (fn: (...args: KaelValue[]) => KaelValue) =>
      ({ kind: 'function', name: method, params: [], body: null as unknown as ASTNode, closure: this.globals, isAsync: false, isNative: true, native: fn } as KaelFunction);

    switch (method) {
      case 'len':     return arr.length;
      case 'push':    return native((v) => { arr.push(v); return null; });
      case 'pop':     return native(() => arr.pop() ?? null);
      case 'shift':   return native(() => arr.shift() ?? null);
      case 'unshift': return native((v) => { arr.unshift(v); return null; });
      case 'reverse': return [...arr].reverse();
      case 'sort':    return [...arr].sort();
      case 'join':    return native((sep) => arr.map(v => this.stringify(v)).join(String(sep)));
      case 'contains': return native((v) => arr.includes(v));
      case 'first':   return arr[0] ?? null;
      case 'last':    return arr[arr.length - 1] ?? null;
      case 'map':     return native((fn) => arr.map(el => this.callFn(fn as KaelFunction, [el])));
      case 'filter':  return native((fn) => arr.filter(el => this.isTruthy(this.callFn(fn as KaelFunction, [el]))));
      case 'reduce':  return native((fn, init) => arr.reduce((acc, el) => this.callFn(fn as KaelFunction, [acc, el]), init));
      case 'find':    return native((fn) => arr.find(el => this.isTruthy(this.callFn(fn as KaelFunction, [el]))) ?? null);
      case 'any':     return native((fn) => arr.some(el => this.isTruthy(this.callFn(fn as KaelFunction, [el]))));
      case 'all':     return native((fn) => arr.every(el => this.isTruthy(this.callFn(fn as KaelFunction, [el]))));
      case 'some':    return native((fn) => arr.some(el => this.isTruthy(this.callFn(fn as KaelFunction, [el]))));
      case 'every':   return native((fn) => arr.every(el => this.isTruthy(this.callFn(fn as KaelFunction, [el]))));
      case 'for_each': return native((fn) => { arr.forEach(el => this.callFn(fn as KaelFunction, [el])); return null; });
      case 'forEach':  return native((fn) => { arr.forEach(el => this.callFn(fn as KaelFunction, [el])); return null; });
      case 'flat':    return (arr as KaelValue[][]).flat();
      case 'slice':   return native((s, e) => arr.slice(Number(s), e !== undefined ? Number(e) : undefined));
      default: throw new RuntimeError(`Array has no method '${method}'`);
    }
  }

  private callFn(fn: KaelFunction, args: KaelValue[]): KaelValue {
    if (fn.isNative && fn.native) return fn.native(...args);
    const fnEnv = fn.closure.child();
    for (let i = 0; i < fn.params.length; i++) fnEnv.set(fn.params[i], args[i] ?? null);
    if (fn.declaringClassName) {
      this.callingClassStack.push(fn.declaringClassName);
    }
    try {
      let result: KaelValue;
      if (fn.body.kind === NodeKind.Block) result = this.execBlock(fn.body as BlockNode, fnEnv);
      else result = this.evalExpr(fn.body as ExprNode, fnEnv);
      return fn.isAsync ? { kind: 'future', value: result, isResolved: true } : result;
    } catch (e) {
      if (e instanceof ReturnSignal) return fn.isAsync ? { kind: 'future', value: e.value, isResolved: true } : e.value;
      throw e;
    } finally {
      if (fn.declaringClassName) {
        this.callingClassStack.pop();
      }
    }
  }

  private evalIndex(node: IndexExprNode, env: Environment): KaelValue {
    const obj = this.evalExpr(node.object, env);
    const idx = this.evalExpr(node.index, env);
    if (obj && typeof obj === 'object' && (obj as any).kind === 'instance') {
      const inst = obj as KaelInstance;
      const opFound = this.findOperator(inst.class.node, '[]');
      if (opFound) return this.invokeOperator(inst, '[]', idx);
    }
    if (Array.isArray(obj)) return obj[Number(idx)] ?? null;
    if (typeof obj === 'string') return obj[Number(idx)] ?? null;
    if (obj instanceof Map) return obj.get(idx) ?? null;
    throw new RuntimeError(`Indexing not supported for ${typeof obj}`);
  }

  private evalLambda(node: LambdaExprNode, env: Environment): KaelValue {
    const fn: KaelFunction = {
      kind: 'function',
      name: '<lambda>',
      params: node.params.map(p => p.name),
      body: node.body,
      closure: env,
      isAsync: false,
    };
    return fn;
  }

  private evalNew(node: NewExprNode, env: Environment): KaelValue {
    if (node.className === 'Channel') {
      const cap = node.args.length > 0 ? this.evalExpr(node.args[0], env) : undefined;
      const capacity = (cap !== undefined && cap !== null) ? Number(cap) : Infinity;
      return {
        kind: 'channel',
        buffer: [] as KaelValue[],
        capacity: capacity > 0 ? capacity : Infinity,
        closed: false,
      } as KaelChannel;
    }

    const cls = env.has(node.className) ? env.get(node.className) : this.globals.get(node.className);
    if (!cls || typeof cls !== 'object' || (cls as any).kind !== 'class') {
      throw new RuntimeError(`'${node.className}' is not a class`);
    }

    const klass = cls as KaelClass;
    const instance: KaelInstance = { kind: 'instance', class: klass, fields: new Map() };

    // Initialize fields with defaults (walking up hierarchy so parent fields are initialized first)
    const initFieldsFromClass = (c: ClassDeclNode) => {
      if (c.superClass) {
        const parentVal = this.globals.has(c.superClass) ? this.globals.get(c.superClass) : null;
        if (parentVal && typeof parentVal === 'object' && (parentVal as KaelClass).kind === 'class') {
          initFieldsFromClass((parentVal as KaelClass).node);
        }
      }
      for (const member of c.members) {
        if (member.kind === NodeKind.FieldDecl && !(member as FieldDeclNode).isStatic) {
          const field = member as FieldDeclNode;
          const val = field.value ? this.evalExpr(field.value, env) : null;
          instance.fields.set(field.name, val);
        }
      }
    };
    initFieldsFromClass(klass.node);

    // Struct-like init
    for (const { key, value } of node.structInit) {
      instance.fields.set(key, this.evalExpr(value, env));
    }

    // Find and call constructor 'new'
    const constructor = klass.node.members.find(m => m.kind === NodeKind.ConstructorDecl) as ConstructorDeclNode | undefined;
    if (constructor) {
      const ctorEnv = klass.closure.child();
      ctorEnv.set('self', instance);
      const args = node.args.map(a => this.evalExpr(a, env));
      for (let i = 0; i < constructor.params.length; i++) {
        ctorEnv.set(constructor.params[i].name, args[i] ?? null);
      }
      // Provide super() as a native that calls the parent class constructor
      if (klass.node.superClass) {
        const parentCls = this.globals.has(klass.node.superClass) ? this.globals.get(klass.node.superClass) : null;
        const superFn: KaelFunction = {
          kind: 'function', name: 'super', params: [], body: null as unknown as ASTNode,
          closure: ctorEnv, isAsync: false, isNative: true,
          native: (...superArgs: KaelValue[]) => {
            if (parentCls && typeof parentCls === 'object' && (parentCls as KaelClass).kind === 'class') {
              const parentClass = parentCls as KaelClass;
              // Call parent constructor if exists
              const parentCtor = parentClass.node.members.find(m => m.kind === NodeKind.ConstructorDecl) as ConstructorDeclNode | undefined;
              if (parentCtor) {
                const parentCtorEnv = parentClass.closure.child();
                parentCtorEnv.set('self', instance);
                for (let i = 0; i < parentCtor.params.length; i++) {
                  parentCtorEnv.set(parentCtor.params[i].name, superArgs[i] ?? null);
                }
                this.callingClassStack.push(parentClass.name);
                try { this.execBlock(parentCtor.body, parentCtorEnv); }
                catch (e) { if (!(e instanceof ReturnSignal)) throw e; }
                finally { this.callingClassStack.pop(); }
              }
            }
            return null;
          }
        };
        ctorEnv.set('super', superFn);
      }
      this.callingClassStack.push(klass.name);
      try { this.execBlock(constructor.body, ctorEnv); }
      catch (e) { if (!(e instanceof ReturnSignal)) throw e; }
      finally { this.callingClassStack.pop(); }
    }

    return instance;
  }

  private evalPipe(node: any, env: Environment): KaelValue {
    const left = this.evalExpr(node.left, env);
    const right = this.evalExpr(node.right, env);
    if (typeof right === 'object' && (right as KaelFunction).kind === 'function') {
      return this.callFn(right as KaelFunction, [left]);
    }
    throw new RuntimeError('Pipe (|>) requires a function on the right side');
  }

  private evalMacro(node: any, env: Environment): KaelValue {
    const args = node.args.map((a: ExprNode) => this.evalExpr(a, env));
    switch (node.name) {
      case 'assert!': {
        if (!this.isTruthy(args[0])) {
          const msg = args[1] !== undefined ? this.stringify(args[1]) : 'assertion failed';
          throw new RuntimeError(`Assertion failed: ${msg}`);
        }
        return null;
      }
      case 'dbg!': {
        console.error('[dbg!]', ...args.map((a: KaelValue) => this.stringify(a)));
        return args[0] ?? null;
      }
      case 'format!': {
        if (args.length === 0) return '';
        let template = String(args[0]);
        let argIdx = 1;
        while (template.includes('{}') && argIdx < args.length) {
          template = template.replace('{}', this.stringify(args[argIdx]));
          argIdx++;
        }
        return template;
      }
      case 'panic!': throw new RuntimeError(`Panic: ${args.map((a: KaelValue) => this.stringify(a)).join(' ')}`);
      case 'todo!': throw new RuntimeError('Not yet implemented (todo!)');
      case 'unreachable!': throw new RuntimeError('Reached unreachable code!');
      default: throw new RuntimeError(`Unknown macro: ${node.name}`);
    }
  }

  // ── Utilitários ───────────────────────────────────────────

  private isTruthy(value: KaelValue): boolean {
    if (value === null || value === false || value === 0) return false;
    if (typeof value === 'string' && value === '') return false;
    if (Array.isArray(value) && value.length === 0) return false;
    return true;
  }

  stringify(value: KaelValue): string {
    if (value === null) return 'null';
    if (typeof value === 'boolean') return value ? 'true' : 'false';
    if (typeof value === 'number') return String(value);
    if (typeof value === 'string') return value;
    if (Array.isArray(value)) return `[${value.map(v => this.stringify(v)).join(', ')}]`;
    if (value instanceof Map) {
      const entries = [...value.entries()].map(([k, v]) => `${this.stringify(k)}: ${this.stringify(v)}`);
      return `{${entries.join(', ')}}`;
    }
    if (typeof value === 'object') {
      const v = value as any;
      if (v.kind === 'instance') return `<${v.class.name}>`;
      if (v.kind === 'class') return `<class ${v.name}>`;
      if (v.kind === 'super') return `<super ${v.declaringClass}>`;
      if (v.kind === 'function') return `<fn ${v.name}>`;
      if (v.kind === 'channel') return `<channel len=${v.buffer.length} cap=${v.capacity === Infinity ? 'inf' : v.capacity}>`;
      if (v.kind === 'future') return `<future resolved=${v.isResolved} value=${this.stringify(v.value)}>`;
      if (v.kind === 'option') return v.value !== null ? `some(${this.stringify(v.value)})` : 'none';
      if (v.kind === 'result') return v.ok ? `ok(${this.stringify(v.value)})` : `err(${this.stringify(v.value)})`;
    }
    return String(value);
  }
}
