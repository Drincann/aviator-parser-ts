import { Expr, Leaf, Node, FunctionCall, LambdaFunction } from './ast';
import { TokenType, Token } from './token';
import { Stmt, ControlFlowSignal } from './statement';
import { LexerUtil } from './util';
import { Pratt } from './parser';

interface Scope {
    parent: Scope | null;
    variables: Map<string, any>;
}

export class Interpreter {
    private globalScope: Scope;
    private currentScope: Scope;

    constructor(context: Record<string, any> = {}) {
        this.globalScope = {
            parent: null,
            variables: new Map(Object.entries(context))
        };
        this.currentScope = this.globalScope;
    }

    public evaluate(expr: Expr): any {
        if (expr instanceof Leaf) {
            return this.evaluateLeaf(expr);
        }
        if (expr instanceof Node) {
            return this.evaluateNode(expr);
        }
        if (expr instanceof FunctionCall) {
            return this.evaluateFunctionCall(expr);
        }
        if (expr instanceof LambdaFunction) {
            return this.evaluateLambda(expr);
        }
        throw new Error(`Unknown expression type: ${expr}`);
    }

    public define(name: string, value: any): void {
        this.currentScope.variables.set(name, value);
    }

    public assign(name: string, value: any): void {
        let scope: Scope | null = this.currentScope;
        while (scope) {
            if (scope.variables.has(name)) {
                scope.variables.set(name, value);
                return;
            }
            scope = scope.parent;
        }
        // If not found, define in current scope (AviatorScript behavior)
        this.currentScope.variables.set(name, value);
    }

    public executeStatements(statements: Stmt[]): any {
        let lastValue: any = null;
        for (let i = 0; i < statements.length; i++) {
            const stmt = statements[i];
            lastValue = stmt.execute(this);
            if (lastValue instanceof ControlFlowSignal) {
                return lastValue; // Propagate control flow
            }
        }
        return lastValue;
    }

    public executeBlock(statements: Stmt[], extraVariables?: Record<string, any>): any {
        return this.withNewScope(() => {
            if (extraVariables) {
                for (const [key, value] of Object.entries(extraVariables)) {
                    this.define(key, value);
                }
            }
            return this.executeStatements(statements);
        });
    }

    public createFunction(params: Token[], body: Stmt[]): Function {
        const closureScope = this.currentScope;
        
        return (...args: any[]) => {
            return this.withNewScope(() => {
                // Bind parameters
                params.forEach((param, i) => {
                    this.define(param.lexeme, args[i]);
                });
                
                const result = this.executeStatements(body);
                if (result instanceof ControlFlowSignal && result.type === 'return') {
                    return result.value;
                }
                return result;
            }, closureScope);
        };
    }

    private withNewScope<T>(fn: () => T, parentScope?: Scope): T {
        const previousScope = this.currentScope;
        this.currentScope = {
            parent: parentScope || previousScope,
            variables: new Map()
        };
        try {
            return fn();
        } finally {
            this.currentScope = previousScope;
        }
    }

    private evaluateLeaf(leaf: Leaf): any {
        const token = leaf.token;
        switch (token.type) {
            case TokenType.NUMBER:
                // Support N (BigInt) and M (Decimal) suffixes
                if (token.lexeme.endsWith('N')) {
                    return BigInt(token.lexeme.slice(0, -1));
                }
                if (token.lexeme.endsWith('M')) {
                    return Number(token.lexeme.slice(0, -1));
                }
                return Number(token.lexeme);
            case TokenType.STRING:
                return this.processString(token.lexeme);
            case TokenType.TRUE:
                return true;
            case TokenType.FALSE:
                return false;
            case TokenType.NIL:
                return null;
            case TokenType.REGEX:
                const pattern = token.lexeme.substring(1, token.lexeme.lastIndexOf('/'));
                const flags = token.lexeme.substring(token.lexeme.lastIndexOf('/') + 1);
                return new RegExp(`^${pattern}$`, flags);
            case TokenType.IDENTIFIER:
                return this.resolveIdentifier(token.lexeme);
            default:
                throw new Error(`Unexpected leaf token: ${token.type}`);
        }
    }

    private processString(lexeme: string): string {
        // Remove quotes
        const quote = lexeme[0];
        let str = lexeme.substring(1, lexeme.length - 1);
        
        // First handle escape sequences
        str = LexerUtil.processStringContent(str);
        
        // Then handle string interpolation #{expr}
        str = str.replace(/#\{([^}]+)\}/g, (match, exprCode) => {
            try {
                // Parse and evaluate the expression
                const result = this.evaluate(Pratt.parse(exprCode));
                return String(result);
            } catch (e) {
                return match; // If error, keep original
            }
        });
        
