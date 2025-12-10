export interface ExpressionRuntime {
    run(expression: string, context: Record<string, any>): any;
    getBuiltinIdentifiers(): Set<string>;
}

export interface PendingExecution {
    provide(symbol: string, value: any): PendingExecution;
    canExecute(): boolean;
    execute(): boolean;
}

