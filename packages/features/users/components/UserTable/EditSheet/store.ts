import { create } from "zustand";

interface EditModeState {
  editMode: boolean;
  setEditMode: (editMode: boolean) => void;
}

export const useEditMode = create<EditModeState>((set) => ({
  editMode: false,
  setEditMode: (editMode) => set({ editMode }),
}));
