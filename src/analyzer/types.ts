export enum AviatorType {
    Long = 'long',
    Double = 'double',
    Boolean = 'boolean',
    String = 'string',
    Pattern = 'pattern',
    BigInt = 'bigint',
    Decimal = 'decimal',
    Nil = 'nil',
    Void = 'void', // For statements that don't return values
    Any = 'any',   // Dynamic/Unknown type
    List = 'list',
    Map = 'map',
    Set = 'set'
}

export enum DiagnosticSeverity {
    Error = 1,
    Warning = 2,
    Information = 3
}

export interface Diagnostic {
    message: string;
    line: number;
    column?: number; // Optional if token doesn't provide it
    severity: DiagnosticSeverity;
    source: string;
}

export interface TypeEnv {
    [key: string]: AviatorType;
}

