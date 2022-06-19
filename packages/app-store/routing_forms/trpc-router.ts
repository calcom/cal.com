import { Prisma } from "@prisma/client";
import { z } from "zod";

import { createProtectedRouter } from "@server/createRouter";
import { TRPCError } from "@trpc/server";

import { zodFields, zodRoutes } from "./zod";

const app_RoutingForms = createProtectedRouter()
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
    async resolve({ ctx: { prisma }, input }) {
      const form = await prisma.app_RoutingForms_Form.findFirst({
        where: {
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
    }),
    async resolve({ ctx: { user, prisma }, input }) {
      const { name, id, routes, description, disabled } = input;
      let { fields } = input;
      fields = fields || [];
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
  // TODO: Can't se use DELETE method on form?
  .mutation("deleteForm", {
    input: z.object({
      id: z.string(),
    }),
    async resolve({ ctx, input }) {
      return await ctx.prisma.app_RoutingForms_Form.delete({
        where: {
          id: input.id,
        },
      });
    },
  })
  .mutation("response", {
    input: z.object({
      formId: z.string(),
      formFillerId: z.string(),
      response: z.record(
        z.object({
          label: z.string(),
          value: z.string(),
        })
      ),
    }),
    async resolve({ ctx: { prisma }, input }) {
      try {
        return await prisma.app_RoutingForms_FormResponse.create({
          data: input,
        });
      } catch (e) {
        if (e.code === "P2002") {
          throw new TRPCError({
            code: "CONFLICT",
          });
        }
        throw e;
      }
    },
  });

export default app_RoutingForms;