        return str;
    }

    private resolveIdentifier(name: string): any {
        let scope: Scope | null = this.currentScope;
        while (scope) {
            if (scope.variables.has(name)) {
                return scope.variables.get(name);
            }
            scope = scope.parent;
        }
        return undefined;
    }

    private evaluateNode(node: Node): any {
        const op = node.operator;
        const operands = node.operands;

        // Unary
        if (operands.length === 1) {
            const val = this.evaluate(operands[0]);
            switch (op.type) {
                case TokenType.SUBTRACT: return -val;
                case TokenType.LOGIC_NOT: return !val;
                case TokenType.BIT_NOT: return ~val;
                default: throw new Error(`Unknown unary operator: ${op.lexeme}`);
            }
        }

        // Binary
        if (operands.length === 2) {
            if (op.type === TokenType.ASSIGN) {
                return this.handleAssignment(operands[0], operands[1]);
            }

            if (op.type === TokenType.DOT) {
                 const left = this.evaluate(operands[0]);
                 if (left && typeof left === 'object') {
                    if (operands[1] instanceof Leaf && operands[1].token.type === TokenType.IDENTIFIER) {
                         return left[operands[1].token.lexeme];
                    }
                }
                return undefined;
            }

            const left = this.evaluate(operands[0]);
            
            if (op.type === TokenType.LOGIC_AND) {
                return left && this.evaluate(operands[1]);
            }
            if (op.type === TokenType.LOGIC_OR) {
                return left || this.evaluate(operands[1]);
            }

            const right = this.evaluate(operands[1]);

            switch (op.type) {
                case TokenType.ADD: return left + right;
                case TokenType.SUBTRACT: return left - right;
                case TokenType.MULTIPLY: return left * right;
                case TokenType.DIVIDE: return left / right;
                case TokenType.MOD: return left % right;
                case TokenType.POW: return Math.pow(left, right);
                
                case TokenType.EQUAL: return left == right;
                case TokenType.NOT_EQUAL: return left != right;
                case TokenType.GREATER_THAN: return left > right;
                case TokenType.GREATER_THAN_EQUAL: return left >= right;
                case TokenType.LESS_THAN: return left < right;
                case TokenType.LESS_THAN_EQUAL: return left <= right;
                
                case TokenType.BIT_AND: return left & right;
                case TokenType.BIT_OR: return left | right;
                case TokenType.BIT_XOR: return left ^ right;
                case TokenType.SIGNED_BIT_SHIFT_LEFT: return left << right;
                case TokenType.SIGNED_BIT_SHIFT_RIGHT: return left >> right;
                case TokenType.UNSIGNED_BIT_SHIFT_RIGHT: return left >>> right;

                case TokenType.LIKE: 
                    if (right instanceof RegExp) {
                        return right.test(String(left));
                    }
                    return false;

                case TokenType.LEFT_BRACKET: 
                    if (left && (typeof left === 'object' || Array.isArray(left))) {
                        return left[right];
                    }
                    return undefined;

                default: throw new Error(`Unknown binary operator: ${op.lexeme}`);
            }
        }

        // Ternary
        if (operands.length === 3 && op.type === TokenType.CONDITIONAL) {
            const condition = this.evaluate(operands[0]);
            if (condition) {
                return this.evaluate(operands[1]);
            } else {
                return this.evaluate(operands[2]);
            }
        }

        throw new Error(`Unexpected node structure: ${op.lexeme} with ${operands.length} operands`);
    }

    private handleAssignment(leftExpr: Expr, rightExpr: Expr): any {
        const right = this.evaluate(rightExpr);

        if (leftExpr instanceof Leaf && leftExpr.token.type === TokenType.IDENTIFIER) {
            this.assign(leftExpr.token.lexeme, right);
            return right;
        }

        if (leftExpr instanceof Node && leftExpr.operator.type === TokenType.DOT) {
             const obj = this.evaluate(leftExpr.operands[0]);
             const propNode = leftExpr.operands[1];
             if (obj && typeof obj === 'object' && propNode instanceof Leaf && propNode.token.type === TokenType.IDENTIFIER) {
                 obj[propNode.token.lexeme] = right;
                 return right;
             }
        }

        if (leftExpr instanceof Node && leftExpr.operator.type === TokenType.LEFT_BRACKET) {
            const obj = this.evaluate(leftExpr.operands[0]);
            const key = this.evaluate(leftExpr.operands[1]);
            if (obj && typeof obj === 'object') {
                obj[key] = right;
                return right;
            }
        }
        
        throw new Error("Invalid assignment target");
    }

    private evaluateFunctionCall(call: FunctionCall): any {
        let func: any;

        const flatName = this.flattenName(call.func);
        if (flatName) {
            func = this.resolveIdentifier(flatName);
        }

        if (!func) {
             func = this.evaluate(call.func);
        }
        
        const args = call.args.map(arg => this.evaluate(arg));

        if (typeof func === 'function') {
            return func.apply(null, args);
        }
        throw new Error(`Expression is not a function: ${call.func}`);
    }

    private flattenName(expr: Expr): string | null {
        if (expr instanceof Leaf && expr.token.type === TokenType.IDENTIFIER) {
            return expr.token.lexeme;
        }
        if (expr instanceof Node && expr.operator.type === TokenType.DOT) {
            const left = this.flattenName(expr.operands[0]);
            const right = expr.operands[1];
            if (left && right instanceof Leaf && right.token.type === TokenType.IDENTIFIER) {
                return left + '.' + right.token.lexeme;
            }
        }
        return null;
    }

    private evaluateLambda(lambda: LambdaFunction): any {
        const params = lambda.parameters.map(p => p.token.lexeme);
        const closureScope = this.currentScope;

        return (...args: any[]) => {
            return this.withNewScope(() => {
                params.forEach((name, index) => {
                    this.define(name, args[index]);
                });
                return this.evaluate(lambda.body);
            }, closureScope);
        };
    }
}
