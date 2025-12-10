import {
  Expr, Node, Leaf, FunctionCall, LambdaFunction,
} from '../ast';
import { Token, TokenType } from '../token';
import { ScriptParser } from '../script_parser';
import { AviatorType, Diagnostic, DiagnosticSeverity, TypeEnv } from './types';
import { SymbolTable } from './symbol_table';

export class StaticAnalyzer {
  private diagnostics: Diagnostic[] = [];
  private globalScope: SymbolTable;

  constructor(env: TypeEnv = {}) {
    this.globalScope = new SymbolTable();
    // Initialize global scope with provided environment types
    for (const [key, type] of Object.entries(env)) {
      this.globalScope.define(key, type);
    }
    this.registerBuiltins();
  }

  private registerBuiltins() {
    // Register some common built-ins for better analysis
    this.globalScope.define('println', AviatorType.Void);
    this.globalScope.define('print', AviatorType.Void);
    this.globalScope.define('range', AviatorType.List);
    this.globalScope.define('count', AviatorType.Long);
    this.globalScope.define('type', AviatorType.String);
    // Add more as needed
  }

  public analyze(code: string): Diagnostic[] {
    this.diagnostics = [];
    try {
      const statements = ScriptParser.parse(code);
      // ScriptParser returns Stmt[], but we need to handle them generically.
      // Our AST structure treats Stmts as Exprs mostly, or we wrapper them.
      // Let's iterate.

      // Note: Current ScriptParser returns Stmt[], which are classes like LetStmt, IfStmt defined in statement.ts
      // BUT, wait. In the previous refactor (step 18/19), I separated Stmt interfaces in `statement.ts`.
      // However, the AST nodes in `ast.ts` (like IfExpr, LetStmt class in ast.ts) are also used or partially mixed?
      // Let's double check `ScriptParser`.
      // `ScriptParser` returns `Stmt[]` from `src/statement.ts`.
      // These classes implement `Stmt` interface: { execute(interpreter): any }.
      // They DO NOT extend `Expr` or have `getChildren`.

      // To implement Static Analysis cleanly, I should probably implement a `visit` pattern 
      // or just use `instanceof` checks on the `Stmt` objects.

      // Since `statement.ts` classes hold `Expr` (which are `Node`, `Leaf` from `ast.ts`),
      // I need to traverse `Stmt` -> `Expr`.

      this.analyzeBlock(statements, this.globalScope);

    } catch (e: any) {
      // Catch syntax errors from Parser
      this.addError(e.message, 0); // Line 0 as fallback if parser doesn't give location in standard way
    }
    return this.diagnostics;
  }

  private analyzeBlock(statements: any[], scope: SymbolTable) {
    for (const stmt of statements) {
      this.analyzeStmt(stmt, scope);
    }
  }

  private analyzeStmt(stmt: any, scope: SymbolTable) {
    const stmtName = stmt.constructor.name;

    switch (stmtName) {
      case 'LetStmt': {
        // let a = 1;
        // stmt.name: Token, stmt.initializer: Expr
        const type = this.analyzeExpr(stmt.initializer, scope);
        scope.define(stmt.name.lexeme, type);
        break;
      }
      case 'ExprStmt': {
        this.analyzeExpr(stmt.expr, scope);
        break;
      }
      case 'IfStmt': {
        // if cond { then } elsif ... else ...
        const condType = this.analyzeExpr(stmt.condition, scope);
        if (condType !== AviatorType.Boolean && condType !== AviatorType.Any) {
          // Start of if condition
          // We don't have exact token for the start of expression easily unless we dig into expr
          this.addError(`'if' condition expects boolean, got ${condType}`, this.getLine(stmt.condition));
        }

        this.analyzeBlock(stmt.thenBranch, scope.createChild());

        for (const elsif of stmt.elsifBranches) {
          const elsifCondType = this.analyzeExpr(elsif.condition, scope);
          if (elsifCondType !== AviatorType.Boolean && elsifCondType !== AviatorType.Any) {
            this.addError(`'elsif' condition expects boolean, got ${elsifCondType}`, this.getLine(elsif.condition));
          }
          this.analyzeBlock(elsif.body, scope.createChild());
        }

        if (stmt.elseBranch) {
          this.analyzeBlock(stmt.elseBranch, scope.createChild());
        }
        break;
      }
      case 'WhileStmt': {
        const condType = this.analyzeExpr(stmt.condition, scope);
        if (condType !== AviatorType.Boolean && condType !== AviatorType.Any) {
          this.addError(`'while' condition expects boolean, got ${condType}`, this.getLine(stmt.condition));
        }
        this.analyzeBlock(stmt.body, scope.createChild());
        break;
      }
      case 'ForStmt': {
        // for x in seq
        const seqType = this.analyzeExpr(stmt.iterable, scope);
        // Ideally check if seqType is iterable (List, Array, Map, Range)

        const childScope = scope.createChild();
        // Define loop variables
        if (stmt.indexVar) {
          childScope.define(stmt.indexVar.lexeme, AviatorType.Any); // Index could be int or key
        }
        childScope.define(stmt.itemVar.lexeme, AviatorType.Any); // Item type unknown without generics

        this.analyzeBlock(stmt.body, childScope);
        break;
      }
      case 'BlockStmt': {
        this.analyzeBlock(stmt.statements, scope.createChild());
        break;
      }
      case 'ReturnStmt': {
        if (stmt.value) {
          this.analyzeExpr(stmt.value, scope);
        }
        break;
      }
      case 'FnStmt': {
        // fn name(params) { body }
        scope.define(stmt.name.lexeme, AviatorType.Any); // Function type
        const fnScope = scope.createChild();
        for (const param of stmt.params) {
          fnScope.define(param.lexeme, AviatorType.Any);
        }
        this.analyzeBlock(stmt.body, fnScope);
        break;
      }
      // Ignore Break/Continue for type checking currently
    }
  }

