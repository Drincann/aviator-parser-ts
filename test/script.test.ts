import { describe, it } from 'node:test';
import assert from 'node:assert';
import { AviatorScript } from '../src/script';

describe('AviatorScript - Complete Scripts', () => {
    const aviator = new AviatorScript();

    it('Let and Assignment', () => {
        const result = aviator.execute(`
            let a = 1;
            let b = 2;
            a + b
        `);
        assert.strictEqual(result, 3);
    });

    it('Multiple Statements with Semicolons', () => {
        const result = aviator.execute(`
            let a = 1;
            let b = 2;
            c = a + b;
        `);
        // With trailing semicolon, should return nil
        // But currently ExprStmt doesn't track this
        // For now, accept that it returns 3
        assert.strictEqual(result, null);
    });

    it('If Statement', () => {
        const result = aviator.execute(`
            let a = 10;
            if (a > 5) {
                a * 2
            }
        `);
        assert.strictEqual(result, 20);
    });

    it('If-Else Statement', () => {
        const result1 = aviator.execute(`
            let a = 3;
            if (a > 5) {
                "greater"
            } else {
                "less or equal"
            }
        `);
        assert.strictEqual(result1, "less or equal");

        const result2 = aviator.execute(`
            let a = 10;
            if (a > 5) {
                "greater"
            } else {
                "less or equal"
            }
        `);
        assert.strictEqual(result2, "greater");
    });

    it('If-Elsif-Else Statement', () => {
        const result = aviator.execute(`
            let a = 50;
            if (a > 100) {
                "large"
            } elsif (a > 10) {
                "medium"
            } else {
                "small"
            }
        `);
        assert.strictEqual(result, "medium");
    });

    it('While Loop', () => {
        const result = aviator.execute(`
            let sum = 1;
            while (sum < 100) {
                sum = sum + sum;
            }
            sum
        `);
        assert.strictEqual(result, 128);
    });

    it('For Loop with Range', () => {
        const result = aviator.execute(`
            let sum = 0;
            for i in range(0, 5) {
                sum = sum + i;
            }
            sum
        `);
        assert.strictEqual(result, 10); // 0+1+2+3+4
    });

    it('For Loop with Array', () => {
        const result = aviator.execute(`
            let arr = seq.list(1, 2, 3);
            let sum = 0;
            for x in arr {
                sum = sum + x;
            }
            sum
        `);
        assert.strictEqual(result, 6);
    });

    it('For Loop with Index', () => {
        const result = aviator.execute(`
            let arr = tuple(10, 20, 30);
            let sum = 0;
            for i, x in arr {
                sum = sum + i + x;
            }
            sum
        `);
        // i=0,x=10; i=1,x=20; i=2,x=30 -> 0+10+1+20+2+30 = 63
        assert.strictEqual(result, 63);
    });

    it('Function Definition and Call', () => {
        const result = aviator.execute(`
            fn add(x, y) {
                x + y
            }
            add(1, 2)
        `);
        assert.strictEqual(result, 3);
    });

    it('Function with Return', () => {
        const result = aviator.execute(`
            fn square(x) {
                return x * x;
            }
            square(5)
        `);
        assert.strictEqual(result, 25);
    });

    it('Nested Scopes', () => {
        const result = aviator.execute(`
            let a = 1;
            {
                let a = 2;
                a = a + 1;
            }
            a
        `);
        assert.strictEqual(result, 1); // Outer scope unchanged
    });

    it('Break Statement', () => {
        const result = aviator.execute(`
            let sum = 0;
            for i in range(0, 10) {
                if (i > 5) {
                    break;
                }
                sum = sum + i;
            }
            sum
        `);
        assert.strictEqual(result, 15); // 0+1+2+3+4+5
    });

    it('Continue Statement', () => {
        const result = aviator.execute(`
            let sum = 0;
            for i in range(0, 10) {
                if (i % 2 == 0) {
                    continue;
                }
                sum = sum + i;
            }
            sum
        `);
        assert.strictEqual(result, 25); // 1+3+5+7+9
    });

    it('String Interpolation', () => {
        const result = aviator.execute(`
            let name = "Aviator";
            let a = 1;
            let b = 2;
            "Hello, #{name}, #{a} + #{b} = #{a + b}"
        `);
        assert.strictEqual(result, "Hello, Aviator, 1 + 2 = 3");
    });

    it('Closure', () => {
        const result = aviator.execute(`
            fn counter() {
                let c = 0;
                return lambda() -> c = c + 1 end;
            }
            let c1 = counter();
            let sum = c1() + c1() + c1();
            sum
        `);
        assert.strictEqual(result, 6); // 1+2+3
    });

    it('BigInt Support', () => {
        const result = aviator.execute(`
            let a = 100N;
            let b = 200N;
            a + b
        `);
        assert.strictEqual(result, BigInt(300));
    });

    it('Higher Order Functions', () => {
        const result = aviator.execute(`
            let arr = seq.list(1, 2, 3, 4, 5);
            let doubled = map(arr, lambda(x) -> x * 2 end);
            let sum = reduce(doubled, lambda(acc, x) -> acc + x end, 0);
            sum
        `);
        assert.strictEqual(result, 30); // (1+2+3+4+5)*2 = 30
    });
});
