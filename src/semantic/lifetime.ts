// ============================================================
// lifetime.ts -- Lifetime & Borrow Checker da linguagem Vox
// Fase 4: Modelo own / borrow / ref, Move Semantics & Lifetimes
// ============================================================

import {
  ASTNode, NodeKind, ProgramNode, VarDeclNode, FnDeclNode,
  ClassDeclNode, BlockNode, ExprNode, ExprStmtNode,
  ReturnStmtNode, IfStmtNode, WhileStmtNode, ForStmtNode,
  MatchStmtNode, BinaryExprNode, UnaryExprNode, CallExprNode,
  MemberExprNode, IdentifierNode, AssignExprNode, OwnershipExprNode,
  OwnershipKind, ParamNode, MethodDeclNode,
} from '../parser/ast';
import { SemanticError } from './analyzer';

export type VariableState = 'Valid' | 'Moved' | 'Uninitialized';

export interface VariableBinding {
  name: string;
  ownership: OwnershipKind;
  state: VariableState;
  isPrimitive: boolean;
  borrowedFrom?: string;
  activeBorrows: Set<string>;
  activeMutableBorrow?: string;
  declaredLine?: number;
  movedAtLine?: number;
}

export class LifetimeScope {
  private bindings: Map<string, VariableBinding> = new Map();
  constructor(public parent?: LifetimeScope) {}

  define(binding: VariableBinding): void {
    this.bindings.set(binding.name, binding);
  }

  lookup(name: string): VariableBinding | undefined {
    return this.bindings.get(name) ?? this.parent?.lookup(name);
  }

  has(name: string): boolean {
    return this.bindings.has(name);
  }

  getAllLocalBindings(): VariableBinding[] {
    return Array.from(this.bindings.values());
  }
}

export class LifetimeChecker {
  private errors: SemanticError[] = [];
  private currentScope: LifetimeScope;
  private functionSignatures: Map<string, ParamNode[]> = new Map();
  private methodSignatures: Map<string, Map<string, ParamNode[]>> = new Map();

  constructor() {
    this.currentScope = new LifetimeScope();
  }

  check(program: ProgramNode): SemanticError[] {
    // 1ª passagem: registrar assinaturas de funções e métodos
    for (const node of program.body) {
      this.collectSignatures(node);
    }
    // 2ª passagem: verificar ownership e lifetimes
    for (const node of program.body) {
      this.checkNode(node);
    }
    return this.errors;
  }

  // ── Registro de assinaturas ───────────────────────────────

  private collectSignatures(node: ASTNode): void {
    if (node.kind === NodeKind.FnDecl) {
      const f = node as FnDeclNode;
      this.functionSignatures.set(f.name, f.params);
    } else if (node.kind === NodeKind.ClassDecl) {
      const c = node as ClassDeclNode;
      const methods = new Map<string, ParamNode[]>();
      for (const m of c.members) {
        if (m.kind === NodeKind.MethodDecl) {
          const method = m as MethodDeclNode;
          methods.set(method.name, method.params);
        }
      }
      this.methodSignatures.set(c.name, methods);
    } else if (node.kind === NodeKind.ImplDecl) {
      const impl = node as any;
      let methods = this.methodSignatures.get(impl.targetType);
      if (!methods) {
        methods = new Map<string, ParamNode[]>();
        this.methodSignatures.set(impl.targetType, methods);
      }
      for (const m of impl.methods) {
        methods.set(m.name, m.params);
      }
    } else if (node.kind === NodeKind.ExportDecl) {
      this.collectSignatures((node as any).decl);
    }
  }

  // ── Verificação de nós da AST ─────────────────────────────

  private checkNode(node: ASTNode): void {
    switch (node.kind) {
      case NodeKind.VarDecl:
        this.checkVarDecl(node as VarDeclNode);
        break;
      case NodeKind.FnDecl:
        this.checkFnDecl(node as FnDeclNode);
        break;
      case NodeKind.ClassDecl:
        this.checkClassDecl(node as ClassDeclNode);
        break;
      case NodeKind.Block:
        this.checkBlock(node as BlockNode);
        break;
      case NodeKind.ExprStmt:
        this.checkExpr((node as ExprStmtNode).expr);
        break;
      case NodeKind.ReturnStmt:
        this.checkReturn(node as ReturnStmtNode);
        break;
      case NodeKind.IfStmt:
        this.checkIf(node as IfStmtNode);
        break;
      case NodeKind.WhileStmt:
        this.checkWhile(node as WhileStmtNode);
        break;
      case NodeKind.ForStmt:
        this.checkFor(node as ForStmtNode);
        break;
      case NodeKind.MatchStmt:
        this.checkMatch(node as MatchStmtNode);
        break;
      case NodeKind.StructDecl:
        break;
      case NodeKind.TraitDecl:
        break;
      case NodeKind.ImplDecl: {
        const impl = node as any;
        for (const m of impl.methods) {
          this.checkFnDecl(m as unknown as FnDeclNode);
        }
        break;
      }
      case NodeKind.ExportDecl:
        this.checkNode((node as any).decl);
        break;
      default:
        // Statements sem impacto em ownership
        break;
    }
  }

