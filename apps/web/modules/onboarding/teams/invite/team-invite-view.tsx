"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import React from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { z } from "zod";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Button } from "@calcom/ui/components/button";
import { Form, Label, TextField, ToggleGroup } from "@calcom/ui/components/form";
import { Icon } from "@calcom/ui/components/icon";
import { Logo } from "@calcom/ui/components/logo";

import { useCreateTeam } from "../../hooks/useCreateTeam";
import { useOnboardingStore, type InviteRole } from "../../store/onboarding-store";

type TeamInviteViewProps = {
  userEmail: string;
};

type FormValues = {
  invites: {
    email: string;
    role: InviteRole;
  }[];
};

export const TeamInviteView = ({ userEmail }: TeamInviteViewProps) => {
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

  const handleSkip = async () => {
    setTeamInvites([]);

    // Create the team without invites (will handle checkout redirect if needed)
    await createTeam(store);
  };

  const hasValidInvites = fields.some((_, index) => {
    const email = form.watch(`invites.${index}.email`);
    return email && email.trim().length > 0;
  });

  return (
    <div className="bg-default flex min-h-screen w-full flex-col items-start overflow-clip rounded-xl">
      {/* Header */}
      <div className="flex w-full items-center justify-between px-6 py-4">
        <Logo className="h-5 w-auto" />

        {/* Progress dots - centered */}
        <div className="absolute left-1/2 flex -translate-x-1/2 items-center justify-center gap-1">
          <div className="bg-emphasis h-1 w-1 rounded-full" />
          <div className="bg-emphasis h-1 w-1 rounded-full" />
          <div className="bg-emphasis h-1 w-1 rounded-full" />
          <div className="bg-emphasis h-1.5 w-1.5 rounded-full" />
        </div>

        <div className="bg-muted flex items-center gap-2 rounded-full px-3 py-2">
          <p className="text-emphasis text-sm font-medium leading-none">{userEmail}</p>
        </div>
      </div>

      {/* Main content */}
      <div className="flex h-full w-full items-start justify-center px-6 py-8">
        <div className="flex w-full max-w-[600px] flex-col gap-4">
          {/* Card */}
          <div className="bg-muted border-muted relative rounded-xl border p-1">
            <div className="rounded-inherit flex w-full flex-col items-start overflow-clip">
              {/* Card Header */}
              <div className="flex w-full gap-1.5 px-5 py-4">
                <div className="flex w-full flex-col gap-1">
                  <h1 className="font-cal text-xl font-semibold leading-6">{t("invite_team_members")}</h1>
                  <p className="text-subtle text-sm font-medium leading-tight">{t("team_invite_subtitle")}</p>
                </div>
              </div>

              {/* Content */}
              <div className="bg-default border-subtle w-full rounded-md border">
                <div className="flex w-full flex-col gap-8 px-5 py-5">
                  <Form form={form} handleSubmit={handleContinue} className="w-full">
                    <div className="flex w-full flex-col gap-4">
                      {/* Email inputs */}
                      <div className="flex flex-col gap-2">
                        <Label className="text-emphasis text-sm font-medium">{t("email")}</Label>

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
                        </div>
                        <span className="text-subtle text-sm">{t("onboarding_modify_roles_later")}</span>
                      </div>
                    </div>
                  </Form>
                </div>
              </div>

              {/* Footer */}
              <div className="flex w-full items-center justify-end gap-1 px-5 py-4">
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
          </div>

          {/* Skip button */}
          <div className="flex w-full justify-center">
            <button
              onClick={handleSkip}
              disabled={isSubmitting}
              className="text-subtle hover:bg-subtle rounded-[10px] px-2 py-1.5 text-sm font-medium leading-4 disabled:opacity-50">
              {t("ill_do_this_later")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
