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
import { OnboardingOrganizationBrowserView } from "../../../components/onboarding-organization-browser-view";
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
    router.push("/onboarding/organization/invite");
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
    return email && email.trim().length > 0 && team && team.trim().length > 0;
  });

  const filteredTeams = store.teams.filter((team) => team.name && team.name.trim().length > 0);
  const teams =
    filteredTeams.length > 0
      ? filteredTeams.map((team) => ({ value: team.name.toLowerCase(), label: team.name }))
      : [];

  return (
    <OnboardingLayout userEmail={userEmail} currentStep={4} totalSteps={4}>
      <div className="flex h-full w-full flex-col gap-4">
        <OnboardingCard
          title={t("onboarding_org_invite_title")}
          subtitle={t("onboarding_org_invite_subtitle_email")}
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
          <div className="flex h-full w-full flex-col gap-4">
            <Form form={form} handleSubmit={handleContinue} className="h-full w-full">
              <div className="flex h-full w-full flex-col gap-4">
                <EmailInviteForm
                  fields={fields}
                  append={append}
                  remove={remove}
                  defaultRole={inviteRole}
                  showTeamSelect
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

      <OnboardingOrganizationBrowserView
        avatar={organizationBrand.logo}
        name={organizationDetails.name}
        bio={organizationDetails.bio}
        slug={organizationDetails.link}
        bannerUrl={organizationBrand.banner}
      />
      <OrganizationCSVUploadModal isOpen={isCSVModalOpen} onClose={() => setIsCSVModalOpen(false)} />
    </OnboardingLayout>
  );
};