  // ── Declaração de variável ────────────────────────────────

  private checkVarDecl(node: VarDeclNode): void {
    const isPrimitive = this.isPrimitiveType(node.typeAnnot);
    let ownership = node.ownership;

    // Se o lado direito for uma expressão explícita de ownership (ex.: let b = borrow x)
    if (node.value && node.value.kind === NodeKind.OwnershipExpr) {
      const ownExpr = node.value as OwnershipExprNode;
      if (ownership === 'none') {
        ownership = ownExpr.ownership;
      }
    }

    if (node.value) {
      this.checkExpr(node.value);
    }

    const binding: VariableBinding = {
      name: node.name,
      ownership,
      state: node.value ? 'Valid' : 'Uninitialized',
      isPrimitive,
      activeBorrows: new Set(),
      declaredLine: node.position?.line,
    };

    // Processar empréstimo ou movimento a partir do valor inicial
    if (node.value) {
      this.processTransferOrBorrow(binding, node.value, node.position?.line);
    }

    this.currentScope.define(binding);
  }

  // ── Transferência de Posse ou Empréstimo ───────────────────

  private processTransferOrBorrow(targetBinding: VariableBinding, rhs: ExprNode, line?: number): void {
    let sourceExpr: ExprNode = rhs;
    let explicitOwnership: OwnershipKind | undefined;

    if (rhs.kind === NodeKind.OwnershipExpr) {
      const o = rhs as OwnershipExprNode;
      explicitOwnership = o.ownership;
      sourceExpr = o.operand;
    }

    if (sourceExpr.kind === NodeKind.Identifier) {
      const sourceId = sourceExpr as IdentifierNode;
      const sourceBinding = this.currentScope.lookup(sourceId.name);
      if (!sourceBinding) return;

      const effectiveOwnership = explicitOwnership ?? targetBinding.ownership;

      if (effectiveOwnership === 'borrow') {
        // Empréstimo imutável
        if (sourceBinding.state === 'Moved') {
          this.error(`Cannot borrow moved value '${sourceBinding.name}'`, line);
          return;
        }
        if (sourceBinding.activeMutableBorrow) {
          this.error(`Cannot borrow '${sourceBinding.name}' immutably because it is currently borrowed mutably by '${sourceBinding.activeMutableBorrow}'`, line);
          return;
        }
        sourceBinding.activeBorrows.add(targetBinding.name);
        targetBinding.borrowedFrom = sourceBinding.name;
      } else if (effectiveOwnership === 'ref') {
        // Empréstimo mutável exclusivo
        if (sourceBinding.state === 'Moved') {
          this.error(`Cannot borrow moved value '${sourceBinding.name}' as mutable reference`, line);
          return;
        }
        if (sourceBinding.activeBorrows.size > 0) {
          this.error(`Cannot borrow '${sourceBinding.name}' as mutable reference because it is already borrowed`, line);
          return;
        }
        if (sourceBinding.activeMutableBorrow) {
          this.error(`Cannot borrow '${sourceBinding.name}' as mutable reference more than once simultaneously`, line);
          return;
        }
        sourceBinding.activeMutableBorrow = targetBinding.name;
        targetBinding.borrowedFrom = sourceBinding.name;
      } else if (effectiveOwnership === 'own') {
        // Move semantics explícito
        this.performMove(sourceBinding, line);
      } else {
        // Sem ownership explícito (default: se a fonte for 'own' e não primitiva, move)
        if (sourceBinding.ownership === 'own' && !sourceBinding.isPrimitive) {
          this.performMove(sourceBinding, line);
        }
      }
    }
  }

