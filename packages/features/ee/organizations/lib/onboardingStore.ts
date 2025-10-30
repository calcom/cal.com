import { useSession } from "next-auth/react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { useEffect } from "react";
import { create } from "zustand";
import { persist, StorageValue } from "zustand/middleware";

import { WEBAPP_URL, IS_TEAM_BILLING_ENABLED_CLIENT } from "@calcom/lib/constants";
import { localStorage } from "@calcom/lib/webstorage";
import { BillingPeriod, UserPermissionRole } from "@calcom/prisma/enums";
import { trpc } from "@calcom/trpc/react";

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
  brandColor?: string | null;
  bannerUrl?: string | null;
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
  setBrandColor: (brandColor: string) => void;
  setBannerUrl: (bannerUrl: string) => void;
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
  brandColor: "",
  bannerUrl: "",
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
    (set, get) => ({
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
      setBrandColor: (brandColor) => set({ brandColor }),
      setBannerUrl: (bannerUrl) => set({ bannerUrl }),
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

export const useOnboarding = () => {
  const session = useSession();
  const router = useRouter();
  const path = usePathname();
  const isAdmin = session.data?.user?.role === UserPermissionRole.ADMIN;

  const isBillingEnabled = process.env.NEXT_PUBLIC_IS_E2E ? false : IS_TEAM_BILLING_ENABLED_CLIENT;

  const searchParams = useSearchParams();
  const { data: organizationOnboarding, isPending: isLoadingOrgOnboarding } =
    trpc.viewer.organizations.getOrganizationOnboarding.useQuery();
  const { reset } = useOnboardingStore();
  useEffect(() => {
    if (isLoadingOrgOnboarding) {
      return;
    }

    // Admin on handover page should never touch the store
    // The DB query returns admin's own onboarding, not the one being handed over
    if (isAdmin && path?.includes("/handover")) {
      return;
    }

    if (organizationOnboarding?.isComplete) {
      reset();
    }

    if (organizationOnboarding) {
      // Admin creating for someone else - don't sync from DB, let them proceed to handover
      if (isAdmin && organizationOnboarding?.orgOwnerEmail !== session.data?.user.email) {
        return;
      }

      // Always sync from DB to ensure UI reflects latest changes
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
        brandColor: organizationOnboarding.brandColor,
        bannerUrl: organizationOnboarding.bannerUrl,
        invitedMembers: [],
        teams: [],
      });
    }
    // Note: We no longer redirect if onboardingId is missing, as regular users
    // don't create the onboarding record until the final step
  }, [organizationOnboarding, isLoadingOrgOnboarding, isAdmin, reset, path]);

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
