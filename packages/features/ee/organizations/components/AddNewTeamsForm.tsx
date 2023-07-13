import { useRouter } from "next/router";
import { useState } from "react";
import { z } from "zod";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { Button, showToast, TextField } from "@calcom/ui";
import { Plus, X, ArrowRight } from "@calcom/ui/components/icon";

const querySchema = z.object({
  id: z.string().transform((val) => parseInt(val)),
});

export const AddNewTeamsForm = () => {
  const { t } = useLocale();
  const router = useRouter();
  const { id: orgId } = querySchema.parse(router.query);
  const [counter, setCounter] = useState(1);

  const [inputValues, setInputValues] = useState<string[]>([]);

  const handleCounterIncrease = () => {
    setCounter((prevCounter) => prevCounter + 1);
    setInputValues((prevInputValues) => [...prevInputValues, ""]);
  };

  const handleInputChange = (index: number, value: string) => {
    const newInputValues = [...inputValues];
    newInputValues[index] = value;
    setInputValues(newInputValues);
  };

  const handleRemoveInput = (index: number) => {
    const newInputValues = [...inputValues];
    newInputValues.splice(index, 1);
    setInputValues(newInputValues);
    setCounter((prevCounter) => prevCounter - 1);
  };

  const createTeamsMutation = trpc.viewer.organizations.createTeams.useMutation({
    async onSuccess(data) {
      if (data.duplicatedSlugs.length) {
        showToast(t("duplicated_slugs_warning", { slugs: data.duplicatedSlugs.join(", ") }), "warning");
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

  const validateInput = () => {
    if (inputValues.includes("")) {
      showToast(t("team_names_empty"), "error");
      return false;
    }
    const duplicates = inputValues.filter((item, index) => inputValues.indexOf(item) !== index);
    if (duplicates.length) {
      showToast(t("team_names_repeated"), "error");
      return false;
    }
    return true;
  };

  const handleFormSubmit = () => {
    if (validateInput()) {
      createTeamsMutation.mutate({ orgId, teamNames: inputValues });
    }
  };

  return (
    <>
      {Array.from({ length: counter }, (_, index) => (
        <div className="relative" key={index}>
          <TextField
            key={index}
            value={inputValues[index] || ""}
            onChange={(e) => handleInputChange(index, e.target.value)}
            addOnClassname="bg-transparent p-0 border-l-0"
            placeholder={index === 0 ? t("org_team_names_example") : ""}
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
          />
        </div>
      ))}
      <Button
        StartIcon={Plus}
        color="secondary"
        disabled={createTeamsMutation.isLoading}
        onClick={handleCounterIncrease}
        aria-label={t("add_a_team")}>
        {t("add_a_team")}
      </Button>
      <Button
        EndIcon={ArrowRight}
        color="primary"
        className="mt-6 w-full justify-center"
        disabled={inputValues.length === 0 || createTeamsMutation.isLoading}
        onClick={handleFormSubmit}>
        {t("continue")}
      </Button>
    </>
  );
};
