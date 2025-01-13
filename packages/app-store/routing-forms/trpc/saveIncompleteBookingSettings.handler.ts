import type { PrismaClient } from "@calcom/prisma";
import { TRPCError } from "@calcom/trpc/server";
import type { TrpcSessionUser } from "@calcom/trpc/server/trpc";

import incompleteBookingActionDataSchemas from "../lib/incompleteBooking/actionDataSchemas";
import type { TSaveIncompleteBookingSettingsInputSchema } from "./saveIncompleteBookingSettings.schema";

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
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Data is not valid",
    });
  }

  // Check to see if the action already exists
  const existingAction = await prisma.app_RoutingForms_IncompleteBooking_Actions.findFirst({
    where: {
      formId: formId,
      actionType: actionType,
    },
  });

  if (existingAction) {
    await prisma.app_RoutingForms_IncompleteBooking_Actions.update({
      where: {
        id: existingAction.id,
      },
      data: {
        data: parsedData.data,
        enabled: input.enabled,
      },
    });
  } else {
    await prisma.app_RoutingForms_IncompleteBooking_Actions.create({
      data: {
        formId: formId,
        actionType: actionType,
        data: parsedData.data,
        enabled: input.enabled,
      },
    });
  }
};

export default saveIncompleteBookingSettingsHandler;
