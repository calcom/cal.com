import { Prisma } from "@prisma/client";
import { z } from "zod";

import { emailSchema } from "@calcom/lib/emailSchema";
import logger from "@calcom/lib/logger";
import { safeStringify } from "@calcom/lib/safeStringify";
import type { PrismaClient } from "@calcom/prisma";
import { TRPCError } from "@calcom/trpc/server";

import { getSerializableForm } from "../lib/getSerializableForm";
import type { FormResponse, SerializableForm } from "../types/types";
import type { TResponseInputSchema } from "./response.schema";
import { onFormSubmission, findTeamMembersMatchingAttributeLogicOfRoute } from "./utils";

const moduleLogger = logger.getSubLogger({ prefix: ["routing-forms/trpc/response.handler"] });

interface ResponseHandlerOptions {
  ctx: {
    prisma: PrismaClient;
    serializableForm?: SerializableForm<{
      user: {
        id: number;
        email: string;
      };
      team: {
        parentId: number | null;
      } | null;
      name: string;
      id: string;
      userId: number;
      position: number;
      teamId: number;
      description: string | null;
      disabled: boolean;
    }>;
  };
  input: TResponseInputSchema;
}

const getSerializableFormById = async (formId: string, prisma: PrismaClient) => {
  const form = await prisma.app_RoutingForms_Form.findFirst({
    where: {
      id: formId,
    },
    include: {
      team: {
        select: {
          parentId: true,
        },
      },
      user: {
        select: {
          id: true,
          email: true,
        },
      },
    },
  });
  if (!form) {
    throw new TRPCError({
      code: "NOT_FOUND",
    });
  }
  const serializableForm = await getSerializableForm({ form });
  if (!serializableForm.fields) {
    // There is no point in submitting a form that doesn't have fields defined
    throw new TRPCError({
      code: "BAD_REQUEST",
    });
  }
  return serializableForm;
};

export const responseHandler = async ({ ctx: { prisma, ...ctx }, input }: ResponseHandlerOptions) => {
  const { response, formId, chosenRouteId } = input;
  const { serializableForm = await getSerializableFormById(formId, prisma) } = ctx;

  try {
    const serializableFormWithFields = {
      ...serializableForm,
      fields: serializableForm.fields,
    };

    const missingFields = serializableFormWithFields.fields
      .filter((field) => !(field.required ? response[field.id]?.value : true))
      .map((f) => f.label);

    if (missingFields.length) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: `Missing required fields ${missingFields.join(", ")}`,
      });
    }
    const invalidFields = serializableFormWithFields.fields
      .filter((field) => {
        const fieldValue = response[field.id]?.value;
        // The field isn't required at this point. Validate only if it's set
        if (!fieldValue) {
          return false;
        }
        let schema;
        if (field.type === "email") {
          schema = emailSchema;
        } else if (field.type === "phone") {
          schema = z.any();
        } else {
          schema = z.any();
        }
        return !schema.safeParse(fieldValue).success;
      })
      .map((f) => ({ label: f.label, type: f.type, value: response[f.id]?.value }));

    if (invalidFields.length) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: `Invalid value for fields ${invalidFields
          .map((f) => `'${f.label}' with value '${f.value}' should be valid ${f.type}`)
          .join(", ")}`,
      });
    }

    const dbFormResponse = await prisma.app_RoutingForms_FormResponse.create({
      data: {
        formId,
        response: response,
      },
    });

    let userWithEmails: string[] = [];
    if (serializableForm.teamId) {
      userWithEmails = serializableForm.teamMembers
        .filter(({ userId }) => (serializableForm.settings?.sendUpdatesTo || []).includes(userId))
        .map(({ email }) => email);
    }

    const teamMembersMatchingAttributeLogicWithResult =
      serializableForm.teamId && chosenRouteId
        ? await findTeamMembersMatchingAttributeLogicOfRoute({
            response,
            routeId: chosenRouteId,
            form: serializableForm,
          })
        : null;

    moduleLogger.debug(
      "teamMembersMatchingAttributeLogic",
      safeStringify({ teamMembersMatchingAttributeLogicWithResult })
    );

    const teamMemberIdsMatchingAttributeLogic =
      teamMembersMatchingAttributeLogicWithResult?.teamMembersMatchingAttributeLogic
        ? teamMembersMatchingAttributeLogicWithResult.teamMembersMatchingAttributeLogic.map(
            (member) => member.userId
          )
        : null;

    const chosenRoute = serializableFormWithFields.routes?.find((route) => route.id === chosenRouteId);
    if (!chosenRoute) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Chosen route not found",
      });
    }

    await onFormSubmission(
      { ...serializableFormWithFields, userWithEmails },
      dbFormResponse.response as FormResponse,
      dbFormResponse.id,
      "action" in chosenRoute ? chosenRoute.action : undefined
    );
    return {
      formResponse: dbFormResponse,
      teamMembersMatchingAttributeLogic: teamMemberIdsMatchingAttributeLogic,
      attributeRoutingConfig:
        "attributeRoutingConfig" in chosenRoute ? chosenRoute.attributeRoutingConfig ?? null : null,
    };
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError) {
      if (e.code === "P2002") {
        throw new TRPCError({
          code: "CONFLICT",
        });
      }
    }
    throw e;
  }
};

export default responseHandler;
