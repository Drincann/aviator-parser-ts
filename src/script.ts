import { ScriptParser } from './script_parser';
import { Interpreter } from './interpreter';
import { DefaultAviatorRuntime } from './runtime';

export class AviatorScript {
    private runtime: DefaultAviatorRuntime;

    constructor() {
        this.runtime = new DefaultAviatorRuntime();
    }

    public execute(code: string, context: Record<string, any> = {}): any {
        const statements = ScriptParser.parse(code);
        
        // Merge builtins with context
        const execContext = { ...this.runtime['builtinFunctions'], ...context };
        const interpreter = new Interpreter(execContext);
        
        return interpreter.executeStatements(statements);
    }

    public compile(code: string) {
        const statements = ScriptParser.parse(code);
        return {
            execute: (context: Record<string, any> = {}) => {
                const execContext = { ...this.runtime['builtinFunctions'], ...context };
                const interpreter = new Interpreter(execContext);
                return interpreter.executeStatements(statements);
            }
        };
    }
}

