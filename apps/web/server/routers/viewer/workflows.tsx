import { z } from "zod";

import { createProtectedRouter } from "@server/createRouter";

export const workflowsRouter = createProtectedRouter().query("list", {
  async resolve({ ctx }) {
    const workflows = await ctx.prisma.workflow.findMany({
      where: {
        userId: ctx.user.id,
      },
    });
    return { workflows };
  },
});
