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
        // Not sure we need this flag check - keeping it here for safe keeping as this is called only from v3 onboarding flow
        const gettingStartedPath = flags["onboarding-v3"]
          ? "/onboarding/personal/settings"
          : "/getting-started";
        router.push(gettingStartedPath);
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
