export interface HasExternalId {
    externalId: string;
}
export declare function useLocalSet<T extends HasExternalId>(key: string, initialValue: T[]): {
    set: Set<T>;
    addValue: (value: T) => void;
    removeById: (id: string) => void;
    toggleValue: (value: T) => void;
    hasItem: (value: T) => boolean;
    clearSet: () => void;
};
//# sourceMappingURL=useLocalSet.d.ts.map