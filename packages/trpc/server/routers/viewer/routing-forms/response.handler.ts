import { getSerializableForm } from "@calcom/app-store/routing-forms/lib/getSerializableForm";
import { handleResponse } from "@calcom/app-store/routing-forms/lib/handleResponse";
import type { PrismaClient } from "@calcom/prisma";
import { TRPCError } from "@calcom/trpc/server";

import type { TResponseInputSchema } from "./response.schema";

interface ResponseHandlerOptions {
  ctx: {
    prisma: PrismaClient;
  };
  input: TResponseInputSchema;
}
export const responseHandler = async ({ ctx, input }: ResponseHandlerOptions) => {
  const { prisma } = ctx;
  const { formId, response, formFillerId, chosenRouteId = null } = input;
  const form = await prisma.app_RoutingForms_Form.findFirst({
    where: {
      id: formId,
    },
    include: {
      team: {
        select: {
          parentId: true,
        },
      },
      user: {
        select: {
          id: true,
          email: true,
        },
      },
    },
  });

  if (!form) {
    throw new TRPCError({
      code: "NOT_FOUND",
    });
  }

  const serializableForm = await getSerializableForm({
    form,
  });

  return handleResponse({ response, form: serializableForm, formFillerId, chosenRouteId });
};

export default responseHandler;
