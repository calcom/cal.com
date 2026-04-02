import { getSerializableForm } from "@calcom/app-store/routing-forms/lib/getSerializableForm";
import { handleResponse } from "@calcom/features/routing-forms/lib/handleResponse";
import { getRoutingTraceService } from "@calcom/features/routing-trace/di/RoutingTraceService.container";
import type { PrismaClient } from "@calcom/prisma";
import { TRPCError } from "@trpc/server";
import type { TResponseInputSchema } from "./response.schema";

interface ResponseHandlerOptions {
  ctx: {
    prisma: PrismaClient;
  };
  input: TResponseInputSchema;
}
export const responseHandler = async ({ ctx, input }: ResponseHandlerOptions) => {
  const { prisma } = ctx;
  const { formId, response, formFillerId, chosenRouteId = null, isPreview = false } = input;
  const form = await prisma.app_RoutingForms_Form.findUnique({
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
          timeFormat: true,
          locale: true,
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

  // Initialize trace service for tracking routing decisions
  const traceService = isPreview ? undefined : getRoutingTraceService();

  const result = await handleResponse({
    response,
    identifierKeyedResponse: null,
    form: serializableForm,
    formFillerId,
    chosenRouteId,
    isPreview,
    traceService,
  });

  // Save the pending trace
  if (traceService) {
    const formResponseId = result.formResponse?.id;
    const queuedFormResponseId = result.queuedFormResponse?.id;

    if (formResponseId) {
      await traceService.savePendingRoutingTrace({ formResponseId });
    } else if (queuedFormResponseId) {
      await traceService.savePendingRoutingTrace({ queuedFormResponseId });
    }
  }

  return result;
};

export default responseHandler;
