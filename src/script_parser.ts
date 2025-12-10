import { AviatorLexer } from './lexer';
import { Token, TokenType, ParseError } from './token';
import { BindingPower } from './binding_power';
import { Expr, Node, Leaf, FunctionCall, LambdaFunction } from './ast';
import {
    Stmt, ExprStmt, LetStmt, IfStmt, WhileStmt, ForStmt,
    FnStmt, ReturnStmt, BreakStmt, ContinueStmt, BlockStmt, TryStmt, ThrowStmt
} from './statement';

export class ScriptParser {
    private lexer: AviatorLexer;
    private token: Token | null = null;
    private lookahead: Token | null = null;

    constructor(code: string) {
        this.lexer = new AviatorLexer(code);
        this.advance(); // Initialize token and lookahead
    }

    public static parse(code: string): Stmt[] {
        return new ScriptParser(code).parse();
    }

    public parse(): Stmt[] {
        const statements: Stmt[] = [];
        while (!this.isAtEnd()) {
            // Skip leading semicolons
            while (this.matchToken(TokenType.SEMICOLON)) {
                // consumed
            }
            if (this.isAtEnd()) break;
            
            statements.push(this.statement());
        }
        return statements;
    }

    private statement(): Stmt {
        if (this.matchToken(TokenType.LET)) {
            return this.letStatement();
        }
        if (this.checkToken(TokenType.IF)) {
            return this.ifStatement();
        }
        if (this.checkToken(TokenType.WHILE)) {
            return this.whileStatement();
        }
        if (this.checkToken(TokenType.FOR)) {
            return this.forStatement();
        }
        if (this.checkToken(TokenType.FN)) {
            return this.fnStatement();
        }
        if (this.checkToken(TokenType.TRY)) {
            return this.tryStatement();
        }
        if (this.matchToken(TokenType.THROW)) {
            return this.throwStatement();
        }
        if (this.matchToken(TokenType.RETURN)) {
            return this.returnStatement();
        }
        if (this.matchToken(TokenType.BREAK)) {
            this.consumeSemicolon();
            return new BreakStmt();
        }
        if (this.matchToken(TokenType.CONTINUE)) {
            this.consumeSemicolon();
            return new ContinueStmt();
        }
        if (this.checkToken(TokenType.LEFT_BRACE)) {
            return new BlockStmt(this.block());
        }

        // Expression statement
        return this.expressionStatement();
    }

    private letStatement(): Stmt {
        const name = this.consumeToken(TokenType.IDENTIFIER, "Expect variable name after 'let'");
        this.consumeToken(TokenType.ASSIGN, "Expect '=' after variable name");
        const initializer = this.expression();
        this.consumeSemicolon();
        return new LetStmt(name, initializer);
    }

    private ifStatement(): Stmt {
        this.advance(); // consume 'if'
        this.matchToken(TokenType.LEFT_PAREN); // optional
        const condition = this.expression();
        this.matchToken(TokenType.RIGHT_PAREN); // optional
        
        const thenBranch = this.block();
        const elsifBranches: Array<{ condition: Expr, body: Stmt[] }> = [];
        let elseBranch: Stmt[] | null = null;

        while (this.matchToken(TokenType.ELSE_IF)) {
            this.matchToken(TokenType.LEFT_PAREN);
            const elsifCond = this.expression();
            this.matchToken(TokenType.RIGHT_PAREN);
            const elsifBody = this.block();
            elsifBranches.push({ condition: elsifCond, body: elsifBody });
        }

        if (this.matchToken(TokenType.ELSE)) {
            elseBranch = this.block();
        }

        return new IfStmt(condition, thenBranch, elsifBranches, elseBranch);
    }

    private whileStatement(): Stmt {
        this.advance(); // consume 'while'
        this.matchToken(TokenType.LEFT_PAREN);
        const condition = this.expression();
        this.matchToken(TokenType.RIGHT_PAREN);
        const body = this.block();
        return new WhileStmt(condition, body);
    }

