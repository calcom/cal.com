import type { App_RoutingForms_Form, User } from "@prisma/client";
import type { ServerResponse } from "http";
import type { NextApiResponse } from "next";
import { SerializableForm } from "../types/types";
import { z } from "zod";

import { entityPrismaWhereClause } from "@calcom/lib/entityPermissionUtils";
import { EventTypeRepository } from "@calcom/lib/server/repository/eventType";
import { UserRepository } from "@calcom/lib/server/repository/user";
import type { PrismaClient } from "@calcom/prisma";
import { entries } from "@calcom/prisma/zod-utils";
import { TRPCError } from "@calcom/trpc/server";
import type { TrpcSessionUser } from "@calcom/trpc/server/trpc";

import { getSerializableForm } from "../lib/getSerializableForm";
import isRouter from "../lib/isRouter";
import { RouteActionType, routingFormResponseInDbSchema } from "../zod";
import type { TFindTeamMembersMatchingAttributeLogicInputSchema } from "./findTeamMembersMatchingAttributeLogic.schema";
import { findTeamMembersMatchingAttributeLogicOfRoute } from "./utils";

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
  const { getOwnerEmailFromCrm } = await import("@calcom/web/lib/getOwnerEmailFromCrm");

  const { formId, response, routeId, isPreview, _enablePerf, _concurrency } = input;

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
  const route = serializableForm.routes?.find((route) => route.id === routeId);

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

  const eventType = await EventTypeRepository.findByIdMinimal({ id: route.action.eventTypeId });

  if (!eventType) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Event type not found",
    });
  }

  const emailIdentifierValueInResponse = getEmailIdentifierValueFromResponse({
    form: serializableForm,
    response,
  });
  
  const contactOwnerEmail = emailIdentifierValueInResponse
    ? await getOwnerEmailFromCrm(eventType, emailIdentifierValueInResponse)
    : null;

  const {
    teamMembersMatchingAttributeLogic: matchingTeamMembersWithResult,
    timeTaken: teamMembersMatchingAttributeLogicTimeTaken,
    troubleshooter,
  } = await findTeamMembersMatchingAttributeLogicOfRoute(
    {
      response,
      routeId,
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
      contactOwnerEmail,
      troubleshooter,
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
    contactOwnerEmail,
    result: matchingTeamMembers.map((user) => ({
      id: user.id,
      name: user.name,
      email: user.email,
    })),
  };
};

function getServerTimingHeader(timeTaken: {
  gAtr: number | null;
  gQryCnfg: number | null;
  gMbrWtAtr: number | null;
  lgcFrMbrs: number | null;
  gQryVal: number | null;
}) {
  const headerParts = Object.entries(timeTaken)
    .map(([key, value]) => {
      if (value !== null) {
        return `${key};dur=${value}`;
      }
      return null;
    })
    .filter(Boolean);

  return headerParts.join(", ");
}

export default findTeamMembersMatchingAttributeLogicHandler;

function getResponseByIdentifier({
  form,
  response,
  identifier,
}: {
  form: Pick<SerializableForm<App_RoutingForms_Form>, "routes" | "fields">;
  response: z.infer<typeof routingFormResponseInDbSchema>;
  identifier: string;
}) {
  if (!form.fields) {
    return null;
  }
  const fields = form.fields;
  const fieldsResponseByIdentifier = entries(response).map(([formFieldId, value]) => {
    const field = fields.find((field) => field.id === formFieldId);
    if (!field) {
      return [formFieldId, value.value];
    }
    return [field.identifier, value.value];
  });

  const responseForField = fieldsResponseByIdentifier.find(
    ([fieldIdentifierInResponse, value]) => fieldIdentifierInResponse === identifier
  );

  if (!responseForField) {
    return null;
  }

  return responseForField[1] ?? null;
}


function getEmailIdentifierValueFromResponse({
  form,
  response,
}: {
  form: Pick<SerializableForm<App_RoutingForms_Form>, "routes" | "fields">;
  response: z.infer<typeof routingFormResponseInDbSchema>;
}) {
  const emailValue = getResponseByIdentifier({ form, response, identifier: "email" });
  if (!emailValue) {
    return null;
  }
  if (emailValue instanceof Array) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: '"email" field must not be an array',
    });
  }
  if (typeof emailValue === "number") {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: '"email" field must not be a number',
    });
  }
  return emailValue;
}
