import { z, ZodError } from "zod";

import { onSubmissionOfFormResponse } from "@calcom/app-store/routing-forms/lib/formSubmissionUtils";
import { getSerializableForm } from "@calcom/app-store/routing-forms/lib/getSerializableForm";
import logger from "@calcom/lib/logger";
import { safeStringify } from "@calcom/lib/safeStringify";
import { defaultHandler } from "@calcom/lib/server/defaultHandler";
import { defaultResponder } from "@calcom/lib/server/defaultResponder";
import { RoutingFormResponseRepository } from "@calcom/lib/server/repository/formResponse";
import { prisma } from "@calcom/prisma";

const useQueuedResponseSchema = z.object({
  queuedFormResponseId: z.string(),
});

const useQueuedResponseHandler = async ({ queuedFormResponseId }: { queuedFormResponseId: string }) => {
  // Get the queued response
  const queuedFormResponse = await prisma.app_RoutingForms_QueuedFormResponse.findUnique({
    where: {
      id: queuedFormResponseId,
    },
    include: {
      form: {
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
      },
    },
  });

  if (!queuedFormResponse) {
    return {
      formResponseId: null,
      message: "Already processed",
    };
  }

  const serializableForm = await getSerializableForm({
    form: queuedFormResponse.form,
  });

  const formResponse = await RoutingFormResponseRepository.writeQueuedFormResponseToFormResponse({
    queuedFormResponseId,
    createdAt: new Date(),
  });

  if (!formResponse) {
    logger.error("Failed to write queued response to form response");
    throw new Error("Failed to write queued response to form response");
  }

  const chosenRoute = serializableForm.routes?.find((r) => r.id === queuedFormResponse.chosenRouteId);
  await onSubmissionOfFormResponse({
    form: serializableForm,
    formResponseInDb: formResponse,
    chosenRouteAction: chosenRoute ? ("action" in chosenRoute ? chosenRoute.action : null) : null,
  });

  return {
    formResponseId: formResponse.id,
    message: "Processed",
  };
};

export default defaultHandler({
  GET: Promise.resolve({
    default: defaultResponder(async (req, res) => {
      try {
        const input = useQueuedResponseSchema.parse(req.query);
        const result = await useQueuedResponseHandler({ queuedFormResponseId: input.queuedFormResponseId });

        return res.status(200).json({ status: "success", data: result });
      } catch (error) {
        if (error instanceof ZodError) {
          logger.error("Invalid input", safeStringify(error));
          return res.status(400).json({
            status: "error",
            data: { message: "Invalid input" },
          });
        }

        logger.error("Error in useQueuedResponseHandler", safeStringify(error));

        return res.status(500).json({
          status: "error",
          data: { message: "Internal server error" },
        });
      }
    }),
  }),
});
