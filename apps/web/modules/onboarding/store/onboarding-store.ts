import { create } from "zustand";
import { persist } from "zustand/middleware";

import { onboardingIndexedDBStorage } from "./onboarding-storage";

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

export interface TeamDetails {
  name: string;
  slug: string;
  bio: string;
}

export interface TeamBrand {
  color: string;
  logo: string | null; // base64 or URL
}

export interface PersonalDetails {
  name: string;
  username: string;
  timezone: string;
  bio: string;
  avatar: string | null;
}

export interface OnboardingState {
  selectedPlan: PlanType | null;

  organizationDetails: OrganizationDetails;

  organizationBrand: OrganizationBrand;

  teams: Team[];

  invites: Invite[];
  inviteRole: InviteRole;

  // Team-specific state
  teamDetails: TeamDetails;
  teamBrand: TeamBrand;
  teamInvites: Invite[];

  // Personal user state
  personalDetails: PersonalDetails;

  // Actions
  setSelectedPlan: (plan: PlanType) => void;
  setOrganizationDetails: (details: Partial<OrganizationDetails>) => void;
  setOrganizationBrand: (brand: Partial<OrganizationBrand>) => void;
  setTeams: (teams: Team[]) => void;
  setInvites: (invites: Invite[]) => void;
  setInviteRole: (role: InviteRole) => void;

  // Team actions
  setTeamDetails: (details: Partial<TeamDetails>) => void;
  setTeamBrand: (brand: Partial<TeamBrand>) => void;
  setTeamInvites: (invites: Invite[]) => void;

  // Personal actions
  setPersonalDetails: (details: Partial<PersonalDetails>) => void;

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
  teamDetails: {
    name: "",
    slug: "",
    bio: "",
  },
  teamBrand: {
    color: "#000000",
    logo: null,
  },
  teamInvites: [],
  personalDetails: {
    name: "",
    username: "",
    timezone: "",
    bio: "",
    avatar: null,
  },
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

      setTeamDetails: (details) =>
        set((state) => ({
          teamDetails: { ...state.teamDetails, ...details },
        })),

      setTeamBrand: (brand) =>
        set((state) => ({
          teamBrand: { ...state.teamBrand, ...brand },
        })),

      setTeamInvites: (invites) => set({ teamInvites: invites }),

      setPersonalDetails: (details) =>
        set((state) => ({
          personalDetails: { ...state.personalDetails, ...details },
        })),

      resetOnboarding: () => set(initialState),
    }),
    {
      name: "cal-onboarding-storage", // Storage key
      storage: onboardingIndexedDBStorage, // Use IndexedDB instead of localStorage for larger capacity
      // Optional: Only persist certain fields
      partialize: (state) => ({
        selectedPlan: state.selectedPlan,
        organizationDetails: state.organizationDetails,
        organizationBrand: state.organizationBrand,
        teams: state.teams,
        invites: state.invites,
        inviteRole: state.inviteRole,
        teamDetails: state.teamDetails,
        teamBrand: state.teamBrand,
        teamInvites: state.teamInvites,
        personalDetails: state.personalDetails,
      }),
    }
  )
);
