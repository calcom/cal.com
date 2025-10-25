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
      const {
        selectedPlan,
        organizationDetails,
        organizationBrand,
        teams,
        invites,
        inviteRole,
        resetOnboarding,
      } = store;

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
          teamName: invite.team,
          teamId: -1,
          role: inviteRole,
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

      // If there's a checkout URL, redirect to Stripe (billing enabled flow)
      if (result.checkoutUrl) {
        window.location.href = result.checkoutUrl;
        return;
      }

      // No checkout URL means billing is disabled (self-hosted flow)
      // Organization has already been created by the backend
      showToast("Organization created successfully!", "success");
      // TODO: after this redirect we need to hard refresh the page to see org
      resetOnboarding();
      router.push("/getting-started");
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
