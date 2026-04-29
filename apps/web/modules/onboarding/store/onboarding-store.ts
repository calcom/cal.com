import type { StoreApi, UseBoundStore } from "zustand";
import { create } from "zustand";
import type { PersistOptions } from "zustand/middleware";
import { persist } from "zustand/middleware";
import { onboardingIndexedDBStorage } from "./onboarding-storage";

// Thresholds for detecting oversized images (in characters of base64 string)
// Images larger than these were uploaded before the cropping fix and should be cleared
const LOGO_SIZE_THRESHOLD = 500_000; // ~500KB - properly cropped logos are ~50-150KB

/**
 * Checks if a base64 image string exceeds the given threshold.
 * Returns true if the image should be cleared (is oversized).
 */
function isOversizedImage(imageData: string | null, threshold: number): boolean {
  if (!imageData) return false;
  return imageData.length > threshold;
}

interface PersonalDetails {
  name: string;
  username: string;
  timezone: string;
  bio: string;
  avatar: string | null;
}

interface OnboardingState {
  personalDetails: PersonalDetails;

  setPersonalDetails: (details: Partial<PersonalDetails>) => void;
  resetOnboarding: () => void;
}

const initialPersonalDetails: PersonalDetails = {
  name: "",
  username: "",
  timezone: "",
  bio: "",
  avatar: null,
};

const initialState: Pick<OnboardingState, "personalDetails"> = {
  personalDetails: {
    ...initialPersonalDetails,
  },
};

export const useOnboardingStore: UseBoundStore<StoreApi<OnboardingState>> = create<OnboardingState>()(
  persist(
    (set) => ({
      ...initialState,

      setPersonalDetails: (details: Partial<PersonalDetails>) =>
        set((state) => ({
          personalDetails: { ...state.personalDetails, ...details },
        })),

      resetOnboarding: () => set(initialState),
    }),
    {
      name: "cal-onboarding-storage",
      storage: onboardingIndexedDBStorage,
      version: 2,
      migrate: (persistedState: unknown) => {
        const state = persistedState as { personalDetails?: PersonalDetails } | undefined;
        const personalDetails = state?.personalDetails ?? initialPersonalDetails;
        let avatar = personalDetails.avatar ?? null;
        if (isOversizedImage(personalDetails.avatar, LOGO_SIZE_THRESHOLD)) {
          avatar = null;
        }

        return {
          personalDetails: {
            ...initialPersonalDetails,
            ...personalDetails,
            avatar,
          },
        } satisfies Partial<OnboardingState>;
      },
      partialize: (state: OnboardingState) => ({
        personalDetails: state.personalDetails,
      }),
    } as PersistOptions<OnboardingState, Partial<OnboardingState>>
  )
);

export type { OnboardingState, PersonalDetails };
