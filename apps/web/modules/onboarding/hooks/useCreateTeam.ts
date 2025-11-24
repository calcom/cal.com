import { useRouter } from "next/navigation";
import { useState } from "react";

import { useFlagMap } from "@calcom/features/flags/context/provider";
import { trpc } from "@calcom/trpc/react";

import type { OnboardingState } from "../store/onboarding-store";
import { useOnboardingStore } from "../store/onboarding-store";

export function useCreateTeam() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const flags = useFlagMap();
  const { setTeamId } = useOnboardingStore();

  const createTeamMutation = trpc.viewer.teams.create.useMutation();

  const createTeam = async (store: OnboardingState) => {
    setIsSubmitting(true);

    try {
      const { teamDetails, teamBrand } = store;

      // Validate team details - if empty, redirect back to team details step
      if (!teamDetails.name || !teamDetails.name.trim() || !teamDetails.slug || !teamDetails.slug.trim()) {
        router.push("/onboarding/teams/details");
        setIsSubmitting(false);
        return;
      }

      // Create the team
      const result = await createTeamMutation.mutateAsync({
        name: teamDetails.name,
        slug: teamDetails.slug,
        bio: teamDetails.bio,
        logo: teamBrand.logo,
        isOnboarding: true,
      });

      // If there's a checkout URL, redirect to Stripe payment
      if (result.url && !result.team) {
        window.location.href = result.url;
        return;
      }

      if (result.team) {
        // Store the teamId and redirect to invite flow after team creation
        setTeamId(result.team.id);
        router.push("/onboarding/teams/invite");
      }
    } catch (error) {
      console.error("Failed to create team:", error);
      throw error;
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    createTeam,
    isSubmitting,
    error: createTeamMutation.error,
  };
}
