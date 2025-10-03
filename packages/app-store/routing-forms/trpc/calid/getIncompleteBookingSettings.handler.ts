import type { PrismaClient } from "@calcom/prisma";
import { safeCredentialSelect } from "@calcom/prisma/selects/credential";
import type { TrpcSessionUser } from "@calcom/trpc/server/types";

import { TRPCError } from "@trpc/server";

import { enabledIncompleteBookingApps } from "../../lib/enabledIncompleteBookingApps";
import type { TCalIdGetIncompleteBookingSettingsInputSchema } from "./getIncompleteBookingSettings.schema";

interface CalIdGetIncompleteBookingSettingsOptions {
  ctx: {
    prisma: PrismaClient;
    user: NonNullable<TrpcSessionUser>;
  };
  input: TCalIdGetIncompleteBookingSettingsInputSchema;
}

const CalIdGetInCompleteBookingSettingsHandler = async (
  options: CalIdGetIncompleteBookingSettingsOptions
) => {
  const {
    ctx: { prisma },
    input,
  } = options;

  const { user: _, ...safeCredentialSelectWithoutUser } = safeCredentialSelect;
  const [incompleteBookingActions, form] = await Promise.all([
    prisma.app_RoutingForms_IncompleteBookingActions.findMany({
      where: {
        formId: input.formId,
      },
    }),
    prisma.app_RoutingForms_Form.findUnique({
      where: {
        id: input.formId,
      },
      select: {
        userId: true,
        calIdTeamId: true,
      },
    }),
  ]);

  if (!form) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Form not found",
    });
  }

  const calIdTeamId = form?.calIdTeamId;
  const userId = form.userId;

  if (calIdTeamId) {
    // Need to get the credentials for the calid team
    const credentials = await prisma.credential.findMany({
      where: {
        appId: {
          in: enabledIncompleteBookingApps,
        },
        calIdTeamId: calIdTeamId,
      },
      select: {
        ...safeCredentialSelectWithoutUser,
        user: {
          select: {
            email: true,
            name: true,
          },
        },
        calIdTeam: {
          select: {
            name: true,
          },
        },
      },
    });

    return { incompleteBookingActions, credentials };
  }

  if (userId) {
    // Assume that a user will have one credential per app
    const credential = await prisma.credential.findFirst({
      where: {
        appId: {
          in: enabledIncompleteBookingApps,
        },
        userId,
      },
    });

    return { incompleteBookingActions, credentials: credential ? [{ ...credential, calIdTeam: null }] : [] };
  }
};

export default CalIdGetInCompleteBookingSettingsHandler;
