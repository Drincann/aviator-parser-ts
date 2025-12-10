import { describe, it } from 'node:test';
import assert from 'node:assert';
import { Pratt } from '../src/parser';

describe('Pratt Parser', () => {
    it('testAddAssociativity', () => {
        const expr = Pratt.parse("1 + 2 + 3");
        assert.strictEqual(expr.rp(), "(+ (+ 1 2) 3)");
    });

    it('testSubtractAssociativity', () => {
        const expr = Pratt.parse("1 - 2 - 3");
        assert.strictEqual(expr.rp(), "(- (- 1 2) 3)");
    });

    it('test1', () => {
        const expr = Pratt.parse("1 + 2 * 3");
        assert.strictEqual(expr.rp(), "(+ 1 (* 2 3))");
    });

    it('test2', () => {
        const expr = Pratt.parse("a + b * c * d + e");
        assert.strictEqual(expr.rp(), "(+ (+ a (* (* b c) d)) e)");
    });

    it('testDotAssociativity', () => {
        const expr = Pratt.parse("a.b.c.d");
        assert.strictEqual(expr.rp(), "(. (. (. a b) c) d)");
    });

    it('test3', () => {
        const expr = Pratt.parse("1 + a.b * c");
        assert.strictEqual(expr.rp(), "(+ 1 (* (. a b) c))");
    });

    it('testSubtractUnary1', () => {
        const expr = Pratt.parse("-1");
        assert.strictEqual(expr.rp(), "(- 1)");
    });

    it('testSubtractUnary2', () => {
        const expr = Pratt.parse("1 - -2");
        assert.strictEqual(expr.rp(), "(- 1 (- 2))");
    });

    it('testSubtractUnary3', () => {
        const expr = Pratt.parse("--1 * 2");
        assert.strictEqual(expr.rp(), "(* (- (- 1)) 2)");
    });

    it('testSubtractUnary4', () => {
        const expr = Pratt.parse("--a.b.c");
        assert.strictEqual(expr.rp(), "(- (- (. (. a b) c)))");
    });

    it('testSubtractUnary5', () => {
        const expr = Pratt.parse("--1 + 2");
        assert.strictEqual(expr.rp(), "(+ (- (- 1)) 2)");
    });

    it('testSubtractUnary6', () => {
        const expr = Pratt.parse("--1 - 2");
        assert.strictEqual(expr.rp(), "(- (- (- 1)) 2)");
    });

    it('testParentheses1', () => {
        const expr = Pratt.parse("(1 + 2) * 3");
        assert.strictEqual(expr.rp(), "(* (+ 1 2) 3)");
    });

    it('testParentheses2', () => {
        const expr = Pratt.parse("(a + b).c + d");
        assert.strictEqual(expr.rp(), "(+ (. (+ a b) c) d)");
    });

    it('testFieldAccess1', () => {
        const expr = Pratt.parse("a[1][2][3]");
        assert.strictEqual(expr.rp(), "([ ([ ([ a 1) 2) 3)");
    });

    it('testFieldAccess2', () => {
        const expr = Pratt.parse("a.b['c']['d'].e");
        assert.strictEqual(expr.rp(), "(. ([ ([ (. a b) 'c') 'd') e)");
    });

    it('testTernary1', () => {
        const expr = Pratt.parse("a ? b : c ? d : e");
        assert.strictEqual(expr.rp(), "(? a b (? c d e))");
    });

    it('testTernary2', () => {
        const expr = Pratt.parse("a ? b ? c : d : e");
        assert.strictEqual(expr.rp(), "(? a (? b c d) e)");
    });

    it('testFunctionCall1', () => {
        const expr = Pratt.parse("f(1, 2, 3)");
        assert.strictEqual(expr.rp(), "(f 1 2 3)");
    });

    it('testFunctionCall2', () => {
        const expr = Pratt.parse("(lambda (x, y) -> x + y end)(1, 2)");
        assert.strictEqual(expr.rp(), "(lambda (x y) -> (+ x y) end 1 2)");
    });

    it('testFunctionCall3', () => {
        const expr = Pratt.parse("lambda (x, y) -> x + y end + 2");
        assert.strictEqual(expr.rp(), "(+ lambda (x y) -> (+ x y) end 2)");
    });

    it('testEquality1', () => {
        const expr = Pratt.parse("1 != 2 == 3");
        assert.strictEqual(expr.rp(), "(== (!= 1 2) 3)");
    });

    it('testEquality2', () => {
        const expr = Pratt.parse("1 > 2 == 3");
        assert.strictEqual(expr.rp(), "(== (> 1 2) 3)");
    });

    it('testUseCase1', () => {
        const expr = Pratt.parse("fun(\"\\\"\")");
        assert.strictEqual(expr.rp(), "(fun \"\\\"\")");
    });

    it('testObjectAccessStringify', () => {
        const expr = Pratt.parse("a.b[c]['d'].e");
        assert.strictEqual(expr.toString(), "a.b[c]['d'].e");
    });

    it('testRegex', () => {
        const expr = Pratt.parse("phoneWithCountryCode =~ /86162.*/");
        assert.strictEqual(expr.rp(), "(=~ phoneWithCountryCode /86162.*/)");
    });

    it('testAssign', () => {
        const expr = Pratt.parse("a || b = c && d || e");
        const expr1 = Pratt.parse("a && b = c && d || e");
        const expr2 = Pratt.parse("'' =~ b = /a/");
        const expr3 = Pratt.parse("a == b = false");
        assert.strictEqual(expr.toString(), "(a || (b = ((c && d) || e)))");
        assert.strictEqual(expr1.toString(), "(a && (b = ((c && d) || e)))");
        assert.strictEqual(expr2.toString(), "(('' =~ b) = /a/)");
        assert.strictEqual(expr3.toString(), "((a == b) = false)");
    });
});
