"use client";

import { useSession } from "next-auth/react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { setShowNewOrgModalFlag } from "@calcom/web/modules/ee/organizations/hooks/useWelcomeModal";
import { useOnboarding } from "@calcom/web/modules/ee/organizations/lib/onboardingStore";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import type { RouterOutputs } from "@calcom/trpc/react";
import { trpc } from "@calcom/trpc/react";
import { Alert } from "@calcom/ui/components/alert";
import { Avatar } from "@calcom/ui/components/avatar";
import { Badge } from "@calcom/ui/components/badge";
import { Button } from "@calcom/ui/components/button";
import { TextField } from "@calcom/ui/components/form";
import { SkeletonButton, SkeletonContainer, SkeletonText } from "@calcom/ui/components/skeleton";
import { showToast } from "@calcom/ui/components/toast";
import { Tooltip } from "@calcom/ui/components/tooltip";

type TeamMember = RouterOutputs["viewer"]["teams"]["listMembers"]["members"][number];

const AddNewTeamMembers = () => {
  const session = useSession();

  if (session.status === "loading") {
    return <SkeletonContainer>Loading...</SkeletonContainer>;
  }
  return <AddNewTeamMembersForm />;
};

const useOrgCreation = () => {
  const { t } = useLocale();
  const session = useSession();
  const utils = trpc.useUtils();
  const [serverErrorMessage, setServerErrorMessage] = useState("");
  const { useOnboardingStore } = useOnboarding();
  const { reset } = useOnboardingStore();

  // Single mutation for all flows (billing, self-hosted, admin)
  const intentToCreateOrgMutation = trpc.viewer.organizations.intentToCreateOrg.useMutation({
    onSuccess: async (data) => {
      reset({
        onboardingId: data.organizationOnboardingId,
      });

      if (data.checkoutUrl) {
        // Billing enabled - redirect to Stripe
        window.location.href = data.checkoutUrl;
      } else if (data.organizationId) {
        // Self-hosted - org already created, redirect to organizations
        await utils.viewer.organizations.listCurrent.invalidate();
        await session.update();
        reset();
        // Set flag to show welcome modal (using both query param and sessionStorage for reliability)
        setShowNewOrgModalFlag();
        window.location.href = `${window.location.origin}/settings/organizations/profile?newOrganizationModal=true`;
      } else {
        // Unexpected state
        setServerErrorMessage("Unexpected response from server");
      }
    },
    onError: (error) => {
      setServerErrorMessage(t(error.message));
    },
  });

  return {
    mutation: intentToCreateOrgMutation,
    mutate: intentToCreateOrgMutation.mutate,
    isPending: intentToCreateOrgMutation.isPending,
    errorMessage: serverErrorMessage,
  };
};