  private analyzeExpr(expr: Expr, scope: SymbolTable): AviatorType {
    if (!expr) return AviatorType.Void;

    if (expr instanceof Leaf) {
      return this.analyzeLeaf(expr, scope);
    }
    if (expr instanceof Node) {
      return this.analyzeNode(expr, scope);
    }
    if (expr instanceof FunctionCall) {
      // Check function existence
      const funcType = this.analyzeExpr(expr.func, scope);
      // Analyze args
      for (const arg of expr.args) {
        this.analyzeExpr(arg, scope);
      }
      // For now, return Any for function calls as we don't track return types signature
      return AviatorType.Any;
    }
    if (expr instanceof LambdaFunction) {
      const lambdaScope = scope.createChild();
      for (const param of expr.parameters) {
        lambdaScope.define(param.token.lexeme, AviatorType.Any);
      }
      this.analyzeExpr(expr.body, lambdaScope);
      return AviatorType.Any; // Function type
    }

    return AviatorType.Any;
  }

  private analyzeLeaf(leaf: Leaf, scope: SymbolTable): AviatorType {
    const token = leaf.token;
    switch (token.type) {
      case TokenType.NUMBER:
        if (token.lexeme.endsWith('N')) return AviatorType.BigInt;
        if (token.lexeme.endsWith('M')) return AviatorType.Decimal;
        if (token.lexeme.includes('.') || token.lexeme.toLowerCase().includes('e')) return AviatorType.Double;
        return AviatorType.Long;
      case TokenType.STRING:
        return AviatorType.String;
      case TokenType.TRUE:
      case TokenType.FALSE:
        return AviatorType.Boolean;
      case TokenType.NIL:
        return AviatorType.Nil;
      case TokenType.REGEX:
        return AviatorType.Pattern;
      case TokenType.IDENTIFIER:
        const type = scope.resolve(token.lexeme);
        if (!type) {
          this.addError(`Undefined variable '${token.lexeme}'`, token.line);
          return AviatorType.Any; // Return Any to prevent cascading errors
        }
        return type;
      default:
        return AviatorType.Any;
    }
  }

