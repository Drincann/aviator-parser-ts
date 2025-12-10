#!/usr/bin/env node

import * as readline from 'readline';
import * as fs from 'fs';
import * as path from 'path';
import { AviatorScript } from './script';

const aviator = new AviatorScript();
const context: Record<string, any> = {};

function printBanner() {
    console.log('╔═══════════════════════════════════════╗');
    console.log('║   AviatorScript TypeScript Runtime   ║');
    console.log('║            Version 1.0.0              ║');
    console.log('╚═══════════════════════════════════════╝');
    console.log('');
    console.log('Type ".help" for help, ".exit" to quit');
    console.log('');
}

function printHelp() {
    console.log('Commands:');
    console.log('  .help              Show this help message');
    console.log('  .exit              Exit the REPL');
    console.log('  .clear             Clear context variables');
    console.log('  .vars              Show all variables');
    console.log('  .load <file>       Load and execute a script file');
    console.log('');
    console.log('Examples:');
    console.log('  > let a = 10');
    console.log('  > a + 20');
    console.log('  > fn add(x, y) { x + y }');
    console.log('  > add(1, 2)');
}

function printVars() {
    const vars = Object.keys(context).filter(k => !k.startsWith('_') && typeof context[k] !== 'function');
    if (vars.length === 0) {
        console.log('No variables defined');
        return;
    }
    console.log('Variables:');
    for (const key of vars) {
        const value = context[key];
        const type = typeof value;
        const preview = type === 'function' ? '[Function]' : 
                       value === null ? 'null' :
                       value === undefined ? 'undefined' :
                       JSON.stringify(value).substring(0, 50);
        console.log(`  ${key}: ${preview}`);
    }
}

function executeFile(filePath: string) {
    try {
        const absPath = path.resolve(filePath);
        if (!fs.existsSync(absPath)) {
            console.error(`Error: File not found: ${filePath}`);
            return;
        }
        
        const code = fs.readFileSync(absPath, 'utf-8');
        console.log(`Executing: ${absPath}\n`);
        
        const result = aviator.execute(code, context);
        if (result !== null && result !== undefined) {
            console.log('Result:', result);
        }
    } catch (e: any) {
        console.error('Error:', e.message);
    }
}

function repl() {
    printBanner();
    
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
        prompt: '> '
    });

    let multilineBuffer = '';
    let inMultiline = false;

    rl.prompt();

    rl.on('line', (line: string) => {
        const trimmed = line.trim();

        // Handle commands
        if (trimmed.startsWith('.')) {
            if (multilineBuffer) {
                console.log('Cannot use commands in multiline mode. Type } to finish.');
                rl.prompt();
                return;
            }

            const cmd = trimmed.split(' ');
            switch (cmd[0]) {
                case '.help':
                    printHelp();
                    break;
                case '.exit':
                    console.log('Goodbye!');
                    process.exit(0);
                case '.clear':
                    Object.keys(context).forEach(k => delete context[k]);
                    console.log('Context cleared');
                    break;
                case '.vars':
                    printVars();
                    break;
                case '.load':
                    if (cmd[1]) {
                        executeFile(cmd.slice(1).join(' '));
                    } else {
                        console.log('Usage: .load <filename>');
                    }
                    break;
                default:
                    console.log(`Unknown command: ${cmd[0]}. Type .help for help.`);
            }
            rl.prompt();
            return;
        }

        // Handle multiline input (detect { without matching })
        if (trimmed.includes('{')) {
            inMultiline = true;
            multilineBuffer += line + '\n';
            rl.setPrompt('... ');
            rl.prompt();
            return;
        }

        if (inMultiline) {
            multilineBuffer += line + '\n';
            if (trimmed.includes('}')) {
                // Count braces
                const openCount = (multilineBuffer.match(/\{/g) || []).length;
                const closeCount = (multilineBuffer.match(/\}/g) || []).length;
                if (openCount === closeCount) {
                    inMultiline = false;
                    const code = multilineBuffer;
                    multilineBuffer = '';
                    rl.setPrompt('> ');
                    executeCode(code);
                }
            }
            rl.prompt();
            return;
        }

        // Single line execution
        if (trimmed) {
            executeCode(line);
        }
        rl.prompt();
    });

    rl.on('close', () => {
        console.log('\nGoodbye!');
        process.exit(0);
    });

    function executeCode(code: string) {
        try {
            const result = aviator.execute(code, context);
            
            // Update context with any new variables
            // (This is a simplified approach - in reality, we'd track changes)
            
            if (result !== null && result !== undefined) {
                console.log('→', formatResult(result));
            }
        } catch (e: any) {
            console.error('✗ Error:', e.message);
        }
    }

    function formatResult(result: any): string {
        if (typeof result === 'function') {
            return '[Function]';
        }
        if (typeof result === 'bigint') {
            return result.toString() + 'n';
        }
        if (result instanceof RegExp) {
            return result.toString();
        }
        if (result instanceof Map) {
            const entries = Array.from(result.entries())
                .map(([k, v]) => `${JSON.stringify(k)}: ${JSON.stringify(v)}`)
                .join(', ');
            return `Map { ${entries} }`;
        }
        if (result instanceof Set) {
            const entries = Array.from(result)
                .map(v => JSON.stringify(v))
                .join(', ');
            return `Set { ${entries} }`;
        }
        if (Array.isArray(result)) {
            return JSON.stringify(result);
        }
        if (typeof result === 'object') {
            return JSON.stringify(result, null, 2);
        }
        return String(result);
    }
}

function main() {
    const args = process.argv.slice(2);

    if (args.length === 0) {
        // Interactive REPL mode
        repl();
    } else if (args[0] === '--help' || args[0] === '-h') {
        console.log('Usage:');
        console.log('  aviator              Start interactive REPL');
        console.log('  aviator <file>       Execute a script file');
        console.log('  aviator -e <code>    Execute code string');
        console.log('  aviator --help       Show this help');
    } else if (args[0] === '-e' || args[0] === '--eval') {
        // Execute code from command line
        const code = args.slice(1).join(' ');
        try {
            const result = aviator.execute(code);
            if (result !== null && result !== undefined) {
                console.log(result);
            }
        } catch (e: any) {
            console.error('Error:', e.message);
            process.exit(1);
        }
    } else {
        // Execute file
        const filePath = args[0];
        executeFile(filePath);
    }
}

main();

