interface EditModeState {
    editMode: boolean;
    setEditMode: (editMode: boolean) => void;
    mutationLoading: boolean;
    setMutationloading: (loading: boolean) => void;
}
export declare const useEditMode: import("zustand").UseBoundStore<import("zustand").StoreApi<EditModeState>>;
export {};
//# sourceMappingURL=store.d.ts.map