    private forStatement(): Stmt {
        this.advance(); // consume 'for'
        
        const first = this.consumeToken(TokenType.IDENTIFIER, "Expect variable name in for loop");
        let indexVar: Token | null = null;
        let itemVar: Token;

        if (this.matchToken(TokenType.COMMA)) {
            indexVar = first;
            itemVar = this.consumeToken(TokenType.IDENTIFIER, "Expect item variable after comma");
        } else {
            itemVar = first;
        }

        this.consumeToken(TokenType.IN, "Expect 'in' in for loop");
        const iterable = this.expression();
        const body = this.block();
        
        return new ForStmt(indexVar, itemVar, iterable, body);
    }

    private fnStatement(): Stmt {
        this.advance(); // consume 'fn'
        const name = this.consumeToken(TokenType.IDENTIFIER, "Expect function name");
        this.consumeToken(TokenType.LEFT_PAREN, "Expect '(' after function name");
        
        const params: Token[] = [];
        if (!this.checkToken(TokenType.RIGHT_PAREN)) {
            do {
                params.push(this.consumeToken(TokenType.IDENTIFIER, "Expect parameter name"));
            } while (this.matchToken(TokenType.COMMA));
        }
        
        this.consumeToken(TokenType.RIGHT_PAREN, "Expect ')' after parameters");
        const body = this.block();
        
        return new FnStmt(name, params, body);
    }

    private tryStatement(): Stmt {
        this.advance(); // consume 'try'
        const tryBlock = this.block();
        
        let catchVar: Token | null = null;
        let catchBlock: Stmt[] | null = null;
        let finallyBlock: Stmt[] | null = null;

        if (this.matchToken(TokenType.CATCH)) {
            this.consumeToken(TokenType.LEFT_PAREN, "Expect '(' after catch");
            catchVar = this.consumeToken(TokenType.IDENTIFIER, "Expect catch variable name");
            this.consumeToken(TokenType.RIGHT_PAREN, "Expect ')' after catch variable");
            catchBlock = this.block();
        }

        if (this.matchToken(TokenType.FINALLY)) {
            finallyBlock = this.block();
        }

        return new TryStmt(tryBlock, catchVar, catchBlock, finallyBlock);
    }

    private returnStatement(): Stmt {
        let value: Expr | null = null;
        if (!this.checkToken(TokenType.SEMICOLON) && !this.checkToken(TokenType.RIGHT_BRACE) && !this.isAtEnd()) {
            value = this.expression();
        }
        this.consumeSemicolon();
        return new ReturnStmt(value);
    }

    private throwStatement(): Stmt {
        const value = this.expression();
        this.consumeSemicolon();
        return new ThrowStmt(value);
    }

    private expressionStatement(): Stmt {
        const expr = this.expression();
        const hasSemi = this.checkToken(TokenType.SEMICOLON);
        this.consumeSemicolon();
        return new ExprStmt(expr, hasSemi);
    }

    private block(): Stmt[] {
        this.consumeToken(TokenType.LEFT_BRACE, "Expect '{'");
        const statements: Stmt[] = [];
        
        while (!this.checkToken(TokenType.RIGHT_BRACE) && !this.isAtEnd()) {
            while (this.matchToken(TokenType.SEMICOLON)) {
                // Skip
            }
            if (this.checkToken(TokenType.RIGHT_BRACE)) break;
            
            statements.push(this.statement());
        }
        
        this.consumeToken(TokenType.RIGHT_BRACE, "Expect '}'");
        return statements;
    }

    // ========== Expression Parsing (Pratt-based) ==========
    
    private expression(): Expr {
        return this.expr(0);
    }

