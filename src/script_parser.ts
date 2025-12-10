import { AviatorLexer } from './lexer';
import { Token, TokenType } from './token';
import { Pratt } from './parser';
import { Expr } from './ast';
import {
    Stmt, ExprStmt, LetStmt, IfStmt, WhileStmt, ForStmt,
    FnStmt, ReturnStmt, BreakStmt, ContinueStmt, BlockStmt
} from './statement';

export class ScriptParser {
    private lexer: AviatorLexer;
    private current: Token;
    private exprParser: Pratt;

    constructor(code: string) {
        this.lexer = new AviatorLexer(code);
        this.exprParser = new Pratt(this.lexer);
        this.current = this.lexer.next();
    }

    public parse(): Stmt[] {
        const statements: Stmt[] = [];
        while (!this.isAtEnd()) {
            statements.push(this.statement());
        }
        return statements;
    }

    private statement(): Stmt {
        // Skip semicolons
        while (this.match(TokenType.SEMICOLON)) {
            // consumed
        }

        if (this.isAtEnd()) {
            throw new Error("Unexpected end of script");
        }

        if (this.match(TokenType.LET)) {
            return this.letStatement();
        }
        if (this.check(TokenType.IF)) {
            return this.ifStatement();
        }
        if (this.check(TokenType.WHILE)) {
            return this.whileStatement();
        }
        if (this.check(TokenType.FOR)) {
            return this.forStatement();
        }
        if (this.check(TokenType.FN)) {
            return this.fnStatement();
        }
        if (this.match(TokenType.RETURN)) {
            return this.returnStatement();
        }
        if (this.match(TokenType.BREAK)) {
            this.consumeSemicolon();
            return new BreakStmt();
        }
        if (this.match(TokenType.CONTINUE)) {
            this.consumeSemicolon();
            return new ContinueStmt();
        }
        if (this.check(TokenType.LEFT_BRACE)) {
            return new BlockStmt(this.block());
        }

        // Expression statement
        return this.expressionStatement();
    }

    private letStatement(): Stmt {
        const name = this.consume(TokenType.IDENTIFIER, "Expect variable name after 'let'");
        this.consume(TokenType.ASSIGN, "Expect '=' after variable name");
        const initializer = this.expression();
        this.consumeSemicolon();
        return new LetStmt(name, initializer);
    }

    private ifStatement(): Stmt {
        this.advance(); // consume 'if'
        this.consumeOptional(TokenType.LEFT_PAREN); // optional (
        const condition = this.expression();
        this.consumeOptional(TokenType.RIGHT_PAREN); // optional )
        
        const thenBranch = this.block();
        const elsifBranches: Array<{ condition: Expr, body: Stmt[] }> = [];
        let elseBranch: Stmt[] | null = null;

        while (this.match(TokenType.ELSE_IF)) {
            this.consumeOptional(TokenType.LEFT_PAREN);
            const elsifCond = this.expression();
            this.consumeOptional(TokenType.RIGHT_PAREN);
            const elsifBody = this.block();
            elsifBranches.push({ condition: elsifCond, body: elsifBody });
        }

        if (this.match(TokenType.ELSE)) {
            elseBranch = this.block();
        }

        return new IfStmt(condition, thenBranch, elsifBranches, elseBranch);
    }

    private whileStatement(): Stmt {
        this.advance(); // consume 'while'
        this.consumeOptional(TokenType.LEFT_PAREN);
        const condition = this.expression();
        this.consumeOptional(TokenType.RIGHT_PAREN);
        const body = this.block();
        return new WhileStmt(condition, body);
    }

    private forStatement(): Stmt {
        this.advance(); // consume 'for'
        
        // for index, item in seq OR for item in seq
        const first = this.consume(TokenType.IDENTIFIER, "Expect variable name in for loop");
        let indexVar: Token | null = null;
        let itemVar: Token;

        if (this.match(TokenType.COMMA)) {
            indexVar = first;
            itemVar = this.consume(TokenType.IDENTIFIER, "Expect item variable after comma");
        } else {
            itemVar = first;
        }

        this.consume(TokenType.IN, "Expect 'in' in for loop");
        const iterable = this.expression();
        const body = this.block();
        
        return new ForStmt(indexVar, itemVar, iterable, body);
    }

    private fnStatement(): Stmt {
        this.advance(); // consume 'fn'
        const name = this.consume(TokenType.IDENTIFIER, "Expect function name");
        this.consume(TokenType.LEFT_PAREN, "Expect '(' after function name");
        
        const params: Token[] = [];
        if (!this.check(TokenType.RIGHT_PAREN)) {
            do {
                params.push(this.consume(TokenType.IDENTIFIER, "Expect parameter name"));
            } while (this.match(TokenType.COMMA));
        }
        
        this.consume(TokenType.RIGHT_PAREN, "Expect ')' after parameters");
        const body = this.block();
        
        return new FnStmt(name, params, body);
    }

    private returnStatement(): Stmt {
        let value: Expr | null = null;
        if (!this.check(TokenType.SEMICOLON) && !this.isAtEnd()) {
            value = this.expression();
        }
        this.consumeSemicolon();
        return new ReturnStmt(value);
    }

    private expressionStatement(): Stmt {
        const expr = this.expression();
        this.consumeSemicolon();
        return new ExprStmt(expr);
    }

    private block(): Stmt[] {
        this.consume(TokenType.LEFT_BRACE, "Expect '{'");
        const statements: Stmt[] = [];
        
        while (!this.check(TokenType.RIGHT_BRACE) && !this.isAtEnd()) {
            statements.push(this.statement());
        }
        
        this.consume(TokenType.RIGHT_BRACE, "Expect '}'");
        return statements;
    }

    private expression(): Expr {
        // Use Pratt parser for expressions
        return this.exprParser.parseExpression();
    }

    private match(...types: TokenType[]): boolean {
        for (const type of types) {
            if (this.check(type)) {
                this.advance();
                return true;
            }
        }
        return false;
    }

    private check(type: TokenType): boolean {
        if (this.isAtEnd()) return false;
        return this.current.type === type;
    }

    private advance(): Token {
        if (!this.isAtEnd()) {
            const prev = this.current;
            this.current = this.lexer.next();
            return prev;
        }
        return this.current;
    }

    private isAtEnd(): boolean {
        return this.current.type === TokenType.EOF;
    }

    private consume(type: TokenType, message: string): Token {
        if (this.check(type)) return this.advance();
        throw new Error(`${message}. Got: ${this.current}`);
    }

    private consumeOptional(type: TokenType): boolean {
        if (this.check(type)) {
            this.advance();
            return true;
        }
        return false;
    }

    private consumeSemicolon(): void {
        // Semicolon is optional at end of script or before }
        if (this.check(TokenType.SEMICOLON)) {
            this.advance();
        } else if (!this.isAtEnd() && !this.check(TokenType.RIGHT_BRACE)) {
            // If not at end and not before }, semicolon might be required
            // But for now, make it flexible
        }
    }
}

