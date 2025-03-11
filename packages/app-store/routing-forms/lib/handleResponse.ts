import { Prisma } from "@prisma/client";
import { z } from "zod";

import { DUPLICATE_RESPONSE_PERIOD_DAYS } from "@calcom/lib/constants";
import { emailSchema } from "@calcom/lib/emailSchema";
import logger from "@calcom/lib/logger";
import { findTeamMembersMatchingAttributeLogic } from "@calcom/lib/raqb/findTeamMembersMatchingAttributeLogic";
import { safeStringify } from "@calcom/lib/safeStringify";
import { prisma } from "@calcom/prisma";
import type { App_RoutingForms_Form } from "@calcom/prisma/client";
import { RoutingFormSettings } from "@calcom/prisma/zod-utils";
import type { ZResponseInputSchema } from "@calcom/trpc/server/routers/viewer/routing-forms/response.schema";

import { TRPCError } from "@trpc/server";

import isRouter from "../lib/isRouter";
import { generateResponseHash } from "../lib/utils";
import { onFormSubmission } from "../trpc/utils";
import type { FormResponse, SerializableForm } from "../types/types";

export type Form = SerializableForm<
  App_RoutingForms_Form & {
    user: {
      id: number;
      email: string;
    };
    team: {
      parentId: number | null;
    } | null;
  }
>;

const moduleLogger = logger.getSubLogger({ prefix: ["routing-forms/lib/handleResponse"] });

async function findDuplicateResponseInLastNDays({
  formId,
  responseHash,
  days,
}: {
  formId: string;
  responseHash: string;
  days: number;
}) {
  const nDaysAgo = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  return prisma.app_RoutingForms_FormResponse.findFirst({
    where: {
      formId,
      responseHash,
      createdAt: {
        gte: nDaysAgo,
      },
    },
  });
}

