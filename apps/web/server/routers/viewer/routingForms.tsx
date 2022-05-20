import { z } from "zod";

import { createProtectedRouter } from "@server/createRouter";

type Field = {
  text: string;
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
      });
    },
  })
  .mutation("form", {
    input: z.object({
      id: z.number().optional(),
      name: z.string(),
      fields: z.array(
        z.object({
          id: z.string(),
          text: z.string(),
          type: z.string(),
          required: z.boolean().optional(),
        })
      ),
    }),
    async resolve({ ctx: { user, prisma }, input }) {
      const { name, fields, id } = input;
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
        },
        update: {
          fields: fields,
          name: name,
        },
      });
    },
  })
  .query("form", {
    input: z.object({
      id: z.number(),
    }),
    async resolve({ ctx: { prisma }, input }) {
      return await prisma.app_RoutingForms_Form.findFirst({
        where: {
          id: input.id,
        },
      });
    },
  });
