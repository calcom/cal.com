import { enabledIncompleteBookingApps } from "@calcom/app-store/routing-forms/lib/enabledIncompleteBookingApps";
import type { PrismaClient } from "@calcom/prisma";
import { safeCredentialSelect } from "@calcom/prisma/selects/credential";
import { entityPrismaWhereClause } from "@calcom/features/pbac/lib/entityPermissionUtils.server";
import type { TrpcSessionUser } from "@calcom/trpc/server/types";

import { TRPCError } from "@trpc/server";

import type { TGetIncompleteBookingSettingsInputSchema } from "./getIncompleteBookingSettings.schema";

interface GetIncompleteBookingSettingsOptions {
  ctx: {
    prisma: PrismaClient;
    user: NonNullable<TrpcSessionUser>;
  };
  input: TGetIncompleteBookingSettingsInputSchema;
}

const getInCompleteBookingSettingsHandler = async (options: GetIncompleteBookingSettingsOptions) => {
  const {
    ctx: { prisma, user },
    input,
  } = options;

  const { user: _, ...safeCredentialSelectWithoutUser } = safeCredentialSelect;
  const [incompleteBookingActions, form] = await Promise.all([
    prisma.app_RoutingForms_IncompleteBookingActions.findMany({
      where: {
        formId: input.formId,
      },
    }),
    prisma.app_RoutingForms_Form.findFirst({
      where: {
        AND: [
          entityPrismaWhereClause({ userId: user.id }),
          { id: input.formId },
        ],
      },
      select: {
        userId: true,
        teamId: true,
      },
    }),
  ]);

  if (!form) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Form not found",
    });
  }

  const teamId = form?.teamId;
  const userId = form.userId;

  if (teamId) {
    // Need to get the credentials for the team and org
    const orgQuery = await prisma.team.findUnique({
      where: {
        id: teamId,
      },
      select: {
        parentId: true,
      },
    });

    const credentials = await prisma.credential.findMany({
      where: {
        appId: {
          in: enabledIncompleteBookingApps,
        },
        teamId: {
          in: [teamId, ...(orgQuery?.parentId ? [orgQuery.parentId] : [])],
        },
      },
      select: {
        ...safeCredentialSelectWithoutUser,
        user: {
          select: {
            email: true,
            name: true,
          },
        },
        team: {
          select: {
            name: true,
          },
        },
      },
    });

    const sanitized = credentials.map((c) =>
      Object.fromEntries(Object.entries(c).filter(([k]) => k !== "key"))
    );

    return { incompleteBookingActions, credentials: sanitized };
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
      select: {
        ...safeCredentialSelect,
      },
    });

    const sanitized = credential
      ? (Object.fromEntries(Object.entries(credential).filter(([k]) => k !== "key")) as typeof credential)
      : null;

    return { incompleteBookingActions, credentials: sanitized ? [{ ...sanitized, team: null }] : [] };
  }
};

export default getInCompleteBookingSettingsHandler;
