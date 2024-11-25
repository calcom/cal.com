/**
 * This route is used only by "Test Preview" button
 * Live mode uses findTeamMembersMatchingAttributeLogicOfRoute fn directly
 */
import type { App_RoutingForms_Form } from "@prisma/client";
import type { ServerResponse } from "http";
import type { NextApiResponse } from "next";

import { enrichFormWithMigrationData } from "@calcom/app-store/routing-forms/enrichFormWithMigrationData";
import { getUrlSearchParamsToForwardForTestPreview } from "@calcom/app-store/routing-forms/pages/routing-link/getUrlSearchParamsToForward";
import { entityPrismaWhereClause } from "@calcom/lib/entityPermissionUtils";
import { fromEntriesWithDuplicateKeys } from "@calcom/lib/fromEntriesWithDuplicateKeys";
import { findTeamMembersMatchingAttributeLogic } from "@calcom/lib/raqb/findTeamMembersMatchingAttributeLogic";
import { getOrderedListOfLuckyUsers } from "@calcom/lib/server/getLuckyUser";
import { EventTypeRepository } from "@calcom/lib/server/repository/eventType";
import { UserRepository } from "@calcom/lib/server/repository/user";
import type { PrismaClient } from "@calcom/prisma";
import { getAbsoluteEventTypeRedirectUrl } from "@calcom/routing-forms/getEventTypeRedirectUrl";
import { getSerializableForm } from "@calcom/routing-forms/lib/getSerializableForm";
import isRouter from "@calcom/routing-forms/lib/isRouter";
import { RouteActionType } from "@calcom/routing-forms/zod";
import { TRPCError } from "@calcom/trpc/server";
import type { TrpcSessionUser } from "@calcom/trpc/server/trpc";

import type { TFindTeamMembersMatchingAttributeLogicOfRouteInputSchema } from "./findTeamMembersMatchingAttributeLogicOfRoute.schema";

interface FindTeamMembersMatchingAttributeLogicOfRouteHandlerOptions {
  ctx: {
    prisma: PrismaClient;
    user: NonNullable<TrpcSessionUser>;
    res: ServerResponse | NextApiResponse | undefined;
  };
  input: TFindTeamMembersMatchingAttributeLogicOfRouteInputSchema;
}

async function getEnrichedSerializableForm<
  TForm extends App_RoutingForms_Form & {
    user: {
      id: number;
      username: string | null;
      movedToProfileId: number | null;
    };
    team: {
      parent: {
        slug: string | null;
      } | null;
      metadata: unknown;
    } | null;
  }
>(form: TForm) {
  const formWithUserInfoProfile = {
    ...form,
    user: await UserRepository.enrichUserWithItsProfile({ user: form.user }),
  };

  const serializableForm = await getSerializableForm({
    form: enrichFormWithMigrationData(formWithUserInfoProfile),
  });

  return serializableForm;
}

export const findTeamMembersMatchingAttributeLogicOfRouteHandler = async ({
  ctx,
  input,
}: FindTeamMembersMatchingAttributeLogicOfRouteHandlerOptions) => {
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
    include: {
      team: {
        select: {
          parentId: true,
          parent: {
            select: {
              slug: true,
            },
          },
          metadata: true,
        },
      },
      user: {
        select: {
          id: true,
          username: true,
          movedToProfileId: true,
        },
      },
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

  const beforeEnrichedForm = performance.now();
  const serializableForm = await getEnrichedSerializableForm(form);
  const afterEnrichedForm = performance.now();
  const timeTakenToEnrichForm = afterEnrichedForm - beforeEnrichedForm;

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
      eventTypeRedirectUrl: null,
      isUsingAttributeWeights: false,
    };
  }

  const eventTypeId = route.action.eventTypeId;
  // e.g. /team/abc/team-event-type
  const eventTypeRedirectPath = route.action.value;

  if (!eventTypeId) {
    // If it ever happens, should automatically be fixed by saving the form again from route-builder.
    // Legacy route actions do not have eventTypeId.
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "The route action is missing eventTypeId.",
    });
  }

  const eventType = await EventTypeRepository.findByIdIncludeHostsAndTeam({ id: eventTypeId });

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
  } = await findTeamMembersMatchingAttributeLogic(
    {
      dynamicFieldValueOperands: {
        response,
        fields: serializableForm.fields || [],
      },
      attributesQueryValue: route.attributesQueryValue ?? null,
      fallbackAttributesQueryValue: route.fallbackAttributesQueryValue ?? null,
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

  const urlSearchParamsToForward = getUrlSearchParamsToForwardForTestPreview({
    formResponse: response,
    fields: serializableForm.fields,
    attributeRoutingConfig: route.attributeRoutingConfig ?? null,
    teamMembersMatchingAttributeLogic: matchingTeamMembersWithResult
      ? matchingTeamMembersWithResult.map((member) => member.userId)
      : [],
  });

  const eventTypeRedirectUrl = getAbsoluteEventTypeRedirectUrl({
    eventTypeRedirectUrl: eventTypeRedirectPath,
    form: serializableForm,
    allURLSearchParams: urlSearchParamsToForward,
  });

  const timeBeforeCrm = performance.now();
  const { email: contactOwnerEmail } = await getTeamMemberEmailForResponseOrContactUsingUrlQuery({
    query: fromEntriesWithDuplicateKeys(urlSearchParamsToForward.entries()),
    eventData: eventType,
    chosenRoute: route,
  });
  const timeAfterCrm = performance.now();

  const timeTaken: Record<string, number | null | undefined> = {
    ...teamMembersMatchingAttributeLogicTimeTaken,
    crm: timeAfterCrm - timeBeforeCrm,
    enrichForm: timeTakenToEnrichForm,
  };

  if (!matchingTeamMembersWithResult) {
    return {
      contactOwnerEmail,
      troubleshooter,
      checkedFallback,
      mainWarnings,
      fallbackWarnings,
      eventTypeRedirectUrl,
      isUsingAttributeWeights: false,
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

  const timeBeforeGetOrderedLuckyUsers = performance.now();
  const {
    users: orderedLuckyUsers,
    perUserData,
    isUsingAttributeWeights,
  } = matchingTeamMembers.length
    ? await getOrderedListOfLuckyUsers({
        // Assuming all are available
        availableUsers: [
          {
            ...matchingHosts[0].user,
            weight: matchingHosts[0].weight,
            priority: matchingHosts[0].priority,
          },
          ...matchingHosts.slice(1).map((host) => ({
            ...host.user,
            weight: host.weight,
            priority: host.priority,
          })),
        ],
        eventType,
        allRRHosts: matchingHosts,
        routingFormResponse: {
          response,
          form,
          chosenRouteId: route.id,
        },
      })
    : { users: [], perUserData: null, isUsingAttributeWeights: false };
  const timeAfterGetOrderedLuckyUsers = performance.now();
  timeTaken.getOrderedLuckyUsers = timeAfterGetOrderedLuckyUsers - timeBeforeGetOrderedLuckyUsers;

  console.log("_enablePerf, _concurrency", _enablePerf, _concurrency);
  if (_enablePerf) {
    const serverTimingHeader = getServerTimingHeader(timeTaken);
    ctx.res?.setHeader("Server-Timing", serverTimingHeader);
    console.log("Server-Timing", serverTimingHeader);
  }

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
    isUsingAttributeWeights,
    eventTypeRedirectUrl,
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

export default findTeamMembersMatchingAttributeLogicOfRouteHandler;
