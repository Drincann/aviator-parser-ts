import { describe, it } from 'node:test';
import assert from 'node:assert';
import { StaticAnalyzer } from '../src/analyzer/analyzer';

describe('Error Line Number', () => {
    it('Should report error on correct line for incomplete let statement', () => {
        const analyzer = new StaticAnalyzer();
        const code = `## Test
let a = 1;

let`;
        
        const diagnostics = analyzer.analyze(code);
        assert.strictEqual(diagnostics.length, 1, 'Should have exactly one diagnostic');
        assert.strictEqual(diagnostics[0].line, 4, `Error should be on line 4, got line ${diagnostics[0].line}`);
        assert.match(diagnostics[0].message, /Expect variable name after 'let'/);
    });

    it('Should report error on correct line for incomplete if statement', () => {
        const analyzer = new StaticAnalyzer();
        const code = `## Line 1
let a = 1;
let b = 2;

if`;
        
        const diagnostics = analyzer.analyze(code);
        assert.strictEqual(diagnostics.length, 1, 'Should have exactly one diagnostic');
        assert.strictEqual(diagnostics[0].line, 5, `Error should be on line 5, got line ${diagnostics[0].line}`);
    });

    it('Should report error on correct line for incomplete try-catch', () => {
        const analyzer = new StaticAnalyzer();
        const code = `let a = 1;

try {
} catch e(){
}`;
        
        const diagnostics = analyzer.analyze(code);
        assert.strictEqual(diagnostics.length, 1, 'Should have exactly one diagnostic');
        assert.strictEqual(diagnostics[0].line, 4, `Error should be on line 4, got line ${diagnostics[0].line}`);
        assert.match(diagnostics[0].message, /Expect '\(' after catch/);
    });

    it('Should report error on correct line for multiline script with incomplete statement', () => {
        const analyzer = new StaticAnalyzer();
        const code = `## Welcome to AviatorScript Web Runtime
## This is a pure JS implementation of AviatorScript

let a = 1;
let b = 2;
p("Hello, World!");
p("a + b = " + (a + b));

## Try defining a function
fn add(x, y) {
  return x + y;
}

p("Function call result: " + add(10, 20));

## Try some loop
for i in range(0, 5) {
  p("Loop " + i);
}

if`;
        
        const diagnostics = analyzer.analyze(code);
        assert.strictEqual(diagnostics.length, 1, 'Should have exactly one diagnostic');
        assert.strictEqual(diagnostics[0].line, 21, `Error should be on line 21, got line ${diagnostics[0].line}`);
    });

    it('Should report undefined variable error on correct line', () => {
        const analyzer = new StaticAnalyzer();
        const code = `let a = 1;
let b = 2;
let c = undefinedVar;`;
        
        const diagnostics = analyzer.analyze(code);
        assert.strictEqual(diagnostics.length, 1, 'Should have exactly one diagnostic');
        assert.strictEqual(diagnostics[0].line, 3, `Error should be on line 3, got line ${diagnostics[0].line}`);
        assert.match(diagnostics[0].message, /Undefined variable 'undefinedVar'/);
    });
});
