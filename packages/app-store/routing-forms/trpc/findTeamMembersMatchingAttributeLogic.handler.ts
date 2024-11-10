import type { ServerResponse } from "http";
import type { NextApiResponse } from "next";

import { entityPrismaWhereClause } from "@calcom/lib/entityPermissionUtils";
import { UserRepository } from "@calcom/lib/server/repository/user";
import type { PrismaClient } from "@calcom/prisma";
import { TRPCError } from "@calcom/trpc/server";
import type { TrpcSessionUser } from "@calcom/trpc/server/trpc";

import { findTeamMembersMatchingAttributeLogicOfRoute } from "../lib/findTeamMembersMatchingAttributeLogicOfRoute";
import { getSerializableForm } from "../lib/getSerializableForm";
import type { TFindTeamMembersMatchingAttributeLogicInputSchema } from "./findTeamMembersMatchingAttributeLogic.schema";

interface FindTeamMembersMatchingAttributeLogicHandlerOptions {
  ctx: {
    prisma: PrismaClient;
    user: NonNullable<TrpcSessionUser>;
    res: ServerResponse | NextApiResponse | undefined;
  };
  input: TFindTeamMembersMatchingAttributeLogicInputSchema;
}

export const findTeamMembersMatchingAttributeLogicHandler = async ({
  ctx,
  input,
}: FindTeamMembersMatchingAttributeLogicHandlerOptions) => {
  const { prisma, user } = ctx;
  const { formId, response, route, isPreview, _enablePerf, _concurrency } = input;

  const form = await prisma.app_RoutingForms_Form.findFirst({
    where: {
      id: formId,
      ...entityPrismaWhereClause({ userId: user.id }),
    },
  });

  if (!form) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Form not found",
    });
  }

  if (!form.teamId) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "This form is not associated with a team",
    });
  }

  const serializableForm = await getSerializableForm({ form });

  const {
    teamMembersMatchingAttributeLogic: matchingTeamMembersWithResult,
    timeTaken: teamMembersMatchingAttributeLogicTimeTaken,
    troubleshooter,
    checkedFallback,
    mainAttributeLogicBuildingWarnings: mainWarnings,
    fallbackAttributeLogicBuildingWarnings: fallbackWarnings,
  } = await findTeamMembersMatchingAttributeLogicOfRoute(
    {
      response,
      route,
      form: serializableForm,
      teamId: form.teamId,
      isPreview: !!isPreview,
    },
    {
      enablePerf: _enablePerf,
      // Reuse same flag for enabling troubleshooter. We would normall use them together
      enableTroubleshooter: _enablePerf,
      concurrency: _concurrency,
    }
  );

  if (!matchingTeamMembersWithResult) {
    return {
      troubleshooter,
      checkedFallback,
      mainWarnings,
      fallbackWarnings,
      result: null,
    };
  }
  const matchingTeamMembersIds = matchingTeamMembersWithResult.map((member) => member.userId);
  const matchingTeamMembers = await UserRepository.findByIds({ ids: matchingTeamMembersIds });

  console.log("_enablePerf, _concurrency", _enablePerf, _concurrency);
  if (_enablePerf) {
    const serverTimingHeader = getServerTimingHeader(teamMembersMatchingAttributeLogicTimeTaken);
    ctx.res?.setHeader("Server-Timing", serverTimingHeader);
    console.log("Server-Timing", serverTimingHeader);
  }

  return {
    troubleshooter,
    checkedFallback,
    mainWarnings,
    fallbackWarnings,
    result: matchingTeamMembers.map((user) => ({
      id: user.id,
      name: user.name,
      email: user.email,
    })),
  };
};

function getServerTimingHeader(timeTaken: Record<string, number | null | undefined>) {
  const headerParts = Object.entries(timeTaken)
    .map(([key, value]) => {
      if (value !== null && value !== undefined) {
        return `${key};dur=${value}`;
      }
      return null;
    })
    .filter(Boolean);

  return headerParts.join(", ");
}

export default findTeamMembersMatchingAttributeLogicHandler;
