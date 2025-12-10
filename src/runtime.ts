import { ExpressionRuntime } from './executor/types';
import { Interpreter } from './interpreter';
import { Pratt } from './parser';

// Helper types and functions
const isNil = (v: any) => v === null || v === undefined;

export class DefaultAviatorRuntime implements ExpressionRuntime {
    
    private builtinFunctions: Record<string, Function> = {
        // System Functions
        'print': (outOrObj: any, obj?: any) => {
            const val = obj === undefined ? outOrObj : obj;
            // Use console.log without newline if available (Node.js), otherwise fallback
            const proc = (globalThis as any).process;
            if (proc && proc.stdout) {
                proc.stdout.write(String(val));
            } else {
                console.log(val);
            }
        },
        'println': (outOrObj: any, obj?: any) => {
            const val = obj === undefined ? outOrObj : obj;
            console.log(val);
        },
        'p': (outOrObj: any, obj?: any) => {
            const val = obj === undefined ? outOrObj : obj;
            console.log(val);
        },
        'sysdate': () => new Date(),
        'rand': (n?: number) => n === undefined ? Math.random() : Math.floor(Math.random() * n),
        'cmp': (x: any, y: any) => x === y ? 0 : (x > y ? 1 : -1),
        'now': () => Date.now(),
        'long': (v: any) => Number(v), // JS numbers are doubles, treated same as long
        'double': (v: any) => Number(v),
        'boolean': (v: any) => !isNil(v) && v !== false,
        'str': (v: any) => isNil(v) ? 'null' : String(v),
        'identity': (v: any) => v,
        'type': (x: any) => {
            if (x === null) return 'nil';
            if (x === undefined) return 'undefined'; // JS specific
            const t = typeof x;
            if (t === 'string') return 'string';
            if (t === 'number') return 'double'; // simplified
            if (t === 'boolean') return 'boolean';
            if (t === 'function') return 'function';
            if (Array.isArray(x)) return 'java.util.List'; // simplified mapping
            return 'Object';
        },
        'is_def': (x: any) => x !== undefined, // undefined in JS context means not def? Interpreter returns undefined for missing vars.
        'range': (start: number, end: number, step: number = 1) => {
            const arr = [];
            if (step > 0) {
                for (let i = start; i < end; i += step) arr.push(i);
            } else {
                for (let i = start; i > end; i += step) arr.push(i);
            }
            return arr;
        },
        'tuple': (...args: any[]) => args,
        'max': (...args: any[]) => {
            if (args.length === 0) return null;
            let m = args[0];
            for (let i = 1; i < args.length; i++) {
                if (args[i] > m) m = args[i];
            }
            return m;
        },
        'min': (...args: any[]) => {
            if (args.length === 0) return null;
            let m = args[0];
            for (let i = 1; i < args.length; i++) {
                if (args[i] < m) m = args[i];
            }
            return m;
        },

        // String Functions
        'string.contains': (s1: string, s2: string) => String(s1).includes(s2),
        'string.length': (s: string) => String(s).length,
        'string.startsWith': (s1: string, s2: string) => String(s1).startsWith(s2),
        'string.endsWith': (s1: string, s2: string) => String(s1).endsWith(s2),
        'string.substring': (s: string, begin: number, end?: number) => String(s).substring(begin, end),
        'string.indexOf': (s1: string, s2: string) => String(s1).indexOf(s2),
        'string.split': (target: string, regex: string, limit?: number) => String(target).split(new RegExp(regex), limit),
        'string.join': (seq: any[], separator: string) => seq.join(separator),
        'string.replace_first': (s: string, regex: string, replacement: string) => String(s).replace(new RegExp(regex), replacement),
        'string.replace_all': (s: string, regex: string, replacement: string) => String(s).replace(new RegExp(regex, 'g'), replacement),

        // Math Functions
        'math.abs': Math.abs,
        'math.round': Math.round,
        'math.floor': Math.floor,
        'math.ceil': Math.ceil,
        'math.sqrt': Math.sqrt,
        'math.pow': Math.pow,
        'math.log': Math.log,
        'math.log10': Math.log10,
        'math.sin': Math.sin,
        'math.cos': Math.cos,
        'math.tan': Math.tan,
        'math.atan': Math.atan,
        'math.acos': Math.acos,
        'math.asin': Math.asin,
        'Math_max': Math.max,
        'Math_min': Math.min,

        // Sequence Functions
        'count': (seq: any) => {
            if (isNil(seq)) return 0;
            if (Array.isArray(seq) || typeof seq === 'string') return seq.length;
            if (seq instanceof Set || seq instanceof Map) return seq.size;
            return 0;
        },
        'is_empty': (seq: any) => {
             if (isNil(seq)) return true;
             if (Array.isArray(seq) || typeof seq === 'string') return seq.length === 0;
             if (seq instanceof Set || seq instanceof Map) return seq.size === 0;
             return false;
        },
        'seq.list': (...args: any[]) => [...args],
        'seq.set': (...args: any[]) => new Set(args),
        'seq.map': (...args: any[]) => {
            const map = new Map();
            for (let i = 0; i < args.length; i += 2) {
                map.set(args[i], args[i + 1]);
            }
            return map;
        },
        'seq.add': (coll: any, ...args: any[]) => {
            if (Array.isArray(coll)) {
                coll.push(args[0]);
                return coll;
            }
            if (coll instanceof Set) {
                coll.add(args[0]);
                return coll;
            }
            if (coll instanceof Map && args.length >= 2) {
                coll.set(args[0], args[1]);
                return coll;
            }
            return coll;
        },
        'seq.get': (coll: any, key: any) => {
            if (Array.isArray(coll)) return coll[key];
            if (coll instanceof Map) return coll.get(key);
            return undefined;
        },
        'seq.contains_key': (coll: any, key: any) => {
            if (Array.isArray(coll)) return key >= 0 && key < coll.length;
            if (coll instanceof Map) return coll.has(key);
            return false;
        },
        'seq.remove': (coll: any, key: any) => {
             if (Array.isArray(coll)) {
                 const idx = coll.indexOf(key);
                 if (idx !== -1) coll.splice(idx, 1);
                 return coll;
             }
             if (coll instanceof Set) {
                 coll.delete(key);
                 return coll;
             }
             if (coll instanceof Map) {
                 coll.delete(key);
                 return coll;
             }
             return coll;
        },
        'map': (seq: any[], fun: Function) => seq.map(item => fun(item)),
        'filter': (seq: any[], pred: Function) => seq.filter(item => pred(item)),
        'reduce': (seq: any[], fun: Function, init: any) => seq.reduce((acc, item) => fun(acc, item), init),
        'include': (seq: any, elem: any) => {
            if (Array.isArray(seq)) return seq.includes(elem);
            if (seq instanceof Set) return seq.has(elem);
            if (seq instanceof Map) return seq.has(elem); // Check keys usually? Or values? Java contains checks element inclusion. For map it's usually containsKey or containsValue? Aviator `include` checks element in seq.
            // For map, sequence is entry set usually.
            return false;
        },
        'sort': (seq: any[], comparator?: Function) => {
            const copy = [...seq];
            if (comparator) {
                copy.sort((a, b) => comparator(a, b));
            } else {
                copy.sort();
            }
            return copy;
        },
        'reverse': (seq: any[]) => [...seq].reverse(),
        
        // Predicates
        'seq.eq': (val: any) => (x: any) => x === val,
        'seq.neq': (val: any) => (x: any) => x !== val,
        'seq.gt': (val: any) => (x: any) => x > val,
        'seq.ge': (val: any) => (x: any) => x >= val,
        'seq.lt': (val: any) => (x: any) => x < val,
        'seq.le': (val: any) => (x: any) => x <= val,
        'seq.nil': () => (x: any) => isNil(x),
        'seq.exists': () => (x: any) => !isNil(x),
    };

    run(expression: string, context: Record<string, any>): any {
        const ast = Pratt.parse(expression);
        const execContext = { ...this.builtinFunctions, ...context };
        const interpreter = new Interpreter(execContext);
        return interpreter.evaluate(ast);
    }

    getBuiltinIdentifiers(): Set<string> {
        return new Set(Object.keys(this.builtinFunctions));
    }
}
