/**
 * This route is used only by "Test Preview" button and Virtual Queues
 * Also, it is applicable only for sub-teams. Regular teams and user Routing Forms don't hit this endpoint.
 * Live mode uses findTeamMembersMatchingAttributeLogicOfRoute fn directly
 */
import type { ServerResponse } from "http";
import type { NextApiResponse } from "next";

import { enrichHostsWithDelegationCredentials } from "@calcom/app-store/delegationCredential";
import { enrichFormWithMigrationData } from "@calcom/app-store/routing-forms/enrichFormWithMigrationData";
import { getLuckyUserService } from "@calcom/features/di/containers/LuckyUser";
import { getUrlSearchParamsToForwardForTestPreview } from "@calcom/features/routing-forms/lib/getUrlSearchParamsToForward";
import { entityPrismaWhereClause } from "@calcom/lib/entityPermissionUtils.server";
import { fromEntriesWithDuplicateKeys } from "@calcom/lib/fromEntriesWithDuplicateKeys";
import { findTeamMembersMatchingAttributeLogic } from "@calcom/app-store/_utils/raqb/findTeamMembersMatchingAttributeLogic";
import { EventTypeRepository } from "@calcom/features/eventtypes/repositories/eventTypeRepository";
import { UserRepository } from "@calcom/features/users/repositories/UserRepository";
import type { PrismaClient } from "@calcom/prisma";
import type { App_RoutingForms_Form } from "@calcom/prisma/client";
import { getAbsoluteEventTypeRedirectUrl } from "@calcom/routing-forms/getEventTypeRedirectUrl";
import { getSerializableForm } from "@calcom/routing-forms/lib/getSerializableForm";
import { getServerTimingHeader } from "@calcom/routing-forms/lib/getServerTimingHeader";
import isRouter from "@calcom/routing-forms/lib/isRouter";
import { RouteActionType } from "@calcom/routing-forms/zod";
import type { TrpcSessionUser } from "@calcom/trpc/server/types";

import { TRPCError } from "@trpc/server";

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
>({ form, prisma }: { prisma: PrismaClient; form: TForm }) {
  const formWithUserInfoProfile = {
    ...form,
    user: await new UserRepository(prisma).enrichUserWithItsProfile({ user: form.user }),
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
    "@calcom/features/ee/teams/lib/getTeamMemberEmailFromCrm"
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

  const formOrgId = form.team?.parentId;
  if (!formOrgId) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "This form is not associated with an organization",
    });
  }

  const beforeEnrichedForm = performance.now();
  const serializableForm = await getEnrichedSerializableForm({ form, prisma });
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

  const eventTypeRepo = new EventTypeRepository(prisma);
  const eventType = await eventTypeRepo.findByIdIncludeHostsAndTeam({ id: eventTypeId });

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
      orgId: formOrgId,
      isPreview: !!isPreview,
    },
    {
      enablePerf: _enablePerf,
      // Reuse same flag for enabling troubleshooter. We would normally use them together
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
  const matchingHosts = await enrichHostsWithDelegationCredentials({
    orgId: formOrgId,
    hosts: eventType.hosts.filter((host) => matchingTeamMembersIds.includes(host.user.id)),
  });

  if (!matchingHosts.length) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "No matching team members found",
    });
  }

  const timeBeforeGetOrderedLuckyUsers = performance.now();
  const luckyUserService = getLuckyUserService();
  const {
    users: orderedLuckyUsers,
    perUserData,
    isUsingAttributeWeights,
  } = matchingHosts.length
    ? await luckyUserService.getOrderedListOfLuckyUsers({
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
        // During Preview testing we could consider the current time itself as the meeting start time
        meetingStartTime: new Date(),
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

export default findTeamMembersMatchingAttributeLogicOfRouteHandler;
