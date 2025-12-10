import { Token, TokenType } from './token';

export interface Expr {
    getChildren(): Expr[];
    rp(): string;
    toString(): string;
}

export class Leaf implements Expr {
    constructor(public token: Token) {}

    getChildren(): Expr[] { return []; }
    rp(): string { return this.token.lexeme; }
    toString(): string { return this.token.lexeme; }
}

export class Node implements Expr {
    public operands: Expr[] = [];
    public children: Expr[] = [];

    constructor(public operator: Token, ...operands: Expr[]) {
        this.operands = operands;
        this.children = [...operands];
    }

    getChildren(): Expr[] { return this.children; }
    
    rp(): string {
        const flatOperands = this.operands.map(t => " " + t.rp()).join("");
        return `(${this.operator.lexeme}${flatOperands})`;
    }

    toString(): string {
        // ... (Keep existing toString logic)
        if (this.operands.length === 1) {
            return `(${this.operator.lexeme}${this.operands[0]})`;
        }
        if (this.operands.length === 2) {
            if (this.operator.type === TokenType.DOT) {
                return `${this.operands[0]}${this.operator.lexeme}${this.operands[1]}`;
            }
            if (this.operator.type === TokenType.LEFT_BRACKET) {
                return `${this.operands[0]}[${this.operands[1]}]`;
            }
            return `(${this.operands[0]} ${this.operator.lexeme} ${this.operands[1]})`;
        }
        if (this.operands.length === 3) {
            return `(${this.operands[0]} ${this.operator.lexeme} ${this.operands[1]}:${this.operands[2]})`;
        }
        return `(${this.operator.lexeme} ${this.operands.map(o => o.toString()).join(" ")})`;
    }
}

export class FunctionCall implements Expr {
    constructor(public func: Expr, public args: Expr[] = []) {}
    getChildren(): Expr[] { return [this.func, ...this.args]; }
    rp(): string { return `(${this.func.rp()} ${this.args.map(a => a.rp()).join(" ")})`; }
    toString(): string { return `${this.func}(${this.args.map(a => a.toString()).join(", ")})`; }
}

export class LambdaFunction implements Expr {
    public parameters: Leaf[];
    constructor(parameters: Token[], public body: Expr) {
        this.parameters = parameters.map(token => new Leaf(token));
    }
    getChildren(): Expr[] { return [this.body]; }
    rp(): string { return `lambda (${this.parameters.map(p => p.toString()).join(" ")}) -> ${this.body.rp()} end`; }
    toString(): string { return `lambda (${this.parameters.map(p => p.toString()).join(", ")}) -> ${this.body} end`; }
}

// New Types for Full Script Support

export class Script implements Expr {
    constructor(public statements: Expr[]) {}
    getChildren(): Expr[] { return this.statements; }
    rp(): string { return this.statements.map(s => s.rp()).join(" ; "); }
    toString(): string { return this.statements.map(s => s.toString()).join(";\n"); }
}

export class Block implements Expr {
    constructor(public statements: Expr[]) {}
    getChildren(): Expr[] { return this.statements; }
    rp(): string { return `{ ${this.statements.map(s => s.rp()).join(" ; ")} }`; }
    toString(): string { return `{\n${this.statements.map(s => s.toString()).join(";\n")}\n}`; }
}

export class IfExpr implements Expr {
    constructor(
        public condition: Expr,
        public thenBlock: Block,
        public elseBlock?: Block | IfExpr // else if is IfExpr
    ) {}
    getChildren(): Expr[] { 
        const children = [this.condition, this.thenBlock];
        if (this.elseBlock) children.push(this.elseBlock);
        return children;
    }
    rp(): string { return `(if ${this.condition.rp()} ${this.thenBlock.rp()} ${this.elseBlock ? this.elseBlock.rp() : ''})`; }
    toString(): string { return `if ${this.condition} ${this.thenBlock} ${this.elseBlock ? 'else ' + this.elseBlock : ''}`; }
}

export class ForExpr implements Expr {
    constructor(
        public varName: Token,
        public collection: Expr,
        public body: Block,
        public indexVar?: Token, // for index, val in ...
    ) {}
    getChildren(): Expr[] { return [this.collection, this.body]; }
    rp(): string { return `(for ${this.varName.lexeme} in ${this.collection.rp()} ${this.body.rp()})`; }
    toString(): string { return `for ${this.varName.lexeme} in ${this.collection} ${this.body}`; }
}

export class WhileExpr implements Expr {
    constructor(
        public condition: Expr,
        public body: Block
    ) {}
    getChildren(): Expr[] { return [this.condition, this.body]; }
    rp(): string { return `(while ${this.condition.rp()} ${this.body.rp()})`; }
    toString(): string { return `while ${this.condition} ${this.body}`; }
}

export class ReturnStmt implements Expr {
    constructor(public value?: Expr) {}
    getChildren(): Expr[] { return this.value ? [this.value] : []; }
    rp(): string { return `(return ${this.value ? this.value.rp() : 'nil'})`; }
    toString(): string { return `return ${this.value || ''}`; }
}

export class BreakStmt implements Expr {
    getChildren(): Expr[] { return []; }
    rp(): string { return '(break)'; }
    toString(): string { return 'break'; }
}

export class ContinueStmt implements Expr {
    getChildren(): Expr[] { return []; }
    rp(): string { return '(continue)'; }
    toString(): string { return 'continue'; }
}

export class LetStmt implements Expr {
    constructor(public varName: Token, public value: Expr) {}
    getChildren(): Expr[] { return [this.value]; }
    rp(): string { return `(let ${this.varName.lexeme} = ${this.value.rp()})`; }
    toString(): string { return `let ${this.varName.lexeme} = ${this.value}`; }
}

export class TryCatchExpr implements Expr {
    constructor(
        public tryBlock: Block,
        public catchBlocks: CatchBlock[],
        public finallyBlock?: Block
    ) {}
    getChildren(): Expr[] { return [this.tryBlock, ...this.catchBlocks, ...(this.finallyBlock ? [this.finallyBlock] : [])]; }
    rp(): string { return `(try ${this.tryBlock.rp()} ...)`; }
    toString(): string { return `try ${this.tryBlock} ...`; }
}

export class CatchBlock implements Expr {
    constructor(
        public errorType: Token | null, // null for catch(e)
        public varName: Token,
        public body: Block
    ) {}
    getChildren(): Expr[] { return [this.body]; }
    rp(): string { return `(catch ${this.errorType ? this.errorType.lexeme : ''} ${this.varName.lexeme} ${this.body.rp()})`; }
    toString(): string { return `catch(${this.errorType ? this.errorType.lexeme + ' ' : ''}${this.varName.lexeme}) ${this.body}`; }
}

export class ThrowStmt implements Expr {
    constructor(public value: Expr) {}
    getChildren(): Expr[] { return [this.value]; }
    rp(): string { return `(throw ${this.value.rp()})`; }
    toString(): string { return `throw ${this.value}`; }
}

export class FnStmt implements Expr {
    constructor(
        public name: Token,
        public params: Token[],
        public body: Block,
        public isVarArg: boolean = false
    ) {}
    getChildren(): Expr[] { return [this.body]; }
    rp(): string { return `(fn ${this.name.lexeme} ...)`; }
    toString(): string { return `fn ${this.name.lexeme}(...) ${this.body}`; }
}
