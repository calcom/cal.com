"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import slugify from "@calcom/lib/slugify";
import { trpc } from "@calcom/trpc/react";
import { Button } from "@calcom/ui/components/button";
import { CheckboxField, TextField } from "@calcom/ui/components/form";
import { Form } from "@calcom/ui/components/form";

import { OnboardingCard } from "../../components/OnboardingCard";
import { OnboardingLayout } from "../../components/OnboardingLayout";
import { OnboardingMigrateTeamsBrowserView } from "../../components/onboarding-migrate-teams-browser-view";
import { useMigrationFlow } from "../../hooks/useMigrationFlow";
import { useOnboardingStore } from "../../store/onboarding-store";
import { getSuggestedSlug } from "./utils";

type OrganizationMigrateTeamsViewProps = {
  userEmail: string;
};

const schema = z.object({
  moveTeams: z.array(
    z.object({
      id: z.number(),
      shouldMove: z.boolean(),
      newSlug: z.string().optional(),
    })
  ),
});

type FormValues = z.infer<typeof schema>;

export const OrganizationMigrateTeamsView = ({ userEmail }: OrganizationMigrateTeamsViewProps) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useLocale();
  const { isMigrationFlow, hasTeams, teams, isLoading } = useMigrationFlow();
  const { organizationDetails, organizationBrand, teams: teamsFromStore, setTeams } = useOnboardingStore();
  const orgSlug = organizationDetails.link;

  const teamsToMigrateFromStore = teamsFromStore.filter((team) => team.isBeingMigrated);

  const form = useForm<FormValues>({
    defaultValues: {
      moveTeams: [],
    },
    resolver: async (data) => {
      try {
        const validatedData = await schema.parseAsync(data);
        return { values: validatedData, errors: {} };
      } catch (error) {
        if (error instanceof z.ZodError) {
          return {
            values: {
              moveTeams: [],
            },
            errors: error.formErrors.fieldErrors,
          };
        }
        return { values: {}, errors: { moveTeams: { message: "Error validating input" } } };
      }
    },
  });

  const { register, control, watch, getValues, setValue, reset } = form;
  const moveTeams = watch("moveTeams");

  useEffect(() => {
    if (teams.length === 0) return;

    const currentMoveTeams = getValues("moveTeams");
    if (currentMoveTeams.length === 0 || currentMoveTeams.length !== teams.length) {
      reset({
        moveTeams: teams.map((team) => {
          const teamToMigrateInStore = teamsToMigrateFromStore.find((t) => t.id === team.id);
          const slugConflictsWithOrg = team.slug === orgSlug;
          return {
            id: team.id,
            shouldMove: slugConflictsWithOrg || !!teamToMigrateInStore,
            newSlug:
              teamToMigrateInStore?.slug ?? getSuggestedSlug({ teamSlug: team.slug, orgSlug }) ?? undefined,
          };
        }),
      });
    }
  }, [teams, reset, teamsToMigrateFromStore, orgSlug, getValues]);

  const handleFormSubmit = () => {
    const moveTeamsData = getValues("moveTeams");

    const teamsBeingMoved = moveTeamsData
      .filter((team) => team.shouldMove)
      .map((team) => {
        const originalTeam = teams.find((t) => t.id === team.id);
        if (!originalTeam) {
          throw new Error(`Team with id ${team.id} not found`);
        }
        // Use newSlug if provided and not empty, otherwise fall back to original team slug
        // This matches the settings flow behavior - backend will use original slug if newSlug is null
        const slug = team.newSlug?.trim() || originalTeam.slug || null;
        return {
          id: team.id,
          isBeingMigrated: true,
          slug,
          name: originalTeam.name,
        };
      });

    const existingNewTeams = teamsFromStore.filter((team) => !team.isBeingMigrated);

    setTeams([...teamsBeingMoved, ...existingNewTeams]);

    const migrateParam = searchParams?.get("migrate");
    const nextUrl = `/onboarding/organization/teams${migrateParam ? `?migrate=${migrateParam}` : ""}`;
    router.push(nextUrl);
  };

  const handleSkip = () => {
    const migrateParam = searchParams?.get("migrate");
    const nextUrl = `/onboarding/organization/teams${migrateParam ? `?migrate=${migrateParam}` : ""}`;
    router.push(nextUrl);
  };

  if (isLoading) {
    return (
      <OnboardingLayout userEmail={userEmail} currentStep={3} totalSteps={6}>
        <OnboardingCard title={t("loading")} subtitle={t("please_wait")} />
      </OnboardingLayout>
    );
  }

  if (!isMigrationFlow || !hasTeams) {
    return null;
  }

  const hasSelectedTeams = moveTeams.some((team) => team.shouldMove);

  const browserViewTeams = teams.map((team) => {
    const moveTeam = moveTeams.find((mt) => mt.id === team.id);
    return {
      id: team.id,
      name: team.name,
      slug: moveTeam?.newSlug || team.slug,
      isSelected: moveTeam?.shouldMove || false,
    };
  });

  return (
    <OnboardingLayout userEmail={userEmail} currentStep={3} totalSteps={6}>
      <OnboardingCard
        title={t("migrate_existing_teams")}
        subtitle={t("select_teams_to_migrate_to_organization")}
        footer={
          <div className="flex w-full items-center justify-between gap-4">
            <Button color="minimal" className="rounded-[10px]" onClick={() => router.back()}>
              {t("back")}
            </Button>
            <div className="flex items-center gap-2">
              <Button color="minimal" className="rounded-[10px]" onClick={handleSkip}>
                {t("onboarding_skip_for_now")}
              </Button>
              <Button
                type="submit"
                form="migrate-teams-form"
                color="primary"
                className="rounded-[10px]"
                disabled={!hasSelectedTeams}>
                {t("continue")}
              </Button>
            </div>
          </div>
        }>
        <Form id="migrate-teams-form" form={form} handleSubmit={handleFormSubmit} className="w-full">
          {moveTeams.length > 0 ? (
            <div className="flex w-full flex-col gap-4">
              <label className="text-emphasis mb-2 block text-sm font-medium leading-none">
                {t("move_existing_teams")}
              </label>
              <ul className="mb-8 flex flex-col gap-4">
                {moveTeams.map((team, index) => {
                  const currentTeam = teams.find((t) => t.id === team.id);
                  const slugConflictsWithOrg = currentTeam?.slug === orgSlug;
                  return (
                    <li key={team.id}>
                      <Controller
                        name={`moveTeams.${index}.shouldMove`}
                        control={control}
                        render={({ field: { value, onChange } }) => (
                          <CheckboxField
                            checked={value || slugConflictsWithOrg}
                            onChange={onChange}
                            description={currentTeam?.name ?? ""}
                            disabled={slugConflictsWithOrg}
                          />
                        )}
                      />
                      {moveTeams[index].shouldMove ? (
                        <TextField
                          placeholder={t("new_slug")}
                          defaultValue={teams.find((t) => t.id === team.id)?.slug ?? ""}
                          {...register(`moveTeams.${index}.newSlug`)}
                          onChange={(e) => {
                            const slug = slugify(e.target.value, true);
                            setValue(`moveTeams.${index}.newSlug`, slug);
                          }}
                          className="mt-2"
                          label=""
                        />
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            </div>
          ) : null}
        </Form>
      </OnboardingCard>

      {/* Right column - Browser view */}
      <OnboardingMigrateTeamsBrowserView
        teams={browserViewTeams}
        organizationLogo={organizationBrand.logo}
        organizationName={organizationDetails.name}
        organizationBanner={organizationBrand.banner}
        slug={organizationDetails.link}
      />
    </OnboardingLayout>
  );
};
