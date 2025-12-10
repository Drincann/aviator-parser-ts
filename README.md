# aviator-parser-ts

TypeScript implementation of [AviatorScript](https://github.com/killme2008/aviatorscript).

## Install

```bash
npm install aviator-parser
```

## Usage

```typescript
import { AviatorScript } from "aviator-parser";

const aviator = new AviatorScript();

// Expression
aviator.execute("1 + 2 * 3"); // 7

// Script
const result = aviator.execute(`
    let a = 10;
    let b = 20;
    
    fn max(x, y) {
        x > y ? x : y
    }
    
    max(a, b)
`); // 20

// With context
aviator.execute("a + b", { a: 1, b: 2 }); // 3
```

## CLI

```bash
npm run cli          # REPL
npm run cli -- file.av
npm run cli -- -e "println(1 + 2)"
```

## API

### AviatorScript

```typescript
import { AviatorScript } from "aviator-parser";

const aviator = new AviatorScript();

// Execute code
aviator.execute(code: string, context?: Record<string, any>): any

// Compile for reuse
const compiled = aviator.compile(code: string);
compiled.execute(context?: Record<string, any>): any
```

### StaticAnalyzer

```typescript
import { StaticAnalyzer, Diagnostic, DiagnosticSeverity, TypeEnv } from "aviator-parser";

const analyzer = new StaticAnalyzer(env?: TypeEnv);

// Analyze code and get diagnostics
const diagnostics: Diagnostic[] = analyzer.analyze(code: string);

// Diagnostic structure
interface Diagnostic {
    message: string;
    line: number;
    column?: number;
    severity: DiagnosticSeverity; // Error = 1, Warning = 2, Information = 3
    source: string;
}

// Type environment
const env: TypeEnv = {
    userId: AviatorType.Long,
    userName: AviatorType.String
};
```

### Expression Parser (Pratt)

```typescript
import { Pratt, Expr } from "aviator-parser";

// Parse expression
const ast: Expr = Pratt.parse("a + b * c");

// AST methods
ast.toString();  // "(a + (b * c))"
ast.rp();        // "(+ a (* b c))"
```

### Script Parser

```typescript
import { ScriptParser, Stmt } from "aviator-parser";

// Parse script to statements
const statements: Stmt[] = ScriptParser.parse(`
    let a = 1;
    let b = 2;
    a + b
`);
```

### Interpreter

```typescript
import { Interpreter } from "aviator-parser";

const interpreter = new Interpreter(context?: Record<string, any>);

// Evaluate expression
const result = interpreter.evaluate(expr: Expr): any

// Execute statements
const result = interpreter.executeStatements(statements: Stmt[]): any

// Execute block with new scope
const result = interpreter.executeBlock(statements: Stmt[], extraVariables?: Record<string, any>): any

// Define variable
interpreter.define(name: string, value: any): void

// Assign variable
interpreter.assign(name: string, value: any): void
```

### Types

```typescript
import { 
    AviatorType,           // enum: Long, Double, Boolean, String, Pattern, BigInt, Decimal, Nil, Void, Any, List, Map, Set
    DiagnosticSeverity,    // enum: Error = 1, Warning = 2, Information = 3
    Diagnostic,            // interface
    TypeEnv,               // interface: { [key: string]: AviatorType }
    Expr,                  // interface
    Stmt,                  // interface
    Token,                 // class
    TokenType,             // enum
    ParseError             // class extends Error
} from "aviator-parser";
```

## Language

- **Types**: numbers, strings, booleans, nil, regex, functions, collections
- **Operators**: `+`, `-`, `*`, `/`, `%`, `**`, `>`, `>=`, `<`, `<=`, `==`, `!=`, `&&`, `||`, `!`, `&`, `|`, `^`, `~`, `<<`, `>>`, `>>>`
- **Statements**: `let`, `if/elsif/else`, `for`, `while`, `fn`, `return`, `break`, `continue`
- **Features**: closures, higher-order functions, string interpolation

## Built-in Functions

- **System**: `print`, `println`, `p`, `sysdate`, `rand`, `now`, `type`, `range`, `tuple`
- **String**: `string.length`, `string.contains`, `string.split`, `string.join`, etc.
- **Math**: `math.abs`, `math.round`, `math.floor`, `math.ceil`, `math.sqrt`, `math.sin`, etc.
- **Sequence**: `count`, `seq.list`, `seq.map`, `map`, `filter`, `reduce`, `sort`, etc.

## Development

```bash
npm install
npm test
npm run build
```

## License

WTFPL