  private performMove(sourceBinding: VariableBinding, line?: number): void {
    if (sourceBinding.state === 'Moved') {
      this.error(`[E0103] Use of moved value '${sourceBinding.name}' (already moved at line ${sourceBinding.movedAtLine ?? line})`, line);
      return;
    }
    if (sourceBinding.activeBorrows.size > 0) {
      const borrowers = Array.from(sourceBinding.activeBorrows).join(', ');
      this.error(`Cannot move '${sourceBinding.name}' because it is currently borrowed by [${borrowers}]`, line);
      return;
    }
    if (sourceBinding.activeMutableBorrow) {
      this.error(`Cannot move '${sourceBinding.name}' because it is currently mutably borrowed by '${sourceBinding.activeMutableBorrow}'`, line);
      return;
    }

    sourceBinding.state = 'Moved';
    sourceBinding.movedAtLine = line;
  }

  // ── Chamada de Função / Método com verificação de argumentos ──

  private checkCallExpr(call: CallExprNode): void {
    let paramNodes: ParamNode[] | undefined;

    if (call.callee.kind === NodeKind.Identifier) {
      const fnName = (call.callee as IdentifierNode).name;
      paramNodes = this.functionSignatures.get(fnName);
    } else if (call.callee.kind === NodeKind.MemberExpr) {
      const member = call.callee as MemberExprNode;
      // Tratar métodos normais ou chamadas de método
      if (member.object.kind === NodeKind.Identifier) {
        const objId = (member.object as IdentifierNode).name;
        const objBinding = this.currentScope.lookup(objId);
        if (objBinding && objBinding.state === 'Moved') {
          this.error(`[E0103] Use of moved value '${objId}': cannot call method '${member.property}'`, call.position?.line);
        }
      }
    }

    this.checkExpr(call.callee);

    // CSP Concurrency: ch.send(...) or chan_send(ch, ...) moves sent values
    const isChannelSendMethod = call.callee.kind === NodeKind.MemberExpr && (call.callee as MemberExprNode).property === 'send';
    const isChanSendFn = call.callee.kind === NodeKind.Identifier && (call.callee as IdentifierNode).name === 'chan_send';

    if (isChannelSendMethod && call.args.length > 0) {
      for (const arg of call.args) {
        let argId: string | undefined;
        if (arg.kind === NodeKind.Identifier) argId = (arg as IdentifierNode).name;
        else if (arg.kind === NodeKind.OwnershipExpr && (arg as OwnershipExprNode).operand.kind === NodeKind.Identifier) {
          argId = ((arg as OwnershipExprNode).operand as IdentifierNode).name;
        }
        if (argId) {
          const argBinding = this.currentScope.lookup(argId);
          if (argBinding) {
            this.performMove(argBinding, call.position?.line);
          }
        }
      }
    } else if (isChanSendFn && call.args.length >= 2) {
      const arg = call.args[1];
      let argId: string | undefined;
      if (arg.kind === NodeKind.Identifier) argId = (arg as IdentifierNode).name;
      else if (arg.kind === NodeKind.OwnershipExpr && (arg as OwnershipExprNode).operand.kind === NodeKind.Identifier) {
        argId = ((arg as OwnershipExprNode).operand as IdentifierNode).name;
      }
      if (argId) {
        const argBinding = this.currentScope.lookup(argId);
        if (argBinding) {
          this.performMove(argBinding, call.position?.line);
        }
      }
    }

    for (let i = 0; i < call.args.length; i++) {
      const arg = call.args[i];
      const param = paramNodes ? paramNodes[i] : undefined;
      this.checkExpr(arg);

      let argId: string | undefined;
      let explicitOwn: OwnershipKind | undefined;

      if (arg.kind === NodeKind.Identifier) {
        argId = (arg as IdentifierNode).name;
      } else if (arg.kind === NodeKind.OwnershipExpr) {
        const o = arg as OwnershipExprNode;
        explicitOwn = o.ownership;
        if (o.operand.kind === NodeKind.Identifier) {
          argId = (o.operand as IdentifierNode).name;
        }
      }

      if (argId) {
        const argBinding = this.currentScope.lookup(argId);
        if (argBinding) {
          const expectedOwn = explicitOwn ?? param?.ownership ?? 'none';

          if (expectedOwn === 'own') {
            this.performMove(argBinding, call.position?.line);
          } else if (expectedOwn === 'borrow') {
            if (argBinding.state === 'Moved') {
              this.error(`Cannot pass moved value '${argBinding.name}' to borrow parameter`, call.position?.line);
            }
            if (argBinding.activeMutableBorrow) {
              this.error(`Cannot borrow '${argBinding.name}' because it is currently mutably borrowed by '${argBinding.activeMutableBorrow}'`, call.position?.line);
            }
          } else if (expectedOwn === 'ref') {
            if (argBinding.state === 'Moved') {
              this.error(`Cannot pass moved value '${argBinding.name}' to ref parameter`, call.position?.line);
            }
            if (argBinding.activeBorrows.size > 0 || argBinding.activeMutableBorrow) {
              this.error(`Cannot borrow '${argBinding.name}' as mutable reference because it is already borrowed`, call.position?.line);
            }
          }
        }
      }
    }
  }

