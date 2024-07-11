import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Controller, useFieldArray, useForm } from "react-hook-form";
import { z } from "zod";

import { classNames } from "@calcom/lib";
import { IS_TEAM_BILLING_ENABLED_CLIENT } from "@calcom/lib/constants";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { useRouterQuery } from "@calcom/lib/hooks/useRouterQuery";
import { UserPermissionRole } from "@calcom/prisma/enums";
import { trpc } from "@calcom/trpc/react";
import { Button, CheckboxField, Form, Icon, showToast, TextField } from "@calcom/ui";

const querySchema = z.object({
  id: z.string().transform((val) => parseInt(val)),
});

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
  const { data: teams } = trpc.viewer.teams.list.useQuery();
  const routerQuery = useRouterQuery();

  const { id: orgId } = querySchema.parse(routerQuery);

  const { data: org } = trpc.viewer.teams.get.useQuery({ teamId: orgId, isOrg: true });

  if (!teams || !org) {
    return null;
  }

  const orgWithRequestedSlug = {
    ...org,
    requestedSlug: org.metadata.requestedSlug ?? null,
  };

  const regularTeams = teams.filter((team) => !team.parentId);
  return <AddNewTeamsFormChild org={orgWithRequestedSlug} teams={regularTeams} />;
};

const AddNewTeamsFormChild = ({
  teams,
  org,
}: {
  org: { id: number; slug: string | null; requestedSlug: string | null };
  teams: { id: number; name: string; slug: string | null }[];
}) => {
  const { t } = useLocale();
  const router = useRouter();
  const [counter, setCounter] = useState(1);
  const form = useForm({
    defaultValues: {
      teams: [{ name: "" }],
      moveTeams: teams.map((team) => ({
        id: team.id,
        shouldMove: false,
        newSlug: getSuggestedSlug({ teamSlug: team.slug, orgSlug: org.slug || org.requestedSlug }),
      })),
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
  const session = useSession();
  const isAdmin =
    session.data?.user?.role === UserPermissionRole.ADMIN ||
    session.data?.user?.impersonatedBy?.role === UserPermissionRole.ADMIN;

  const allowWizardCompletionWithoutUpgrading = !IS_TEAM_BILLING_ENABLED_CLIENT || isAdmin;
  const { register, control, watch, getValues } = form;
  const { fields, append, remove } = useFieldArray({
    control,
    name: "teams",
  });

  const publishOrgMutation = trpc.viewer.organizations.publish.useMutation({
    onSuccess(data) {
      router.push(data.url);
    },
    onError: (error) => {
      showToast(error.message, "error");
    },
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

  const createTeamsMutation = trpc.viewer.organizations.createTeams.useMutation({
    async onSuccess(data) {
      if (data.duplicatedSlugs.length) {
        showToast(t("duplicated_slugs_warning", { slugs: data.duplicatedSlugs.join(", ") }), "warning");
        // Server will return array of duplicated slugs, so we need to wait for user to read the warning
        // before pushing to next page
        setTimeout(() => handleSuccessRedirect, 3000);
      } else {
        handleSuccessRedirect();
      }

      function handleSuccessRedirect() {
        if (allowWizardCompletionWithoutUpgrading) {
          router.push(`/event-types`);
          return;
        }
        // mutate onSuccess will take care of routing to the correct place.
        publishOrgMutation.mutate();
      }
    },
    onError: (error) => {
      showToast(t(error.message), "error");
    },
  });

  const handleFormSubmit = () => {
    const fields = getValues("teams");
    const moveTeams = getValues("moveTeams");
    createTeamsMutation.mutate({ orgId: org.id, moveTeams, teamNames: fields.map((field) => field.name) });
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
            <ul className="mb-8 space-y-4">
              {moveTeams.map((team, index) => {
                return (
                  <li key={team.id}>
                    <Controller
                      name={`moveTeams.${index}.shouldMove`}
                      render={({ field: { value, onChange } }) => (
                        <CheckboxField
                          defaultValue={value}
                          checked={value}
                          onChange={onChange}
                          description={teams.find((t) => t.id === team.id)?.name ?? ""}
                        />
                      )}
                    />
                    {moveTeams[index].shouldMove ? (
                      <TextField
                        placeholder="New Slug"
                        defaultValue={teams.find((t) => t.id === team.id)?.slug ?? ""}
                        {...register(`moveTeams.${index}.newSlug`)}
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
            disabled={createTeamsMutation.isPending}
            onClick={handleCounterIncrease}
            aria-label={t("add_a_team")}
            className="my-1">
            {t("add_a_team")}
          </Button>
        )}
        <Button
          EndIcon="arrow-right"
          color="primary"
          className="mt-6 w-full justify-center"
          data-testId="continue_or_checkout"
          disabled={createTeamsMutation.isPending || createTeamsMutation.isSuccess}
          onClick={handleFormSubmit}>
          {allowWizardCompletionWithoutUpgrading ? t("continue") : t("checkout")}
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
