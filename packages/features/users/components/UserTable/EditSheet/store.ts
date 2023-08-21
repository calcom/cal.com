import { create } from "zustand";

interface EditModeState {
  editMode: boolean;
  setEditMode: (editMode: boolean) => void;
  mutationLoading: boolean;
  setMutationloading: (loading: boolean) => void;
}

export const useEditMode = create<EditModeState>((set) => ({
  editMode: false,
  setEditMode: (editMode) => set({ editMode }),
  mutationLoading: false,
  setMutationloading: (loading) => set({ mutationLoading: loading }),
}));
