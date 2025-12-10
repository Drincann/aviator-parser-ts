import { Token, TokenType } from './token';

export class BindingPower {
    static readonly INFIX_OPERATOR_LEFT_BINDING_POWER: Map<TokenType, number> = new Map([
        [TokenType.ASSIGN, 6],
        [TokenType.CONDITIONAL, 2],
        [TokenType.LOGIC_OR, 3],
        [TokenType.LOGIC_AND, 5],
        [TokenType.BIT_OR, 6],
        [TokenType.BIT_XOR, 7],
        [TokenType.BIT_AND, 8],
        [TokenType.LIKE, 7],
        [TokenType.EQUAL, 9], [TokenType.NOT_EQUAL, 9],
        [TokenType.GREATER_THAN, 11], [TokenType.GREATER_THAN_EQUAL, 11], [TokenType.LESS_THAN, 11], [TokenType.LESS_THAN_EQUAL, 11],
        [TokenType.SIGNED_BIT_SHIFT_LEFT, 12], [TokenType.SIGNED_BIT_SHIFT_RIGHT, 12], [TokenType.UNSIGNED_BIT_SHIFT_RIGHT, 12],
        [TokenType.ADD, 13], [TokenType.SUBTRACT, 13],
        [TokenType.MOD, 15],
        [TokenType.MULTIPLY, 17], [TokenType.DIVIDE, 17],
        [TokenType.POW, 18], 
        [TokenType.DOT, 19]
    ]);

    static readonly INFIX_OPERATOR_RIGHT_BINDING_POWER: Map<TokenType, number> = new Map([
        [TokenType.ASSIGN, 0],
        [TokenType.CONDITIONAL, 1],
        [TokenType.LOGIC_OR, 4],
        [TokenType.LOGIC_AND, 6],
        [TokenType.BIT_OR, 7],
        [TokenType.BIT_XOR, 8], 
        [TokenType.BIT_AND, 9],
        [TokenType.LIKE, 8],
        [TokenType.EQUAL, 10], [TokenType.NOT_EQUAL, 10],
        [TokenType.GREATER_THAN, 12], [TokenType.GREATER_THAN_EQUAL, 12], [TokenType.LESS_THAN, 12], [TokenType.LESS_THAN_EQUAL, 12],
        [TokenType.SIGNED_BIT_SHIFT_LEFT, 13], [TokenType.SIGNED_BIT_SHIFT_RIGHT, 13], [TokenType.UNSIGNED_BIT_SHIFT_RIGHT, 13],
        [TokenType.ADD, 14], [TokenType.SUBTRACT, 14],
        [TokenType.MOD, 16],
        [TokenType.MULTIPLY, 18], [TokenType.DIVIDE, 18],
        [TokenType.POW, 17], 
        [TokenType.DOT, 20]
    ]);

    static readonly PREFIX_OPERATOR_BINDING_POWER: Map<TokenType, number> = new Map([
        [TokenType.SUBTRACT, 19],
        [TokenType.LOGIC_NOT, 19],
        [TokenType.BIT_NOT, 19]
    ]);

    static readonly POSTFIX_OPERATOR_BINDING_POWER: Map<TokenType, number> = new Map([
        [TokenType.LEFT_PAREN, 19], [TokenType.LEFT_BRACKET, 19]
    ]);

    static isPostfix(op: Token): boolean {
        return BindingPower.POSTFIX_OPERATOR_BINDING_POWER.has(op.type);
    }

    static isInfix(op: Token): boolean {
        return BindingPower.INFIX_OPERATOR_LEFT_BINDING_POWER.has(op.type);
    }

    static infixRight(op: Token): number {
        return BindingPower.INFIX_OPERATOR_RIGHT_BINDING_POWER.get(op.type)!;
    }

    static infixLeft(op: Token): number {
        return BindingPower.INFIX_OPERATOR_LEFT_BINDING_POWER.get(op.type)!;
    }

    static prefix(op: Token): number {
        return BindingPower.PREFIX_OPERATOR_BINDING_POWER.get(op.type)!;
    }

    static postfix(op: Token): number {
        return BindingPower.POSTFIX_OPERATOR_BINDING_POWER.get(op.type)!;
    }
}
