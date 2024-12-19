import type { z } from "zod";

import { getFirstAndLastName } from "@calcom/features/form-builder/utils";
import type { bookingResponses } from "@calcom/prisma/zod-utils";
import type { RouterOutputs } from "@calcom/trpc/react";

type Fields = NonNullable<RouterOutputs["viewer"]["public"]["event"]>["bookingFields"];
type BookingResponses = NonNullable<z.infer<typeof bookingResponses>>;
type NameResponse = BookingResponses["name"];

function doesLastNameExist(name: NameResponse) {
  const { lastName } = getFirstAndLastName(name);
  return !!lastName && lastName.length > 0;
}

export const isNameFieldReadOnly = ({
  field,
  nameResponse,
  isReschedule,
  isNameFieldDirty,
}: {
  field: {
    variantsConfig?: {
      variants: {
        [key: string]: {
          fields: { name: string; required?: boolean }[];
        };
      };
    };
    variant?: Fields[number]["variant"];
  };
  nameResponse: NameResponse;
  isReschedule: boolean;
  isNameFieldDirty: boolean;
}): boolean => {
  if (!isReschedule) return false;
  // An already modified field can't be read only
  if (isNameFieldDirty) return false;

  // By default, a rescheduled booking shouldn't allow editing the name. Enable it when needed after ensuring that the new name is communicated everywhere
  const DEFAULT_READONLY_VALUE_FOR_RESCHEDULE = true;
  const variants = field.variantsConfig?.variants;
  if (!variants) return DEFAULT_READONLY_VALUE_FOR_RESCHEDULE;

  const firstAndLastNameVariant = variants.firstAndLastName;
  if (!firstAndLastNameVariant) return DEFAULT_READONLY_VALUE_FOR_RESCHEDULE;

  const lastNameField = firstAndLastNameVariant.fields.find((f) => f.name === "lastName");
  if (!lastNameField) return DEFAULT_READONLY_VALUE_FOR_RESCHEDULE;

  // Allow setting the lastName when it is required but not yet set. Possible when someone makes lastName required after the data is collected without lastName
  if (field.variant === "firstAndLastName" && lastNameField.required && !doesLastNameExist(nameResponse)) {
    return false;
  }
  return DEFAULT_READONLY_VALUE_FOR_RESCHEDULE;
};
