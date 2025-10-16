import { useSession } from "next-auth/react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { useEffect } from "react";
import { create } from "zustand";
import { persist } from "zustand/middleware";

import { WEBAPP_URL, IS_TEAM_BILLING_ENABLED_CLIENT } from "@calcom/lib/constants";
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

const getStorageKey = (onboardingId?: string | null) => {
  if (onboardingId) {
    return `org-creation-onboarding-${onboardingId}`;
  }
  return "org-creation-onboarding";
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
      setOnboardingId: (onboardingId) => {
        const currentId = get().onboardingId;
        // If we're setting an onboardingId for the first time, migrate the data
        if (onboardingId && !currentId && typeof window !== "undefined") {
          const currentState = get();
          // Save to the new key
          const newKey = getStorageKey(onboardingId);
          localStorage.setItem(newKey, JSON.stringify({ state: currentState, version: 0 }));
          // Remove the old key
          localStorage.removeItem("org-creation-onboarding");
        }
        set({ onboardingId });
      },
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
          const currentId = get().onboardingId;
          const newId = state.onboardingId;

          // If onboardingId is changing, handle localStorage migration
          if (typeof window !== "undefined" && currentId !== newId) {
            // Remove old key if it exists
            if (currentId) {
              localStorage.removeItem(getStorageKey(currentId));
            } else {
              localStorage.removeItem("org-creation-onboarding");
            }

            // Set new state which will be persisted with new key
            set(state);

            // Immediately save to new key
            if (newId) {
              const newKey = getStorageKey(newId);
              localStorage.setItem(newKey, JSON.stringify({ state, version: 0 }));
            }
          } else {
            set(state);
          }
        } else {
          // Clear the localStorage entry for this store
          if (typeof window !== "undefined") {
            const currentId = get().onboardingId;
            if (currentId) {
              localStorage.removeItem(getStorageKey(currentId));
            } else {
              localStorage.removeItem("org-creation-onboarding");
            }
          }
          set(initialState);
        }
      },
    }),
    {
      name: "org-creation-onboarding",
      partialize: (state) => {
        // When persisting, use the dynamic key if onboardingId is present
        return state;
      },
      storage: {
        getItem: (name) => {
          if (typeof window === "undefined") return null;

          // Try to find the most recent onboarding state
          // First check if there's a state with onboardingId
          const keys = Object.keys(localStorage).filter((key) => key.startsWith("org-creation-onboarding"));

          for (const key of keys) {
            const item = localStorage.getItem(key);
            if (item) {
              try {
                const parsed = JSON.parse(item);
                if (parsed.state?.onboardingId) {
                  // Found a state with an onboardingId, use its key from now on
                  return item;
                }
              } catch (e) {
                // Invalid JSON, skip
              }
            }
          }

          // Fall back to default key
          return localStorage.getItem(name);
        },
        setItem: (name, value) => {
          if (typeof window === "undefined") return;

          try {
            const parsed = JSON.parse(value);
            const onboardingId = parsed.state?.onboardingId;
            const key = getStorageKey(onboardingId);

            // Save with the appropriate key
            localStorage.setItem(key, value);

            // If this is a different key than the default, remove the default
            if (key !== name) {
              localStorage.removeItem(name);
            }
          } catch (e) {
            // If parsing fails, just use the default key
            localStorage.setItem(name, value);
          }
        },
        removeItem: () => {
          if (typeof window === "undefined") return;

          // Remove all org-creation-onboarding keys
          const keys = Object.keys(localStorage).filter((key) => key.startsWith("org-creation-onboarding"));
          keys.forEach((key) => localStorage.removeItem(key));
        },
      },
    }
  )
);

export const useOnboarding = (params?: { step?: "start" | "status" | null }) => {
  const session = useSession();
  const router = useRouter();
  const path = usePathname();
  const isAdmin = session.data?.user?.role === UserPermissionRole.ADMIN;

  const isBillingEnabled = process.env.NEXT_PUBLIC_IS_E2E ? false : IS_TEAM_BILLING_ENABLED_CLIENT;

  const searchParams = useSearchParams();
  const { data: organizationOnboarding, isPending: isLoadingOrgOnboarding } =
    trpc.viewer.organizations.getOrganizationOnboarding.useQuery();
  const { reset, onboardingId } = useOnboardingStore();
  const step = params?.step ?? null;
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
      // Only sync from DB if we have an onboarding record (admin handover or resume flow)
      if (!window.isOrgOnboardingSynced) {
        window.isOrgOnboardingSynced = true;

        // Admin creating for someone else - don't sync from DB, let them proceed to handover
        if (isAdmin && organizationOnboarding?.orgOwnerEmail !== session.data?.user.email) {
          // Don't reset or sync - admin has just created this onboarding and should see handover page
          return;
        }

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
          brandColor: organizationOnboarding.brandColor,
          bannerUrl: organizationOnboarding.bannerUrl,
        });
      }
    }
    // Note: We no longer redirect if onboardingId is missing, as regular users
    // don't create the onboarding record until the final step
  }, [organizationOnboarding, isLoadingOrgOnboarding, isAdmin, reset, step, router, path]);

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
