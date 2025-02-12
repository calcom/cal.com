import { create } from "zustand";
import { persist } from "zustand/middleware";

enum BillingPeriod {
  MONTHLY = "MONTHLY",
  ANNUALLY = "ANNUALLY",
}

interface OnboardingAdminStoreState {
  billingPeriod?: BillingPeriod;
  pricePerSeat?: number | null;
  seats?: number | null;
  orgOwnerEmail?: string;
}

interface OnboardingUserStoreState {
  name: string;
  slug: string;
  logo?: string;
  bio?: string;
  invitedMembers: { email: string; name?: string }[];
  teams: { id: number; name: string; slug: string | null; isBeingMigrated: boolean }[];
}

interface OnboardingStoreState extends OnboardingAdminStoreState, OnboardingUserStoreState {
  // Actions for admin state
  setBillingPeriod: (billingPeriod: BillingPeriod) => void;
  setPricePerSeat: (price: number | null) => void;
  setSeats: (seats: number | null) => void;
  setOrgOwnerEmail: (email: string) => void;

  // Actions for user state
  setName: (name: string) => void;
  setSlug: (slug: string) => void;
  setLogo: (logo: string) => void;
  setBio: (bio: string) => void;
  addInvitedMember: (member: { email: string; name?: string }) => void;
  removeInvitedMember: (email: string) => void;

  // Actions for team state
  setTeams: (teams: { id: number; name: string; slug: string | null; isBeingMigrated: boolean }[]) => void;
  // Reset state
  reset: () => void;
}

const initialState: OnboardingAdminStoreState & OnboardingUserStoreState = {
  // User state
  name: "",
  slug: "",
  logo: "",
  bio: "",
  invitedMembers: [],
  teams: [],
};

export const useOnboardingStore = create<OnboardingStoreState>()(
  persist(
    (set) => ({
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
      addInvitedMember: (member) =>
        set((state) => ({
          invitedMembers: [...state.invitedMembers, member],
        })),
      removeInvitedMember: (email) =>
        set((state) => ({
          invitedMembers: state.invitedMembers.filter((member) => member.email !== email),
        })),

      // Team actions
      setTeams: (teams) => set({ teams }),

      // Reset action
      reset: () => set(initialState),
    }),
    {
      name: "org-creation-onboarding",
    }
  )
);
