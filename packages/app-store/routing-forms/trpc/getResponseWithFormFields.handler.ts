import type { z } from "zod";

import { canEditEntity } from "@calcom/lib/entityPermissionUtils";
import { prisma } from "@calcom/prisma";
import type { TrpcSessionUser } from "@calcom/trpc/server/trpc";

import { TRPCError } from "@trpc/server";

import { enrichFormWithMigrationData } from "../enrichFormWithMigrationData";
import { getResponseWithFormFields } from "../lib/getResponseWithFormFields";
import { getSerializableForm } from "../lib/getSerializableForm";
import type { FormResponse } from "../types/types";
import type { ZFormByResponseIdInputSchema } from "./_router";

type GetResponseWithFormFieldsOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: z.infer<typeof ZFormByResponseIdInputSchema>;
};

async function getResponseWithFormFieldsHandler({ ctx, input }: GetResponseWithFormFieldsOptions) {
  const { user } = ctx;
  const { formResponseId } = input;

  const { response, form } = await getResponseWithFormFields(formResponseId);

  if (!canEditEntity(form, user.id)) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "You don't have access to this form",
    });
  }

  return {
    response,
    form,
  };
}

export default getResponseWithFormFieldsHandler;
