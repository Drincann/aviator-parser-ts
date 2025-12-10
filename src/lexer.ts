import { Token, TokenType } from './token';
import { LexerUtil } from './util';

class LexerState {
    public readonly validTransferFrom: Map<TokenType, Set<TokenType>> = new Map([
        [TokenType.DIVIDE, new Set([
            TokenType.NUMBER, TokenType.IDENTIFIER, TokenType.RIGHT_PAREN, TokenType.RIGHT_BRACKET
        ])],
        [TokenType.DOT, new Set([
            TokenType.IDENTIFIER, TokenType.RIGHT_BRACKET, TokenType.RIGHT_PAREN
        ])]
    ]);

    public readonly invalidTransferFrom: Map<TokenType, Set<TokenType>> = new Map([
        [TokenType.NUMBER, new Set([
            TokenType.RIGHT_BRACKET, TokenType.RIGHT_PAREN, TokenType.IDENTIFIER
        ])]
    ]);

    constructor(private lexer: AviatorLexer) {}

    public expect(type: TokenType): boolean {
        const lastTokenType = this.lexer.getLastToken().type;

        if (this.validTransferFrom.has(type)) {
            return this.validTransferFrom.get(type)!.has(lastTokenType);
        }
        if (this.invalidTransferFrom.has(type)) {
            return !this.invalidTransferFrom.get(type)!.has(lastTokenType);
        }

        return true;
    }
}

export class AviatorLexer {
    private readonly code: string;
    private readonly state: LexerState;
    private cursor: number = -1; // cursor points to current processed char
    private line: number = 1;
    private column: number = -1;
    private lastToken: Token;

    constructor(code: string) {
        this.code = code;
        this.state = new LexerState(this);
        this.lastToken = this.createEofToken(); 
    }

    public getLastToken(): Token {
        return this.lastToken;
    }

    public next(): Token {
        while (this.hasNext()) {
            const ch = this.nextChar();
            if (ch === 10) { // \n
                this.newLine();
                continue;
            }

            if (this.isCommentStart()) {
                this.untilMeet(10); // \n
                continue;
            }

            if (this.isNumberLiteralStart()) {
                if (this.state.expect(TokenType.NUMBER)) {
                    return this.parseNextNumberLiteral();
                }
            }

            if (LexerUtil.isIdentifierStart(ch)) {
                return this.parseNextIdentifier();
            }

            if (LexerUtil.isStringLiteralStart(ch)) {
                return this.parseNextStringLiteral();
            }

            // ... (Other operators logic - copy from previous file content to preserve)
            if (ch === 38) { // &
                return this.parseNextAnd();
            }
            if (ch === 124) { // |
                return this.parseNextOr();
            }
            if (ch === 60) { // <
                return this.parseNextLessOrBitShiftLeft();
            }
            if (ch === 62) { // >
                return this.parseNextGreaterOrBitShiftRight();
            }
            if (ch === 61) { // =
                return this.parseNextEqualLikeOrAssign();
            }
            if (ch === 33) { // !
                return this.parseNextNotOrNotEqual();
            }

            if (ch === 43) { // +
                return this.token(TokenType.ADD, "+");
            }
            if (ch === 45) { // -
                return this.tokenSubtractOrArrow();
            }
            if (ch === 42) { // *
                return this.parseMultiplyOrPower();
            }
            if (ch === 47) { // /
                if (this.state.expect(TokenType.DIVIDE)) {
                    return this.token(TokenType.DIVIDE, "/");
                }
                if (this.state.expect(TokenType.REGEX)) {
                    return this.parseNextRegexLiteral();
                }
            }
            if (ch === 37) { // %
                return this.token(TokenType.MOD, "%");
            }
            if (ch === 94) { // ^
                return this.token(TokenType.BIT_XOR, "^");
            }
            if (ch === 126) { // ~
                return this.token(TokenType.BIT_NOT, "~");
            }

            if (ch === 40) return this.token(TokenType.LEFT_PAREN, "(");
            if (ch === 41) return this.token(TokenType.RIGHT_PAREN, ")");
            if (ch === 91) return this.token(TokenType.LEFT_BRACKET, "[");
            if (ch === 93) return this.token(TokenType.RIGHT_BRACKET, "]");
            if (ch === 123) return this.token(TokenType.LEFT_BRACE, "{");
            if (ch === 125) return this.token(TokenType.RIGHT_BRACE, "}");
            if (ch === 46) return this.token(TokenType.DOT, ".");
            if (ch === 63) return this.token(TokenType.CONDITIONAL, "?");
            if (ch === 58) return this.token(TokenType.COLON, ":");
            if (ch === 44) return this.token(TokenType.COMMA, ",");
            if (ch === 59) return this.token(TokenType.SEMICOLON, ";");
        }
        return this.createEofToken();
    }

    private createEofToken(): Token {
        this.lastToken = new Token(
            TokenType.EOF,
            "",
            this.cursor + 1,
            this.cursor + 1,
            this.line
        );
        return this.lastToken;
    }

