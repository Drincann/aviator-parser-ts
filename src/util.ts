export class LexerUtil {
    public static isIdentifierStart(ch: number): boolean {
        return LexerUtil.isAlpha(ch) || ch === 95; // '_' is 95
    }

    public static isIdentifierRest(ch: number): boolean {
        return LexerUtil.isAlpha(ch) || LexerUtil.isDigit(ch) || ch === 95; // '_'
    }

    public static isNotIdentifierStart(ch: number): boolean {
        return !LexerUtil.isIdentifierStart(ch);
    }

    public static isNumberLiteralStart(ch: number): boolean {
        return LexerUtil.isDigit(ch) || ch === 46; // '.' is 46
    }

    public static isStringLiteralStart(ch: number): boolean {
        return ch === 39 || ch === 34; // ' is 39, " is 34
    }

    public static isNotEOL(ch: number): boolean {
        return ch !== 10 && ch !== 13; // \n=10, \r=13
    }

    public static isWhiteSpace(ch: number): boolean {
        return ch === 32 || ch === 9 || ch === 12 || ch === 8 || ch === 10 || ch === 13;
        // ' '=32, \t=9, \f=12, \b=8, \n=10, \r=13
    }

    public static isDigit(ch: number): boolean {
        return ch >= 48 && ch <= 57; // '0'-'9'
    }

    public static toPrintable(ch: number): string {
        switch (ch) {
            case 10: return "\\n";
            case 13: return "\\r";
            case 9: return "\\t";
            case 12: return "\\f";
            case 8: return "\\b";
            default: return String.fromCharCode(ch);
        }
    }

    public static isHexDigit(ch: number): boolean {
        return LexerUtil.isDigit(ch) || (ch >= 97 && ch <= 102) || (ch >= 65 && ch <= 70);
        // a-f, A-F
    }

    private static isAlpha(ch: number): boolean {
        return (ch >= 97 && ch <= 122) || (ch >= 65 && ch <= 90);
        // a-z, A-Z
    }
}

export class ScopedSet<T> {
    private parent: ScopedSet<T> | null;
    private scope: Set<T>;

    constructor(parent: ScopedSet<T> | null, scope: Set<T>) {
        this.parent = parent;
        this.scope = scope;
    }

    public static create<T>(): ScopedSet<T> {
        return new ScopedSet<T>(null, new Set<T>());
    }

    public enter(): ScopedSet<T> {
        return new ScopedSet<T>(this, new Set<T>());
    }

    public leave(): ScopedSet<T> {
        if (!this.parent) {
            throw new Error("No parent scope to leave");
        }
        return this.parent;
    }

    public addTopScope(item: T): ScopedSet<T> {
        if (this.parent) {
            this.parent.addTopScope(item);
        } else {
            this.scope.add(item);
        }
        return this;
    }

    public getScope(): Set<T> {
        return this.scope;
    }

    public contains(item: T): boolean {
        if (this.parent && this.parent.contains(item)) {
            return true;
        }
        return this.scope.has(item);
    }

    public addAll(items: T[]): void {
        items.forEach(i => this.scope.add(i));
    }
}
