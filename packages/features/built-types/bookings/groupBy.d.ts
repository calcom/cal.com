type KeySelector<T> = (item: T) => string;
export declare function groupBy<T>(array: Iterable<T>, keySelector: KeySelector<T>): Record<string, T[]>;
export {};
//# sourceMappingURL=groupBy.d.ts.map