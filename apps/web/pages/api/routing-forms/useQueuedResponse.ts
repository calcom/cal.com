import { z, ZodError } from "zod";

import { onSubmissionOfFormResponse } from "@calcom/app-store/routing-forms/lib/formSubmissionUtils";
import { getResponseToStore } from "@calcom/app-store/routing-forms/lib/getResponseToStore";
import { getSerializableForm } from "@calcom/app-store/routing-forms/lib/getSerializableForm";
import logger from "@calcom/lib/logger";
import { safeStringify } from "@calcom/lib/safeStringify";
import { defaultHandler } from "@calcom/lib/server/defaultHandler";
import { defaultResponder } from "@calcom/lib/server/defaultResponder";
import { RoutingFormResponseRepository } from "@calcom/lib/server/repository/formResponse";

const useQueuedResponseSchema = z.object({
  queuedFormResponseId: z.string(),
  params: z.record(z.string(), z.string().or(z.array(z.string()))),
});

const useQueuedResponseHandler = async ({
  queuedFormResponseId,
  params,
}: {
  queuedFormResponseId: string;
  params: Record<string, string | string[]>;
}) => {
  // Get the queued response
  const queuedFormResponse = await RoutingFormResponseRepository.getQueuedFormResponseFromId(
    queuedFormResponseId
  );

  if (!queuedFormResponse) {
    return {
      formResponseId: null,
      message: "Already processed",
    };
  }

  const serializableForm = await getSerializableForm({
    form: queuedFormResponse.form,
  });

  if (!serializableForm.fields) {
    throw new Error("Form has no fields");
  }

  const response = getResponseToStore({
    formFields: serializableForm.fields,
    fieldsResponses: params,
  });

  const formResponse = await RoutingFormResponseRepository.recordFormResponse({
    formId: queuedFormResponse.formId,
    queuedFormResponseId: queuedFormResponse.id,
    // We record new response here as that might be different from the queued response depending on if the user changed something in b/w before clicking CTA and that something wasn't prerendered
    response,
    // We use the queuedFormResponse's chosenRouteId because that is what decided routed team members
    chosenRouteId: queuedFormResponse.chosenRouteId,
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
  POST: Promise.resolve({
    default: defaultResponder(async (req, res) => {
      try {
        const { params, queuedFormResponseId } = useQueuedResponseSchema.parse(JSON.parse(req.body));
        const result = await useQueuedResponseHandler({
          queuedFormResponseId,
          params,
        });

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
