"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Controller, useFieldArray, useForm } from "react-hook-form";
import { z } from "zod";

import { useOnboarding } from "@calcom/web/modules/ee/organizations/lib/onboardingStore";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import slugify from "@calcom/lib/slugify";
import { trpc } from "@calcom/trpc/react";
import classNames from "@calcom/ui/classNames";
import { Button } from "@calcom/ui/components/button";
import { CheckboxField } from "@calcom/ui/components/form";
import { Form } from "@calcom/ui/components/form";
import { TextField } from "@calcom/ui/components/form";
import { Icon } from "@calcom/ui/components/icon";
import { SkeletonText, SkeletonContainer, SkeletonButton } from "@calcom/ui/components/skeleton";

const schema = z.object({
  teams: z.array(
    z.object({
      name: z.string().trim(),
    })
  ),
  moveTeams: z.array(
    z.object({
      id: z.number(),
      shouldMove: z.boolean(),
      newSlug: z.string().optional(),
    })
  ),
});

export const AddNewTeamsForm = () => {
  const { data: teams, isLoading } = trpc.viewer.teams.listOwnedTeams.useQuery();

  if (isLoading) {
    return (
      <SkeletonContainer as="div" className="stack-y-6">
        <div className="stack-y-4">
          <SkeletonText className="h-4 w-32" />
          <div className="stack-y-2">
            {[...Array(2)].map((_, i) => (
              <div key={i} className="flex items-center space-x-2">
                <SkeletonText className="h-5 w-5" />
                <SkeletonText className="h-8 w-full" />
              </div>
            ))}
          </div>
        </div>
        <div className="stack-y-4">
          <SkeletonText className="h-4 w-32" />
          <div className="stack-y-2">
            {[...Array(3)].map((_, i) => (
              <SkeletonText key={i} className="h-10 w-full" />
            ))}
          </div>
        </div>
        <SkeletonButton className="w-full" />
      </SkeletonContainer>
    );
  }

  return <AddNewTeamsFormChild teams={(teams ?? []).map(({ id, name, slug }) => ({ id, name, slug }))} />;
};

