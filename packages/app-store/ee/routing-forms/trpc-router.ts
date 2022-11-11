import { App_RoutingForms_Form, Prisma, User, WebhookTriggerEvents } from "@prisma/client";
import { v4 as uuidv4 } from "uuid";
import { z } from "zod";

import getWebhooks from "@calcom/features/webhooks/lib/getWebhooks";
import { sendGenericWebhookPayload } from "@calcom/features/webhooks/lib/sendPayload";
import logger from "@calcom/lib/logger";
import { RoutingFormSettings } from "@calcom/prisma/zod-utils";
import { TRPCError } from "@calcom/trpc/server";
import { authedProcedure, publicProcedure, router } from "@calcom/trpc/server/trpc";
import { Ensure } from "@calcom/types/utils";

import ResponseEmail from "./emails/templates/response-email";
import { jsonLogicToPrisma } from "./jsonLogicToPrisma";
import { getSerializableForm } from "./lib/getSerializableForm";
import { isAllowed } from "./lib/isAllowed";
import { Response, SerializableForm } from "./types/types";
import { zodFields, zodRoutes } from "./zod";

async function onFormSubmission(
  form: Ensure<SerializableForm<App_RoutingForms_Form> & { user: User }, "fields">,
  response: Response
) {
  const fieldResponsesByName: Record<string, typeof response[keyof typeof response]["value"]> = {};

  for (const [fieldId, fieldResponse] of Object.entries(response)) {
    // Use the label lowercased as the key to identify a field.
    const key =
      form.fields.find((f) => f.id === fieldId)?.identifier ||
      (fieldResponse.label as keyof typeof fieldResponsesByName);
    fieldResponsesByName[key] = fieldResponse.value;
  }

  const subscriberOptions = {
    userId: form.user.id,
    // It isn't an eventType webhook
    eventTypeId: -1,
    triggerEvent: WebhookTriggerEvents.FORM_SUBMITTED,
  };

  const webhooks = await getWebhooks(subscriberOptions);
  const promises = webhooks.map((webhook) => {
    sendGenericWebhookPayload(
      webhook.secret,
      "FORM_SUBMITTED",
      new Date().toISOString(),
      webhook,
      fieldResponsesByName
    ).catch((e) => {
      console.error(`Error executing routing form webhook`, webhook, e);
    });
  });

  await Promise.all(promises);
  if (form.settings?.emailOwnerOnSubmission) {
    logger.debug(
      `Preparing to send Form Response email for Form:${form.id} to form owner: ${form.user.email}`
    );
    await sendResponseEmail(form, response, form.user.email);
  }
}

const sendResponseEmail = async (
  form: Pick<App_RoutingForms_Form, "id" | "name">,
  response: Response,
  ownerEmail: string
) => {
  try {
    const email = new ResponseEmail({ form: form, toAddresses: [ownerEmail], response: response });
    await email.sendEmail();
  } catch (e) {
    logger.error("Error sending response email", e);
  }
};

