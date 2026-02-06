import { useRouter } from "next/navigation";
import { useState } from "react";

import { useFlagMap } from "@calcom/features/flags/context/provider";
import { MembershipRole } from "@calcom/prisma/enums";
import { CreationSource } from "@calcom/prisma/enums";
import { trpc } from "@calcom/trpc/react";

import type { OnboardingState } from "../store/onboarding-store";
import { useOnboardingStore } from "../store/onboarding-store";

export function useCreateTeam() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const flags = useFlagMap();
  const { setTeamId, teamId } = useOnboardingStore();

  const createTeamMutation = trpc.viewer.teams.create.useMutation();
  const inviteMemberMutation = trpc.viewer.teams.inviteMember.useMutation();

  const createTeam = async (store?: OnboardingState) => {
    setIsSubmitting(true);

    try {
      // Get the latest state from the store to ensure we have the most up-to-date values
      const currentStore = store || useOnboardingStore.getState();
      const { teamDetails, teamBrand } = currentStore;

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
        router.push(`/onboarding/teams/invite?teamId=${result.team.id}`);
      }
    } catch (error) {
      console.error("Failed to create team:", error);
      throw error;
    } finally {
      setIsSubmitting(false);
    }
  };

  const inviteMembers = async (
    invites: Array<{ email: string; role: "MEMBER" | "ADMIN" }>,
    language: string
  ) => {
    if (!teamId) {
      throw new Error("Team ID is required to invite members");
    }

    setIsSubmitting(true);

    try {
      // Filter and validate invites
      const validInvites = invites.filter((invite) => invite.email && invite.email.trim().length > 0);

      if (validInvites.length === 0) {
        throw new Error("At least one valid email address is required");
      }

      // Group invites by role and send separate requests for each role
      // This is necessary because the schema validation expects array of strings when using bulk invites
      const invitesByRole = validInvites.reduce(
        (acc, invite) => {
          const role = invite.role === "ADMIN" ? MembershipRole.ADMIN : MembershipRole.MEMBER;
          if (!acc[role]) {
            acc[role] = [];
          }
          acc[role].push(invite.email.trim().toLowerCase());
          return acc;
        },
        {} as Record<MembershipRole, string[]>
      );

      // Send invites for each role group
      await Promise.all(
        Object.entries(invitesByRole).map(([role, emails]) =>
          inviteMemberMutation.mutateAsync({
            teamId,
            usernameOrEmail: emails, // Array of strings, not objects
            role: role as MembershipRole,
            language,
            creationSource: CreationSource.WEBAPP,
          })
        )
      );

      // Redirect to personal settings after successful invite
      const gettingStartedPath = flags["onboarding-v3"]
        ? "/onboarding/personal/settings?fromTeamOnboarding=true"
        : "/getting-started";
      router.replace(gettingStartedPath);
    } catch (error) {
      console.error("Failed to invite members:", error);
      // Extract error message from TRPC error
      if (error && typeof error === "object" && "message" in error) {
        throw new Error(error.message as string);
      }
      if (error instanceof Error) {
        throw error;
      }
      throw new Error("Failed to invite members. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    createTeam,
    inviteMembers,
    isSubmitting,
    error: createTeamMutation.error || inviteMemberMutation.error,
  };
}
