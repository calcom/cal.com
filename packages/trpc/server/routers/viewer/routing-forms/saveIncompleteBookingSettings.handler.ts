import incompleteBookingActionDataSchemas from "@calcom/app-store/routing-forms/lib/incompleteBooking/actionDataSchemas";
import logger from "@calcom/lib/logger";
import type { PrismaClient } from "@calcom/prisma";
import type { TrpcSessionUser } from "@calcom/trpc/server/types";

import { TRPCError } from "@trpc/server";

import type { TSaveIncompleteBookingSettingsInputSchema } from "./saveIncompleteBookingSettings.schema";

const log = logger.getSubLogger({ prefix: ["incomplete-booking"] });

interface SaveIncompleteBookingSettingsOptions {
  ctx: {
    prisma: PrismaClient;
    user: NonNullable<TrpcSessionUser>;
  };
  input: TSaveIncompleteBookingSettingsInputSchema;
}

const saveIncompleteBookingSettingsHandler = async (options: SaveIncompleteBookingSettingsOptions) => {
  const {
    ctx: { prisma },
    input,
  } = options;

  const { formId, actionType, data } = input;

  const dataSchema = incompleteBookingActionDataSchemas[actionType];

  if (!dataSchema) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Action data schema not found",
    });
  }

  const parsedData = dataSchema.safeParse(data);

  if (!parsedData.success) {
    log.error("Data is not valid", data, parsedData.error);
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Data is not valid",
    });
  }

  // Check to see if the action already exists
  const existingAction = await prisma.app_RoutingForms_IncompleteBookingActions.findFirst({
    where: {
      formId: formId,
      actionType: actionType,
    },
  });

  if (existingAction) {
    await prisma.app_RoutingForms_IncompleteBookingActions.update({
      where: {
        id: existingAction.id,
      },
      data: {
        data: parsedData.data,
        enabled: input.enabled,
        credentialId: input?.credentialId,
      },
    });
  } else {
    await prisma.app_RoutingForms_IncompleteBookingActions.create({
      data: {
        formId: formId,
        actionType: actionType,
        data: parsedData.data,
        enabled: input.enabled,
        credentialId: input?.credentialId,
      },
    });
  }
};

export default saveIncompleteBookingSettingsHandler;
