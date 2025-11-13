"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import React from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { z } from "zod";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Button } from "@calcom/ui/components/button";
import { Form } from "@calcom/ui/components/form";

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
  const { t } = useLocale();

  const store = useOnboardingStore();
  const { teamInvites, setTeamInvites, teamDetails } = store;
  const [inviteRole, setInviteRole] = React.useState<InviteRole>("MEMBER");
  const { createTeam, isSubmitting } = useCreateTeam();

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
    const invitesWithTeam = data.invites.map((invite) => ({
      email: invite.email,
      team: teamDetails.name,
      role: invite.role,
    }));

    setTeamInvites(invitesWithTeam);

    // Create the team (will handle checkout redirect if needed)
    await createTeam(store);
  };

  const handleBack = () => {
    router.push("/onboarding/teams/invite");
  };

  const hasValidInvites = fields.some((_, index) => {
    const email = form.watch(`invites.${index}.email`);
    return email && email.trim().length > 0;
  });

  return (
    <OnboardingLayout userEmail={userEmail} currentStep={3} totalSteps={3}>
      {/* Left column - Main content */}
      <div className="flex w-full flex-col gap-4">
        <OnboardingCard
          title={t("invite_via_email")}
          subtitle={t("team_invite_subtitle")}
          footer={
            <div className="flex w-full items-center justify-end gap-4">
              <Button color="minimal" className="rounded-[10px]" onClick={handleBack} disabled={isSubmitting}>
                {t("back")}
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
      <OnboardingInviteBrowserView teamName={teamDetails.name} />
    </OnboardingLayout>
  );
};
