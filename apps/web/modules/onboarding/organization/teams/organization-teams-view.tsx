"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import posthog from "posthog-js";
import { useForm, useFieldArray } from "react-hook-form";
import { z } from "zod";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Button } from "@calcom/ui/components/button";
import { Form, TextField } from "@calcom/ui/components/form";
import { Icon } from "@calcom/ui/components/icon";

import { OnboardingCard } from "../../components/OnboardingCard";
import { OnboardingLayout } from "../../components/OnboardingLayout";
import { OnboardingTeamsBrowserView } from "../../components/onboarding-teams-browser-view";
import { useOnboardingStore } from "../../store/onboarding-store";

type OrganizationTeamsViewProps = {
  userEmail: string;
};

type FormValues = {
  teams: { name: string }[];
};

export const OrganizationTeamsView = ({ userEmail }: OrganizationTeamsViewProps) => {
  const router = useRouter();
  const { t } = useLocale();
  const { teams: storedTeams, setTeams, organizationBrand, organizationDetails } = useOnboardingStore();

  const formSchema = z.object({
    teams: z.array(
      z.object({
        name: z.string().min(1, t("team_name_required")),
      })
    ),
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      teams: storedTeams.length > 0 ? storedTeams : [{ name: "" }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "teams",
  });

  const handleContinue = (data: FormValues) => {
    const validTeams = data.teams.filter((team) => team.name.trim().length > 0);
    posthog.capture("onboarding_organization_teams_continue_clicked", {
      team_count: validTeams.length,
    });
    // Save teams to store
    setTeams(data.teams);
    router.push("/onboarding/organization/invite/email");
  };

  const handleSkip = () => {
    posthog.capture("onboarding_organization_teams_skip_clicked");
    // Skip teams and go to invite
    router.push("/onboarding/organization/invite/email");
  };

  const hasValidTeams = fields.some((_, index) => {
    const teamName = form.watch(`teams.${index}.name`);
    return teamName && teamName.trim().length > 0;
  });

  return (
    <OnboardingLayout userEmail={userEmail} currentStep={3} totalSteps={4}>
      {/* Left column - Main content */}
      <OnboardingCard
        title={t("onboarding_org_teams_title")}
        subtitle={t("onboarding_org_teams_subtitle")}
        footer={
          <div className="flex w-full items-center justify-between gap-4">
            <Button
              type="button"
              color="minimal"
              className="rounded-[10px]"
              onClick={() => {
                posthog.capture("onboarding_organization_teams_back_clicked");
                router.push("/onboarding/organization/brand");
              }}>
              {t("back")}
            </Button>
            <div className="flex items-center gap-2">
              <Button type="button" color="minimal" className="rounded-[10px]" onClick={handleSkip}>
                {t("onboarding_skip_for_now")}
              </Button>
              <Button
                type="submit"
                form="teams-form"
                color="primary"
                className="rounded-[10px]"
                disabled={!hasValidTeams}>
                {t("continue")}
              </Button>
            </div>
          </div>
        }>
        <Form id="teams-form" form={form} handleSubmit={handleContinue} className="w-full">
          <div className="w-full ">
            <div className="flex w-full flex-col gap-8 ">
              <div className="flex w-full flex-col gap-2">
                <div className="flex flex-col gap-1">
                  <p className="text-emphasis text-sm font-medium leading-4">{t("team")}</p>
                </div>

                {/* Team fields */}
                <div className="flex flex-col gap-2">
                  {fields.map((field, index) => (
                    <div key={field.id} className="flex w-full items-end gap-0.5">
                      <div className="flex-1">
                        <TextField
                          labelSrOnly
                          {...form.register(`teams.${index}.name`)}
                          placeholder={t("team")}
                          className="h-7 w-full rounded-[10px] text-sm"
                        />
                      </div>
                      <Button
                        type="button"
                        color="minimal"
                        variant="icon"
                        size="sm"
                        className="h-7 w-7"
                        disabled={fields.length === 1}
                        onClick={() => {
                          posthog.capture("onboarding_organization_teams_remove_clicked", {
                            team_count: fields.length,
                          });
                          remove(index);
                        }}>
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
                  onClick={() => {
                    posthog.capture("onboarding_organization_teams_add_clicked", {
                      team_count: fields.length,
                    });
                    append({ name: "" });
                  }}>
                  {t("add")}
                </Button>
              </div>
            </div>
          </div>
        </Form>
      </OnboardingCard>

      {/* Right column - Browser view */}
      <OnboardingTeamsBrowserView
        teams={form.watch("teams")}
        organizationLogo={organizationBrand.logo}
        organizationName={organizationDetails.name}
        organizationBanner={organizationBrand.banner}
        slug={organizationDetails.link}
      />
    </OnboardingLayout>
  );
};
