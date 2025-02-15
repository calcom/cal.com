import { useSession } from "next-auth/react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { useEffect } from "react";
import { create } from "zustand";
import { persist } from "zustand/middleware";

import { WEBAPP_URL } from "@calcom/lib/constants";

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
  reset: () => void;
}

const initialState: OnboardingAdminStoreState & OnboardingUserStoreState = {
  // User state
  name: "",
  slug: "",
  logo: "",
  bio: "",
  onboardingId: null,
  invitedMembers: [],
  teams: [],
};

export const useSetOnboardingIdFromParam = ({ step }: { step: "start" | "status" | null }) => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [onboardingIdFromStore, setOnboardingId] = useOnboardingStore((state) => [
    state.onboardingId,
    state.setOnboardingId,
  ]);

  const onboardingIdFromParams = searchParams?.get("onboardingId");

  // Set only if the store didn't have it already
  if (onboardingIdFromParams && !onboardingIdFromStore) {
    setOnboardingId(onboardingIdFromParams);
    return;
  }

  const requireOnboardingIdInStore = step !== "start" && step !== "status";

  useEffect(() => {
    if (!onboardingIdFromStore && requireOnboardingIdInStore) {
      console.warn("No onboardingId found in store, redirecting to /settings/organizations/new");
      router.push("/settings/organizations/new");
    }
  }, [onboardingIdFromStore, requireOnboardingIdInStore, router]);
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
      reset: () => set(initialState),
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
  const searchParams = useSearchParams();
  useSetOnboardingIdFromParam({ step: params?.step ?? null });
  useEffect(() => {
    if (session.status === "loading") {
      return;
    }
    if (!session.data) {
      const searchString = !searchParams ? "" : `${searchParams.toString()}`;
      router.push(`/auth/login?callbackUrl=${WEBAPP_URL}${path}${searchString ? `?${searchString}` : ""}`);
    }
  }, [session, router, path, searchParams]);
  return useOnboardingStore;
};
