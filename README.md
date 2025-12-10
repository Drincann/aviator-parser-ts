# aviator-parser-ts

A TypeScript implementation of the Parser and AST generator for [AviatorScript](https://github.com/killme2008/aviatorscript).

This project is a migration of the `aviator-parser` Java implementation to TypeScript, providing Lexer, Pratt Parser, and AST structure definitions.

## Install

```bash
npm install aviator-parser
```

## Usage

### Parsing (AST)

You can use the `Pratt` parser to parse AviatorScript expressions into an Abstract Syntax Tree (AST).

```typescript
import { Pratt, Expr } from "aviator-parser";

const code = "a + b * c";
const ast: Expr = Pratt.parse(code);

// Get Reverse Polish Notation (RPN) representation
console.log(ast.rp()); 
// Output: (+ a (* b c))

// Get original expression string (normalized)
console.log(ast.toString());
// Output: (a + (b * c))
```

### Lexer

If you only need to tokenize the input:

```typescript
import { AviatorLexer, Token, TokenType } from "aviator-parser";

const lexer = new AviatorLexer("a + 1");
let token: Token;

while ((token = lexer.next()).type !== TokenType.EOF) {
    console.log(token);
}
```

### Executor Structure (Pending Execution)

This library provides a "Pending Execution" structure similar to the Java implementation. This allows you to partial-evaluate expressions or analyze dependencies before actual execution.

**Note**: This library parses the expression structure. For actual runtime evaluation of the values, you need to provide an implementation of `ExpressionRuntime`.

```typescript
import { 
    AviatorPendingExecutionFactory, 
    ExpressionRuntime, 
    PendingExecution 
} from "aviator-parser";

// 1. Implement your runtime (bridge to your actual evaluator)
class MyRuntime implements ExpressionRuntime {
    run(expression: string, context: Record<string, any>): any {
        // Implement evaluation logic here, e.g., using 'eval' or another library
        // For demonstration, let's just return a mock value
        console.log(`Executing: ${expression} with context`, context);
        return true; 
    }

    getBuiltinIdentifiers(): Set<string> {
        return new Set(['Math', 'println']);
    }
}

// 2. Compile expression to a PendingExecution
const runtime = new MyRuntime();
const execution: PendingExecution = AviatorPendingExecutionFactory.compile(runtime, "a && b");

// 3. Check dependencies
// The execution knows which variables it needs
if (!execution.canExecute()) {
    console.log("Cannot execute yet, missing variables.");
}

// 4. Provide values
execution.provide("a", true);
execution.provide("b", false);

// 5. Execute
if (execution.canExecute()) {
    const result = execution.execute();
    console.log("Result:", result); // Output depends on your Runtime implementation
}
```

## Features

- **Lexer**: Full support for AviatorScript tokens including:
    - Numbers (decimal, hex, scientific notation)
    - Strings (single & double quoted)
    - Regex literals (`/pattern/`)
    - Operators (Arithmetic, Bitwise, Logic, Comparison)
    - Identifiers & Keywords
- **Parser**: Pratt Parser implementation handling operator precedence (binding power) correctly.
- **AST**: Typed AST nodes (`Node`, `Leaf`, `FunctionCall`, `LambdaFunction`, etc.).
- **Utils**: Helper classes for character analysis.

## Development

```bash
# Install dependencies
npm install

# Run tests
npm test

# Build
npm run build
```

## License

WTFPL
