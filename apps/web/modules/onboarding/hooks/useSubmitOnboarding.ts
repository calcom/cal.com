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
  const createWithPaymentIntent = trpc.viewer.organizations.createWithPaymentIntent.useMutation();
  const createTeams = trpc.viewer.organizations.createTeams.useMutation();

  const submitOnboarding = async (store: OnboardingState, userEmail: string) => {
    setIsSubmitting(true);
    setError(null);

    try {
      const { selectedPlan, organizationDetails, organizationBrand, teams, invites } = store;

      if (selectedPlan !== "organization") {
        throw new Error("Only organization plan is currently supported");
      }

      // Step 1: Create organization onboarding intent
      const intentResult = await intentToCreateOrg.mutateAsync({
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
        creationSource: CreationSource.ONBOARDING,
      });

      const onboardingId = intentResult.organizationOnboardingId;

      if (!onboardingId) {
        throw new Error("Failed to create organization onboarding");
      }

      // Step 2: Create payment intent with teams and invites
      const teamsData = teams
        .filter((team) => team.name.trim().length > 0)
        .map((team) => ({
          id: -1, // New team
          name: team.name,
          isBeingMigrated: false,
          slug: null,
        }));

      const invitedMembersData = invites
        .filter((invite) => invite.email.trim().length > 0)
        .map((invite) => ({
          email: invite.email,
          name: undefined,
        }));

      const paymentResult = await createWithPaymentIntent.mutateAsync({
        onboardingId,
        logo: organizationBrand.logo,
        bio: organizationDetails.bio || null,
        brandColor: organizationBrand.color,
        bannerUrl: organizationBrand.banner,
        teams: teamsData,
        invitedMembers: invitedMembersData,
      });

      // Step 3: If there's a checkout URL, redirect to Stripe
      if (paymentResult.checkoutUrl) {
        window.location.href = paymentResult.checkoutUrl;
        return;
      }

      // Step 4: If no checkout (admin flow or self-hosted), create teams
      if (teamsData.length > 0 && intentResult.userId) {
        const orgId = intentResult.organizationOnboardingId;
        if (orgId) {
          await createTeams.mutateAsync({
            teamNames: teamsData.map((t) => t.name),
            orgId: parseInt(orgId, 10),
            moveTeams: [],
            creationSource: CreationSource.ONBOARDING,
          });
        }
      }

      // Success!
      showToast("Organization created successfully!", "success");
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