  // ── Análise de expressões ─────────────────────────────────

  private checkExpr(node: ExprNode): void {
    switch (node.kind) {
      case NodeKind.Identifier: {
        const id = node as IdentifierNode;
        const binding = this.currentScope.lookup(id.name);
        if (binding) {
          if (binding.state === 'Moved') {
            this.error(`[E0103] Use of moved value '${id.name}' (moved at line ${binding.movedAtLine ?? node.position?.line})`, node.position?.line);
          }
        }
        break;
      }

      case NodeKind.AssignExpr: {
        const assign = node as AssignExprNode;
        this.checkExpr(assign.value);

        if (assign.target.kind === NodeKind.Identifier) {
          const targetId = (assign.target as IdentifierNode).name;
          const binding = this.currentScope.lookup(targetId);
          if (binding) {
            // Se o alvo tem empréstimos ativos, não pode ser modificado
            if (binding.activeBorrows.size > 0) {
              this.error(`Cannot assign to '${targetId}' because it is currently borrowed`, node.position?.line);
            } else if (binding.activeMutableBorrow) {
              this.error(`Cannot assign to '${targetId}' because it is currently mutably borrowed by '${binding.activeMutableBorrow}'`, node.position?.line);
            } else {
              // Re-inicializa a variável se ela havia sido movida
              binding.state = 'Valid';
              binding.movedAtLine = undefined;
            }
            this.processTransferOrBorrow(binding, assign.value, node.position?.line);
          }
        } else {
          this.checkExpr(assign.target);
        }
        break;
      }

      case NodeKind.CallExpr: {
        this.checkCallExpr(node as CallExprNode);
        break;
      }

      case NodeKind.MemberExpr: {
        const member = node as MemberExprNode;
        if (member.object.kind === NodeKind.Identifier) {
          const objId = (member.object as IdentifierNode).name;
          const binding = this.currentScope.lookup(objId);
          if (binding && binding.state === 'Moved') {
            this.error(`[E0103] Use of moved value '${objId}': cannot access property '${member.property}'`, node.position?.line);
          }
        }
        this.checkExpr(member.object);
        break;
      }

      case NodeKind.CoalesceExpr: {
        const c = node as any;
        this.checkExpr(c.left);
        this.checkExpr(c.right);
        break;
      }

      case NodeKind.OwnershipExpr: {
        const o = node as OwnershipExprNode;
        this.checkExpr(o.operand);
        break;
      }

      case NodeKind.BinaryExpr: {
        const bin = node as BinaryExprNode;
        this.checkExpr(bin.left);
        this.checkExpr(bin.right);
        break;
      }

      case NodeKind.UnaryExpr: {
        this.checkExpr((node as UnaryExprNode).operand);
        break;
      }

      case NodeKind.ArrayLiteral: {
        const arr = node as any;
        for (const el of arr.elements) this.checkExpr(el);
        break;
      }

      case NodeKind.NewExpr: {
        const newExpr = node as any;
        for (const arg of newExpr.args) this.checkExpr(arg);
        for (const f of newExpr.structInit) this.checkExpr(f.value);
        break;
      }

      case NodeKind.IndexExpr: {
        const idx = node as any;
        this.checkExpr(idx.object);
        this.checkExpr(idx.index);
        break;
      }

      default:
        break;
    }
  }

  // ── Blocos e Escopos Léxicos ──────────────────────────────

  private checkBlock(block: BlockNode): void {
    const blockScope = new LifetimeScope(this.currentScope);
    const outerScope = this.currentScope;
    this.currentScope = blockScope;

    for (const stmt of block.body) {
      this.checkNode(stmt);
    }

    // Ao sair do escopo, liberar todos os empréstimos concedidos a variáveis locais deste escopo
    for (const localBinding of blockScope.getAllLocalBindings()) {
      if (localBinding.borrowedFrom) {
        const original = this.currentScope.lookup(localBinding.borrowedFrom);
        if (original) {
          original.activeBorrows.delete(localBinding.name);
          if (original.activeMutableBorrow === localBinding.name) {
            original.activeMutableBorrow = undefined;
          }
        }
      }
    }

    this.currentScope = outerScope;
  }

