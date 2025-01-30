import { Prisma } from "@prisma/client";
import type { GetServerSidePropsContext } from "next";
import { z } from "zod";

import { emailSchema } from "@calcom/lib/emailSchema";
import logger from "@calcom/lib/logger";
import { findTeamMembersMatchingAttributeLogic } from "@calcom/lib/raqb/findTeamMembersMatchingAttributeLogic";
import { safeStringify } from "@calcom/lib/safeStringify";
import { prisma } from "@calcom/prisma";
import type { App_RoutingForms_Form } from "@calcom/prisma/client";
import { RoutingFormSettings } from "@calcom/prisma/zod-utils";
import { TRPCError } from "@calcom/trpc/server";

import isRouter from "../lib/isRouter";
import { onFormSubmission } from "../trpc/utils";
import type { FormResponse, SerializableForm } from "../types/types";
import { findMatchingRoute } from "./processRoute";

type Form = SerializableForm<
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

type HandleResponseOptions = {
  query: GetServerSidePropsContext["query"];
  req: {
    body: Record<string, unknown> & {
      formFillerId?: string;
      chosenRouteId?: string | null;
      isPreview?: boolean;
    };
  };
  form: SerializableForm<
    App_RoutingForms_Form & {
      user: { id: number; email: string };
      team: { parentId: number | null } | null;
    }
  >;
};

const moduleLogger = logger.getSubLogger({ prefix: ["routing-forms/lib/handleResponse"] });

export const handleResponse = async (context: HandleResponseOptions) => {
  let serializableFormWithFields: Form | null = null;

  try {
    if (!context.query.formId) {
      throw new TRPCError({
        code: "BAD_REQUEST",
      });
    }

    const formId = context.query.formId;
    const form = (await prisma.app_RoutingForms_Form.findUnique({
      where: {
        id: formId as string,
      },
      select: {
        id: true,
        fields: true,
        routes: true,
        teamId: true,
        user: {
          select: {
            id: true,
            email: true,
          },
        },
        team: {
          select: {
            parentId: true,
          },
        },
      },
    })) as unknown as Form;

    if (!form) {
      throw new TRPCError({
        code: "NOT_FOUND",
      });
    }

    const {
      formFillerId: _formFillerId,
      chosenRouteId: _chosenRouteId,
      isPreview: _isPreview,
      ...cleanBody
    } = context.req.body;
    const response = cleanBody as Record<string, { value: string | number | string[]; label: string }>;

    const matchingRoute = findMatchingRoute({ form, response });

    if (!matchingRoute) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "No matching route found",
      });
    }

    if (!form.fields) {
      throw new TRPCError({
        code: "BAD_REQUEST",
      });
    }

    const formTeamId = form.teamId;
    const formOrgId = form.team?.parentId ?? null;
    serializableFormWithFields = {
      ...form,
      fields: form.fields || [],
    };

    const missingFields = (serializableFormWithFields.fields || [])
      .filter((field) => {
        return field.required && !field.deleted && !response[field.id]?.value;
      })
      .map((f) => f.label);

    if (missingFields.length) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: `Missing required fields ${missingFields.join(", ")}`,
        cause: {
          errorType: "missing_required_fields",
          missingFields,
        },
      });
    }
    const invalidFields = (serializableFormWithFields.fields || [])
      .filter((field) => {
        const fieldValue = response[field.id]?.value;
        if (!fieldValue) {
          return false;
        }
        let schema;
        if (field.type === "email") {
          schema = emailSchema;
        } else if (field.type === "phone") {
          schema = z.any();
        } else {
          ``;
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

    const chosenRoute = serializableFormWithFields.routes?.find((route) => route.id === matchingRoute.id);
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

    const dbFormResponse = await prisma.app_RoutingForms_FormResponse.create({
      data: {
        formId: form.id,
        response: response,
        chosenRouteId: matchingRoute.id,
      },
    });

    await onFormSubmission(
      { ...serializableFormWithFields, userWithEmails, fields: form.fields || [] },
      dbFormResponse.response as FormResponse,
      dbFormResponse.id,
      chosenRoute ? ("action" in chosenRoute ? chosenRoute.action : undefined) : undefined
    );

    return {
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
    if (e instanceof TRPCError) {
      return {
        error: true,
        message: e.message,
        status: 400,
        data: e.cause,
      };
    }
    if (e instanceof Prisma.PrismaClientKnownRequestError) {
      if (e.code === "P2002") {
        return {
          error: true,
          message: "Duplicate submission",
          status: 409,
        };
      }
    }
    return {
      error: true,
      message: "An unexpected error occurred",
      status: 500,
    };
  }
};
