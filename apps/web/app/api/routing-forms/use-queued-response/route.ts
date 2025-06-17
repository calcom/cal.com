import { defaultResponderForAppDir } from "app/api/defaultResponderForAppDir";
import { NextResponse } from "next/server";
import { z, ZodError } from "zod";

import { onSubmissionOfFormResponse } from "@calcom/app-store/routing-forms/lib/formSubmissionUtils";
import { getResponseToStore } from "@calcom/app-store/routing-forms/lib/getResponseToStore";
import { getSerializableForm } from "@calcom/app-store/routing-forms/lib/getSerializableForm";
import logger from "@calcom/lib/logger";
import { safeStringify } from "@calcom/lib/safeStringify";
import { RoutingFormResponseRepository } from "@calcom/lib/server/repository/formResponse";

const useQueuedResponseSchema = z.object({
  queuedFormResponseId: z.string(),
  params: z.record(z.string(), z.string().or(z.array(z.string()))),
});

const queuedResponseHandler = async ({
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
    form: {
      ...queuedFormResponse.form,
      ...serializableForm,
    },
    formResponseInDb: formResponse,
    chosenRouteAction: chosenRoute ? ("action" in chosenRoute ? chosenRoute.action : null) : null,
  });

  return {
    formResponseId: formResponse.id,
    message: "Processed",
  };
};

async function handler(req: Request) {
  try {
    const body = await req.json();
    const { params, queuedFormResponseId } = useQueuedResponseSchema.parse(body);
    const result = await queuedResponseHandler({
      queuedFormResponseId,
      params,
    });

    return NextResponse.json({ status: "success", data: result });
  } catch (error) {
    if (error instanceof ZodError) {
      logger.error("Invalid input", safeStringify(error));
      return NextResponse.json(
        {
          status: "error",
          message: "Invalid input",
        },
        { status: 400 }
      );
    }

    logger.error("Error in queuedResponseHandler", safeStringify(error));

    return NextResponse.json(
      {
        status: "error",
        message: "Internal server error",
      },
      { status: 500 }
    );
  }
}

export const POST = defaultResponderForAppDir(handler);
