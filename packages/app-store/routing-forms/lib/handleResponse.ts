import { Prisma } from "@prisma/client";
import { z } from "zod";

import { emailSchema } from "@calcom/lib/emailSchema";
import logger from "@calcom/lib/logger";
import { findTeamMembersMatchingAttributeLogic } from "@calcom/lib/raqb/findTeamMembersMatchingAttributeLogic";
import { safeStringify } from "@calcom/lib/safeStringify";
import { withReporting } from "@calcom/lib/sentryWrapper";
import { RoutingFormResponseRepository } from "@calcom/lib/server/repository/formResponse";
import type { ZResponseInputSchema } from "@calcom/trpc/server/routers/viewer/routing-forms/response.schema";

import { TRPCError } from "@trpc/server";

import isRouter from "../lib/isRouter";
import routerGetCrmContactOwnerEmail from "./crmRouting/routerGetCrmContactOwnerEmail";
import { onSubmissionOfFormResponse, type TargetRoutingFormForResponse } from "./formSubmissionUtils";

const moduleLogger = logger.getSubLogger({ prefix: ["routing-forms/lib/handleResponse"] });

const _handleResponse = async ({
  response,
  form,
  // Unused but probably should be used
  // formFillerId,
  chosenRouteId,
  isPreview,
  queueFormResponse,
}: {
  response: z.infer<typeof ZResponseInputSchema>["response"];
  form: TargetRoutingFormForResponse;
  formFillerId: string;
  chosenRouteId: string | null;
  isPreview: boolean;
  queueFormResponse?: boolean;
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

    const chosenRoute = serializableFormWithFields.routes?.find((route) => route.id === chosenRouteId);
    let teamMemberIdsMatchingAttributeLogic: number[] | null = null;
    let crmContactOwnerEmail: string | null = null;
    let crmContactOwnerRecordType: string | null = null;
    let crmAppSlug: string | null = null;
    let timeTaken: Record<string, number | null> = {};
    if (chosenRoute) {
      if (isRouter(chosenRoute)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Chosen route is a router",
        });
      }

      const getRoutedMembers = async () =>
        await Promise.all([
          (async () => {
            const contactOwnerQuery = await routerGetCrmContactOwnerEmail({
              attributeRoutingConfig: chosenRoute.attributeRoutingConfig,
              response,
              action: chosenRoute.action,
            });
            crmContactOwnerEmail = contactOwnerQuery?.email ?? null;
            crmContactOwnerRecordType = contactOwnerQuery?.recordType ?? null;
            crmAppSlug = contactOwnerQuery?.crmAppSlug ?? null;
          })(),
          (async () => {
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
          })(),
        ]);

      await withReporting(getRoutedMembers, "getRoutedMembers")();
    } else {
      // It currently happens for a Router route. Such a route id isn't present in the form.routes
    }
    let dbFormResponse, queuedFormResponse;
    if (!isPreview) {
      if (queueFormResponse) {
        queuedFormResponse = await RoutingFormResponseRepository.recordQueuedFormResponse({
          formId: form.id,
          response,
          chosenRouteId,
        });
        dbFormResponse = null;
      } else {
        dbFormResponse = await RoutingFormResponseRepository.recordFormResponse({
          formId: form.id,
          response,
          chosenRouteId,
        });
        queuedFormResponse = null;

        await onSubmissionOfFormResponse({
          form: serializableFormWithFields,
          formResponseInDb: dbFormResponse,
          chosenRouteAction: chosenRoute ? ("action" in chosenRoute ? chosenRoute.action : null) : null,
        });
      }
    } else {
      moduleLogger.debug("Dry run mode - Form response not stored and also webhooks and emails not sent");
      if (queueFormResponse) {
        queuedFormResponse = {
          id: "00000000-0000-0000-0000-000000000000",
          formId: form.id,
          response,
        };
      } else {
        // Create a mock response for dry run
        dbFormResponse = {
          id: 0,
          formId: form.id,
          response,
          chosenRouteId,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
      }
    }
    return {
      isPreview: !!isPreview,
      formResponse: dbFormResponse,
      queuedFormResponse,
      teamMembersMatchingAttributeLogic: teamMemberIdsMatchingAttributeLogic,
      crmContactOwnerEmail,
      crmContactOwnerRecordType,
      crmAppSlug,
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

export const handleResponse = withReporting(_handleResponse, "handleResponse");
