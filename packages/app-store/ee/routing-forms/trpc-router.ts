import { Prisma, WebhookTriggerEvents } from "@prisma/client";
import { v4 as uuidv4 } from "uuid";
import { z } from "zod";

import getWebhooks from "@calcom/features/webhooks/utils/getWebhooks";
import { sendGenericWebhookPayload } from "@calcom/lib/webhooks/sendPayload";
import { TRPCError } from "@calcom/trpc/server";
import { createProtectedRouter, createRouter } from "@calcom/trpc/server/createRouter";

import { isAllowed } from "./lib/isAllowed";
import { zodFields, zodRoutes } from "./zod";

const app_RoutingForms = createRouter()
  .merge(
    "public.",
    createRouter().mutation("response", {
      input: z.object({
        formId: z.string(),
        formFillerId: z.string(),
        response: z.record(
          z.object({
            label: z.string(),
            value: z.union([z.string(), z.array(z.string())]),
          })
        ),
      }),
      async resolve({ ctx: { prisma }, input }) {
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
          const fieldsParsed = zodFields.safeParse(form.fields);
          if (!fieldsParsed.success) {
            // This should not be possible normally as before saving the form it is verified by zod
            throw new TRPCError({
              code: "INTERNAL_SERVER_ERROR",
            });
          }

          const fields = fieldsParsed.data;

          if (!fields) {
            // There is no point in submitting a form that doesn't have fields defined
            throw new TRPCError({
              code: "BAD_REQUEST",
            });
          }

          const missingFields = fields
            .filter((field) => !(field.required ? response[field.id]?.value : true))
            .map((f) => f.label);

          if (missingFields.length) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: `Missing required fields ${missingFields.join(", ")}`,
            });
          }
          const invalidFields = fields
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

          const fieldResponsesByName: Record<string, typeof response[keyof typeof response]["value"]> = {};

          for (const [fieldId, fieldResponse] of Object.entries(response)) {
            // Use the label lowercased as the key to identify a field.
            const key =
              fields.find((f) => f.id === fieldId)?.identifier ||
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

          return await prisma.app_RoutingForms_FormResponse.create({
            data: input,
          });
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
      },
    })
  )
  .merge(
    "",
    createProtectedRouter()
      .query("forms", {
        async resolve({ ctx: { user, prisma } }) {
          return await prisma.app_RoutingForms_Form.findMany({
            where: {
              userId: user.id,
            },
            orderBy: {
              createdAt: "asc",
            },
          });
        },
      })
      .query("form", {
        input: z.object({
          id: z.string(),
        }),
        async resolve({ ctx: { prisma, user }, input }) {
          const form = await prisma.app_RoutingForms_Form.findFirst({
            where: {
              userId: user.id,
              id: input.id,
            },
          });

          return form;
        },
      })
      .mutation("form", {
        input: z.object({
          id: z.string(),
          name: z.string(),
          description: z.string().nullable().optional(),
          disabled: z.boolean().optional(),
          fields: zodFields,
          routes: zodRoutes,
          addFallback: z.boolean().optional(),
          duplicateFrom: z.string().nullable().optional(),
        }),
        async resolve({ ctx: { user, prisma }, input }) {
          const { name, id, description, disabled, addFallback, duplicateFrom } = input;
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
              routes: routes === null ? Prisma.JsonNull : routes,
            },
          });
        },
      })
      // TODO: Can't we use DELETE method on form?
      .mutation("deleteForm", {
        input: z.object({
          id: z.string(),
        }),
        async resolve({ ctx: { user, prisma }, input }) {
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
        },
      })
  );

export default app_RoutingForms;