const appRoutingForms = router({
  public: router({
    response: publicProcedure
      .input(
        z.object({
          formId: z.string(),
          formFillerId: z.string(),
          response: z.record(
            z.object({
              label: z.string(),
              value: z.union([z.string(), z.array(z.string())]),
            })
          ),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const { prisma } = ctx;
        try {
          const { response, formId } = input;
          const form = await prisma.app_RoutingForms_Form.findFirst({
            where: {
              id: formId,
            },
            include: {
              user: true,
            },
          });
          if (!form) {
            throw new TRPCError({
              code: "NOT_FOUND",
            });
          }

          const serializableForm = getSerializableForm(form);
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
                schema = z.string().email();
              } else if (field.type === "phone") {
                schema = z.any();
              } else {
                schema = z.any();
              }
              return !schema.safeParse(fieldValue).success;
            })
            .map((f) => ({ label: f.label, type: f.type }));

          if (invalidFields.length) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: `Invalid fields ${invalidFields.map((f) => `${f.label}: ${f.type}`)}`,
            });
          }

          const dbFormResponse = await prisma.app_RoutingForms_FormResponse.create({
            data: input,
          });

          await onFormSubmission(serializableFormWithFields, dbFormResponse.response as Response);
          return dbFormResponse;
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
      }),
  }),
  forms: authedProcedure.query(async ({ ctx }) => {
    const { prisma, user } = ctx;
    const forms = await prisma.app_RoutingForms_Form.findMany({
      where: {
        userId: user.id,
      },
      orderBy: {
        createdAt: "desc",
      },
      include: {
        _count: {
          select: {
            responses: true,
          },
        },
      },
    });

    const serializableForms = forms.map((form) => getSerializableForm(form));
    return serializableForms;
  }),
  formQuery: authedProcedure
    .input(
      z.object({
        id: z.string(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { prisma, user } = ctx;
      const form = await prisma.app_RoutingForms_Form.findFirst({
        where: {
          userId: user.id,
          id: input.id,
        },
        include: {
          _count: {
            select: {
              responses: true,
            },
          },
        },
      });

      if (!form) {
        return null;
      }

      return getSerializableForm(form);
    }),
  formMutation: authedProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string(),
        description: z.string().nullable().optional(),
        disabled: z.boolean().optional(),
        fields: zodFields,
        routes: zodRoutes,
        addFallback: z.boolean().optional(),
        duplicateFrom: z.string().nullable().optional(),
        settings: RoutingFormSettings.optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { user, prisma } = ctx;
      const { name, id, description, settings, disabled, addFallback, duplicateFrom } = input;
      if (!(await isAllowed({ userId: user.id, formId: id }))) {
        throw new TRPCError({
          code: "FORBIDDEN",
        });
      }
      let { routes } = input;
      let { fields } = input;

      if (duplicateFrom) {
        const sourceForm = await prisma.app_RoutingForms_Form.findFirst({
          where: {
            userId: user.id,
            id: duplicateFrom,
          },
          select: {
            fields: true,
            routes: true,
          },
        });
        if (!sourceForm) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `Form to duplicate: ${duplicateFrom} not found`,
          });
        }
        const fieldParsed = zodFields.safeParse(sourceForm.fields);
        const routesParsed = zodRoutes.safeParse(sourceForm.routes);
        if (!fieldParsed.success || !routesParsed.success) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Could not parse source form's fields or routes",
          });
        }
        // Duplicate just routes and fields
        // We don't want name, description and responses to be copied
        routes = routesParsed.data;
        fields = fieldParsed.data;
      }

      fields = fields || [];

      const form = await prisma.app_RoutingForms_Form.findUnique({
        where: {
          id: id,
        },
        select: {
          id: true,
          user: true,
          name: true,
          description: true,
          userId: true,
          disabled: true,
          createdAt: true,
          updatedAt: true,
          routes: true,
          fields: true,
          settings: true,
        },
      });

      // Add back deleted fields in the end. Fields can't be deleted, to make sure columns never decrease which hugely simplifies CSV generation
      if (form) {
        const serializedForm = getSerializableForm(form, true);
        // Find all fields that are in DB(including deleted) but not in the mutation
        const deletedFields =
          serializedForm.fields?.filter((f) => !fields!.find((field) => field.id === f.id)) || [];

        fields = fields.concat(
          deletedFields.map((f) => {
            f.deleted = true;
            return f;
          })
        );
      }

      if (addFallback) {
        const uuid = uuidv4();
        routes = routes || [];
        // Add a fallback route if there is none
        if (!routes.find((route) => route.isFallback)) {
          routes.push({
            id: uuid,
            isFallback: true,
            action: {
              type: "customPageMessage",
              value: "Thank you for your interest! We will be in touch soon.",
            },
            queryValue: { id: uuid, type: "group" },
          });
        }
      }

      return await prisma.app_RoutingForms_Form.upsert({
        where: {
          id: id,
        },
        create: {
          user: {
            connect: {
              id: user.id,
            },
          },
          fields: fields,
          name: name,
          description,
          // Prisma doesn't allow setting null value directly for JSON. It recommends using JsonNull for that case.
          routes: routes === null ? Prisma.JsonNull : routes,
          id: id,
        },
        update: {
          disabled: disabled,
          fields: fields,
          name: name,
          description,
          settings: settings === null ? Prisma.JsonNull : settings,
          routes: routes === null ? Prisma.JsonNull : routes,
        },
      });
    }),
  deleteForm: authedProcedure
    .input(
      z.object({
        id: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { user, prisma } = ctx;
      if (!(await isAllowed({ userId: user.id, formId: input.id }))) {
        throw new TRPCError({
          code: "FORBIDDEN",
        });
      }
      return await prisma.app_RoutingForms_Form.deleteMany({
        where: {
          id: input.id,
          userId: user.id,
        },
      });
    }),
  report: authedProcedure
    .input(
      z.object({
        formId: z.string(),
        jsonLogicQuery: z.object({
          logic: z.union([z.record(z.any()), z.null()]),
        }),
        cursor: z.number().nullish(), // <-- "cursor" needs to exist when using useInfiniteQuery, but can be any type
      })
    )
    .query(async ({ ctx: { prisma }, input }) => {
      // Can be any prisma `where` clause
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const prismaWhere: Record<string, any> = input.jsonLogicQuery
        ? jsonLogicToPrisma(input.jsonLogicQuery)
        : {};
      const skip = input.cursor ?? 0;
      const take = 50;
      logger.debug(
        `Built Prisma where ${JSON.stringify(prismaWhere)} from jsonLogicQuery ${JSON.stringify(
          input.jsonLogicQuery
        )}`
      );
      const form = await prisma.app_RoutingForms_Form.findUnique({
        where: {
          id: input.formId,
        },
      });

      if (!form) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Form not found",
        });
      }
      // TODO: Second argument is required to return deleted operators.
      const serializedForm = getSerializableForm(form, true);

      const rows = await prisma.app_RoutingForms_FormResponse.findMany({
        where: {
          formId: input.formId,
          ...prismaWhere,
        },
        take,
        skip,
      });
      const fields = serializedForm?.fields || [];
      const headers = fields.map((f) => f.label + (f.deleted ? "(Deleted)" : ""));
      const responses: string[][] = [];
      rows.forEach((r) => {
        const rowResponses: string[] = [];
        responses.push(rowResponses);
        fields.forEach((field) => {
          if (!r.response) {
            return;
          }
          const response = r.response as Response;
          const value = response[field.id]?.value || "";
          let stringValue = "";
          if (value instanceof Array) {
            stringValue = value.join(", ");
          } else {
            stringValue = value;
          }
          rowResponses.push(stringValue);
        });
      });
      const areThereNoResultsOrLessThanAskedFor = !rows.length || rows.length < take;
      return {
        headers,
        responses,
        nextCursor: areThereNoResultsOrLessThanAskedFor ? null : skip + rows.length,
      };
    }),
});

export default appRoutingForms;
