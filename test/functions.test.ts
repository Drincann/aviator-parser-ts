import { describe, it } from 'node:test';
import assert from 'node:assert';
import { DefaultAviatorRuntime } from '../src/runtime';

describe('Aviator Functions', () => {
    const runtime = new DefaultAviatorRuntime();
    const run = (code: string, ctx: any = {}) => runtime.run(code, ctx);

    it('System Functions', () => {
        assert.strictEqual(run("long(10.5)"), 10.5); 
        assert.strictEqual(run("str(123)"), "123");
        assert.strictEqual(run("boolean(1)"), true);
        assert.strictEqual(run("boolean(nil)"), false);
        assert.strictEqual(run("identity(100)"), 100);
        assert.strictEqual(run("type('s')"), 'string');
        assert.strictEqual(run("cmp(10, 20)"), -1);
        
        assert.deepStrictEqual(run("range(0, 5)"), [0, 1, 2, 3, 4]);
        
        assert.deepStrictEqual(run("tuple(1, 2, 3)"), [1, 2, 3]);
        assert.strictEqual(run("min(1, 2, 3)"), 1);
        assert.strictEqual(run("max(1, 2, 3)"), 3);
        
        // is_def in Aviator is a special form that checks variable existence without evaluation
        // In pure function implementation, we can only check if the evaluated value is undefined
        assert.strictEqual(run("is_def(b)", {}), false); // b is undefined
        assert.strictEqual(run("is_def(a)", {a: 1}), true); // a exists
    });

    it('String Functions', () => {
        assert.strictEqual(run("string.length('hello')"), 5);
        assert.strictEqual(run("string.contains('hello', 'ell')"), true);
        assert.strictEqual(run("string.startsWith('hello', 'he')"), true);
        assert.strictEqual(run("string.endsWith('hello', 'lo')"), true);
        assert.strictEqual(run("string.substring('hello', 1, 3)"), 'el');
        assert.strictEqual(run("string.indexOf('hello', 'l')"), 2);
        assert.strictEqual(run("string.join(seq.list('a', 'b'), ',')"), 'a,b');
        assert.strictEqual(run("string.replace_all('aba', 'a', 'c')"), 'cbc');
    });

    it('Math Functions', () => {
        assert.strictEqual(run("math.abs(-10)"), 10);
        assert.strictEqual(run("math.round(10.5)"), 11);
        assert.strictEqual(run("math.floor(10.9)"), 10);
        assert.strictEqual(run("math.ceil(10.1)"), 11);
        assert.strictEqual(run("math.sqrt(16)"), 4);
        assert.strictEqual(run("math.pow(2, 3)"), 8);
    });

    it('Sequence Functions', () => {
        assert.strictEqual(run("count(seq.list(1, 2, 3))"), 3);
        assert.strictEqual(run("is_empty(seq.list())"), true);
        
        const list = run("seq.list(1, 2)");
        assert.deepStrictEqual(list, [1, 2]);
        
        const set = run("seq.set(1, 2, 1)");
        assert.strictEqual(set.size, 2); 
        
        const map = run("seq.map('a', 1, 'b', 2)");
        assert.strictEqual(map.get('a'), 1);
        
        assert.deepStrictEqual(run("seq.add(seq.list(1), 2)"), [1, 2]);
        assert.strictEqual(run("seq.get(seq.list(10, 20), 1)"), 20);
        
        assert.strictEqual(run("seq.contains_key(seq.map('a', 1), 'a')"), true);
        
        assert.deepStrictEqual(run("map(seq.list(1, 2, 3), lambda(x) -> x * 2 end)"), [2, 4, 6]);
        assert.deepStrictEqual(run("filter(seq.list(1, 2, 3, 4), lambda(x) -> x > 2 end)"), [3, 4]);
        assert.strictEqual(run("reduce(seq.list(1, 2, 3), lambda(acc, x) -> acc + x end, 0)"), 6);
        
        assert.strictEqual(run("include(seq.list(1, 2), 1)"), true);
        
        assert.deepStrictEqual(run("sort(seq.list(3, 1, 2))"), [1, 2, 3]);
        assert.deepStrictEqual(run("reverse(seq.list(1, 2))"), [2, 1]);
    });
});
