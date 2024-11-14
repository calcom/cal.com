import type { ServerResponse } from "http";
import type { NextApiResponse } from "next";

import { getUrlSearchParamsToForwardForTestPreview } from "@calcom/app-store/routing-forms/pages/routing-link/getUrlSearchParamsToForward";
import { entityPrismaWhereClause } from "@calcom/lib/entityPermissionUtils";
import { fromEntriesWithDuplicateKeys } from "@calcom/lib/fromEntriesWithDuplicateKeys";
import { DistributionMethod, getOrderedListOfLuckyUsers } from "@calcom/lib/server/getLuckyUser";
import { EventTypeRepository } from "@calcom/lib/server/repository/eventType";
import { UserRepository } from "@calcom/lib/server/repository/user";
import type { PrismaClient } from "@calcom/prisma";
import { findTeamMembersMatchingAttributeLogicOfRoute } from "@calcom/routing-forms/lib/findTeamMembersMatchingAttributeLogicOfRoute";
import { getSerializableForm } from "@calcom/routing-forms/lib/getSerializableForm";
import isRouter from "@calcom/routing-forms/lib/isRouter";
import { RouteActionType } from "@calcom/routing-forms/zod";
import { TRPCError } from "@calcom/trpc/server";
import type { TrpcSessionUser } from "@calcom/trpc/server/trpc";

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
  const { getTeamMemberEmailForResponseOrContactUsingUrlQuery } = await import(
    "@calcom/web/lib/getTeamMemberEmailFromCrm"
  );

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

  if (!serializableForm.fields) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Form fields not found",
    });
  }

  if (!route) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Route not found",
    });
  }

  if (isRouter(route)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "This route is a global router which is not supported",
    });
  }

  if (route.action.type !== RouteActionType.EventTypeRedirectUrl) {
    return {
      troubleshooter: null,
      result: null,
      contactOwnerEmail: null,
      checkedFallback: false,
      mainWarnings: [],
      fallbackWarnings: [],
    };
  }

  if (!route.action.eventTypeId) {
    // If it ever happens, should automatically be fixed by saving the form again from route-builder.
    // Legacy route actions do not have eventTypeId.
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "The route action is missing eventTypeId.",
    });
  }

  const eventType = await EventTypeRepository.findByIdIncludeHosts({ id: route.action.eventTypeId });

  if (!eventType) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Event type not found",
    });
  }

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

  const urlSearchParams = getUrlSearchParamsToForwardForTestPreview({
    formResponse: response,
    fields: serializableForm.fields,
    attributeRoutingConfig: route.attributeRoutingConfig ?? null,
    teamMembersMatchingAttributeLogic: matchingTeamMembersWithResult
      ? matchingTeamMembersWithResult.map((member) => member.userId)
      : [],
  });

  const contactOwnerEmail = await getTeamMemberEmailForResponseOrContactUsingUrlQuery({
    query: fromEntriesWithDuplicateKeys(urlSearchParams.entries()),
    eventTypeId: eventType.id,
    eventData: eventType,
    chosenRoute: route,
  });

  if (!matchingTeamMembersWithResult) {
    return {
      contactOwnerEmail,
      troubleshooter,
      checkedFallback,
      mainWarnings,
      fallbackWarnings,
      result: null,
    };
  }

  const matchingTeamMembersIds = matchingTeamMembersWithResult.map((member) => member.userId);
  const matchingTeamMembers = await UserRepository.findByIds({ ids: matchingTeamMembersIds });
  const matchingHosts = eventType.hosts.filter((host) => matchingTeamMembersIds.includes(host.user.id));

  if (matchingTeamMembers.length !== matchingHosts.length) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Looks like not all matching team members are assigned to the event",
    });
  }

  console.log("_enablePerf, _concurrency", _enablePerf, _concurrency);
  if (_enablePerf) {
    const serverTimingHeader = getServerTimingHeader(teamMembersMatchingAttributeLogicTimeTaken);
    ctx.res?.setHeader("Server-Timing", serverTimingHeader);
    console.log("Server-Timing", serverTimingHeader);
  }
  const { users: orderedLuckyUsers, perUserData } = matchingTeamMembers.length
    ? await getOrderedListOfLuckyUsers(DistributionMethod.PRIORITIZE_AVAILABILITY, {
        // Assuming all are available
        availableUsers: [matchingTeamMembers[0], ...matchingTeamMembers.slice(1)],
        eventType: {
          id: eventType.id,
          isRRWeightsEnabled: eventType.isRRWeightsEnabled,
        },
        allRRHosts: matchingHosts,
      })
    : { users: [], perUserData: null };

  return {
    troubleshooter,
    contactOwnerEmail,
    checkedFallback,
    mainWarnings,
    fallbackWarnings,
    result: {
      users: orderedLuckyUsers.map((user) => ({
        id: user.id,
        name: user.name,
        email: user.email,
      })),
      perUserData,
    },
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