  private analyzeNode(node: Node, scope: SymbolTable): AviatorType {
    const op = node.operator;

    // Unary
    if (node.operands.length === 1) {
      const right = this.analyzeExpr(node.operands[0], scope);
      if (op.type === TokenType.LOGIC_NOT) {
        // !x -> x should be boolean (or any)
        return AviatorType.Boolean;
      }
      if (op.type === TokenType.SUBTRACT) {
        // -x -> x should be number
        return right; // Preserves type (Long -> Long)
      }
      return right;
    }

    // Binary
    if (node.operands.length === 2) {
      const leftNode = node.operands[0];
      const rightNode = node.operands[1];

      // Special case: Assignment
      // c = 1
      if (op.type === TokenType.ASSIGN) {
        // Check if left is L-Value (Identifier or Dot/Index)
        // For simple checking, we just check types
        const rightType = this.analyzeExpr(rightNode, scope);

        // If left is Identifier, we might define it if not exists? 
        // No, in Aviator, `let` defines. Direct assignment to undefined variable is usually allowed in loose mode, 
        // but strictly speaking should warn if not 'let' declared?
        // The interpreter allows `a = 1` global define. 
        // We will just verify the expression and return rightType.

        // We also need to analyze left side to check for validity (e.g. not assigning to 1 = 2)
        if (leftNode instanceof Leaf && leftNode.token.type === TokenType.IDENTIFIER) {
          // Update type in scope if it exists, or define if strict mode off?
          // For static analysis, we assume standard flow.
          // If the variable exists, we might warn on type change?
          const existing = scope.resolve(leftNode.token.lexeme);
          if (existing && existing !== AviatorType.Any && rightType !== AviatorType.Any && existing !== rightType) {
            // Aviator is dynamic, so type change is allowed. 
            // But maybe we track the NEW type for subsequent code?
            scope.define(leftNode.token.lexeme, rightType);
          } else if (!existing) {
            // Implicit definition
            scope.define(leftNode.token.lexeme, rightType);
          }
        } else {
          this.analyzeExpr(leftNode, scope);
        }

        return rightType;
      }

      const left = this.analyzeExpr(leftNode, scope);
      const right = this.analyzeExpr(rightNode, scope);

      // Logic: &&, ||
      if (op.type === TokenType.LOGIC_AND || op.type === TokenType.LOGIC_OR) {
        // Both must be boolean
        if (!this.isBooleanCompatible(left)) {
          this.addError(`Left operand of '${op.lexeme}' must be boolean, got ${left}`, this.getLine(leftNode));
        }
        if (!this.isBooleanCompatible(right)) {
          this.addError(`Right operand of '${op.lexeme}' must be boolean, got ${right}`, this.getLine(rightNode));
        }
        return AviatorType.Boolean;
      }

      // Comparison: ==, !=, >, < ...
      if ([TokenType.EQUAL, TokenType.NOT_EQUAL, TokenType.GREATER_THAN, TokenType.LESS_THAN,
      TokenType.GREATER_THAN_EQUAL, TokenType.LESS_THAN_EQUAL].includes(op.type)) {
        return AviatorType.Boolean;
      }

      // Arithmetic: +, -, *, /
      if ([TokenType.ADD, TokenType.SUBTRACT, TokenType.MULTIPLY, TokenType.DIVIDE, TokenType.MOD].includes(op.type)) {
        // String concatenation
        if (op.type === TokenType.ADD) {
          if (left === AviatorType.String || right === AviatorType.String) {
            return AviatorType.String;
          }
        }

        // Number promotion
        if (left === AviatorType.Decimal || right === AviatorType.Decimal) return AviatorType.Decimal;
        if (left === AviatorType.Double || right === AviatorType.Double) return AviatorType.Double;
        if (left === AviatorType.BigInt || right === AviatorType.BigInt) return AviatorType.BigInt;

        // Default Long
        return AviatorType.Long;
      }

      // Regex match
      if (op.type === TokenType.LIKE) {
        if (left !== AviatorType.String && left !== AviatorType.Any) {
          this.addWarn(`Left operand of '=~' should be string, got ${left}`, this.getLine(leftNode));
        }
        // Right should be pattern or string
        return AviatorType.Boolean;
      }
    }

    // Ternary
    if (node.operands.length === 3 && op.type === TokenType.CONDITIONAL) {
      const cond = this.analyzeExpr(node.operands[0], scope);
      if (!this.isBooleanCompatible(cond)) {
        this.addError(`Ternary condition must be boolean, got ${cond}`, this.getLine(node.operands[0]));
      }
      const trueType = this.analyzeExpr(node.operands[1], scope);
      const falseType = this.analyzeExpr(node.operands[2], scope);

      if (trueType === falseType) return trueType;
      return AviatorType.Any; // Mixed types
    }

    return AviatorType.Any;
  }

  private isBooleanCompatible(type: AviatorType): boolean {
    return type === AviatorType.Boolean || type === AviatorType.Any;
  }

  private addError(message: string, line: number) {
    this.diagnostics.push({
      message,
      line,
      severity: DiagnosticSeverity.Error,
      source: 'static-analysis'
    });
  }

  private addWarn(message: string, line: number) {
    this.diagnostics.push({
      message,
      line,
      severity: DiagnosticSeverity.Warning,
      source: 'static-analysis'
    });
  }

  private getLine(expr: Expr): number {
    // Try to extract line number from AST node
    if (expr instanceof Leaf) return expr.token.line;
    if (expr instanceof Node) return expr.operator.line;
    // Fallback
    return 0;
  }
}

