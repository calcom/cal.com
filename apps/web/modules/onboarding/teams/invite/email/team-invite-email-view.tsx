"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter, useSearchParams } from "next/navigation";
import React, { useEffect } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { z } from "zod";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Button } from "@calcom/ui/components/button";
import { Form } from "@calcom/ui/components/form";
import { showToast } from "@calcom/ui/components/toast";

import { EmailInviteForm } from "../../../components/EmailInviteForm";
import { OnboardingCard } from "../../../components/OnboardingCard";
import { OnboardingLayout } from "../../../components/OnboardingLayout";
import { RoleSelector } from "../../../components/RoleSelector";
import { OnboardingInviteBrowserView } from "../../../components/onboarding-invite-browser-view";
import { useCreateTeam } from "../../../hooks/useCreateTeam";
import { useOnboardingStore, type InviteRole } from "../../../store/onboarding-store";

type TeamInviteEmailViewProps = {
  userEmail: string;
};

type FormValues = {
  invites: {
    email: string;
    role: InviteRole;
  }[];
};

export const TeamInviteEmailView = ({ userEmail }: TeamInviteEmailViewProps) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t, i18n } = useLocale();

  const store = useOnboardingStore();
  const { teamInvites, setTeamInvites, teamDetails, setTeamId, teamId } = store;
  const [inviteRole, setInviteRole] = React.useState<InviteRole>("MEMBER");
  const { inviteMembers, isSubmitting } = useCreateTeam();

  // Read teamId from query params and store it (from payment callback or redirect)
  useEffect(() => {
    const teamIdParam = searchParams?.get("teamId");
    if (teamIdParam && !teamId) {
      const parsedTeamId = parseInt(teamIdParam, 10);
      if (!isNaN(parsedTeamId)) {
        setTeamId(parsedTeamId);
      }
    }
  }, [searchParams, setTeamId, teamId]);

  const formSchema = z.object({
    invites: z.array(
      z.object({
        email: z.union([z.literal(""), z.string().email(t("invalid_email_address"))]),
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
    const teamIdParam = searchParams?.get("teamId");
    const parsedTeamId = !teamId ? parseInt(teamIdParam || "", 10) : teamId;
    if (!parsedTeamId) {
      console.log("Team ID is missing. Please go back and create your team first.");
      showToast(
        t("team_id_missing") || "Team ID is missing. Please go back and create your team first.",
        "error"
      );
      return;
    }

    const invitesWithTeam = data.invites.map((invite) => ({
      email: invite.email,
      role: invite.role,
      team: teamDetails.name,
    }));

    setTeamInvites(invitesWithTeam);

    // Filter out empty emails and invite members
    const validInvites = data.invites.filter((invite) => invite.email && invite.email.trim().length > 0);

    if (validInvites.length > 0) {
      try {
        await inviteMembers(
          validInvites.map((invite) => ({
            email: invite.email,
            role: invite.role,
          })),
          i18n.language
        );
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : t("something_went_wrong") || "Something went wrong";
        showToast(errorMessage, "error");
      }
    } else {
      // No invites, skip to personal settings
      console.log("No invites, skipping to personal settings");
      const gettingStartedPath = "/onboarding/personal/settings?fromTeamOnboarding=true";
      router.replace(gettingStartedPath);
    }
  };

  const handleSkip = async () => {
    setTeamInvites([]);
    // Skip inviting members and go to personal settings
    const gettingStartedPath = "/onboarding/personal/settings?fromTeamOnboarding=true";
    router.replace(gettingStartedPath);
  };

  // Watch form values to pass to browser view for real-time updates
  const watchedInvites = form.watch("invites");

  const hasValidInvites = watchedInvites.some((invite) => {
    return invite.email && invite.email.trim().length > 0;
  });

  return (
    <OnboardingLayout userEmail={userEmail} currentStep={3} totalSteps={3}>
      {/* Left column - Main content */}
      <div className="flex h-full w-full flex-col gap-4">
        <Form form={form} handleSubmit={handleContinue} className="flex h-full w-full flex-col gap-4">
          <OnboardingCard
            title={t("invite")}
            subtitle={t("team_invite_subtitle")}
            footer={
              <div className="flex w-full items-center justify-end gap-4">
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
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
                    loading={isSubmitting}>
                    {t("continue")}
                  </Button>
                </div>
              </div>
            }>
            <div className="flex w-full flex-col gap-4 px-1">
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
            </div>
          </OnboardingCard>
        </Form>
      </div>

      {/* Right column - Browser view */}
      <OnboardingInviteBrowserView teamName={teamDetails.name} watchedInvites={watchedInvites} />
    </OnboardingLayout>
  );
};