export const AddNewTeamMembersForm = () => {
  const { t } = useLocale();
  const { useOnboardingStore, isBillingEnabled } = useOnboarding();
  const {
    addInvitedMember,
    removeInvitedMember,
    orgOwnerEmail,
    teams,
    invitedMembers,
    logo,
    bio,
    name,
    slug,
    billingPeriod,
    seats,
    pricePerSeat,
    brandColor,
    bannerUrl,
  } = useOnboardingStore();
  const orgCreation = useOrgCreation();

  const teamIds = teams.filter((team) => team.isBeingMigrated && team.id > 0).map((team) => team.id);

  const results = trpc.useQueries((t) => teamIds.map((teamId) => t.viewer.teams.listMembers({ teamId })));

  const isLoading = results.some((result) => result.isLoading);

  // Combine all members and remove duplicates
  const uniqueMembers = results
    .reduce<TeamMember[]>((acc, result) => {
      if (result.data?.members) {
        return [...acc, ...result.data.members];
      }
      return acc;
    }, [])
    .filter((member, index, self) => index === self.findIndex((m) => m.email === member.email));

  const { register, handleSubmit, reset } = useForm<{ email: string }>();

  const onSubmit = handleSubmit((data) => {
    const parsedEmail = z.string().email().safeParse(data.email);
    if (!parsedEmail.success) {
      return;
    }

    const normalizedEmail = parsedEmail.data.toLowerCase();

    // Check if email exists in either invitedMembers or uniqueMembers
    const isInvited = invitedMembers.some((member) => member.email.toLowerCase() === normalizedEmail);
    const isExisting = uniqueMembers?.some((member) => member.email.toLowerCase() === normalizedEmail);

    if (isInvited || isExisting) {
      showToast(t("member_already_invited"), "error");
      return;
    }

    addInvitedMember({ email: normalizedEmail });
    reset();
  });

  if (isLoading) {
    return (
      <SkeletonContainer as="div" className="stack-y-6">
        <SkeletonText className="h-8 w-full" />
        <SkeletonText className="h-8 w-full" />
        <SkeletonButton className="mr-6 h-8 w-20 rounded-md p-5" />
      </SkeletonContainer>
    );
  }

  return (
    <>
      {orgCreation.errorMessage && (
        <div className="mb-4">
          <Alert severity="error" message={orgCreation.errorMessage} />
        </div>
      )}
      <div className="stack-y-6">
        <div className="flex space-x-3">
          <form onSubmit={onSubmit} className="flex w-full items-end space-x-2">
            <div className="grow">
              <TextField
                label={t("email")}
                type="email"
                {...register("email", { required: true })}
                placeholder="colleague@company.com"
              />
            </div>
            <Button type="submit" StartIcon="plus" color="secondary" data-testid="invite-new-member-button">
              {t("add")}
            </Button>
          </form>
        </div>

        {(invitedMembers.length > 0 || uniqueMembers?.length > 0) && (
          <ul
            className="border-subtle divide-subtle max-h-[300px] divide-y overflow-y-auto rounded-md border"
            data-testid="pending-member-list">
            {invitedMembers.map((member) => (
              <li key={member.email} className="flex items-center justify-between px-5 py-2">
                <div className="flex items-center space-x-3">
                  <Avatar size="sm" alt={member.email} />
                  <div className="flex gap-1">
                    <Tooltip content={member.email}>
                      <span className="text-subtle max-w-[250px] truncate text-sm">{member.email}</span>
                    </Tooltip>
                    <Badge variant="gray">{t("pending")}</Badge>
                  </div>
                </div>
                <Button
                  variant="icon"
                  size="sm"
                  color="minimal"
                  StartIcon="x"
                  onClick={() => removeInvitedMember(member.email)}
                />
              </li>
            ))}
            {uniqueMembers?.map((member) => (
              <li key={member.email} className="flex items-center justify-between px-5 py-2">
                <div className="flex items-center space-x-3">
                  <Avatar size="sm" alt={member.email} imageSrc={member.avatarUrl} />
                  <div className="flex gap-1">
                    <Tooltip content={member.email}>
                      <span className="text-emphasis text-sm font-medium">{member.name || member.email}</span>
                    </Tooltip>
                    {/* TODO: We should show the team name here instead of "migrating from team" */}
                    <Badge variant="green">{t("migrating_from_team")}</Badge>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="mt-3 flex items-center justify-end">
        <Button
          data-testid="publish-button"
          onClick={() => {
            // Submit ALL data to intentToCreateOrg
            if (!name || !slug || !orgOwnerEmail) {
              console.error("Required fields missing", { name, slug, orgOwnerEmail });
              showToast(t("required_fields_missing"), "error");
              return;
            }

            orgCreation.mutate({
              name,
              slug,
              orgOwnerEmail,
              seats,
              pricePerSeat,
              billingPeriod,
              creationSource: "WEBAPP" as const,
              logo,
              bio,
              brandColor,
              bannerUrl,
              teams,
              invitedMembers,
            });
          }}
          loading={orgCreation.isPending}>
          {isBillingEnabled ? t("checkout") : t("create")}
        </Button>
      </div>
    </>
  );
};

export default AddNewTeamMembers;
