import { describe, it } from 'node:test';
import assert from 'node:assert';
import { StaticAnalyzer } from '../src/analyzer/analyzer';

describe('Math.abs and object access', () => {
    it('Should recognize math.abs as a built-in function', () => {
        const analyzer = new StaticAnalyzer();
        const code = `let a = math.abs(1, 2);`;
        
        const diagnostics = analyzer.analyze(code);
        // Should not report "Undefined variable 'math'" or "Undefined variable 'abs'"
        const mathErrors = diagnostics.filter(d => 
            d.message.includes("Undefined variable 'math'") || 
            d.message.includes("Undefined variable 'abs'")
        );
        assert.strictEqual(mathErrors.length, 0, 
            `Should not report undefined variable errors for math.abs, but got: ${JSON.stringify(diagnostics)}`);
    });

    it('Should recognize seq.get as a built-in function', () => {
        const analyzer = new StaticAnalyzer();
        const code = `let result = seq.get([1, 2, 3], 0);`;
        
        const diagnostics = analyzer.analyze(code);
        const seqErrors = diagnostics.filter(d => 
            d.message.includes("Undefined variable 'seq'") || 
            d.message.includes("Undefined variable 'get'")
        );
        assert.strictEqual(seqErrors.length, 0, 
            `Should not report undefined variable errors for seq.get, but got: ${JSON.stringify(diagnostics)}`);
    });

    it('Should still report error for undefined object access', () => {
        const analyzer = new StaticAnalyzer();
        const code = `let a = unknown.prop;`;
        
        const diagnostics = analyzer.analyze(code);
        const unknownErrors = diagnostics.filter(d => 
            d.message.includes("Undefined variable 'unknown'")
        );
        assert.strictEqual(unknownErrors.length, 1, 
            `Should report undefined variable error for 'unknown', but got: ${JSON.stringify(diagnostics)}`);
    });

    it('Should handle nested object access', () => {
        const analyzer = new StaticAnalyzer();
        const code = `let a = math.abs(-5);`;
        
        const diagnostics = analyzer.analyze(code);
        const errors = diagnostics.filter(d => 
            d.message.includes("Undefined variable")
        );
        assert.strictEqual(errors.length, 0, 
            `Should not report undefined variable errors, but got: ${JSON.stringify(diagnostics)}`);
    });
});
