import { useSession } from "next-auth/react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { useEffect } from "react";
import { create } from "zustand";
import { persist } from "zustand/middleware";

import { WEBAPP_URL, IS_SELF_HOSTED } from "@calcom/lib/constants";
import { UserPermissionRole } from "@calcom/prisma/enums";
import { trpc } from "@calcom/trpc/react";

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
  logo?: string | null;
  bio?: string | null;
  onboardingId: string | null;
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

  setOnboardingId: (onboardingId: string) => void;

  // Actions for team state
  setTeams: (teams: { id: number; name: string; slug: string | null; isBeingMigrated: boolean }[]) => void;
  // Reset state
  reset: (state?: Partial<OnboardingStoreState>) => void;
}

const initialState: OnboardingAdminStoreState & OnboardingUserStoreState = {
  // User state
  name: "",
  slug: "",
  logo: "",
  bio: "",
  orgOwnerEmail: "",
  seats: null,
  pricePerSeat: null,
  billingPeriod: undefined,
  onboardingId: null,
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
      setOnboardingId: (onboardingId) => set({ onboardingId }),
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
      reset: (state) => {
        if (state) {
          set(state);
        } else {
          // Clear the localStorage entry for this store
          if (typeof window !== "undefined") {
            localStorage.removeItem("org-creation-onboarding");
          }
          set(initialState);
        }
      },
    }),
    {
      name: "org-creation-onboarding",
    }
  )
);

export const useOnboarding = (params?: { step?: "start" | "status" | null }) => {
  const session = useSession();
  const router = useRouter();
  const path = usePathname();
  const isAdmin = session.data?.user?.role === UserPermissionRole.ADMIN;
  const isBillingEnabled = !(IS_SELF_HOSTED && isAdmin) || process.env.NEXT_PUBLIC_IS_E2E;
  const searchParams = useSearchParams();
  const { data: organizationOnboarding, isPending: isLoadingOrgOnboarding } =
    trpc.viewer.organizations.getOrganizationOnboarding.useQuery();
  const { reset, onboardingId } = useOnboardingStore();
  const step = params?.step ?? null;
  useEffect(() => {
    if (isLoadingOrgOnboarding) {
      return;
    }

    if (organizationOnboarding?.isComplete) {
      reset();
    }

    if (organizationOnboarding) {
      // Must not keep resetting state on each step change as every step doesn't save at the moment and this would reset user's changes
      if (!window.isOrgOnboardingSynced) {
        window.isOrgOnboardingSynced = true;
        // Must reset with current state of onboarding in DB for the user
        reset({
          onboardingId: organizationOnboarding.id,
          billingPeriod: organizationOnboarding.billingPeriod as BillingPeriod,
          pricePerSeat: organizationOnboarding.pricePerSeat,
          seats: organizationOnboarding.seats,
          orgOwnerEmail: organizationOnboarding.orgOwnerEmail,
          name: organizationOnboarding.name,
          slug: organizationOnboarding.slug,
          bio: organizationOnboarding.bio,
          logo: organizationOnboarding.logo,
        });
        if (isAdmin && organizationOnboarding?.orgOwnerEmail !== session.data?.user.email) {
          reset();
        }
      }
    } else {
      // First step doesn't require onboardingId
      const requireOnboardingId = step !== "start";

      // Reset to first step if onboardingId isn't available
      if (!onboardingId && requireOnboardingId) {
        console.warn("No onboardingId found in store, redirecting to /settings/organizations/new");
        router.push("/settings/organizations/new");
      }
    }
  }, [organizationOnboarding, isLoadingOrgOnboarding, isAdmin, onboardingId, reset, step, router]);

  useEffect(() => {
    if (session.status === "loading") {
      return;
    }
    if (!session.data) {
      const searchString = !searchParams ? "" : `${searchParams.toString()}`;
      router.push(`/auth/login?callbackUrl=${WEBAPP_URL}${path}${searchString ? `?${searchString}` : ""}`);
    }
  }, [session, router, path, searchParams]);
  return {
    useOnboardingStore,
    isLoadingOrgOnboarding,
    dbOnboarding: organizationOnboarding,
    isBillingEnabled,
  };
};
