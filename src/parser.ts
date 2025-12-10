import { AviatorLexer } from './lexer';
import { Token, TokenType } from './token';
import { BindingPower } from './binding_power';
import { Expr, Node, Leaf, FunctionCall, LambdaFunction } from './ast';

export class Pratt {
    private lexer: AviatorLexer;
    private token: Token | null = null;
    private lookahead: Token | null = null;
    private result: Expr | null = null;

    constructor(lexer: AviatorLexer) {
        this.lexer = lexer;
    }

    public static parse(code: string): Expr {
        return new Pratt(new AviatorLexer(code)).parse();
    }

    public parse(): Expr {
        if (this.result != null) {
            return this.result;
        }
        this.next();
        this.result = this.expr(0);
        return this.result;
    }

    private expr(ubp: number): Expr {
        let left = this.primary();

        while (true) {
            if (this.peekType(TokenType.EOF)) {
                break;
            }

            const op = this.peek();

            if (BindingPower.isInfix(op)) {
                const lbp = BindingPower.infixLeft(op);
                if (lbp < ubp) {
                    break;
                }

                left = this.infixExpr(left, op);
                continue;
            }

            if (BindingPower.isPostfix(op)) {
                const rbp = BindingPower.postfix(op);
                if (rbp < ubp) {
                    break;
                }

                left = this.postfixExpr(left, op);
                continue;
            }

            break;
        }

        return left;
    }

    private primary(): Expr {
        if (this.peekType(TokenType.LEFT_PAREN)) {
            return this.subExpr();
        }

        if (this.peekLeaf()) {
            return this.leaf();
        }

        if (this.peekUnary()) {
            return this.prefixExpr();
        }

        if (this.peekType(TokenType.LAMBDA)) {
            return this.lambda();
        }

        throw new Error("Unexpected primary token: " + this.getToken());
    }

    private prefixExpr(): Node {
        this.next();
        const op = this.getToken();
        const right = this.expr(BindingPower.prefix(this.getToken()));
        return new Node(op, right);
    }

    private infixExpr(left: Expr, op: Token): Expr {
        this.next();
        if (this.tokenIs(TokenType.CONDITIONAL)) {
            return this.conditional(left, op);
        }

        return new Node(op, left, this.expr(BindingPower.infixRight(op)));
    }

    private postfixExpr(left: Expr, op: Token): Expr {
        this.next();
        if (this.tokenIs(TokenType.LEFT_BRACKET)) {
            left = this.objectAccess(left, op);
        }

        if (this.tokenIs(TokenType.LEFT_PAREN)) {
            left = this.functionCall(left);
        }

        return left;
    }

    private subExpr(): Expr {
        this.eat(TokenType.LEFT_PAREN);
        const expr = this.expr(0);
        this.eat(TokenType.RIGHT_PAREN);
        return expr;
    }

    private leaf(): Leaf {
        return new Leaf(this.next());
    }

    private lambda(): LambdaFunction {
        this.eat(TokenType.LAMBDA);
        this.eat(TokenType.LEFT_PAREN);
        const parameters: Token[] = [];
        while (!this.tokenIs(TokenType.RIGHT_PAREN)) {
            parameters.push(this.next());
            if (this.peekType(TokenType.RIGHT_PAREN)) {
                break;
            }
            this.eat(TokenType.COMMA);
        }
        this.eat(TokenType.RIGHT_PAREN);
        this.eat(TokenType.ARROW);
        const body = this.expr(0);
        this.eat(TokenType.END);
        return new LambdaFunction(parameters, body);
    }

    private conditional(left: Expr, op: Token): Expr {
        const thenExpr = this.expr(0);
        this.eat(TokenType.COLON);
        const elseExpr = this.expr(BindingPower.infixRight(op));
        return new Node(op, left, thenExpr, elseExpr);
    }

    private objectAccess(left: Expr, op: Token): Expr {
        const subexpr = this.expr(0);
        this.eat(TokenType.RIGHT_BRACKET);
        return new Node(op, left, subexpr);
    }

    private functionCall(left: Expr): Expr {
        const args: Expr[] = [];
        // Check for immediate closing paren first
        if (this.peekType(TokenType.RIGHT_PAREN)) {
            this.eat(TokenType.RIGHT_PAREN);
            return new FunctionCall(left, args);
        }
        
        while (true) {
            args.push(this.expr(0));
            if (this.peekType(TokenType.RIGHT_PAREN)) {
                break;
            }
            // If not closing paren, expect COMMA.
            // If we hit EOF or something else, it will throw in next iteration or next eat.
            this.eat(TokenType.COMMA);
        }
        this.eat(TokenType.RIGHT_PAREN);
        return new FunctionCall(left, args);
    }

    private getToken(): Token {
        if (!this.token) {
            throw new Error("Token is null. Parser not initialized?");
        }
        return this.token;
    }

    private tokenIs(type: TokenType): boolean {
        return this.getToken().type === type;
    }

    private peekUnary(): boolean {
        return this.peekType(TokenType.SUBTRACT) || 
               this.peekType(TokenType.LOGIC_NOT) || 
               this.peekType(TokenType.BIT_NOT);
    }

    private peekLeaf(): boolean {
        return this.peekType(TokenType.NUMBER) || 
               this.peekType(TokenType.IDENTIFIER) || 
               this.peekType(TokenType.STRING) || 
               this.peekType(TokenType.TRUE) || 
               this.peekType(TokenType.FALSE) || 
               this.peekType(TokenType.NIL) || 
               this.peekType(TokenType.REGEX);
    }

    private next(): Token {
        this.token = this.lookahead;
        this.lookahead = this.lexer.next();
        return this.token!;
    }

    private peek(): Token {
        return this.lookahead!;
    }

    private peekType(type: TokenType): boolean {
        if (!this.peek()) return type === TokenType.EOF; // If peek is null/undefined, it's effectively EOF? No, lookahead initialized.
        return this.peek().type === type;
    }

    private eat(type: TokenType): void {
        this.next();
        if (!this.tokenIs(type)) {
            // Special handling for EOF/Error reporting
            throw new Error(`Expect ${type} but got: ${this.getToken()}`);
        }
    }
}
