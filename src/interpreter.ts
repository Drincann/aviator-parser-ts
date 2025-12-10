import { Expr, Leaf, Node, FunctionCall, LambdaFunction } from './ast';
import { TokenType, Token } from './token';

export class Interpreter {
    constructor(private context: Record<string, any> = {}) {}

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

    private evaluateLeaf(leaf: Leaf): any {
        const token = leaf.token;
        switch (token.type) {
            case TokenType.NUMBER:
                return Number(token.lexeme);
            case TokenType.STRING:
                return token.lexeme.substring(1, token.lexeme.length - 1);
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

    private resolveIdentifier(name: string): any {
        if (Object.prototype.hasOwnProperty.call(this.context, name)) {
            return this.context[name];
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
            // Handle Assignment specially
            if (op.type === TokenType.ASSIGN) {
                return this.handleAssignment(operands[0], operands[1]);
            }

            // Handle Dot Access (property access) as an expression first
            if (op.type === TokenType.DOT) {
                 const left = this.evaluate(operands[0]);
                 if (left && typeof left === 'object') {
                    if (operands[1] instanceof Leaf && operands[1].token.type === TokenType.IDENTIFIER) {
                         return left[operands[1].token.lexeme];
                    }
                    // If right side is not an identifier, it's invalid dot syntax for Aviator usually, 
                    // but Parser allows it.
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
            this.context[leftExpr.token.lexeme] = right;
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
        // Function call: funcName(args...) or (lambda)(args...) or obj.method(args...)
        // In Parser, functionCall(left). left is the function expression.
        
        // Special Case: obj.method() is parsed as Node(DOT, obj, method).
        // But function call precedence binds stronger than dot?
        // Parser: postfixExpr -> LEFT_PAREN handles functionCall(left).
        // If we have `a.b()`.
        // 1. primary 'a'
        // 2. infix DOT 'b'. left = Node(DOT, a, b).
        // 3. postfix PAREN. functionCall(left).
        // So call.func is Node(DOT, a, b).
        // If we evaluate Node(DOT, a, b) normally, it returns property value `a.b`.
        // If `a.b` is a function in context (or JS method), it works.
        // BUT, for `string.length('s')` in Aviator, `string.length` is a function name in namespace?
        // OR `string` is a namespace map and `length` is a function in it?
        // In `DefaultAviatorRuntime`, we registered 'string.length' as a single key.
        // Lexer parses `string.length` as: IDENTIFIER(string) DOT IDENTIFIER(length).
        // So `string.length` is parsed as Node(DOT, string, length).
        // Interpreter.evaluate(Node(DOT...)) tries to look up property `length` on object `string`.
        // `string` identifier resolves to undefined (unless we injected it).
        // `DefaultAviatorRuntime` injects flat keys like 'string.length'.
        // So we need to handle "Namespace Resolution" or flatten identifier lookup for functions.
        
        let func: any;
        let thisContext: any = null; // for method calls if needed

        // Try to handle "namespaced function" pattern: a.b.c() where "a.b.c" is a registered function name.
        const flatName = this.flattenName(call.func);
        if (flatName) {
            func = this.resolveIdentifier(flatName);
        }

        if (!func) {
            // Fallback to normal evaluation
            func = this.evaluate(call.func);
        }
        
        const args = call.args.map(arg => this.evaluate(arg));

        if (typeof func === 'function') {
            return func.apply(thisContext, args);
        }
        throw new Error(`Expression is not a function: ${call.func}`);
    }

    // Helper to reconstruct "a.b.c" from AST if it's a chain of DOTs and IDENTIFIERS
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
        const closureContext = { ...this.context };

        return (...args: any[]) => {
            const localContext = { ...closureContext };
            params.forEach((name, index) => {
                localContext[name] = args[index];
            });
            const interpreter = new Interpreter(localContext);
            return interpreter.evaluate(lambda.body);
        };
    }
}