const AddNewTeamsFormChild = ({ teams }: { teams: { id: number; name: string; slug: string | null }[] }) => {
  const { t } = useLocale();
  const router = useRouter();
  const [counter, setCounter] = useState(1);
  const { useOnboardingStore } = useOnboarding();
  const { slug: orgSlug, setTeams, teams: teamsFromStore } = useOnboardingStore();
  const teamsToCreateFromStore = teamsFromStore.filter((team) => !team.isBeingMigrated);
  const teamsToMigrateFromStore = teamsFromStore.filter((team) => team.isBeingMigrated);
  const form = useForm({
    defaultValues: {
      teams: teamsToCreateFromStore.length ? teamsToCreateFromStore : [{ name: "" }],
      moveTeams: teams.map((team) => {
        const teamToMigrateInStore = teamsToMigrateFromStore.find((t) => t.id === team.id);
        const slugConflictsWithOrg = team.slug === orgSlug;
        return {
          id: team.id,
          // The team with conflicting slug must be moved
          shouldMove: slugConflictsWithOrg || !!teamToMigrateInStore,
          newSlug: teamToMigrateInStore?.slug || getSuggestedSlug({ teamSlug: team.slug, orgSlug }),
          name: team.name,
        };
      }),
    }, // Set initial values
    resolver: async (data) => {
      try {
        const validatedData = await schema.parseAsync(data);
        return { values: validatedData, errors: {} };
      } catch (error) {
        if (error instanceof z.ZodError) {
          return {
            values: {
              teams: [],
            },
            errors: error.formErrors.fieldErrors,
          };
        }
        return { values: {}, errors: { teams: { message: "Error validating input" } } };
      }
    },
  });
  const { register, control, watch, getValues, setValue } = form;
  const { fields, append, remove } = useFieldArray({
    control,
    name: "teams",
  });

  const handleCounterIncrease = () => {
    if (counter >= 0 && counter < 5) {
      setCounter((prevCounter) => prevCounter + 1);
      append({ name: "" });
    }
  };

  const handleRemoveInput = (index: number) => {
    remove(index);
    setCounter((prevCounter) => prevCounter - 1);
  };

  const handleFormSubmit = () => {
    const fields = getValues("teams");
    const moveTeams = getValues("moveTeams");

    const teamsBeingMoved = moveTeams.map((team) => {
      return {
        id: team.id,
        isBeingMigrated: team.shouldMove,
        slug: team.newSlug,
        name: team.name,
      };
    });

    const newTeams = fields
      .map((team) => {
        return {
          id: -1,
          isBeingMigrated: false,
          slug: getSuggestedSlug({ teamSlug: team.name, orgSlug }),
          name: team.name,
        };
      })
      .filter((team) => team.slug !== "");

    setTeams([...teamsBeingMoved, ...newTeams]);
    router.push(`/settings/organizations/new/onboard-members`);
  };

  const moveTeams = watch("moveTeams");
  return (
    <>
      <Form form={form} handleSubmit={handleFormSubmit}>
        {moveTeams.length ? (
          <>
            <label className="text-emphasis mb-2 block text-sm font-medium leading-none">
              Move existing teams
            </label>
            <ul className="mb-8 stack-y-4">
              {moveTeams.map((team, index) => {
                const currentTeam = teams.find((t) => t.id === team.id);
                // If the team slug conflicts with the org slug, this team must be moved
                const slugConflictsWithOrg = currentTeam?.slug === orgSlug;
                return (
                  <li key={team.id}>
                    <Controller
                      name={`moveTeams.${index}.shouldMove`}
                      render={({ field: { value, onChange } }) => (
                        <CheckboxField
                          defaultValue={value}
                          checked={value || slugConflictsWithOrg}
                          onChange={onChange}
                          description={currentTeam?.name ?? ""}
                          // Must not allow toggling off if the slug conflicts with the org slug
                          disabled={slugConflictsWithOrg}
                        />
                      )}
                    />
                    {moveTeams[index].shouldMove ? (
                      <TextField
                        placeholder="New Slug"
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
          </>
        ) : null}
        <label className="text-emphasis mb-2 block text-sm font-medium leading-none">Add New Teams</label>
        {fields.map((field, index) => (
          <div className={classNames("relative", index > 0 ? "mb-2" : "")} key={field.id}>
            <TextField
              key={field.id}
              {...register(`teams.${index}.name`)}
              data-testid={`team.${index}.name`}
              label=""
              addOnClassname="bg-transparent p-0 border-l-0"
              className={index > 0 ? "mb-2" : ""}
              placeholder={t(`org_team_names_example_${index + 1}`)}
              addOnSuffix={
                index > 0 && (
                  <Button
                    color="minimal"
                    className="group/remove mx-2 px-0 hover:bg-transparent"
                    onClick={() => handleRemoveInput(index)}
                    aria-label="Remove Team">
                    <Icon
                      name="x"
                      className="bg-subtle text group-hover/remove:text-inverted group-hover/remove:bg-inverted h-5 w-5 rounded-full p-1"
                    />
                  </Button>
                )
              }
              minLength={2}
              maxLength={63}
            />
          </div>
        ))}
        {counter === 5 && <p className="text-subtle my-2 text-sm">{t("org_max_team_warnings")}</p>}
        {counter < 5 && (
          <Button
            StartIcon="plus"
            color="secondary"
            onClick={handleCounterIncrease}
            aria-label={t("add_a_team")}
            className="my-1"
            data-testId="add_a_team">
            {t("add_a_team")}
          </Button>
        )}
        <Button
          EndIcon="arrow-right"
          type="submit"
          color="primary"
          className="mt-6 w-full justify-center"
          data-testId="continue_or_checkout">
          {t("continue")}
        </Button>
      </Form>
    </>
  );
};

const getSuggestedSlug = ({ teamSlug, orgSlug }: { teamSlug: string | null; orgSlug: string | null }) => {
  // If there is no orgSlug, we can't suggest a slug
  if (!teamSlug || !orgSlug) {
    return teamSlug;
  }

  return teamSlug.replace(`${orgSlug}-`, "").replace(`-${orgSlug}`, "");
};
