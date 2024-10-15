import { Controller, useFormContext } from "react-hook-form";
import type { Control } from "react-hook-form";

import type { AvailabilityFormValues } from "@calcom/atoms/availability/types";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Button, TextField, InputError } from "@calcom/ui";

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
  const methods = useFormContext() as ReturnType<typeof useFormContext> | null;
  if (!methods) return null;
  const { formState } = methods;

  return (
    <div>
      {fields.map((field, index) => {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        const fieldErrors: FieldErrors<T> | undefined = formState.errors.timeBlocks?.[index]?.value;
        return (
          <div key={field.id} className="flex-col items-center space-y-2">
            {index !== 0 && (
              <div>
                <p>{t("or")}</p>
              </div>
            )}
            <div>
              <div className="flex space-x-4">
                <div className="w-full">
                  <Controller
                    control={control}
                    name={`timeBlocks.${index}.value`}
                    rules={{ required: t("time_block_empty_error") }}
                    render={({ field }) => (
                      <TextField labelSrOnly placeholder="Time block" type="standard" {...field} />
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
              {fieldErrors && (
                <div className="mb-2">
                  <InputError message={fieldErrors.message} />
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default TimeBlocksList;
