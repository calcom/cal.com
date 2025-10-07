import { useRouter } from "next/navigation";
import { useState } from "react";

import { CreationSource } from "@calcom/prisma/enums";
import { trpc } from "@calcom/trpc/react";
import { showToast } from "@calcom/ui/components/toast";

import type { OnboardingState } from "../store/onboarding-store";

export const useSubmitOnboarding = () => {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const intentToCreateOrg = trpc.viewer.organizations.intentToCreateOrg.useMutation();

  const submitOnboarding = async (store: OnboardingState, userEmail: string) => {
    setIsSubmitting(true);
    setError(null);

    try {
      const { selectedPlan, organizationDetails, organizationBrand, teams, invites } = store;

      if (selectedPlan !== "organization") {
        throw new Error("Only organization plan is currently supported");
      }

      // Prepare teams data
      const teamsData = teams
        .filter((team) => team.name.trim().length > 0)
        .map((team) => ({
          id: -1, // New team
          name: team.name,
          isBeingMigrated: false,
          slug: null,
        }));

      // Prepare invites data
      const invitedMembersData = invites
        .filter((invite) => invite.email.trim().length > 0)
        .map((invite) => ({
          email: invite.email,
          name: undefined,
        }));

      const result = await intentToCreateOrg.mutateAsync({
        name: organizationDetails.name,
        slug: organizationDetails.link,
        bio: organizationDetails.bio || null,
        logo: organizationBrand.logo,
        brandColor: organizationBrand.color,
        bannerUrl: organizationBrand.banner,
        orgOwnerEmail: userEmail,
        seats: null,
        pricePerSeat: null,
        isPlatform: false,
        creationSource: CreationSource.WEBAPP,
        teams: teamsData,
        invitedMembers: invitedMembersData,
      });

      // If there's a checkout URL, redirect to Stripe
      if (result.checkoutUrl) {
        window.location.href = result.checkoutUrl;
        return;
      }

      // Success - no payment required (admin or self-hosted)
      showToast("Organization created successfully!", "success");
      resetOnboarding();
      router.push("/settings/organizations");
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to create organization";
      setError(errorMessage);
      showToast(errorMessage, "error");
      console.error("Organization creation error:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    submitOnboarding,
    isSubmitting,
    error,
  };
};
