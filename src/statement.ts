import { Token } from './token';
import { Expr } from './ast';

// Control flow signals
export class ControlFlowSignal {
    constructor(public type: 'break' | 'continue' | 'return', public value?: any) {}
}

// Base interface for statements
export interface Stmt {
    execute(interpreter: any): any;
}

// Expression statement (an expression used as a statement)
export class ExprStmt implements Stmt {
    constructor(public expr: Expr) {}
    execute(interpreter: any): any {
        return interpreter.evaluate(this.expr);
    }
}

// Let statement: let x = expr
export class LetStmt implements Stmt {
    constructor(public name: Token, public initializer: Expr) {}
    execute(interpreter: any): any {
        const value = interpreter.evaluate(this.initializer);
        interpreter.define(this.name.lexeme, value);
        return null; // let statement returns nil
    }
}

// If statement: if cond { then } elsif cond2 { then2 } else { else }
export class IfStmt implements Stmt {
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
    constructor(public condition: Expr, public body: Stmt[]) {}
    
    execute(interpreter: any): any {
        let lastValue: any = null;
        while (interpreter.evaluate(this.condition)) {
            try {
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
            } catch (signal: any) {
                if (signal instanceof ControlFlowSignal) {
                    if (signal.type === 'break') return null;
                    if (signal.type === 'continue') continue;
                    if (signal.type === 'return') return signal;
                }
                throw signal;
            }
        }
        return lastValue;
    }
}

// For statement: for item in seq { body }
export class ForStmt implements Stmt {
    constructor(
        public indexVar: Token | null, // optional index/key variable
        public itemVar: Token,
        public iterable: Expr,
        public body: Stmt[]
    ) {}

    execute(interpreter: any): any {
        const seq = interpreter.evaluate(this.iterable);
        if (!seq || typeof seq[Symbol.iterator] !== 'function') {
            throw new Error(`Expression is not iterable: ${this.iterable}`);
        }

        let lastValue: any = null;
        let index = 0;

        // Handle Map iteration
        if (seq instanceof Map) {
            for (const [key, value] of seq) {
                interpreter.define(this.itemVar.lexeme, this.indexVar ? { key, value } : { key, value });
                if (this.indexVar) {
                    interpreter.define(this.indexVar.lexeme, key);
                }
                try {
                    lastValue = interpreter.executeBlock(this.body);
                    if (lastValue instanceof ControlFlowSignal) {
                        if (lastValue.type === 'break') return null;
                        if (lastValue.type === 'continue') { lastValue = null; continue; }
                        if (lastValue.type === 'return') return lastValue;
                    }
                } catch (signal: any) {
                    if (signal instanceof ControlFlowSignal) {
                        if (signal.type === 'break') return null;
                        if (signal.type === 'continue') continue;
                        if (signal.type === 'return') return signal;
                    }
                    throw signal;
                }
                index++;
            }
        } else {
            // Arrays, Sets, Lists
            for (const item of seq) {
                if (this.indexVar) {
                    interpreter.define(this.indexVar.lexeme, index);
                }
                interpreter.define(this.itemVar.lexeme, item);
                
                try {
                    lastValue = interpreter.executeBlock(this.body);
                    if (lastValue instanceof ControlFlowSignal) {
                        if (lastValue.type === 'break') return null;
                        if (lastValue.type === 'continue') { lastValue = null; continue; }
                        if (lastValue.type === 'return') return lastValue;
                    }
                } catch (signal: any) {
                    if (signal instanceof ControlFlowSignal) {
                        if (signal.type === 'break') return null;
                        if (signal.type === 'continue') continue;
                        if (signal.type === 'return') return signal;
                    }
                    throw signal;
                }
                index++;
            }
        }
        return lastValue;
    }
}

// Function definition: fn name(params) { body }
export class FnStmt implements Stmt {
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
    constructor(public value: Expr | null) {}
    execute(interpreter: any): any {
        const val = this.value ? interpreter.evaluate(this.value) : null;
        return new ControlFlowSignal('return', val);
    }
}

// Break statement
export class BreakStmt implements Stmt {
    execute(interpreter: any): any {
        return new ControlFlowSignal('break');
    }
}

// Continue statement
export class ContinueStmt implements Stmt {
    execute(interpreter: any): any {
        return new ControlFlowSignal('continue');
    }
}

// Block statement: { stmts }
export class BlockStmt implements Stmt {
    constructor(public statements: Stmt[]) {}
    execute(interpreter: any): any {
        return interpreter.executeBlock(this.statements);
    }
}

