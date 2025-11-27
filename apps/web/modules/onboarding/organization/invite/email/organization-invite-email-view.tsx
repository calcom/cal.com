"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import React from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { z } from "zod";

import { useFlags } from "@calcom/features/flags/hooks";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Button } from "@calcom/ui/components/button";
import { Form } from "@calcom/ui/components/form";

import { EmailInviteForm } from "../../../components/EmailInviteForm";
import { InviteOptions } from "../../../components/InviteOptions";
import { OnboardingCard } from "../../../components/OnboardingCard";
import { OnboardingLayout } from "../../../components/OnboardingLayout";
import { RoleSelector } from "../../../components/RoleSelector";
import { OnboardingInviteBrowserView } from "../../../components/onboarding-invite-browser-view";
import { useSubmitOnboarding } from "../../../hooks/useSubmitOnboarding";
import { useOnboardingStore, type InviteRole } from "../../../store/onboarding-store";
import { OrganizationCSVUploadModal } from "../csv-upload-modal";

type OrganizationInviteEmailViewProps = {
  userEmail: string;
};

type FormValues = {
  invites: {
    email: string;
    team: string;
    role: "MEMBER" | "ADMIN";
  }[];
};

export const OrganizationInviteEmailView = ({ userEmail }: OrganizationInviteEmailViewProps) => {
  const router = useRouter();
  const { t } = useLocale();
  const flags = useFlags();

  const store = useOnboardingStore();
  const usersEmailDomain = userEmail.split("@")[1];
  const {
    invites: storedInvites,
    inviteRole,
    setInvites,
    setInviteRole,
    organizationDetails,
    organizationBrand,
  } = store;
  const { submitOnboarding, isSubmitting } = useSubmitOnboarding();
  const [isCSVModalOpen, setIsCSVModalOpen] = React.useState(false);

  const googleWorkspaceEnabled = flags["google-workspace-directory"];

  const filteredTeams = store.teams.filter((team) => team.name && team.name.trim().length > 0);
  const teams =
    filteredTeams.length > 0
      ? filteredTeams.map((team) => ({ value: team.name.toLowerCase(), label: team.name }))
      : [];
  const hasTeams = teams.length > 0;

  // Conditional form schema - team is optional when there are no teams
  const formSchema = z.object({
    invites: z.array(
      z.object({
        email: z.string().email(t("invalid_email_address")),
        team: hasTeams ? z.string().min(1, t("onboarding_team_required")) : z.string().optional(),
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

  const {
    fields,
    append: appendField,
    remove,
  } = useFieldArray({
    control: form.control,
    name: "invites",
  });

  // Wrapper to ensure team is always provided when appending
  const append = (value: { email: string; team?: string; role: InviteRole }) => {
    appendField({
      email: value.email,
      team: value.team || "",
      role: value.role,
    });
  };

  const handleContinue = async (data: FormValues) => {
    setInvites(data.invites);
    await submitOnboarding(store, userEmail, data.invites);
  };

  const handleBack = () => {
    router.push("/onboarding/organization/teams");
  };

  const handleSkip = async () => {
    setInvites([]);
    await submitOnboarding(store, userEmail, []);
  };

  const handleGoogleWorkspaceConnect = () => {
    console.log("Connect Google Workspace");
  };

  const handleUploadCSV = () => {
    setIsCSVModalOpen(true);
  };

  const handleCopyInviteLink = () => {
    console.log("Copy invite link - disabled");
  };

  const handleInviteViaEmail = () => {
    router.push("/onboarding/organization/invite/email");
  };

  const hasValidInvites = fields.some((_, index) => {
    const email = form.watch(`invites.${index}.email`);
    const team = form.watch(`invites.${index}.team`);
    // If there are no teams, only validate email. Otherwise, validate both email and team.
    if (!hasTeams) {
      return email && email.trim().length > 0;
    }
    return email && email.trim().length > 0 && team && team.trim().length > 0;
  });

  return (
    <OnboardingLayout userEmail={userEmail} currentStep={4} totalSteps={4}>
      <div className="flex h-full w-full flex-col gap-4">
        <OnboardingCard
          title={t("onboarding_org_invite_title")}
          subtitle={t("onboarding_org_invite_subtitle_email")}
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
          <div className="flex w-full flex-col gap-4">
            <Form form={form} handleSubmit={handleContinue} className="w-full">
              <div className="flex w-full flex-col gap-4">
                <EmailInviteForm
                  fields={fields}
                  append={append}
                  remove={remove}
                  defaultRole={inviteRole}
                  showTeamSelect={hasTeams}
                  teams={teams}
                  emailPlaceholder={`dave@${usersEmailDomain}`}
                />

                <RoleSelector
                  value={inviteRole}
                  showInfoBadge={true}
                  onValueChange={(value) => {
                    setInviteRole(value);
                    fields.forEach((_, index) => {
                      form.setValue(`invites.${index}.role`, value);
                    });
                  }}
                />
              </div>
            </Form>
          </div>
        </OnboardingCard>
      </div>

      <OnboardingInviteBrowserView useOrganizationInvites={true} watchedInvites={form.watch("invites")} />
      <OrganizationCSVUploadModal isOpen={isCSVModalOpen} onClose={() => setIsCSVModalOpen(false)} />
    </OnboardingLayout>
  );
};