  private checkFnDecl(fn: FnDeclNode): void {
    const fnScope = new LifetimeScope(this.currentScope);
    const outer = this.currentScope;
    this.currentScope = fnScope;

    for (const param of fn.params) {
      fnScope.define({
        name: param.name,
        ownership: param.ownership,
        state: 'Valid',
        isPrimitive: this.isPrimitiveType(param.typeAnnot),
        activeBorrows: new Set(),
        declaredLine: param.position?.line,
      });
    }

    if (fn.body.kind === NodeKind.Block) {
      this.checkBlock(fn.body as BlockNode);
    } else {
      this.checkExpr(fn.body as ExprNode);
    }

    this.currentScope = outer;
  }

  private checkClassDecl(cls: ClassDeclNode): void {
    const classScope = new LifetimeScope(this.currentScope);
    const outer = this.currentScope;
    this.currentScope = classScope;

    for (const member of cls.members) {
      if (member.kind === NodeKind.MethodDecl) {
        this.checkFnDecl(member as unknown as FnDeclNode);
      } else if (member.kind === NodeKind.ConstructorDecl) {
        const ctor = member as any;
        const ctorScope = new LifetimeScope(classScope);
        this.currentScope = ctorScope;
        for (const p of ctor.params) {
          ctorScope.define({
            name: p.name,
            ownership: p.ownership,
            state: 'Valid',
            isPrimitive: this.isPrimitiveType(p.typeAnnot),
            activeBorrows: new Set(),
            declaredLine: p.position?.line,
          });
        }
        this.checkBlock(ctor.body);
        this.currentScope = classScope;
      }
    }

    this.currentScope = outer;
  }

  private checkReturn(ret: ReturnStmtNode): void {
    if (ret.value) {
      this.checkExpr(ret.value);
    }
  }

  private checkIf(node: IfStmtNode): void {
    this.checkExpr(node.condition);
    this.checkBlock(node.then);
    for (const elif of node.elif) {
      this.checkExpr(elif.condition);
      this.checkBlock(elif.block);
    }
    if (node.else) {
      this.checkBlock(node.else);
    }
  }

  private checkWhile(node: WhileStmtNode): void {
    this.checkExpr(node.condition);
    this.checkBlock(node.body);
  }

  private checkFor(node: ForStmtNode): void {
    this.checkExpr(node.iterable);
    const forScope = new LifetimeScope(this.currentScope);
    const outer = this.currentScope;
    this.currentScope = forScope;
    forScope.define({
      name: node.variable,
      ownership: 'none',
      state: 'Valid',
      isPrimitive: false,
      activeBorrows: new Set(),
      declaredLine: node.position?.line,
    });
    this.checkBlock(node.body);
    this.currentScope = outer;
  }

  private checkMatch(node: MatchStmtNode): void {
    this.checkExpr(node.value);
    for (const arm of node.arms) {
      const armScope = new LifetimeScope(this.currentScope);
      const outer = this.currentScope;
      this.currentScope = armScope;
      if (arm.pattern.kind === 'some' || arm.pattern.kind === 'ok' || arm.pattern.kind === 'err' || arm.pattern.kind === 'identifier') {
        armScope.define({
          name: (arm.pattern as any).name,
          ownership: 'none',
          state: 'Valid',
          isPrimitive: false,
          activeBorrows: new Set(),
        });
      }
      if (arm.guard) this.checkExpr(arm.guard);
      if (arm.body.kind === NodeKind.Block) this.checkBlock(arm.body as BlockNode);
      else this.checkExpr(arm.body as ExprNode);
      this.currentScope = outer;
    }
  }

  // ── Utilitários ───────────────────────────────────────────

  private isPrimitiveType(typeAnnot?: any): boolean {
    if (!typeAnnot) return false;
    if (typeAnnot.kind === NodeKind.TypeRef) {
      const primitives = ['int', 'float', 'bool', 'char', 'void', 'null'];
      return primitives.includes(typeAnnot.name);
    }
    return false;
  }

  private error(message: string, line?: number, col?: number): void {
    this.errors.push(new SemanticError(message, line, col));
  }

  getErrors(): SemanticError[] {
    return this.errors;
  }
}
