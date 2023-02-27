import type { BookingFormValues } from "../../Booker/components/BookEventForm/form-config";
import type { PublicEvent, ValidationErrors } from "../../types";

/**
 * Validates all custom input fields, then either returns
 * an array of all fields with errors, or null if there are no errors.
 */
export const validateCustomInputs = (
  event: PublicEvent,
  formValues: BookingFormValues
): ValidationErrors<BookingFormValues> | null => {
  const requiredCustomInputs = event.customInputs.filter((input) => input.required);
  const missingRequiredCustomInputs = requiredCustomInputs.filter(
    (input) => !formValues?.customInputs?.[input.id]
  );

  if (missingRequiredCustomInputs.length > 0) {
    return missingRequiredCustomInputs.map((input) => ({
      key: `customInputs.${input.id}`,
      error: {
        type: "required",
      },
    }));
  }

  return null;
};
