"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter, useSearchParams } from "next/navigation";
import posthog from "posthog-js";
import { useForm, useFieldArray } from "react-hook-form";
import { z } from "zod";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import slugify from "@calcom/lib/slugify";
import { Badge } from "@calcom/ui/components/badge";
import { Button } from "@calcom/ui/components/button";
import { Form, TextField } from "@calcom/ui/components/form";
import { Icon } from "@calcom/ui/components/icon";

import { OnboardingCard } from "../../components/OnboardingCard";
import { OnboardingLayout } from "../../components/OnboardingLayout";
import { OnboardingTeamsBrowserView } from "../../components/onboarding-teams-browser-view";
import { useMigrationFlow } from "../../hooks/useMigrationFlow";
import { useOnboardingStore } from "../../store/onboarding-store";

type OrganizationTeamsViewProps = {
  userEmail: string;
};

type FormValues = {
  teams: { name: string }[];
};

export const OrganizationTeamsView = ({ userEmail }: OrganizationTeamsViewProps) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useLocale();
  const { teams: storedTeams, setTeams, organizationBrand, organizationDetails } = useOnboardingStore();
  const { isMigrationFlow } = useMigrationFlow();

  // Filter out migrated teams - only show new teams
  const newTeams = storedTeams.filter((team) => !team.isBeingMigrated);
  const migratedTeams = storedTeams.filter((team) => team.isBeingMigrated);

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
      teams: newTeams.length > 0 ? newTeams.map((team) => ({ name: team.name })) : [{ name: "" }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "teams",
  });

  const getNextStep = () => {
    const migrateParam = searchParams?.get("migrate");
    const queryString = migrateParam ? `?migrate=${migrateParam}` : "";

    // If migration flow and teams were migrated, go to migrate-members
    if (isMigrationFlow && migratedTeams.length > 0) {
      return `/onboarding/organization/migrate-members${queryString}`;
    }
    return `/onboarding/organization/invite/email${queryString}`;
  };

  const handleContinue = (data: FormValues) => {
    // Convert form data to Team structure and combine with migrated teams
    const newTeamsData = data.teams
      .filter((team) => team.name && team.name.trim().length > 0)
      .map((team) => ({
        id: -1,
        name: team.name,
        slug: null,
        isBeingMigrated: false,
      }));

    posthog.capture("onboarding_organization_teams_continue_clicked", {
      team_count: newTeamsData.length,
    });

    // Combine migrated teams with new teams
    setTeams([...migratedTeams, ...newTeamsData]);
    router.push(getNextStep());
  };

  const handleSkip = () => {
    posthog.capture("onboarding_organization_teams_skip_clicked");
    // Skip teams - keep migrated teams if any, otherwise empty
    setTeams(migratedTeams);
    router.push(getNextStep());
  };

  const hasValidTeams = fields.some((_, index) => {
    const teamName = form.watch(`teams.${index}.name`);
    return teamName && teamName.trim().length > 0;
  });

  // Calculate total steps dynamically
  const totalSteps = isMigrationFlow && migratedTeams.length > 0 ? 6 : 4;
  const currentStep = isMigrationFlow && migratedTeams.length > 0 ? 4 : 3;

  return (
    <OnboardingLayout userEmail={userEmail} currentStep={currentStep} totalSteps={totalSteps}>
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
                router.back();
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
            <div className="flex w-full flex-col gap-6">
              {/* Migrated teams section */}
              {migratedTeams.length > 0 && (
                <div className="flex w-full flex-col gap-2">
                  <div className="flex flex-col gap-1">
                    <p className="text-emphasis text-sm font-medium leading-4">{t("migrated_teams")}</p>
                    <p className="text-subtle text-xs leading-4">{t("migrated_teams_description")}</p>
                  </div>
                  <div className="flex flex-col gap-2">
                    {migratedTeams.map((team) => (
                      <div key={team.id} className="flex w-full items-center gap-1">
                        <div className="flex-1">
                          <TextField
                            labelSrOnly
                            value={team.name}
                            disabled
                            placeholder={t("team")}
                            className="h-7 w-full rounded-[10px] text-sm opacity-60"
                          />
                        </div>
                        <Badge variant="green" className="text-xs">
                          {t("migrating")}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* New teams section */}
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
        teams={[
          ...migratedTeams.map((team) => ({
            name: team.name,
            slug: team.slug,
            isMigrated: true,
          })),
          ...form
            .watch("teams")
            .filter((t) => t.name && t.name.trim().length > 0)
            .map((t) => ({ name: t.name, isMigrated: false })),
        ]}
        organizationLogo={organizationBrand.logo}
        organizationName={organizationDetails.name}
        organizationBanner={organizationBrand.banner}
        slug={organizationDetails.link}
      />
    </OnboardingLayout>
  );
};
