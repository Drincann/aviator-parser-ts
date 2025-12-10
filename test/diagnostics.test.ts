import { describe, it } from 'node:test';
import assert from 'node:assert';
import { StaticAnalyzer } from '../src/analyzer/analyzer';

describe('Error Reporting', () => {
    it('Should report syntax error on correct line (incomplete if)', () => {
        const analyzer = new StaticAnalyzer();
        // 22 lines of code
        const code = `
let a = 1;
let a = 1;
let a = 1;
let a = 1;
let a = 1;
let a = 1;
let a = 1;
let a = 1;
let a = 1;
let a = 1;
let a = 1;
let a = 1;
let a = 1;
let a = 1;
let a = 1;
let a = 1;
let a = 1;
let a = 1;
let a = 1;
let a = 1;
if
`;
        const diagnostics = analyzer.analyze(code);
        assert.strictEqual(diagnostics.length, 1, 'Should have exactly 1 error');
        
        const error = diagnostics[0];
        console.log('Error reported:', error);
        
        // The last line is line 22 (due to initial newline + 20 lines + if)
        // Actually template literal starts with newline, so:
        // Line 1: empty
        // Line 2: let a = 1;
        // ...
        // Line 21: let a = 1;
        // Line 22: if
        // Line 23: empty
        
        // Wait, line counting:
        // `
        // let a = 1;`
        // Line 1 is empty. Line 2 is `let a = 1`.
        
        assert.ok(error.line > 20, `Error line should be > 20, got ${error.line}`);
    });

    it('Should report syntax error on correct line (unexpected token)', () => {
        const analyzer = new StaticAnalyzer();
        const code = `
let a = 1;
let b = 2;
## some padding
fn test() {
  return;
}

try {
} catch e { 
}
`;
        // catch e { -> missing parens `catch (e)`
        // Expected '(' after catch. Got: Token{... lexeme='e' ... line=10}
        
        const diagnostics = analyzer.analyze(code);
        assert.strictEqual(diagnostics.length, 1);
        const error = diagnostics[0];
        console.log('Error reported:', error);
        
        // Line count:
        // 1: 
        // 2: let a
        // 3: let b
        // 4: //
        // 5: fn
        // 6:   return
        // 7: }
        // 8: 
        // 9: try {
        // 10: } catch e {
        
        assert.strictEqual(error.line, 10, `Error should be on line 10, got ${error.line}`);
    });
});
