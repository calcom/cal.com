import { BookingFormValues } from "../../components/BookEventForm/form-config";
import { PublicEvent, ValidationErrors } from "../../types";

/**
 *
 */
export const validateCustomInputs = (
  event: PublicEvent,
  formValues: BookingFormValues
): ValidationErrors | null => {
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
