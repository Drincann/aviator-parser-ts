export enum TokenType {
    // 数学运算符
    ADD = 'ADD', /* + */
    SUBTRACT = 'SUBTRACT', /* - */
    MULTIPLY = 'MULTIPLY', /* * */
    DIVIDE = 'DIVIDE', /* / */
    MOD = 'MOD', /* % */
    POW = 'POW', /* ** */
    BIT_AND = 'BIT_AND', /* & */
    BIT_OR = 'BIT_OR', /* | */
    BIT_XOR = 'BIT_XOR', /* ^ */
    BIT_NOT = 'BIT_NOT', /* ~ */
    SIGNED_BIT_SHIFT_LEFT = 'SIGNED_BIT_SHIFT_LEFT', /* << */
    SIGNED_BIT_SHIFT_RIGHT = 'SIGNED_BIT_SHIFT_RIGHT', /* >> */
    UNSIGNED_BIT_SHIFT_RIGHT = 'UNSIGNED_BIT_SHIFT_RIGHT', /* >>> */

    // 逻辑运算
    LIKE = 'LIKE', /* =~ */
    EQUAL = 'EQUAL', /* == */
    NOT_EQUAL = 'NOT_EQUAL', /* != */
    GREATER_THAN = 'GREATER_THAN', /* > */
    GREATER_THAN_EQUAL = 'GREATER_THAN_EQUAL', /* >= */
    LESS_THAN = 'LESS_THAN', /* < */
    LESS_THAN_EQUAL = 'LESS_THAN_EQUAL', /* <= */
    LOGIC_AND = 'LOGIC_AND', /* && */
    LOGIC_OR = 'LOGIC_OR', /* || */
    LOGIC_NOT = 'LOGIC_NOT', /* ! */
    CONDITIONAL = 'CONDITIONAL', /* ? */
    COLON = 'COLON', /* : */
    COMMA = 'COMMA', /* , */
    SEMICOLON = 'SEMICOLON', /* ; */

    // 括号
    LEFT_PAREN = 'LEFT_PAREN', /* ( */
    RIGHT_PAREN = 'RIGHT_PAREN', /* ) */
    LEFT_BRACKET = 'LEFT_BRACKET', /* [ */
    RIGHT_BRACKET = 'RIGHT_BRACKET', /* ] */
    LEFT_BRACE = 'LEFT_BRACE', /* { */
    RIGHT_BRACE = 'RIGHT_BRACE', /* } */

    // 对象访问
    DOT = 'DOT', /* . */

    // 流程控制关键字
    IF = 'IF', /* if */
    ELSE = 'ELSE', /* else */
    ELSE_IF = 'ELSE_IF', /* elsif */
    FOR = 'FOR', /* for */
    IN = 'IN', /* in */
    WHILE = 'WHILE', /* while */
    BREAK = 'BREAK', /* break */
    CONTINUE = 'CONTINUE', /* continue */
    RETURN = 'RETURN', /* return */

    // 异常处理关键字
    TRY = 'TRY', /* try */
    CATCH = 'CATCH', /* catch */
    FINALLY = 'FINALLY', /* finally */
    THROW = 'THROW', /* throw */

    // 函数和闭包关键字
    FN = 'FN', /* fn */
    LAMBDA = 'LAMBDA', /* lambda */
    ARROW = 'ARROW', /* -> */
    END = 'END', /* end */

    // 注释
    COMMENT = 'COMMENT', // ::= ##<comment_content>

    // 赋值、变量声明、new 创建对象、use 导入
    LET = 'LET', /* let */
    NEW = 'NEW', /* new */
    USE = 'USE', /* use */

    // 字面量关键字
    TRUE = 'TRUE', /* true */
    FALSE = 'FALSE', /* false */
    NIL = 'NIL', /* nil */

    // 赋值
    ASSIGN = 'ASSIGN', /* = */

    // 字面量
    IDENTIFIER = 'IDENTIFIER',
    NUMBER = 'NUMBER',
    STRING = 'STRING',
    REGEX = 'REGEX',

    EOF = 'EOF',
}

export class Token {
    public static readonly KEYWORDS_MAP: Record<string, TokenType> = {
        "if": TokenType.IF, "else": TokenType.ELSE, "elsif": TokenType.ELSE_IF,
        "for": TokenType.FOR, "in": TokenType.IN, "while": TokenType.WHILE,
        "break": TokenType.BREAK, "continue": TokenType.CONTINUE, "return": TokenType.RETURN,
        "try": TokenType.TRY, "catch": TokenType.CATCH, "finally": TokenType.FINALLY, "throw": TokenType.THROW,
        "fn": TokenType.FN, "lambda": TokenType.LAMBDA, "->": TokenType.ARROW, "end": TokenType.END,
        "true": TokenType.TRUE, "false": TokenType.FALSE, "nil": TokenType.NIL,
        "let": TokenType.LET, "new": TokenType.NEW, "use": TokenType.USE
    };

    constructor(
        public type: TokenType,
        public lexeme: string,
        public start: number,
        public end: number,
        public line: number
    ) {}

    public toString(): string {
        return `Token{type=${this.type}, lexeme='${this.lexeme}', start=${this.start}, end=${this.end}, line=${this.line}}`;
    }
}

