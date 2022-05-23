import { z } from "zod";

import { createProtectedRouter } from "@server/createRouter";

type Field = {
  label: string;
  type: string;
  required: boolean;
};

export const app_RoutingForms = createProtectedRouter()
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
      return await prisma.app_RoutingForms_Form.findFirst({
        where: {
          id: input.id,
        },
      });
    },
  })
  .mutation("form", {
    input: z.object({
      id: z.string(),
      name: z.string(),
      fields: z
        .array(
          z.object({
            id: z.string(),
            label: z.string(),
            type: z.string(),
            required: z.boolean().optional(),
          })
        )
        .optional(),
      route: z
        .array(
          z.object({
            id: z.string(),
            queryValue: z.any(),
            action: z.object({
              // TODO: Make it a union type of "customPageMessage" and ..
              type: z.string(),
              value: z.string(),
            }),
          })
        )
        .optional(),
    }),
    async resolve({ ctx: { user, prisma }, input }) {
      const { name, id, route } = input;
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
          route: route,
          id: id,
        },
        update: {
          fields: fields,
          name: name,
          route: route,
        },
      });
    },
  })
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
  });
