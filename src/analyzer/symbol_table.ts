import { AviatorType } from './types';

export class SymbolTable {
    private parent: SymbolTable | null;
    private symbols: Map<string, AviatorType>;

    constructor(parent: SymbolTable | null = null) {
        this.parent = parent;
        this.symbols = new Map();
    }

    public define(name: string, type: AviatorType): void {
        this.symbols.set(name, type);
    }

    public resolve(name: string): AviatorType | null {
        let current: SymbolTable | null = this;
        while (current) {
            if (current.symbols.has(name)) {
                return current.symbols.get(name)!;
            }
            current = current.parent;
        }
        return null;
    }

    public createChild(): SymbolTable {
        return new SymbolTable(this);
    }
}

