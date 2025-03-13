"use client";

import { useSession } from "next-auth/react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { useOnboarding } from "@calcom/features/ee/organizations/lib/onboardingStore";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import type { RouterOutputs } from "@calcom/trpc";
import { trpc } from "@calcom/trpc";
import {
  Avatar,
  Badge,
  Button,
  SkeletonContainer,
  SkeletonText,
  SkeletonButton,
  Tooltip,
  TextField,
  showToast,
  Alert,
} from "@calcom/ui";

type TeamMember = RouterOutputs["viewer"]["teams"]["listMembers"]["members"][number];

const AddNewTeamMembers = () => {
  const session = useSession();

  if (session.status === "loading") {
    return <SkeletonContainer>Loading...</SkeletonContainer>;
  }
  return <AddNewTeamMembersForm />;
};

const useCheckout = () => {
  const { t } = useLocale();
  const [serverErrorMessage, setServerErrorMessage] = useState("");
  const mutation = trpc.viewer.organizations.createWithPaymentIntent.useMutation({
    onSuccess: (data) => {
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      }
    },
    onError: (error) => {
      setServerErrorMessage(t(error.message));
    },
  });

  return {
    mutation,
    mutate: mutation.mutate,
    isPending: mutation.isPending,
    errorMessage: serverErrorMessage,
  };
};

export const AddNewTeamMembersForm = () => {
  const { t } = useLocale();
  const { useOnboardingStore } = useOnboarding();
  const {
    addInvitedMember,
    removeInvitedMember,
    orgOwnerEmail,
    teams,
    invitedMembers,
    logo,
    bio,
    onboardingId,
  } = useOnboardingStore();
  const checkout = useCheckout();

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
      <SkeletonContainer as="div" className="space-y-6">
        <SkeletonText className="h-8 w-full" />
        <SkeletonText className="h-8 w-full" />
        <SkeletonButton className="mr-6 h-8 w-20 rounded-md p-5" />
      </SkeletonContainer>
    );
  }

  return (
    <>
      {checkout.errorMessage && (
        <div className="mb-4">
          <Alert severity="error" message={checkout.errorMessage} />
        </div>
      )}
      <div className="space-y-6">
        <div className="flex space-x-3">
          <form onSubmit={onSubmit} className="flex w-full items-end space-x-2">
            <div className="flex-grow">
              <TextField
                label={t("email")}
                type="email"
                {...register("email", { required: true })}
                placeholder="colleague@company.com"
              />
            </div>
            <Button type="submit" StartIcon="plus" color="secondary">
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
      <div className="mt-3 mt-6 flex items-center justify-end">
        <Button
          onClick={() => {
            if (!onboardingId) {
              console.error("Org owner email and onboardingId are required", {
                orgOwnerEmail,
                onboardingId,
              });
              return;
            }
            checkout.mutation.mutate({
              logo,
              bio,
              teams,
              invitedMembers,
              onboardingId,
            });
          }}
          loading={checkout.isPending}>
          {t("checkout")}
        </Button>
      </div>
    </>
  );
};

export default AddNewTeamMembers;
