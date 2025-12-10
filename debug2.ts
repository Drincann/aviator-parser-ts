import { DefaultAviatorRuntime } from './src/runtime';
import { Pratt } from './src/parser';
import { Interpreter } from './src/interpreter';

const runtime = new DefaultAviatorRuntime();

const code = "string.endsWith('hello', 'lo')";
console.log("Testing:", code);

const ast = Pratt.parse(code);
console.log("AST:", ast.toString());
console.log("AST RPN:", ast.rp());

const ctx = { ...runtime['builtinFunctions'] };
console.log("Context has string.endsWith?", 'string.endsWith' in ctx);
console.log("Function value:", ctx['string.endsWith']);

const interpreter = new Interpreter(ctx);
try {
    const result = interpreter.evaluate(ast);
    console.log("Result:", result);
} catch(e: any) {
    console.error("Error:", e.message);
    console.error(e.stack);
}

