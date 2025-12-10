import { describe, it } from 'node:test';
import assert from 'node:assert';
import { Interpreter } from '../src/interpreter';
import { Pratt } from '../src/parser';
import { DefaultAviatorRuntime } from '../src/runtime';

describe('Interpreter', () => {
    const evalExpr = (code: string, ctx: any = {}) => {
        const ast = Pratt.parse(code);
        const interpreter = new Interpreter(ctx);
        return interpreter.evaluate(ast);
    };

    it('Arithmetic', () => {
        assert.strictEqual(evalExpr("1 + 2"), 3);
        assert.strictEqual(evalExpr("1 + 2 * 3"), 7);
        assert.strictEqual(evalExpr("(1 + 2) * 3"), 9);
        assert.strictEqual(evalExpr("10 / 2"), 5);
        assert.strictEqual(evalExpr("10 % 3"), 1);
        assert.strictEqual(evalExpr("2 ** 3"), 8);
    });

    it('Comparison', () => {
        assert.strictEqual(evalExpr("1 < 2"), true);
        assert.strictEqual(evalExpr("1 > 2"), false);
        assert.strictEqual(evalExpr("1 <= 1"), true);
        assert.strictEqual(evalExpr("1 >= 1"), true);
        assert.strictEqual(evalExpr("1 == 1"), true);
        assert.strictEqual(evalExpr("1 != 2"), true);
    });

    it('Logic', () => {
        assert.strictEqual(evalExpr("true && true"), true);
        assert.strictEqual(evalExpr("true && false"), false);
        assert.strictEqual(evalExpr("true || false"), true);
        assert.strictEqual(evalExpr("!true"), false);
        assert.strictEqual(evalExpr("!false"), true);
    });

    it('Bitwise', () => {
        assert.strictEqual(evalExpr("1 & 3"), 1); // 01 & 11 = 01
        assert.strictEqual(evalExpr("1 | 2"), 3); // 01 | 10 = 11
        assert.strictEqual(evalExpr("1 ^ 3"), 2); // 01 ^ 11 = 10
        assert.strictEqual(evalExpr("~1"), -2); 
        assert.strictEqual(evalExpr("1 << 1"), 2);
        assert.strictEqual(evalExpr("2 >> 1"), 1);
    });

    it('Ternary', () => {
        assert.strictEqual(evalExpr("true ? 1 : 2"), 1);
        assert.strictEqual(evalExpr("false ? 1 : 2"), 2);
        assert.strictEqual(evalExpr("1 > 0 ? 10 : 20"), 10);
    });

    it('Variables', () => {
        const ctx = { a: 10, b: 20 };
        assert.strictEqual(evalExpr("a + b", ctx), 30);
    });

    it('String', () => {
        assert.strictEqual(evalExpr("'hello' + ' world'"), "hello world");
    });

    it('Regex', () => {
        assert.strictEqual(evalExpr("'abc' =~ /a.*/"), true);
        assert.strictEqual(evalExpr("'abc' =~ /b.*/"), false);
    });

    it('Object Access', () => {
        const ctx = { 
            a: { b: 10 },
            arr: [1, 2, 3] 
        };
        assert.strictEqual(evalExpr("a.b", ctx), 10);
        assert.strictEqual(evalExpr("arr[0]", ctx), 1);
        assert.strictEqual(evalExpr("arr[1] + a.b", ctx), 12);
    });

    it('Function Call', () => {
        const ctx = {
            add: (a: number, b: number) => a + b
        };
        assert.strictEqual(evalExpr("add(1, 2)", ctx), 3);
    });

    it('Lambda', () => {
        assert.strictEqual(evalExpr("(lambda (x) -> x + 1 end)(1)"), 2);
    });

    it('Runtime', () => {
        const runtime = new DefaultAviatorRuntime();
        // Use max instead of Math_max
        assert.strictEqual(runtime.run("max(1, 10)", {}), 10);
        assert.strictEqual(runtime.run("str(123) + '456'", {}), "123456");
    });
});