export const handleResponse = async ({
  response,
  form,
  // Unused but probably should be used
  // formFillerId,
  chosenRouteId,
  isPreview,
}: {
  response: z.infer<typeof ZResponseInputSchema>["response"];
  form: Form;
  formFillerId: string;
  chosenRouteId: string | null;
  isPreview: boolean;
}) => {
  try {
    if (!form.fields) {
      // There is no point in submitting a form that doesn't have fields defined
      throw new TRPCError({
        code: "BAD_REQUEST",
      });
    }

    const formTeamId = form.teamId;
    const formOrgId = form.team?.parentId ?? null;
    const serializableFormWithFields = {
      ...form,
      fields: form.fields,
    };

    const formFields = serializableFormWithFields.fields;
    const missingFields = formFields
      .filter((field) => !(field.required ? response[field.id]?.value : true))
      .map((f) => f.label);

    if (missingFields.length) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: `Missing required fields ${missingFields.join(", ")}`,
      });
    }
    const invalidFields = formFields
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

    const settings = RoutingFormSettings.parse(form.settings);
    let userWithEmails: string[] = [];
    if (form.teamId && (settings?.sendToAll || settings?.sendUpdatesTo?.length)) {
      const whereClause: Prisma.MembershipWhereInput = { teamId: form.teamId };
      if (!settings?.sendToAll) {
        whereClause.userId = { in: settings.sendUpdatesTo };
      }
      const userEmails = await prisma.membership.findMany({
        where: whereClause,
        select: {
          user: {
            select: {
              email: true,
            },
          },
        },
      });
      userWithEmails = userEmails.map((userEmail) => userEmail.user.email);
    }

    const chosenRoute = serializableFormWithFields.routes?.find((route) => route.id === chosenRouteId);
    let teamMemberIdsMatchingAttributeLogic: number[] | null = null;
    let timeTaken: Record<string, number | null> = {};
    if (chosenRoute) {
      if (isRouter(chosenRoute)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Chosen route is a router",
        });
      }

      const teamMembersMatchingAttributeLogicWithResult =
        formTeamId && formOrgId
          ? await findTeamMembersMatchingAttributeLogic(
              {
                dynamicFieldValueOperands: {
                  response,
                  fields: form.fields || [],
                },
                attributesQueryValue: chosenRoute.attributesQueryValue ?? null,
                fallbackAttributesQueryValue: chosenRoute.fallbackAttributesQueryValue,
                teamId: formTeamId,
                orgId: formOrgId,
              },
              {
                enablePerf: true,
              }
            )
          : null;

      moduleLogger.debug(
        "teamMembersMatchingAttributeLogic",
        safeStringify({ teamMembersMatchingAttributeLogicWithResult })
      );

      teamMemberIdsMatchingAttributeLogic =
        teamMembersMatchingAttributeLogicWithResult?.teamMembersMatchingAttributeLogic
          ? teamMembersMatchingAttributeLogicWithResult.teamMembersMatchingAttributeLogic.map(
              (member) => member.userId
            )
          : null;

      timeTaken = teamMembersMatchingAttributeLogicWithResult?.timeTaken ?? {};
    } else {
      // It currently happens for a Router route. Such a route id isn't present in the form.routes
    }

    if (isPreview) {
      moduleLogger.debug("Dry run mode - Form response not stored and also webhooks and emails not sent");
      // Create a mock response for dry run
      const mockFormResponse = {
        id: 0,
        formId: form.id,
        response,
        chosenRouteId,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      return {
        isPreview: !!isPreview,
        isDuplicate: false,
        formResponse: mockFormResponse,
        teamMembersMatchingAttributeLogic: teamMemberIdsMatchingAttributeLogic,
        attributeRoutingConfig: chosenRoute
          ? "attributeRoutingConfig" in chosenRoute
            ? chosenRoute.attributeRoutingConfig
            : null
          : null,
        timeTaken,
      };
    }

    let dbFormResponse;

    let duplicateResponse = null;

    const responseHash = generateResponseHash({ response, fields: form.fields });

    if (form.deduplicateResponses) {
      duplicateResponse = await findDuplicateResponseInLastNDays({
        formId: form.id,
        responseHash: responseHash,
        days: DUPLICATE_RESPONSE_PERIOD_DAYS,
      });
    }

    if (duplicateResponse) {
      moduleLogger.info(`Duplicate form response detected for form ${form.id}`);

      // We can make updates to the existing response till it is connected to a successful booking
      if (!duplicateResponse.routedToBookingUid) {
        await prisma.app_RoutingForms_FormResponse.update({
          where: { id: duplicateResponse.id },
          data: {
            chosenRouteId,
            lastSubmittedAt: new Date(),
          },
        });
      } else {
        moduleLogger.info(
          `Duplicate form response detected for form ${form.id} with response id ${duplicateResponse.id} but it is connected to a booking. Not updating the record.`
        );
      }

      dbFormResponse = duplicateResponse;
    } else {
      // If not a duplicate, create a new response
      dbFormResponse = await prisma.app_RoutingForms_FormResponse.create({
        data: {
          // TODO: Why do we not save formFillerId available in the input?
          // formFillerId,
          formId: form.id,
          response: response,
          responseHash: responseHash,
          chosenRouteId,
          lastSubmittedAt: new Date(),
        },
      });

      await onFormSubmission(
        { ...serializableFormWithFields, userWithEmails },
        dbFormResponse.response as FormResponse,
        dbFormResponse.id,
        chosenRoute ? ("action" in chosenRoute ? chosenRoute.action : undefined) : undefined
      );
    }

    return {
      isPreview: !!isPreview,
      isDuplicate: !!duplicateResponse,
      formResponse: dbFormResponse,
      teamMembersMatchingAttributeLogic: teamMemberIdsMatchingAttributeLogic,
      attributeRoutingConfig: chosenRoute
        ? "attributeRoutingConfig" in chosenRoute
          ? chosenRoute.attributeRoutingConfig
          : null
        : null,
      timeTaken,
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
