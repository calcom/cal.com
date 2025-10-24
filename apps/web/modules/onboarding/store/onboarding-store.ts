import { create } from "zustand";
import { persist } from "zustand/middleware";

export type PlanType = "personal" | "team" | "organization";
export type InviteRole = "MEMBER" | "ADMIN";

export interface OrganizationDetails {
  name: string;
  link: string;
  bio: string;
}

export interface OrganizationBrand {
  color: string;
  logo: string | null; // base64 or URL
  banner: string | null; // base64 or URL
}

export interface Team {
  name: string;
}

export interface Invite {
  email: string;
  team: string;
  role: InviteRole;
}

export interface OnboardingState {
  selectedPlan: PlanType | null;

  organizationDetails: OrganizationDetails;

  organizationBrand: OrganizationBrand;

  teams: Team[];

  invites: Invite[];
  inviteRole: InviteRole;

  // Actions
  setSelectedPlan: (plan: PlanType) => void;
  setOrganizationDetails: (details: Partial<OrganizationDetails>) => void;
  setOrganizationBrand: (brand: Partial<OrganizationBrand>) => void;
  setTeams: (teams: Team[]) => void;
  setInvites: (invites: Invite[]) => void;
  setInviteRole: (role: InviteRole) => void;

  // Reset
  resetOnboarding: () => void;
}

const initialState = {
  selectedPlan: "personal" as PlanType,
  organizationDetails: {
    name: "",
    link: "",
    bio: "",
  },
  organizationBrand: {
    color: "#000000",
    logo: null,
    banner: null,
  },
  teams: [],
  invites: [],
  inviteRole: "MEMBER" as InviteRole,
};

export const useOnboardingStore = create<OnboardingState>()(
  persist(
    (set) => ({
      ...initialState,

      setSelectedPlan: (plan) => set({ selectedPlan: plan }),

      setOrganizationDetails: (details) =>
        set((state) => ({
          organizationDetails: { ...state.organizationDetails, ...details },
        })),

      setOrganizationBrand: (brand) =>
        set((state) => ({
          organizationBrand: { ...state.organizationBrand, ...brand },
        })),

      setTeams: (teams) => set({ teams }),

      setInvites: (invites) => set({ invites }),

      setInviteRole: (role) => set({ inviteRole: role }),

      resetOnboarding: () => set(initialState),
    }),
    {
      name: "cal-onboarding-storage", // localStorage key
      // Optional: Only persist certain fields
      partialize: (state) => ({
        selectedPlan: state.selectedPlan,
        organizationDetails: state.organizationDetails,
        organizationBrand: state.organizationBrand,
        teams: state.teams,
        invites: state.invites,
        inviteRole: state.inviteRole,
      }),
    }
  )
);
