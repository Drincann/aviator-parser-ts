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
