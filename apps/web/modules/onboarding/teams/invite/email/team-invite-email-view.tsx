"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import React, { useEffect, useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { z } from "zod";

import { CreationSource, MembershipRole } from "@calcom/prisma/enums";
import { useFlags } from "@calcom/features/flags/hooks";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { showToast } from "@calcom/ui";
import { Button } from "@calcom/ui/components/button";
import { Form } from "@calcom/ui/components/form";
import { trpc } from "@calcom/trpc/react";

import { EmailInviteForm } from "../../../components/EmailInviteForm";
import { OnboardingCard } from "../../../components/OnboardingCard";
import { OnboardingLayout } from "../../../components/OnboardingLayout";
import { RoleSelector } from "../../../components/RoleSelector";
import { OnboardingInviteBrowserView } from "../../../components/onboarding-invite-browser-view";
import { useOnboardingStore, type InviteRole } from "../../../store/onboarding-store";

type TeamInviteEmailViewProps = {
  userEmail: string;
  teamId?: number | null;
};

type FormValues = {
  invites: {
    email: string;
    role: InviteRole;
  }[];
};

export const TeamInviteEmailView = ({ userEmail, teamId }: TeamInviteEmailViewProps) => {
  const router = useRouter();
  const { t, i18n } = useLocale();
  const flags = useFlags();

  const store = useOnboardingStore();
  const { teamInvites, setTeamInvites, teamDetails, setTeamId, teamId: storedTeamId } = store;
  const [inviteRole, setInviteRole] = React.useState<InviteRole>("MEMBER");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const inviteMemberMutation = trpc.viewer.teams.inviteMember.useMutation();

  // Store teamId from URL if provided and not already stored
  useEffect(() => {
    if (teamId && !storedTeamId) {
      setTeamId(teamId);
    }
  }, [teamId, storedTeamId, setTeamId]);

  // Redirect to details page if team doesn't exist
  useEffect(() => {
    if (!storedTeamId && !teamId) {
      router.push("/onboarding/teams/details");
    }
  }, [storedTeamId, teamId, router]);

  const formSchema = z.object({
    invites: z.array(
      z.object({
        email: z.string().email(t("invalid_email_address")),
        role: z.enum(["MEMBER", "ADMIN"]),
      })
    ),
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      invites:
        teamInvites.length > 0
          ? teamInvites.map((inv) => ({ email: inv.email, role: inv.role }))
          : [{ email: "", role: inviteRole }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "invites",
  });

  const handleContinue = async (data: FormValues) => {
    const currentTeamId = storedTeamId || teamId;

    if (!currentTeamId) {
      showToast(t("team_not_found"), "error");
      router.push("/onboarding/teams/details");
      return;
    }

    setIsSubmitting(true);

    try {
      const invitesWithTeam = data.invites.map((invite) => ({
        email: invite.email,
        team: teamDetails.name,
        role: invite.role,
      }));

      setTeamInvites(invitesWithTeam);

      // Send invites using inviteMember mutation
      // The mutation accepts an array of {email, role} objects
      const inviteData = data.invites.map((invite) => ({
        email: invite.email,
        role: invite.role === "ADMIN" ? MembershipRole.ADMIN : MembershipRole.MEMBER,
      }));

      await inviteMemberMutation.mutateAsync({
        teamId: currentTeamId,
        usernameOrEmail: inviteData,
        language: i18n.language,
        creationSource: CreationSource.WEBAPP,
      });

      // Navigate to next step after successful invites
      const gettingStartedPath = flags["onboarding-v3"]
        ? "/onboarding/personal/settings"
        : "/getting-started";
      router.push(gettingStartedPath);
    } catch (error) {
      console.error("Failed to send invites:", error);
      showToast(
        error instanceof Error ? error.message : t("failed_to_send_invites"),
        "error"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBack = () => {
    router.push("/onboarding/teams/invite");
  };

  const handleSkip = () => {
    setTeamInvites([]);
    // Navigate to next step without sending invites (team already exists)
    const gettingStartedPath = flags["onboarding-v3"]
      ? "/onboarding/personal/settings"
      : "/getting-started";
    router.push(gettingStartedPath);
  };

  const hasValidInvites = fields.some((_, index) => {
    const email = form.watch(`invites.${index}.email`);
    return email && email.trim().length > 0;
  });

  // Watch form values to pass to browser view for real-time updates
  const watchedInvites = form.watch("invites");

  return (
    <OnboardingLayout userEmail={userEmail} currentStep={3} totalSteps={3}>
      {/* Left column - Main content */}
      <div className="flex h-full w-full flex-col gap-4">
        <OnboardingCard
          title={t("invite_via_email")}
          subtitle={t("team_invite_subtitle")}
          footer={
            <div className="flex w-full items-center justify-between gap-4">
              <Button color="minimal" className="rounded-[10px]" onClick={handleBack} disabled={isSubmitting}>
                {t("back")}
              </Button>
              <div className="flex items-center gap-2">
                <Button
                  color="minimal"
                  className="rounded-[10px]"
                  onClick={handleSkip}
                  disabled={isSubmitting}>
                  {t("onboarding_skip_for_now")}
                </Button>
                <Button
                  type="submit"
                  color="primary"
                  className="rounded-[10px]"
                  disabled={!hasValidInvites || isSubmitting}
                  loading={isSubmitting}
                  onClick={form.handleSubmit(handleContinue)}>
                  {t("continue")}
                </Button>
              </div>
            </div>
          }>
          <div className="flex w-full flex-col gap-4 px-1">
            <Form form={form} handleSubmit={handleContinue} className="w-full">
              <div className="flex w-full flex-col gap-4">
                <EmailInviteForm
                  fields={fields}
                  append={append}
                  remove={remove}
                  defaultRole={inviteRole}
                  emailPlaceholder="rick@cal.com"
                />

                <RoleSelector
                  value={inviteRole}
                  onValueChange={(value) => {
                    setInviteRole(value);
                    fields.forEach((_, index) => {
                      form.setValue(`invites.${index}.role`, value);
                    });
                  }}
                  showInfoBadge
                />
              </div>
            </Form>
          </div>
        </OnboardingCard>
      </div>

      {/* Right column - Browser view */}
      <OnboardingInviteBrowserView teamName={teamDetails.name} watchedInvites={watchedInvites} />
    </OnboardingLayout>
  );
};
