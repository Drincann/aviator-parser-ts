import { Token } from './token';
import { Expr } from './ast';

// Control flow signals
export class ControlFlowSignal {
    constructor(public type: 'break' | 'continue' | 'return', public value?: any) {}
}

// Base interface for statements
export interface Stmt {
    execute(interpreter: any): any;
    hasSemicolon?: boolean; // Track if statement ends with semicolon
    type?: string; // Statement type identifier (for minification-safe type checking)
}

// Expression statement (an expression used as a statement)
export class ExprStmt implements Stmt {
    public readonly type = 'ExprStmt';
    public hasSemicolon: boolean = false;
    
    constructor(public expr: Expr, hasSemicolon: boolean = false) {
        this.hasSemicolon = hasSemicolon;
    }
    
    execute(interpreter: any): any {
        const result = interpreter.evaluate(this.expr);
        // If has semicolon, return nil (unless it's an assignment which already returns value)
        return this.hasSemicolon ? null : result;
    }
}

// Let statement: let x = expr
export class LetStmt implements Stmt {
    public readonly type = 'LetStmt';
    constructor(public name: Token, public initializer: Expr) {}
    execute(interpreter: any): any {
        const value = interpreter.evaluate(this.initializer);
        interpreter.define(this.name.lexeme, value);
        return null; // let statement returns nil
    }
}

// If statement: if cond { then } elsif cond2 { then2 } else { else }
export class IfStmt implements Stmt {
    public readonly type = 'IfStmt';
    constructor(
        public condition: Expr,
        public thenBranch: Stmt[],
        public elsifBranches: Array<{ condition: Expr, body: Stmt[] }>,
        public elseBranch: Stmt[] | null
    ) {}

    execute(interpreter: any): any {
        if (interpreter.evaluate(this.condition)) {
            return interpreter.executeBlock(this.thenBranch);
        }
        for (const elsif of this.elsifBranches) {
            if (interpreter.evaluate(elsif.condition)) {
                return interpreter.executeBlock(elsif.body);
            }
        }
        if (this.elseBranch) {
            return interpreter.executeBlock(this.elseBranch);
        }
        return null; // Default nil
    }
}

// While statement: while cond { body }
export class WhileStmt implements Stmt {
    public readonly type = 'WhileStmt';
    constructor(public condition: Expr, public body: Stmt[]) {}
    
    execute(interpreter: any): any {
        let lastValue: any = null;
        while (interpreter.evaluate(this.condition)) {
            lastValue = interpreter.executeBlock(this.body);
            if (lastValue instanceof ControlFlowSignal) {
                if (lastValue.type === 'break') {
                    return null; // break returns nil
                }
                if (lastValue.type === 'continue') {
                    lastValue = null;
                    continue;
                }
                if (lastValue.type === 'return') {
                    return lastValue; // propagate return
                }
            }
        }
        return lastValue;
    }
}

// For statement: for item in seq { body }
export class ForStmt implements Stmt {
    public readonly type = 'ForStmt';
    constructor(
        public indexVar: Token | null, // optional index/key variable
        public itemVar: Token,
        public iterable: Expr,
        public body: Stmt[]
    ) {}

    execute(interpreter: any): any {
        const seq = interpreter.evaluate(this.iterable);
        if (!seq) {
            throw new Error(`Expression is null: ${this.iterable}`);
        }

        let lastValue: any = null;
        let index = 0;

        // Handle Map iteration
        if (seq instanceof Map) {
            for (const [key, value] of seq) {
                if (this.indexVar) {
                    interpreter.define(this.indexVar.lexeme, key);
                    interpreter.define(this.itemVar.lexeme, value);
                } else {
                    interpreter.define(this.itemVar.lexeme, { key, value });
                }
                
                lastValue = interpreter.executeBlock(this.body);
                if (lastValue instanceof ControlFlowSignal) {
                    if (lastValue.type === 'break') return null;
                    if (lastValue.type === 'continue') { lastValue = null; continue; }
                    if (lastValue.type === 'return') return lastValue;
                }
                index++;
            }
        } else if (typeof seq[Symbol.iterator] === 'function') {
            // Arrays, Sets, Lists, etc.
            for (const item of seq) {
                if (this.indexVar) {
                    interpreter.define(this.indexVar.lexeme, index);
                }
                interpreter.define(this.itemVar.lexeme, item);
                
                lastValue = interpreter.executeBlock(this.body);
                if (lastValue instanceof ControlFlowSignal) {
                    if (lastValue.type === 'break') return null;
                    if (lastValue.type === 'continue') { lastValue = null; continue; }
                    if (lastValue.type === 'return') return lastValue;
                }
                index++;
            }
        } else {
            throw new Error(`Expression is not iterable: ${this.iterable}`);
        }
        
        return lastValue;
    }
}

// Function definition: fn name(params) { body }
export class FnStmt implements Stmt {
    public readonly type = 'FnStmt';
    constructor(
        public name: Token,
        public params: Token[],
        public body: Stmt[]
    ) {}

    execute(interpreter: any): any {
        const func = interpreter.createFunction(this.params, this.body);
        interpreter.define(this.name.lexeme, func);
        return null; // fn definition returns nil
    }
}

// Return statement: return expr
export class ReturnStmt implements Stmt {
    public readonly type = 'ReturnStmt';
    constructor(public value: Expr | null) {}
    execute(interpreter: any): any {
        const val = this.value ? interpreter.evaluate(this.value) : null;
        return new ControlFlowSignal('return', val);
    }
}

// Break statement
export class BreakStmt implements Stmt {
    public readonly type = 'BreakStmt';
    execute(interpreter: any): any {
        return new ControlFlowSignal('break');
    }
}

// Continue statement
export class ContinueStmt implements Stmt {
    public readonly type = 'ContinueStmt';
    execute(interpreter: any): any {
        return new ControlFlowSignal('continue');
    }
}

// Block statement: { stmts }
export class BlockStmt implements Stmt {
    public readonly type = 'BlockStmt';
    constructor(public statements: Stmt[]) {}
    execute(interpreter: any): any {
        return interpreter.executeBlock(this.statements);
    }
}

// Throw statement: throw expr
export class ThrowStmt implements Stmt {
    public readonly type = 'ThrowStmt';
    constructor(public value: Expr) {}
    execute(interpreter: any): any {
        const exception = interpreter.evaluate(this.value);
        throw exception;
    }
}
export class TryStmt implements Stmt {
    public readonly type = 'TryStmt';
    constructor(
        public tryBlock: Stmt[],
        public catchVar: Token | null,
        public catchBlock: Stmt[] | null,
        public finallyBlock: Stmt[] | null
    ) {}

    execute(interpreter: any): any {
        try {
            return interpreter.executeBlock(this.tryBlock);
        } catch (e: any) {
            if (this.catchBlock) {
                const catchEnv: Record<string, any> = {};
                if (this.catchVar) {
                    catchEnv[this.catchVar.lexeme] = e;
                }
                return interpreter.executeBlock(this.catchBlock, catchEnv);
            }
        } finally {
            if (this.finallyBlock) {
                interpreter.executeBlock(this.finallyBlock);
            }
        }
        return null;
    }
}
