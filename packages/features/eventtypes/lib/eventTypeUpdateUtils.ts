import { ErrorWithCode } from "@calcom/lib/errors";
import { PeriodType } from "@calcom/prisma/enums";
import type { CustomInputSchema } from "@calcom/prisma/zod-utils";

import type { EventTypeUpdateInput } from "./types";

export function isPeriodType(keyInput: string): keyInput is PeriodType {
  return Object.keys(PeriodType).includes(keyInput);
}

export function handlePeriodType(periodType: string | undefined): PeriodType | undefined {
  if (typeof periodType !== "string") return undefined;
  const passedPeriodType = periodType.toUpperCase();
  if (!isPeriodType(passedPeriodType)) return undefined;
  return PeriodType[passedPeriodType];
}

export function handleCustomInputs(customInputs: CustomInputSchema[], eventTypeId: number) {
  const cInputsIdsToDeleteOrUpdated = customInputs.filter((input) => !input.hasToBeCreated);
  const cInputsIdsToDelete = cInputsIdsToDeleteOrUpdated.map((e) => e.id);
  const cInputsToCreate = customInputs
    .filter((input) => input.hasToBeCreated)
    .map((input) => ({
      type: input.type,
      label: input.label,
      required: input.required,
      placeholder: input.placeholder,
      options: input.options || undefined,
    }));
  const cInputsToUpdate = cInputsIdsToDeleteOrUpdated.map((input) => ({
    data: {
      type: input.type,
      label: input.label,
      required: input.required,
      placeholder: input.placeholder,
      options: input.options || undefined,
    },
    where: {
      id: input.id,
    },
  }));

  return {
    deleteMany: {
      eventTypeId,
      NOT: {
        id: { in: cInputsIdsToDelete },
      },
    },
    createMany: {
      data: cInputsToCreate,
    },
    update: cInputsToUpdate,
  };
}

export function ensureUniqueBookingFields(fields: EventTypeUpdateInput["bookingFields"]) {
  if (!fields) {
    return;
  }

  fields.reduce(
    (discoveredFields, field) => {
      if (discoveredFields[field.name]) {
        throw ErrorWithCode.Factory.BadRequest(`Duplicate booking field name: ${field.name}`);
      }

      discoveredFields[field.name] = true;

      return discoveredFields;
    },
    {} as Record<string, true>
  );
}

export function ensureEmailOrPhoneNumberIsPresent(fields: EventTypeUpdateInput["bookingFields"]) {
  if (!fields || fields.length === 0) {
    return;
  }

  const attendeePhoneNumberField = fields.find((field) => field.name === "attendeePhoneNumber");
  const emailField = fields.find((field) => field.name === "email");

  if (emailField?.hidden && attendeePhoneNumberField?.hidden) {
    throw ErrorWithCode.Factory.BadRequest("booking_fields_email_and_phone_both_hidden");
  }
  if (!emailField?.required && !attendeePhoneNumberField?.required) {
    throw ErrorWithCode.Factory.BadRequest("booking_fields_email_or_phone_required");
  }
  if (emailField?.hidden && !attendeePhoneNumberField?.required) {
    throw ErrorWithCode.Factory.BadRequest("booking_fields_phone_required_when_email_hidden");
  }
  if (attendeePhoneNumberField?.hidden && !emailField?.required) {
    throw ErrorWithCode.Factory.BadRequest("booking_fields_email_required_when_phone_hidden");
  }
}
