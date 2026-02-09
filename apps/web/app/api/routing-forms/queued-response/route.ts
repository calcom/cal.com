import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { z, ZodError } from "zod";

import { onSubmissionOfFormResponse } from "@calcom/app-store/routing-forms/lib/formSubmissionUtils";
import { getResponseToStore } from "@calcom/app-store/routing-forms/lib/getResponseToStore";
import { getSerializableForm } from "@calcom/app-store/routing-forms/lib/getSerializableForm";
import { PrismaPendingRoutingTraceRepository } from "@calcom/features/routing-trace/repositories/PrismaPendingRoutingTraceRepository";
import logger from "@calcom/lib/logger";
import { safeStringify } from "@calcom/lib/safeStringify";
import { RoutingFormResponseRepository } from "@calcom/lib/server/repository/formResponse";
import prisma from "@calcom/prisma";

import { defaultResponderForAppDir } from "../../defaultResponderForAppDir";

const queuedResponseSchema = z.object({
  queuedFormResponseId: z.string(),
  params: z.record(z.string(), z.string().or(z.array(z.string()))),
});

export const queuedResponseHandler = async ({
  queuedFormResponseId,
  params,
}: {
  queuedFormResponseId: string;
  params: Record<string, string | string[]>;
}) => {
  const formResponseRepo = new RoutingFormResponseRepository(prisma);

  // Get the queued response
  const queuedFormResponse = await formResponseRepo.getQueuedFormResponseFromId(queuedFormResponseId);

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

  const formResponse = await formResponseRepo.recordFormResponse({
    formId: queuedFormResponse.formId,
    queuedFormResponseId: queuedFormResponse.id,
    // We record new response here as that might be different from the queued response depending on if the user changed something in b/w before clicking CTA and that something wasn't prerendered
    response,
    // We use the queuedFormResponse's chosenRouteId because that is what decided routed team members
    chosenRouteId: queuedFormResponse.chosenRouteId,
  });

  // Link the pending routing trace to the new formResponseId so it can be found when booking is created
  try {
    const pendingTraceRepo = new PrismaPendingRoutingTraceRepository(prisma);
    await pendingTraceRepo.linkToFormResponse({
      queuedFormResponseId: queuedFormResponse.id,
      formResponseId: formResponse.id,
    });
  } catch (error) {
    // Log but don't fail - trace linking is not critical
    logger.warn("Failed to link pending routing trace to form response", safeStringify(error));
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

export const handler = async (req: NextRequest) => {
  try {
    const body = await req.json();
    const { params, queuedFormResponseId } = queuedResponseSchema.parse(body);
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
};

export const POST = defaultResponderForAppDir(handler);
