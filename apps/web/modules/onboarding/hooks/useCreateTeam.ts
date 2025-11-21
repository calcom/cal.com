import { useRouter } from "next/navigation";
import { useState } from "react";

import { useFlagMap } from "@calcom/features/flags/context/provider";
import { trpc } from "@calcom/trpc/react";

import type { OnboardingState } from "../store/onboarding-store";

export function useCreateTeam() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const flags = useFlagMap();

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
        logo: teamBrand.logo,
        isOnboarding: true,
      });

      // If there's a checkout URL, redirect to Stripe payment
      if (result.url && !result.team) {
        window.location.href = result.url;
        return;
      }

      if (result.team) {
        // Store team ID in onboarding store
        store.setTeamId(result.team.id);
        // Redirect to invite page after team creation
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
