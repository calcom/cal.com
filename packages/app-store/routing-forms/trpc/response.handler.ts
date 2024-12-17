import { Prisma } from "@prisma/client";
import { z } from "zod";

import { emailSchema } from "@calcom/lib/emailSchema";
import logger from "@calcom/lib/logger";
import { findTeamMembersMatchingAttributeLogic } from "@calcom/lib/raqb/findTeamMembersMatchingAttributeLogic";
import { safeStringify } from "@calcom/lib/safeStringify";
import type { PrismaClient } from "@calcom/prisma";
import { RoutingFormSettings } from "@calcom/prisma/zod-utils";
import { TRPCError } from "@calcom/trpc/server";

import { getSerializableForm } from "../lib/getSerializableForm";
import isRouter from "../lib/isRouter";
import type { FormResponse } from "../types/types";
import type { TResponseInputSchema } from "./response.schema";
import { onFormSubmission } from "./utils";

const moduleLogger = logger.getSubLogger({ prefix: ["routing-forms/trpc/response.handler"] });

interface ResponseHandlerOptions {
  ctx: {
    prisma: PrismaClient;
  };
  input: TResponseInputSchema;
}
export const responseHandler = async ({ ctx, input }: ResponseHandlerOptions) => {
  const { prisma } = ctx;
  try {
    const { response, formId, chosenRouteId } = input;
    const form = await prisma.app_RoutingForms_Form.findFirst({
      where: {
        id: formId,
      },
      include: {
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

    const settings = RoutingFormSettings.parse(form.settings);
    let userWithEmails: string[] = [];
    if (form.teamId && settings?.sendUpdatesTo?.length) {
      const userEmails = await prisma.membership.findMany({
        where: {
          teamId: form.teamId,
          userId: {
            in: settings.sendUpdatesTo,
          },
        },
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

    if (chosenRoute) {
      if (isRouter(chosenRoute)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Chosen route is a router",
        });
      }
      const teamMembersMatchingAttributeLogicWithResult = form.teamId
        ? await findTeamMembersMatchingAttributeLogic({
            dynamicFieldValueOperands: {
              response,
              fields: serializableForm.fields || [],
            },
            attributesQueryValue: chosenRoute.attributesQueryValue ?? null,
            fallbackAttributesQueryValue: chosenRoute.fallbackAttributesQueryValue,
            teamId: form.teamId,
          })
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
    } else {
      // It currently happens for a Router route. Such a route id isn't present in the form.routes
    }

    // const chosenRouteName = `Route ${chosenRouteIndex + 1}`;

    // if (input.isPreview) {
    //   // Detect if response has value for a field that isn't in the field list
    //   const formFields = serializableFormWithFields.fields.map((field) => field.id);
    //   const extraFields = Object.keys(response).filter((fieldId) => !formFields.includes(fieldId));
    //   const attributeRoutingConfig =
    //     "attributeRoutingConfig" in chosenRoute ? chosenRoute.attributeRoutingConfig ?? null : null;

    //   let previewData = {
    //     teamMemberIdsMatchingAttributeLogic,
    //     chosenRoute: {
    //       name: chosenRouteName,
    //       action: "action" in chosenRoute ? chosenRoute.action : null,
    //     },
    //     skipContactOwner: attributeRoutingConfig?.skipContactOwner ?? false,
    //     warnings: [] as string[],
    //     errors: [] as string[],
    //   };

    //   if (extraFields.length > 0) {
    //     // If response submitted directly through the /response.handler, it is useful to know which fields were non-existent
    //     // If we reach here through router, all extra fields are already removed from here
    //     previewData.warnings.push(
    //       `Response contains values for non-existent fields: ${extraFields.join(", ")}`
    //     );
    //   }

    //   // Check for values not present in options for SINGLE_SELECT and MULTISELECT fields
    //   serializableFormWithFields.fields.forEach((field) => {
    //     if (
    //       field.type !== RoutingFormFieldType.SINGLE_SELECT &&
    //       field.type !== RoutingFormFieldType.MULTI_SELECT
    //     ) {
    //       return;
    //     }

    //     const fieldResponse = response[field.id];

    //     if (fieldResponse && fieldResponse.value) {
    //       const values = Array.isArray(fieldResponse.value) ? fieldResponse.value : [fieldResponse.value];
    //       const invalidValues = values.filter(
    //         (value) => !field.options?.some((option) => option.id === value || option.label === value)
    //       );
    //       if (invalidValues.length > 0) {
    //         previewData.errors.push(`Invalid value(s) for ${field.label}: ${invalidValues.join(", ")}`);
    //       }
    //     }
    //   });

    //   return {
    //     isPreview: true,
    //     previewData,
    //     formResponse: null,
    //     teamMembersMatchingAttributeLogic: teamMemberIdsMatchingAttributeLogic,
    //   };
    // }

    const dbFormResponse = await prisma.app_RoutingForms_FormResponse.create({
      data: {
        formId,
        response: response,
        chosenRouteId,
      },
    });

    await onFormSubmission(
      { ...serializableFormWithFields, userWithEmails },
      dbFormResponse.response as FormResponse,
      dbFormResponse.id,
      chosenRoute ? ("action" in chosenRoute ? chosenRoute.action : undefined) : undefined
    );

    return {
      isPreview: false,
      formResponse: dbFormResponse,
      teamMembersMatchingAttributeLogic: teamMemberIdsMatchingAttributeLogic,
      attributeRoutingConfig: chosenRoute
        ? "attributeRoutingConfig" in chosenRoute
          ? chosenRoute.attributeRoutingConfig
          : null
        : null,
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
