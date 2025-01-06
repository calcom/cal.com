import { create } from "zustand";

enum BillingPeriod {
  MONTHLY = "MONTHLY",
  ANNUALLY = "ANNUALLY",
}

interface OnboardingAdminStoreState {
  billingPeriod: BillingPeriod;
  pricePerSeat: number;
  seats: number;
  orgOwnerEmail: string;
}

interface OnboardingUserStoreState {
  name: string;
  slug: string;
  logo?: string;
  bio?: string;
}

interface OnboardingStoreState extends OnboardingAdminStoreState, OnboardingUserStoreState {
  // Actions for admin state
  setBillingPeriod: (billingPeriod: BillingPeriod) => void;
  setPricePerSeat: (price: number) => void;
  setSeats: (seats: number) => void;
  setOrgOwnerEmail: (email: string) => void;

  // Actions for user state
  setName: (name: string) => void;
  setSlug: (slug: string) => void;
  setLogo: (logo: string) => void;
  setBio: (bio: string) => void;

  // Reset state
  reset: () => void;
}

const initialState: OnboardingAdminStoreState & OnboardingUserStoreState = {
  // Admin state (verified on backend to ensure user is admin)
  billingPeriod: BillingPeriod.MONTHLY,
  pricePerSeat: 0,
  seats: 0,
  orgOwnerEmail: "",

  // User state
  name: "",
  slug: "",
  logo: "",
  bio: "",
};

export const useOnboardingStore = create<OnboardingStoreState>((set) => ({
  ...initialState,

  // Admin actions
  setBillingPeriod: (billingPeriod) => set({ billingPeriod }),
  setPricePerSeat: (pricePerSeat) => set({ pricePerSeat }),
  setSeats: (seats) => set({ seats }),
  setOrgOwnerEmail: (orgOwnerEmail) => set({ orgOwnerEmail }),

  // User actions
  setName: (name) => set({ name }),
  setSlug: (slug) => set({ slug }),
  setLogo: (logo) => set({ logo }),
  setBio: (bio) => set({ bio }),

  // Reset action
  reset: () => set(initialState),
}));
