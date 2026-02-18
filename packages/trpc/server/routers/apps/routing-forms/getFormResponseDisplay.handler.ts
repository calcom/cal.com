import type { z } from "zod";

import { getHumanReadableFieldResponseValue } from "@calcom/app-store/routing-forms/lib/responseData/getHumanReadableFieldResponseValue";
import { getFieldWithOptions } from "@calcom/app-store/routing-forms/lib/selectOptions";
import type { FormResponse } from "@calcom/app-store/routing-forms/types/types";
import { zodFields } from "@calcom/app-store/routing-forms/zod";
import { canAccessEntity } from "@calcom/features/pbac/lib/entityPermissionUtils.server";
import { PrismaRoutingFormResponseRepository } from "@calcom/features/routing-forms/repositories/PrismaRoutingFormResponseRepository";
import { getTranslation } from "@calcom/lib/server/i18n";
import type { TrpcSessionUser } from "@calcom/trpc/server/types";

import { TRPCError } from "@trpc/server";

import type { ZFormByResponseIdInputSchema } from "./getResponseWithFormFields.schema";

type GetFormResponseDisplayOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: z.infer<typeof ZFormByResponseIdInputSchema>;
};

async function getFormResponseDisplayHandler({ ctx, input }: GetFormResponseDisplayOptions) {
  const { user } = ctx;
  const { formResponseId } = input;
  const translate = await getTranslation(user.locale ?? "en", "common");

  const routingFormResponseRepository = new PrismaRoutingFormResponseRepository();
  const formResponse = await routingFormResponseRepository.findByIdIncludeForm(formResponseId);

  if (!formResponse) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: translate("form_response_not_found"),
    });
  }

  const form = formResponse.form;

  if (!(await canAccessEntity({ userId: form.userId, teamId: form.teamId }, user.id))) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: translate("you_dont_have_access_to_view_this_form_response"),
    });
  }

  const fieldsParsed = zodFields.safeParse(form.fields);
  if (!fieldsParsed.success) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Error parsing form fields",
    });
  }

  const fields = (fieldsParsed.data ?? []).filter((f) => !f.deleted);
  const response = formResponse.response as FormResponse;

  const responses = fields
    .map((field) => {
      const fieldResponse = response[field.id];
      if (!fieldResponse) return null;

      const fieldWithOptions = getFieldWithOptions(field);
      const humanReadableValue = getHumanReadableFieldResponseValue({
        field: fieldWithOptions,
        value: fieldResponse.value,
      });
      const displayValue = Array.isArray(humanReadableValue)
        ? humanReadableValue.join(", ")
        : humanReadableValue;

      return {
        fieldId: field.id,
        label: field.label,
        displayValue,
      };
    })
    .filter((item): item is NonNullable<typeof item> => item !== null);

  return {
    form: {
      name: form.name,
      description: form.description,
    },
    responses,
  };
}

export default getFormResponseDisplayHandler;
