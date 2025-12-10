# aviator-parser-ts

A complete TypeScript implementation of [AviatorScript](https://github.com/killme2008/aviatorscript) - a powerful expression language and scripting runtime.

Migrated from the Java implementation with full feature parity for core language features, adapted to TypeScript/JavaScript ecosystem conventions.

## ✨ Features

- ✅ **Complete Lexer**: Numbers (int, hex, scientific, BigInt, Decimal), Strings, Regex, Operators, Keywords
- ✅ **Pratt Parser**: Correct operator precedence and associativity
- ✅ **Full Script Runtime**: Execute complete scripts with variables, functions, and control flow
- ✅ **Rich Built-in Functions**: 70+ functions (system, string, math, sequence)
- ✅ **Advanced Features**: Closures, higher-order functions, string interpolation
- ✅ **Type System**: Dynamic typing with long, double, BigInt, string, boolean, nil, pattern, function
- ✅ **Interactive CLI**: REPL mode + file execution

## 📦 Install

```bash
npm install aviator-parser
```

## 🚀 Quick Start

### Execute Complete Scripts

```typescript
import { AviatorScript } from "aviator-parser";

const aviator = new AviatorScript();

// Simple expression
aviator.execute("1 + 2 * 3"); // 7

// Variables and functions
const result = aviator.execute(`
    let a = 10;
    let b = 20;
    
    fn max(x, y) {
        x > y ? x : y
    }
    
    max(a, b)
`);
console.log(result); // 20

// With context
aviator.execute("a + b", { a: 1, b: 2 }); // 3
```

## 🖥️ CLI Usage

```bash
# Interactive REPL
npm run cli
# or
npm run repl

# Execute a script file
npm run cli -- script.av

# Execute code directly
npm run cli -- -e "println(1 + 2 * 3)"
```

### REPL Example

```
> let a = 10
→ null
> let b = 20
→ null
> a + b
→ 30
> fn square(x) { x * x }
→ null
> square(5)
→ 25
> .vars
Variables:
  a: 10
  b: 20
  square: [Function]
> .exit
Goodbye!
```

See [CLI_USAGE.md](./CLI_USAGE.md) for detailed CLI documentation.

## 📖 Language Features

### Control Flow

```javascript
// If-elsif-else
let score = 85;
if (score >= 90) {
    "A"
} elsif (score >= 80) {
    "B"
} else {
    "C"
} // Returns "B"

// Loops
let sum = 0;
for i in range(1, 11) {
    sum = sum + i;
}

while (sum < 100) {
    sum = sum * 2;
}
```

### Functions and Closures

```javascript
// Function definition
fn fibonacci(n) {
    if (n <= 1) { return n; }
    return fibonacci(n - 1) + fibonacci(n - 2);
}

// Closures
fn makeCounter(start) {
    let count = start;
    return lambda() -> count = count + 1 end;
}

let counter = makeCounter(0);
counter(); // 1
counter(); // 2
```

### String Interpolation

```javascript
let name = "World";
let x = 10;
"Hello, #{name}! Result: #{x * 2}" // "Hello, World! Result: 20"
```

### Higher-Order Functions

```javascript
let nums = seq.list(1, 2, 3, 4, 5);

let doubled = map(nums, lambda(x) -> x * 2 end);
let evens = filter(doubled, lambda(x) -> x % 2 == 0 end);
let sum = reduce(evens, lambda(acc, x) -> acc + x end, 0);

sum // 30
```

### BigInt Support

```javascript
let big = 9999999999999999N;
big + 1N // 10000000000000000n
```

## 📚 API Reference

### AviatorScript Class

```typescript
const aviator = new AviatorScript();

// Execute code
aviator.execute(code: string, context?: Record<string, any>): any

// Compile for reuse
const compiled = aviator.compile(code: string);
compiled.execute(context?: Record<string, any>): any
```

### Expression Parsing (Low-level)

```typescript
import { Pratt, Expr } from "aviator-parser";

const ast: Expr = Pratt.parse("a + b * c");
console.log(ast.rp());       // (+ a (* b c))
console.log(ast.toString()); // (a + (b * c))
```

### Script Parsing

```typescript
import { ScriptParser } from "aviator-parser";

const statements = ScriptParser.parse(`
    let a = 1;
    let b = 2;
    a + b
`);
```

## 🔧 Built-in Functions

### System Functions
`print`, `println`, `p`, `sysdate`, `rand`, `now`, `long`, `double`, `boolean`, `str`, `type`, `identity`, `is_def`, `range`, `tuple`, `min`, `max`, `cmp`

### String Functions  
`string.length`, `string.contains`, `string.startsWith`, `string.endsWith`, `string.substring`, `string.indexOf`, `string.split`, `string.join`, `string.replace_first`, `string.replace_all`

### Math Functions
`math.abs`, `math.round`, `math.floor`, `math.ceil`, `math.sqrt`, `math.pow`, `math.log`, `math.log10`, `math.sin`, `math.cos`, `math.tan`, `math.asin`, `math.acos`, `math.atan`

### Sequence Functions
`count`, `is_empty`, `seq.list`, `seq.set`, `seq.map`, `seq.add`, `seq.get`, `seq.contains_key`, `seq.remove`, `map`, `filter`, `reduce`, `include`, `sort`, `reverse`

### Predicates
`seq.eq`, `seq.neq`, `seq.gt`, `seq.ge`, `seq.lt`, `seq.le`, `seq.nil`, `seq.exists`

## 🎯 Operators

### Arithmetic
`+`, `-`, `*`, `/`, `%`, `**` (power)

### Comparison
`>`, `>=`, `<`, `<=`, `==`, `!=`

### Logical
`&&`, `||`, `!`

### Bitwise
`&`, `|`, `^`, `~`, `<<`, `>>`, `>>>`

### Others
`.` (property), `[]` (index), `=~` (regex match), `? :` (ternary), `=` (assignment)

## 📝 Language Reference

### Types
- **Numbers**: `123`, `0xFF`, `1.5`, `1e-5`, `100N` (BigInt), `1.5M` (Decimal*)
- **Strings**: `"hello"`, `'world'`, with interpolation `"result: #{expr}"`
- **Boolean**: `true`, `false`
- **Nil**: `nil` (null)
- **Regex**: `/pattern/`
- **Functions**: `lambda(x) -> x + 1 end`
- **Collections**: Arrays, List, Map, Set

*Note: Decimal uses JavaScript Number (no BigDecimal equivalent)

### Statements
```javascript
// Variables
let x = 10;
x = x + 1;

// Conditions
if (x > 10) {
    println("large");
} elsif (x > 5) {
    println("medium");
} else {
    println("small");
}

// Loops
for i in range(0, 10) {
    if (i % 2 == 0) continue;
    println(i);
}

for index, value in myArray {
    println("#{index}: #{value}");
}

while (x < 100) {
    x = x * 2;
    if (x > 50) break;
}

// Functions
fn factorial(n) {
    if (n <= 1) { return 1; }
    return n * factorial(n - 1);
}

// Scopes
{
    let local = 42; // Only visible in this block
}
```

## 🧪 Testing

```bash
# Run all tests (61 test cases)
npm test

# Tests include:
# - Parser tests (27)
# - Interpreter tests (12)  
# - Function library tests (4)
# - Complete script tests (18)
```

## 📂 Project Structure

```
src/
├── lexer.ts          # Lexical analyzer
├── token.ts          # Token definitions
├── parser.ts         # Pratt expression parser
├── script_parser.ts  # Full script parser (statements)
├── ast.ts            # AST node definitions
├── statement.ts      # Statement types
├── interpreter.ts    # Interpreter with scope support
├── runtime.ts        # Built-in function library
├── script.ts         # Unified entry point
├── util.ts           # Utilities
├── binding_power.ts  # Operator precedence
└── executor/         # PendingExecution structure

test/
├── parser.test.ts       # Expression parsing tests
├── interpreter.test.ts  # Evaluation tests
├── functions.test.ts    # Built-in function tests
└── script.test.ts       # Complete script tests

cli.ts                # Command-line interface
example.av            # Example script
```

## 🎓 Examples

See `example.av` for a comprehensive example covering:
- Recursive functions (factorial)
- FizzBuzz
- Closures and counters
- Array processing (map/filter/reduce)
- String interpolation

## 🔄 Differences from Java Implementation

| Feature | Java | TypeScript |
|---------|------|------------|
| Core Language | ✅ Full | ✅ Full |
| Decimal Type | BigDecimal | Number* |
| Collections | Java Collections | JS Array/Map/Set |
| Java Interop | `new`, `use` | ❌ Not supported |
| Performance | JVM optimized | V8 optimized |

*JavaScript doesn't have arbitrary precision decimals. Use libraries like `decimal.js` if needed.

## 🚀 Development

```bash
# Install dependencies
npm install

# Run tests
npm test

# Build (ESM + CJS)
npm run build

# Run CLI
npm run cli

# Development mode
npm run cli -- -e "println('dev test')"
```

## 📄 License

WTFPL

## 🤝 Contributing

This is a complete port of AviatorScript to TypeScript. If you find any bugs or have suggestions, feel free to open an issue or submit a PR.

---

**Powered by TypeScript ❤️ | Migrated from Java with 💯% test coverage**
