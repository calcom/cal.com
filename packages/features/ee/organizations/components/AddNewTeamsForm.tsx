import { useRouter } from "next/navigation";
import { useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { z } from "zod";

import { classNames } from "@calcom/lib";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { useRouterQuery } from "@calcom/lib/hooks/useRouterQuery";
import { trpc } from "@calcom/trpc/react";
import { Button, showToast, TextField } from "@calcom/ui";
import { ArrowRight, Plus, X } from "@calcom/ui/components/icon";

const querySchema = z.object({
  id: z.string().transform((val) => parseInt(val)),
});

const schema = z.object({
  teams: z
    .array(
      z.object({
        name: z.string().min(2, "org_team_name_min_2_chars").trim(),
      })
    )
    .min(1, "At least one team is required"),
});

export const AddNewTeamsForm = () => {
  const { t } = useLocale();
  const router = useRouter();
  const routerQuery = useRouterQuery();
  const { id: orgId } = querySchema.parse(routerQuery);
  const [counter, setCounter] = useState(1);

  const { register, control, handleSubmit, formState, trigger, setValue, getValues } = useForm({
    defaultValues: { teams: [{ name: "" }] }, // Set initial values
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

  const createTeamsMutation = trpc.viewer.organizations.createTeams.useMutation({
    async onSuccess(data) {
      if (data.duplicatedSlugs.length) {
        showToast(t("duplicated_slugs_warning", { slugs: data.duplicatedSlugs.join(", ") }), "warning");
        // Server will return array of duplicated slugs, so we need to wait for user to read the warning
        // before pushing to next page
        setTimeout(() => {
          router.push(`/event-types`);
        }, 3000);
      } else {
        router.push(`/event-types`);
      }
    },
    onError: (error) => {
      showToast(t(error.message), "error");
    },
  });

  const handleInputChange = (index: number, event: any) => {
    const { name, value } = event.target;
    setValue(`teams.${index}.name`, value);
    trigger(`teams.${index}.name`);
  };

  const handleFormSubmit = () => {
    if (formState.isValid) {
      const fields = getValues("teams");
      createTeamsMutation.mutate({ orgId, teamNames: fields.map((field) => field.name) });
    }
  };

  return (
    <>
      <form onSubmit={handleSubmit(handleFormSubmit)}>
        {fields.map((field, index) => (
          <div className={classNames("relative", index > 0 ? "mb-2" : "")} key={field.id}>
            <TextField
              key={field.id}
              {...register(`teams.${index}.name`)}
              label=""
              onChange={(e) => handleInputChange(index, e)}
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
                    <X className="bg-subtle text group-hover/remove:text-inverted group-hover/remove:bg-inverted h-5 w-5 rounded-full p-1" />
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
            StartIcon={Plus}
            color="secondary"
            disabled={createTeamsMutation.isLoading}
            onClick={handleCounterIncrease}
            aria-label={t("add_a_team")}
            className="my-1">
            {t("add_a_team")}
          </Button>
        )}
        <Button
          EndIcon={ArrowRight}
          color="primary"
          className="mt-6 w-full justify-center"
          disabled={!formState.isValid || createTeamsMutation.isLoading || createTeamsMutation.isSuccess}
          onClick={handleFormSubmit}>
          {t("continue")}
        </Button>
      </form>
    </>
  );
};
