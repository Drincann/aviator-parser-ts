import { DefaultAviatorRuntime } from './src/runtime';

const runtime = new DefaultAviatorRuntime();

const tests = [
    "string.length('hello')",
    "string.contains('hello', 'ell')",
    "string.startsWith('hello', 'he')",
    "string.endsWith('hello', 'lo')",
    "string.substring('hello', 1, 3)",
    "string.indexOf('hello', 'l')",
];

for (const test of tests) {
    try {
        const result = runtime.run(test, {});
        console.log(`${test} => ${result}`);
    } catch(e: any) {
        console.error(`${test} => ERROR: ${e.message}`);
    }
}

