import { Controller } from "react-hook-form";
import type { Control } from "react-hook-form";

import type { AvailabilityFormValues } from "@calcom/atoms/availability/types";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Button, TextField } from "@calcom/ui";

const TimeBlocksList = ({
  fields,
  remove,
  control,
}: {
  fields: { value: string; id: string }[];
  remove: (index?: number | number[]) => void;
  control: Control<AvailabilityFormValues>;
}) => {
  const { t } = useLocale();
  return (
    <div>
      {fields.length > 0 ? (
        fields.map((field, index) => (
          <div key={field.id} className="mb-2 flex-col items-center space-y-2">
            {index !== 0 && (
              <div>
                <p>{t("or")}</p>
              </div>
            )}
            <div className="flex items-center space-x-4">
              <div className="w-full">
                <Controller
                  control={control}
                  name={`timeBlocks.${index}.value`}
                  render={({ field }) => (
                    <TextField label={false} placeholder="Time block" type="standard" {...field} />
                  )}
                />
              </div>
              <Button
                StartIcon="x"
                variant="icon"
                color="secondary"
                aria-label="remove"
                onClick={() => remove(index)}
              />
            </div>
          </div>
        ))
      ) : (
        <div />
      )}
    </div>
  );
};

export default TimeBlocksList;