    private isNumberLiteralStart(): boolean {
        const current = this.currentChar();
        return LexerUtil.isDigit(current)
            || (current === 46 && LexerUtil.isDigit(this.peek()))
            || (current === 46 && (this.peek() === 101 || this.peek() === 69)); 
    }

    // ... (Keep existing methods: parseNextAnd, parseNextOr, etc.)
    private parseNextAnd(): Token {
        if (this.peek() === 38) { // &
            this.nextChar();
            return this.token(TokenType.LOGIC_AND, "&&");
        }
        return this.token(TokenType.BIT_AND, "&");
    }

    private parseNextOr(): Token {
        if (this.peek() === 124) { // |
            this.nextChar();
            return this.token(TokenType.LOGIC_OR, "||");
        }
        return this.token(TokenType.BIT_OR, "|");
    }

    private parseNextLessOrBitShiftLeft(): Token {
        const lt = this.token(TokenType.LESS_THAN, "<");

        this.untilNonMatch(LexerUtil.isWhiteSpace);
        if (this.peek() === 61) { // =
            this.nextChar();
            return this.token(TokenType.LESS_THAN_EQUAL, "<=");
        }

        if (this.peek() === 60) { // <
            this.nextChar();
            return this.token(TokenType.SIGNED_BIT_SHIFT_LEFT, "<<");
        }

        return lt;
    }

    private parseNextGreaterOrBitShiftRight(): Token {
        const gt = this.token(TokenType.GREATER_THAN, ">");

        this.untilNonMatch(LexerUtil.isWhiteSpace);
        if (this.peek() === 61) { // =
            this.nextChar();
            return this.token(TokenType.GREATER_THAN_EQUAL, ">=");
        }

        if (this.peek() === 62) { // >
            this.nextChar();
            const shiftRight = this.token(TokenType.SIGNED_BIT_SHIFT_RIGHT, ">>");

            this.untilNonMatch(LexerUtil.isWhiteSpace);
            if (this.peek() === 62) { // >
                this.nextChar();
                return this.token(TokenType.UNSIGNED_BIT_SHIFT_RIGHT, ">>>");
            }
            return shiftRight;
        }

        return gt;
    }

    private parseNextEqualLikeOrAssign(): Token {
        const assign = this.token(TokenType.ASSIGN, "=");

        this.untilNonMatch(LexerUtil.isWhiteSpace);
        if (this.peek() === 61) { // =
            this.nextChar();
            return this.token(TokenType.EQUAL, "==");
        }
        if (this.peek() === 126) { // ~
            this.nextChar();
            return this.token(TokenType.LIKE, "=~");
        }

        return assign;
    }

    private parseNextNotOrNotEqual(): Token {
        const not = this.token(TokenType.LOGIC_NOT, "!");

        this.untilNonMatch(LexerUtil.isWhiteSpace);
        if (this.peek() === 61) { // =
            this.nextChar();
            return this.token(TokenType.NOT_EQUAL, "!=");
        }

        return not;
    }

    private tokenSubtractOrArrow(): Token {
        const sub = this.token(TokenType.SUBTRACT, "-");

        this.untilNonMatch(LexerUtil.isWhiteSpace);
        if (this.peek() === 62) { // >
            this.nextChar();
            return this.token(TokenType.ARROW, "->");
        }
        return sub;
    }

    private parseMultiplyOrPower(): Token {
        const mul = this.token(TokenType.MULTIPLY, "*");

        this.untilNonMatch(LexerUtil.isWhiteSpace);
        if (this.peek() === 42) { // *
            this.nextChar();
            return this.token(TokenType.POW, "**");
        }
        return mul;
    }

    private parseNextNumberLiteral(): Token {
        const start = this.cursor;

        // hex
        if (this.currentChar() === 48 && (this.peek() === 120 || this.peek() === 88)) { // 0, x, X
            this.nextChar(); // skip '0'
            this.nextChar(); // skip 'x'
            this.untilNonMatch(LexerUtil.isHexDigit);
            return this.numberToken(start, this.cursor + 1);
        }

        // dec
        this.untilNonMatch(LexerUtil.isDigit);
        if (this.peek() === 46) { // .
            this.nextChar(); // consume dot
            this.untilNonMatch(LexerUtil.isDigit);
        }

        if (this.peek() === 101 || this.peek() === 69) { // e or E
            this.nextChar(); // to 'e'
            this.nextChar(); // to char after 'e' (could be - or + or digit)
            if (this.currentChar() === 45 || this.currentChar() === 43) { // - or +
                this.nextChar(); // consume sign
            }
            this.untilNonMatch(LexerUtil.isDigit);
        }

        // Check for suffixes: N (BigInt) or M (Decimal)
        // N = 78, M = 77
        if (this.peek() === 78 || this.peek() === 77) {
            this.nextChar();
        }

        return this.numberToken(start, this.cursor + 1);
    }

    private parseNextIdentifier(): Token {
        const start = this.cursor;
        while (LexerUtil.isIdentifierRest(this.peek())) {
            this.assertObjectAccessValid(start);
            this.nextChar();
        }
        this.assertObjectAccessEnd(start);
        return this.identifierToken(start, this.cursor + 1);
    }

