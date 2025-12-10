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

```typescript
const aviator = new AviatorScript();

// Execute
aviator.execute(code: string, context?: Record<string, any>): any

// Compile
const compiled = aviator.compile(code: string);
compiled.execute(context?: Record<string, any>): any
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
