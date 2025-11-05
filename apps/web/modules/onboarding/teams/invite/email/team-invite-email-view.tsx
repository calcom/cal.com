"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import React from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { z } from "zod";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { InfoBadge } from "@calcom/ui/components/badge";
import { Button } from "@calcom/ui/components/button";
import { Form, Label, TextField, ToggleGroup } from "@calcom/ui/components/form";
import { Icon } from "@calcom/ui/components/icon";

import { OnboardingCard } from "../../../components/OnboardingCard";
import { OnboardingLayout } from "../../../components/OnboardingLayout";
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
    <OnboardingLayout userEmail={userEmail} currentStep={3}>
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
          <div className="flex w-full flex-col gap-4 px-5">
            <Form form={form} handleSubmit={handleContinue} className="w-full">
              <div className="flex w-full flex-col gap-4">
                {/* Email inputs */}
                <div className="flex flex-col gap-2">
                  <Label className="text-emphasis text-sm font-medium">{t("email")}</Label>

                  <div className="scroll-bar flex max-h-72 flex-col gap-2 overflow-y-auto">
                    {fields.map((field, index) => (
                      <div key={field.id} className="flex items-start gap-0.5">
                        <div className="flex-1">
                          <TextField
                            labelSrOnly
                            {...form.register(`invites.${index}.email`)}
                            placeholder={`rick@cal.com`}
                            type="email"
                            size="sm"
                          />
                        </div>
                        <Button
                          type="button"
                          color="minimal"
                          variant="icon"
                          size="sm"
                          className="h-7 w-7"
                          disabled={fields.length === 1}
                          onClick={() => remove(index)}>
                          <Icon name="x" className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>

                  {/* Add button */}
                  <Button
                    type="button"
                    color="secondary"
                    size="sm"
                    StartIcon="plus"
                    className="w-fit"
                    onClick={() => append({ email: "", role: inviteRole })}>
                    {t("add")}
                  </Button>
                </div>

                {/* Role selector */}
                <div className="flex items-center justify-between">
                  <div className="hidden items-center gap-2 md:flex">
                    <span className="text-emphasis text-sm">{t("onboarding_invite_all_as")}</span>
                    <ToggleGroup
                      value={inviteRole}
                      onValueChange={(value) => {
                        if (value) {
                          setInviteRole(value as InviteRole);
                          // Update all invites with the new role
                          fields.forEach((_, index) => {
                            form.setValue(`invites.${index}.role`, value as InviteRole);
                          });
                        }
                      }}
                      options={[
                        { value: "MEMBER", label: t("members") },
                        { value: "ADMIN", label: t("onboarding_admins") },
                      ]}
                    />
                    <InfoBadge content={t("onboarding_modify_roles_later")} />
                  </div>
                </div>
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
