import authedProcedure from "../../../procedures/authedProcedure";
import { router } from "../../../trpc";
import { ZCreateInputSchema } from "./create.schema";
import { ZCreateTeamsSchema } from "./createTeams.schema";
import { ZUpdateInputSchema } from "./update.schema";
import { ZVerifyCodeInputSchema } from "./verifyCode.schema";

type OrganizationsRouterHandlerCache = {
  create?: typeof import("./create.handler").createHandler;
  listCurrent?: typeof import("./list.handler").listHandler;
  update?: typeof import("./update.handler").updateHandler;
  verifyCode?: typeof import("./verifyCode.handler").verifyCodeHandler;
  createTeams?: typeof import("./createTeams.handler").createTeamsHandler;
};

const UNSTABLE_HANDLER_CACHE: OrganizationsRouterHandlerCache = {};

export const viewerOrganizationsRouter = router({
  create: authedProcedure.input(ZCreateInputSchema).mutation(async ({ ctx, input }) => {
    if (!UNSTABLE_HANDLER_CACHE.create) {
      UNSTABLE_HANDLER_CACHE.create = await import("./create.handler").then((mod) => mod.createHandler);
    }

    // Unreachable code but required for type safety
    if (!UNSTABLE_HANDLER_CACHE.create) {
      throw new Error("Failed to load handler");
    }

    return UNSTABLE_HANDLER_CACHE.create({
      ctx,
      input,
    });
  }),
  update: authedProcedure.input(ZUpdateInputSchema).mutation(async ({ ctx, input }) => {
    if (!UNSTABLE_HANDLER_CACHE.update) {
      UNSTABLE_HANDLER_CACHE.update = await import("./update.handler").then((mod) => mod.updateHandler);
    }

    // Unreachable code but required for type safety
    if (!UNSTABLE_HANDLER_CACHE.update) {
      throw new Error("Failed to load handler");
    }

    return UNSTABLE_HANDLER_CACHE.update({
      ctx,
      input,
    });
  }),
  verifyCode: authedProcedure.input(ZVerifyCodeInputSchema).mutation(async ({ ctx, input }) => {
    if (!UNSTABLE_HANDLER_CACHE.verifyCode) {
      UNSTABLE_HANDLER_CACHE.verifyCode = await import("./verifyCode.handler").then(
        (mod) => mod.verifyCodeHandler
      );
    }

    // Unreachable code but required for type safety
    if (!UNSTABLE_HANDLER_CACHE.verifyCode) {
      throw new Error("Failed to load handler");
    }

    return UNSTABLE_HANDLER_CACHE.verifyCode({
      ctx,
      input,
    });
  }),
  createTeams: authedProcedure.input(ZCreateTeamsSchema).mutation(async ({ ctx, input }) => {
    if (!UNSTABLE_HANDLER_CACHE.createTeams) {
      UNSTABLE_HANDLER_CACHE.createTeams = await import("./createTeams.handler").then(
        (mod) => mod.createTeamsHandler
      );
    }

    // Unreachable code but required for type safety
    if (!UNSTABLE_HANDLER_CACHE.createTeams) {
      throw new Error("Failed to load handler");
    }

    return UNSTABLE_HANDLER_CACHE.createTeams({
      ctx,
      input,
    });
  }),
  listCurrent: authedProcedure.query(async ({ ctx }) => {
    if (!UNSTABLE_HANDLER_CACHE.listCurrent) {
      UNSTABLE_HANDLER_CACHE.listCurrent = await import("./list.handler").then((mod) => mod.listHandler);
    }

    // Unreachable code but required for type safety
    if (!UNSTABLE_HANDLER_CACHE.listCurrent) {
      throw new Error("Failed to load handler");
    }

    return UNSTABLE_HANDLER_CACHE.listCurrent({
      ctx,
    });
  }),
});
