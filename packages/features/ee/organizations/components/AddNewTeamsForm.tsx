import { ArrowRight } from "lucide-react";
import { useRouter } from "next/router";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { Button, showToast, TextField } from "@calcom/ui";
import { Plus, X } from "@calcom/ui/components/icon";

const querySchema = z.object({
  id: z.string().transform((val) => parseInt(val)),
});

export const AddNewTeamsForm = () => {
  const { t, i18n } = useLocale();
  const router = useRouter();
  const { id: orgId } = querySchema.parse(router.query);
  const [counter, setCounter] = useState(1);
  const newAdminsFormMethods = useForm<{
    teamNames: string[];
  }>();

  const [inputValues, setInputValues] = useState<string[]>([""]);

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
    async onSuccess() {
      router.push(`/getting-started`);
    },
    onError: (error) => {
      showToast(error.message, "error");
    },
  });

  return (
    <>
      {Array.from({ length: counter }, (_, index) => (
        <div className="relative" key={index}>
          <TextField
            key={index}
            value={inputValues[index]}
            onChange={(e) => handleInputChange(index, e.target.value)}
          />
          {index > 0 && (
            <Button
              color="minimal"
              className="absolute top-2 right-2 m-0 flex h-auto p-0"
              onClick={() => handleRemoveInput(index)}>
              <X className="bg-subtle text h-5 w-5 rounded-full p-1" />
            </Button>
          )}
        </div>
      ))}
      <Button
        StartIcon={Plus}
        color="secondary"
        disabled={createTeamsMutation.isLoading}
        onClick={handleCounterIncrease}>
        Add a team
      </Button>
      <Button
        EndIcon={ArrowRight}
        color="primary"
        className="mt-6 w-full justify-center"
        disabled={createTeamsMutation.isLoading}
        onClick={() => {
          if (inputValues.includes("")) {
            showToast("Team names can't be empty", "error");
          } else {
            const duplicates = inputValues.filter((item, index) => inputValues.indexOf(item) !== index);
            if (duplicates.length) {
              showToast("Team names can't be repeated", "error");
            } else {
              createTeamsMutation.mutate({ orgId, teamNames: inputValues });
            }
          }
        }}>
        Continue
      </Button>
    </>
  );
};
