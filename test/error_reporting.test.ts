
import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { StaticAnalyzer } from '../src/analyzer/analyzer';
import { ParseError, Token, TokenType } from '../src/token';
import { ScriptParser } from '../src/script_parser';

test('StaticAnalyzer should report correct line number for syntax errors', () => {
    const code = `
let a = 1;
let b = 2;
if
`;
    // line 1: empty
    // line 2: let a = 1;
    // line 3: let b = 2;
    // line 4: if
    // EOF should be at line 4 or 5 depending on trailing newline

    const analyzer = new StaticAnalyzer();
    const diagnostics = analyzer.analyze(code);

    assert.equal(diagnostics.length, 1);
    // The error comes from parsing 'if' which expects an expression.
    // Expression parsing fails at EOF.
    // EOF token should have line number around 4.
    
    console.log('Diagnostic:', diagnostics[0]);
    assert.ok(diagnostics[0].line >= 4, `Expected line >= 4, got ${diagnostics[0].line}`);
});

test('ScriptParser should throw ParseError with token info', () => {
    const code = 'if';
    try {
        ScriptParser.parse(code);
        assert.fail('Should have thrown error');
    } catch (e: any) {
        assert.ok(e instanceof ParseError, 'Error should be instance of ParseError');
        assert.ok(e.token, 'Error should have token');
        assert.equal(e.token.type, TokenType.EOF);
    }
});

test('ParseError structure check', () => {
    const token = new Token(TokenType.EOF, "", 0, 0, 10);
    const error = new ParseError("test", token);
    assert.equal(error.token.line, 10);
});
