import { useRouter } from "next/navigation";
import { useState } from "react";

import { trpc } from "@calcom/trpc/react";

import type { OnboardingState } from "../store/onboarding-store";

export function useCreateTeam() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

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
      });

      // If there's a checkout URL, redirect to Stripe payment
      if (result.url && !result.team) {
        window.location.href = result.url;
        return;
      }

      if (result.team) {
        router.push("/getting-started");
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
