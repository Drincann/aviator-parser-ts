import { describe, it } from 'node:test';
import assert from 'node:assert';
import { StaticAnalyzer } from '../src/analyzer/analyzer';
import { AviatorType } from '../src/analyzer/types';

describe('Static Analyzer', () => {
    it('Should detect type mismatch in logic operation', () => {
        const analyzer = new StaticAnalyzer({
            b: AviatorType.Long,
            c: AviatorType.Long
        });

        // if b == 2 && c = 1 { ... }
        // b==2 -> Boolean
        // c=1 -> Long (return value of assignment)
        // Boolean && Long -> Error
        const code = `
            if b == 2 && c = 1 {
                print("ok");
            }
        `;

        const diagnostics = analyzer.analyze(code);
        assert.strictEqual(diagnostics.length, 1);
        assert.strictEqual(diagnostics[0].message, "Right operand of '&&' must be boolean, got long");
    });

    it('Should detect undefined variables', () => {
        const analyzer = new StaticAnalyzer();
        const code = `a + 1`;
        
        const diagnostics = analyzer.analyze(code);
        assert.strictEqual(diagnostics.length, 1);
        assert.match(diagnostics[0].message, /Undefined variable 'a'/);
    });

    it('Should handle variable definition', () => {
        const analyzer = new StaticAnalyzer();
        const code = `
            let a = 1;
            a + 2;
        `;
        
        const diagnostics = analyzer.analyze(code);
        assert.strictEqual(diagnostics.length, 0);
    });

    it('Should detect invalid if condition', () => {
        const analyzer = new StaticAnalyzer();
        const code = `
            if 1 + 2 {
                print("error");
            }
        `;
        
        const diagnostics = analyzer.analyze(code);
        assert.strictEqual(diagnostics.length, 1);
        assert.match(diagnostics[0].message, /'if' condition expects boolean, got long/);
    });

    it('Should handle nested scopes correctly', () => {
        const analyzer = new StaticAnalyzer();
        const code = `
            let a = 1;
            {
                let b = 2;
                a + b;
            }
            a + b; ## b undefined here
        `;
        
        const diagnostics = analyzer.analyze(code);
        assert.strictEqual(diagnostics.length, 1);
        assert.match(diagnostics[0].message, /Undefined variable 'b'/);
    });
});

