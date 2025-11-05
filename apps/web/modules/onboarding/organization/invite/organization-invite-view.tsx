"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import React from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { z } from "zod";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Button } from "@calcom/ui/components/button";
import { Form, Label, TextField, Select, ToggleGroup } from "@calcom/ui/components/form";
import { Icon } from "@calcom/ui/components/icon";
import { Logo } from "@calcom/ui/components/logo";

import { useSubmitOnboarding } from "../../hooks/useSubmitOnboarding";
import { useOnboardingStore } from "../../store/onboarding-store";

type OrganizationInviteViewProps = {
  userEmail: string;
};

type FormValues = {
  invites: {
    email: string;
    team: string;
    role: "MEMBER" | "ADMIN";
  }[];
};

export const OrganizationInviteView = ({ userEmail }: OrganizationInviteViewProps) => {
  const router = useRouter();
  const { t } = useLocale();
  // We are using email mode for now until we implement the other invite methods, csv, workspace - invite link
  const isEmailMode = true;

  const store = useOnboardingStore();
  const usersEmailDomain = userEmail.split("@")[1];
  const { invites: storedInvites, inviteRole, setInvites, setInviteRole } = store;
  const { submitOnboarding, isSubmitting } = useSubmitOnboarding();

  const formSchema = z.object({
    invites: z.array(
      z.object({
        email: z.string().email(t("invalid_email_address")),
        team: z.string().min(1, t("onboarding_team_required")),
        role: z.enum(["MEMBER", "ADMIN"]),
      })
    ),
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      invites: storedInvites.length > 0 ? storedInvites : [{ email: "", team: "", role: inviteRole }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "invites",
  });

  const handleSubmitOnboarding = async (invitesData: FormValues["invites"]) => {
    // Save invites to store before submitting
    setInvites(invitesData);
    await submitOnboarding(store, userEmail, invitesData);
  };

  const handleContinue = async (data?: FormValues) => {
    if (data) {
      await handleSubmitOnboarding(data.invites);
    } else {
      await handleSubmitOnboarding([]);
    }
  };

  const handleSkip = async () => {
    // Complete onboarding without invites
    await handleSubmitOnboarding([]);
  };

  const handleInviteViaEmail = () => {
    router.push("/onboarding/organization/invite?mode=email");
  };

  const hasValidInvites = fields.some((_, index) => {
    const email = form.watch(`invites.${index}.email`);
    const team = form.watch(`invites.${index}.team`);
    return email && email.trim().length > 0 && team && team.trim().length > 0;
  });

  // Get teams from store, filter out empty teams
  const filteredTeams = store.teams.filter((team) => team.name && team.name.trim().length > 0);
  const teams =
    filteredTeams.length > 0
      ? filteredTeams.map((team) => ({ value: team.name.toLowerCase(), label: team.name }))
      : [];

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
                  <h1 className="font-cal text-xl font-semibold leading-6">
                    {t("onboarding_org_invite_title")}
                  </h1>
                  <p className="text-subtle text-sm font-medium leading-tight">
                    {isEmailMode
                      ? t("onboarding_org_invite_subtitle_email")
                      : t("onboarding_org_invite_subtitle_full")}
                  </p>
                </div>
              </div>

              {/* Content */}
              <div className="bg-default border-subtle w-full rounded-md border">
                <div className="flex w-full flex-col gap-8 px-5 py-5">
                  {!isEmailMode ? (
                    // Coming soon
                    // Initial invite options view
                    <div className="flex w-full flex-col gap-4">
                      <Button color="secondary" className="w-full justify-center" StartIcon="mail">
                        {t("onboarding_connect_google_workspace")}
                      </Button>

                      <div className="flex items-center gap-2">
                        <div className="bg-subtle h-px flex-1" />
                        <span className="text-subtle text-xs">{t("onboarding_or_divider")}</span>
                        <div className="bg-subtle h-px flex-1" />
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          color="secondary"
                          className="flex-1 justify-center"
                          onClick={handleInviteViaEmail}>
                          {t("invite_via_email")}
                        </Button>
                        <Button color="secondary" className="flex-1 justify-center" StartIcon="upload">
                          {t("onboarding_upload_csv")}
                        </Button>
                        <Button color="secondary" className="flex-1 justify-center" StartIcon="link">
                          {t("onboarding_copy_invite_link")}
                        </Button>
                      </div>

                      {/* Role selector */}
                      <div className="flex items-center justify-between">
                        <div className="hidden items-center gap-2 md:flex">
                          <span className="text-emphasis text-sm">{t("onboarding_invite_all_as")}</span>
                          <ToggleGroup
                            value={inviteRole}
                            onValueChange={(value) => value && setInviteRole(value as "MEMBER" | "ADMIN")}
                            options={[
                              { value: "ADMIN", label: t("onboarding_admins") },
                              { value: "MEMBER", label: t("members") },
                            ]}
                          />
                        </div>
                        <span className="text-subtle text-sm">{t("onboarding_modify_roles_later")}</span>
                      </div>
                    </div>
                  ) : (
                    // Email invite form
                    <Form form={form} handleSubmit={handleContinue} className="w-full">
                      <div className="flex w-full flex-col gap-4">
                        {/* Email and Team inputs */}
                        <div className="flex flex-col gap-2">
                          <div className="grid grid-cols-2">
                            <Label
                              className="text-emphasis mb-0 text-sm font-medium"
                              htmlFor="invites.0.email">
                              {t("email")}
                            </Label>
                            <Label
                              className="text-emphasis mb-0 text-sm font-medium"
                              htmlFor="invites.0.team">
                              {t("team")}
                            </Label>
                          </div>

                          {fields.map((field, index) => (
                            <div key={field.id} className="flex items-start gap-0.5">
                              <div className="grid flex-1 items-start gap-2 md:grid-cols-2 ">
                                <TextField
                                  labelSrOnly
                                  {...form.register(`invites.${index}.email`)}
                                  placeholder={`dave@${usersEmailDomain}`}
                                  type="email"
                                  size="sm"
                                />
                                <Select
                                  size="sm"
                                  options={teams}
                                  value={teams.find((t) => t.value === form.watch(`invites.${index}.team`))}
                                  onChange={(option) => {
                                    if (option) {
                                      form.setValue(`invites.${index}.team`, option.value);
                                    }
                                  }}
                                  placeholder={t("select_team")}
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
                            className="mt-2 w-fit"
                            onClick={() => append({ email: "", team: "", role: "MEMBER" })}>
                            {t("add")}
                          </Button>
                        </div>

                        {/* Role selector */}
                        <div className="flex items-center justify-between">
                          <div className="hidden items-center gap-2 md:flex">
                            <span className="text-emphasis text-sm">{t("onboarding_invite_all_as")}</span>
                            <ToggleGroup
                              value={inviteRole}
                              onValueChange={(value) => value && setInviteRole(value as "MEMBER" | "ADMIN")}
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
                  )}
                </div>
              </div>

              {/* Footer */}
              <div className="flex w-full items-center justify-end gap-1 px-5 py-4">
                <Button
                  type={isEmailMode ? "submit" : "button"}
                  color="primary"
                  className="rounded-[10px]"
                  disabled={(isEmailMode && !hasValidInvites) || isSubmitting}
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
              className="text-subtle hover:bg-subtle rounded-[10px] px-2 py-1.5 text-sm font-medium leading-4">
              {t("ill_do_this_later")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