    private expr(ubp: number): Expr {
        let left = this.primary();

        while (true) {
            if (this.peekType(TokenType.EOF) || this.peekType(TokenType.SEMICOLON) || this.peekType(TokenType.RIGHT_BRACE)) {
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

        throw new ParseError("Unexpected primary token: " + this.peek(), this.peek());
    }

    private prefixExpr(): Node {
        this.advance();
        const op = this.current();
        const right = this.expr(BindingPower.prefix(this.current()));
        return new Node(op, right);
    }

    private infixExpr(left: Expr, op: Token): Expr {
        this.advance();
        if (this.currentIs(TokenType.CONDITIONAL)) {
            return this.conditional(left, op);
        }

        return new Node(op, left, this.expr(BindingPower.infixRight(op)));
    }

    private postfixExpr(left: Expr, op: Token): Expr {
        this.advance();
        if (this.currentIs(TokenType.LEFT_BRACKET)) {
            left = this.objectAccess(left, op);
        }

        if (this.currentIs(TokenType.LEFT_PAREN)) {
            left = this.functionCall(left);
        }

        return left;
    }

    private subExpr(): Expr {
        this.eatToken(TokenType.LEFT_PAREN);
        const expr = this.expr(0);
        this.eatToken(TokenType.RIGHT_PAREN);
        return expr;
    }

    private leaf(): Leaf {
        this.advance();
        return new Leaf(this.current());
    }

    private lambda(): LambdaFunction {
        this.eatToken(TokenType.LAMBDA);
        this.eatToken(TokenType.LEFT_PAREN);
        const parameters: Token[] = [];
        
        // Check if empty parameter list
        if (!this.peekType(TokenType.RIGHT_PAREN)) {
            while (true) {
                this.advance();
                parameters.push(this.current());
                if (this.peekType(TokenType.RIGHT_PAREN)) {
                    break;
                }
                this.eatToken(TokenType.COMMA);
            }
        }
        
        this.eatToken(TokenType.RIGHT_PAREN);
        this.eatToken(TokenType.ARROW);
        const body = this.expr(0);
        this.eatToken(TokenType.END);
        return new LambdaFunction(parameters, body);
    }

    private conditional(left: Expr, op: Token): Expr {
        const thenExpr = this.expr(0);
        this.eatToken(TokenType.COLON);
        const elseExpr = this.expr(BindingPower.infixRight(op));
        return new Node(op, left, thenExpr, elseExpr);
    }

    private objectAccess(left: Expr, op: Token): Expr {
        const subexpr = this.expr(0);
        this.eatToken(TokenType.RIGHT_BRACKET);
        return new Node(op, left, subexpr);
    }

    private functionCall(left: Expr): Expr {
        const args: Expr[] = [];
        if (this.peekType(TokenType.RIGHT_PAREN)) {
            this.eatToken(TokenType.RIGHT_PAREN);
            return new FunctionCall(left, args);
        }
        
        while (true) {
            args.push(this.expr(0));
            if (this.peekType(TokenType.RIGHT_PAREN)) {
                break;
            }
            this.eatToken(TokenType.COMMA);
        }
        this.eatToken(TokenType.RIGHT_PAREN);
        return new FunctionCall(left, args);
    }

    // ========== Token Utilities ==========

    private currentIs(type: TokenType): boolean {
        return this.current().type === type;
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

    private advance(): Token {
        this.token = this.lookahead;
        this.lookahead = this.lexer.next();
        return this.token!;
    }

    private current(): Token {
        if (!this.token) throw new Error("Token not initialized");
        return this.token;
    }

    private peek(): Token {
        if (!this.lookahead) throw new Error("Lookahead not initialized");
        return this.lookahead;
    }

    private peekType(type: TokenType): boolean {
        return this.peek().type === type;
    }

    private eatToken(type: TokenType): void {
        this.advance();
        if (!this.currentIs(type)) {
            const token = this.current();
            throw new ParseError(`Expect ${type} but got: ${token}`, token);
        }
    }

    private matchToken(...types: TokenType[]): boolean {
        for (const type of types) {
            if (this.checkToken(type)) {
                this.advance();
                return true;
            }
        }
        return false;
    }

    private checkToken(type: TokenType): boolean {
        if (this.isAtEnd()) return false;
        return this.peek().type === type;
    }

    private isAtEnd(): boolean {
        return this.peek().type === TokenType.EOF;
    }

    private consumeToken(type: TokenType, message: string): Token {
        if (this.checkToken(type)) {
            this.advance();
            return this.current();
        }
        // Improve error message with line number
        const token = this.peek();
        const errorMessage = `${message}. Got: ${token}`;
        throw new ParseError(errorMessage, token);
    }

    private consumeSemicolon(): void {
        // Semicolon is optional at end of script or before }
        if (this.checkToken(TokenType.SEMICOLON)) {
            this.advance();
        }
    }
}
