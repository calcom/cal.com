import { create } from "zustand";

export enum GatedFeatures {
  RolesAndPermissions = "roles_and_permissions",
}

type GatedFeaturesStore = {
  isOpen: boolean;
  activeFeature: GatedFeatures | null;
  open: (feature: GatedFeatures) => void;
  close: () => void;
};

export const useGatedFeaturesStore = create<GatedFeaturesStore>((set) => ({
  isOpen: false,
  activeFeature: null,
  open: (feature) => set({ isOpen: true, activeFeature: feature }),
  close: () => set({ isOpen: false, activeFeature: null }),
}));
