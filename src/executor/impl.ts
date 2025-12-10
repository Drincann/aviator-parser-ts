import { PendingExecution, ExpressionRuntime } from './types';
import { Expr, Node, Leaf, FunctionCall, LambdaFunction } from '../ast';
import { TokenType } from '../token';
import { ScopedSet } from '../util';

export class ValueExecution implements PendingExecution {
    private node: Expr;
    private runtime: ExpressionRuntime;
    private identifiers: Set<string>;
    private context: Map<string, any>;
    private resultCache: boolean | null = null;

    constructor(runtime: ExpressionRuntime, node: Expr) {
        this.node = node;
        this.runtime = runtime;
        this.context = new Map();
        this.identifiers = this.extractGlobalVars(node);
    }

    private extractGlobalVars(expr: Expr): Set<string> {
        const global = ScopedSet.create<string>();
        this.dfs(expr, global);
        return global.getScope();
    }

    private dfs(expr: Expr, vars: ScopedSet<string>): void {
        if (expr instanceof Leaf) {
            const token = expr.token;
            if (token.type === TokenType.IDENTIFIER) {
                if (!vars.contains(token.lexeme)) {
                    this.addIfNotBuiltin(vars, token.lexeme);
                }
            }
        }

        if (expr instanceof Node) {
            if (expr.operator.type === TokenType.DOT) {
                const left = expr.getChildren()[0];
                if (this.isIdentifier(left)) {
                    this.addIfNotBuiltin(vars, left.toString());
                    return;
                }
            }
            for (const child of expr.getChildren()) {
                this.dfs(child, vars);
            }
        }

        if (expr instanceof FunctionCall) {
            this.dfs(expr.func, vars);
            for (const arg of expr.args) {
                this.dfs(arg, vars);
            }
        }

        if (expr instanceof LambdaFunction) {
            const lambdaVars = vars.enter();
            lambdaVars.addAll(expr.parameters.map(p => p.toString()));
            this.dfs(expr.body, lambdaVars);
        }
    }

    private addIfNotBuiltin(vars: ScopedSet<string>, identifier: string): void {
        if (this.runtime.getBuiltinIdentifiers().has(identifier)) {
            return;
        }
        vars.addTopScope(identifier);
    }

    private isIdentifier(node: Expr): boolean {
        return node instanceof Leaf && node.token.type === TokenType.IDENTIFIER;
    }

    public provide(symbol: string, value: any): PendingExecution {
        if (this.identifiers.has(symbol)) {
            this.context.set(symbol, value);
        }
        return this;
    }

    public canExecute(): boolean {
        for (const id of this.identifiers) {
            if (!this.context.has(id)) {
                return false;
            }
        }
        return true;
    }

    public execute(): boolean {
        if (this.resultCache === null) {
            const contextObj: Record<string, any> = {};
            this.context.forEach((v, k) => contextObj[k] = v);
            
            const result = this.runtime.run(this.node.toString(), contextObj);
            if (typeof result !== 'boolean') {
                throw new Error("type error: expected boolean result");
            }
            this.resultCache = result;
        }
        return this.resultCache;
    }
}

export class AndExecution implements PendingExecution {
    private resultCache: boolean | null = null;

    constructor(
        private left: PendingExecution,
        private right: PendingExecution
    ) {}

    provide(symbol: string, value: any): PendingExecution {
        this.left.provide(symbol, value);
        this.right.provide(symbol, value);
        return this;
    }

    canExecute(): boolean {
        if (this.left.canExecute() && this.right.canExecute()) {
            return true;
        }
        if (this.left.canExecute()) {
            // Check if left is false (short circuit)
             // We can't know result unless we execute. 
             // Java code: if (left.canExecute() && !left.execute()) return true;
             // This assumes executing twice is safe (idempotent/cached).
             // ValueExecution caches result.
            try {
                if (!this.left.execute()) return true;
            } catch (e) {
                // ignore
            }
        }
        if (this.right.canExecute()) {
             try {
                if (!this.right.execute()) return true;
            } catch (e) {
                // ignore
            }
        }
        return false;
    }

    execute(): boolean {
        if (this.resultCache === null) {
            if (this.left.canExecute() && this.right.canExecute()) {
                this.resultCache = this.left.execute() && this.right.execute();
                return this.resultCache;
            }
            if (this.left.canExecute() && !this.left.execute()) {
                this.resultCache = false;
                return false;
            }
            if (this.right.canExecute() && !this.right.execute()) {
                this.resultCache = false;
                return false;
            }
            throw new Error("cannot execute");
        }
        return this.resultCache;
    }
}

export class OrExecution implements PendingExecution {
    private resultCache: boolean | null = null;

    constructor(
        private left: PendingExecution,
        private right: PendingExecution
    ) {}

    provide(symbol: string, value: any): PendingExecution {
        this.left.provide(symbol, value);
        this.right.provide(symbol, value);
        return this;
    }

    canExecute(): boolean {
        if (this.left.canExecute() && this.right.canExecute()) {
            return true;
        }
        if (this.left.canExecute()) {
            try {
                if (this.left.execute()) return true; // Short circuit true
            } catch (e) {}
        }
        if (this.right.canExecute()) {
            try {
                if (this.right.execute()) return true; // Short circuit true
            } catch (e) {}
        }
        return false;
    }

    execute(): boolean {
        if (this.resultCache === null) {
            if (this.left.canExecute() && this.right.canExecute()) {
                this.resultCache = this.left.execute() || this.right.execute();
                return this.resultCache;
            }
            if (this.left.canExecute() && this.left.execute()) {
                this.resultCache = true;
                return true;
            }
            if (this.right.canExecute() && this.right.execute()) {
                this.resultCache = true;
                return true;
            }
            throw new Error("cannot execute");
        }
        return this.resultCache;
    }
}

export class NotExecution implements PendingExecution {
    private resultCache: boolean | null = null;

    constructor(private child: PendingExecution) {}

    provide(symbol: string, value: any): PendingExecution {
        this.child.provide(symbol, value);
        return this;
    }

    canExecute(): boolean {
        return this.child.canExecute();
    }

    execute(): boolean {
        if (this.resultCache === null) {
            this.resultCache = !this.child.execute();
        }
        return this.resultCache;
    }
}

export class ConditionalExecution implements PendingExecution {
    private resultCache: boolean | null = null;

    constructor(
        private condition: PendingExecution,
        private thenExpr: PendingExecution,
        private elseExpr: PendingExecution
    ) {}

    provide(symbol: string, value: any): PendingExecution {
        this.condition.provide(symbol, value);
        this.thenExpr.provide(symbol, value);
        this.elseExpr.provide(symbol, value);
        return this;
    }

    canExecute(): boolean {
        if (this.condition.canExecute()) {
            if (this.condition.execute()) {
                return this.thenExpr.canExecute();
            } else {
                return this.elseExpr.canExecute();
            }
        }
        return false;
    }

    execute(): boolean {
        if (this.resultCache === null) {
            if (this.condition.execute()) {
                this.resultCache = this.thenExpr.execute();
            } else {
                this.resultCache = this.elseExpr.execute();
            }
        }
        return this.resultCache;
    }
}

