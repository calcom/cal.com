import type { UseFormReturn } from "react-hook-form";
import { useFieldArray } from "react-hook-form";

import { classNames } from "@calcom/lib";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Button, EmailField, Tooltip } from "@calcom/ui";
import { FiInfo, FiUserPlus, FiX } from "@calcom/ui/components/icon";

import type { BookingFormValues } from "./form-config";

type GuestFieldsProps = {
  bookingForm: UseFormReturn<BookingFormValues>;
};

export const GuestFields = ({ bookingForm }: GuestFieldsProps) => {
  const { t } = useLocale();
  const { fields, remove, append } = useFieldArray({
    name: "guests",
    control: bookingForm.control,
  });

  return (
    <div className="mb-4">
      <div>
        <label htmlFor="guests" className="mb-1 block text-sm font-medium text-gray-700 dark:text-white">
          {t("guests")}
        </label>
        <ul>
          {fields.map((field, index) => (
            <li key={field.id}>
              <EmailField
                {...bookingForm.register(`guests.${index}.email` as const)}
                className={classNames(
                  bookingForm.formState.errors.guests?.[index] && "!focus:ring-red-700 !border-red-700"
                )}
                addOnClassname={classNames(
                  bookingForm.formState.errors.guests?.[index] && "!focus:ring-red-700 !border-red-700"
                )}
                placeholder="guest@example.com"
                label={<></>}
                required
                addOnSuffix={
                  <Tooltip content="Remove guest">
                    <button className="m-1" type="button" onClick={() => remove(index)}>
                      <FiX className="text-gray-600" />
                    </button>
                  </Tooltip>
                }
              />
              {bookingForm.formState.errors.guests?.[index] && (
                <div className="mt-2 flex items-center text-sm text-red-700 ">
                  <FiInfo className="h-3 w-3 ltr:mr-2 rtl:ml-2" />
                  <p className="text-red-700">{bookingForm.formState.errors.guests?.[index]?.message}</p>
                </div>
              )}
            </li>
          ))}
        </ul>
        <Button
          type="button"
          color="minimal"
          StartIcon={FiUserPlus}
          className="my-2.5"
          onClick={() => append({ email: "" })}>
          {fields.length === 0 ? t("additional_guests") : t("add_another")}
        </Button>
      </div>
    </div>
  );
};