    private assertObjectAccessEnd(start: number): void {
        if (this.currentChar() === 46) { // .
             throw new Error(`Invalid object access syntax: <${this.code.substring(start, this.cursor + 1)}> expect alpha but got <${LexerUtil.toPrintable(this.peek())}> at ${this.line}:${this.column}`);
        }
    }

    private assertObjectAccessValid(start: number): void {
        if (this.currentChar() === 46 && LexerUtil.isNotIdentifierStart(this.peek())) {
             throw new Error(`Invalid object access syntax: <${this.code.substring(start, this.cursor + 1)}> expect alpha but got <${LexerUtil.toPrintable(this.peek())}> at ${this.line}:${this.column}`);
        }
    }

    private parseNextRegexLiteral(): Token {
        const start = this.cursor;
        this.nextChar(); // skip first '/'

        this.untilMeet(47, 10, 13); // /, \n, \r

        if (this.peek() !== 0 && LexerUtil.isNotEOL(this.peek())) {
            this.nextChar(); // cursor to '/'
        }

        this.assertRegexEnd(start);
        return this.regexToken(start);
    }

    private assertRegexEnd(start: number): void {
        if (this.currentChar() !== 47) { // /
             throw new Error(`Invalid regex syntax: <${this.code.substring(start, this.cursor + 1)}>, expect </> but got <${LexerUtil.toPrintable(this.currentChar())}> at ${this.line}:${this.column}`);
        }
    }

    private parseNextStringLiteral(): Token {
        const quote = this.currentChar();
        let content = "";

        const start = this.cursor;
        
        while (this.peek() !== quote && LexerUtil.isNotEOL(this.peek()) && this.peek() !== 0) {
            this.nextChar();
            // Handle Interpolation #{...} if needed, but for now treating as string content
            // To support interpolation properly, Lexer needs to split string into parts or return special token.
            // For simplicity in migration, we might let Runtime regex/parse handle interpolation if possible, 
            // or implement full interpolation lexing.
            // Full interpolation lexing involves nested Lexer states which is complex.
            // Given "java特有的特性...可以不实现", and interpolation is Aviator specific but complex.
            // I will stick to basic string parsing. Interpolation will be handled as plain string literal for now
            // or handled at runtime/AST transformation if I decide to support it later.
            
            if (this.currentChar() === 92) { // \
                this.nextChar();
                content += "\\" + String.fromCharCode(this.currentChar());
                continue;
            }
            content += String.fromCharCode(this.currentChar());
        }

        this.nextChar(); // skip to end quote
        this.assertStringEnd(quote, start, this.cursor);
        return this.stringToken(start, this.cursor + 1, String.fromCharCode(quote) + content + String.fromCharCode(quote));
    }

    private assertStringEnd(quote: number, start: number, end: number): void {
        if (this.currentChar() !== quote) {
             throw new Error(`Invalid string syntax: <${this.code.substring(start, end)}>, expect <${String.fromCharCode(quote)}> but got <${LexerUtil.toPrintable(this.currentChar())}> at ${this.line}:${this.column}`);
        }
    }

    private numberToken(start: number, end: number): Token {
        this.lastToken = new Token(TokenType.NUMBER, this.code.substring(start, end), start, end, this.line);
        return this.lastToken;
    }

    private identifierToken(start: number, end: number): Token {
        const name = this.code.substring(start, end);
        const type = Token.KEYWORDS_MAP[name] || TokenType.IDENTIFIER;
        this.lastToken = new Token(type, name, start, end, this.line);
        return this.lastToken;
    }

    private regexToken(start: number): Token {
        this.lastToken = new Token(TokenType.REGEX, this.code.substring(start, this.cursor + 1), start, this.cursor + 1, this.line);
        return this.lastToken;
    }

    private stringToken(start: number, end: number, str: string): Token {
        this.lastToken = new Token(TokenType.STRING, str, start, end, this.line);
        return this.lastToken;
    }

    private token(type: TokenType, lexeme: string): Token {
        this.lastToken = new Token(type, lexeme, this.cursor + 1 - lexeme.length, this.cursor + 1, this.line);
        return this.lastToken;
    }

    private isCommentStart(): boolean {
        return this.currentChar() === 35 && this.peek() === 35; // # and #
    }

    private untilMeet(...chs: number[]): void {
        const set = new Set(chs);
        while (this.peek() !== 0 && !set.has(this.peek())) {
            this.nextChar();
        }
    }

    private untilNonMatch(matcher: (ch: number) => boolean): void {
        while (this.peek() !== 0 && matcher(this.peek())) {
            this.nextChar();
        }
    }

    private nextChar(): number {
        this.column++;
        this.cursor++;
        return this.charAt(this.cursor);
    }

    private newLine(): void {
        this.line++;
        this.column = -1;
    }

    private hasNext(): boolean {
        return this.peek() !== 0;
    }

    private currentChar(): number {
        return this.charAt(this.cursor);
    }

    private peek(): number {
        return this.charAt(this.cursor + 1);
    }

    private charAt(cursor: number): number {
        if (cursor >= this.code.length) {
            return 0;
        }
        return this.code.charCodeAt(cursor);
    }
}
