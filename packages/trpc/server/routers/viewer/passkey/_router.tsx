import authedProcedure from "../../../procedures/authedProcedure";
import publicProcedure from "../../../procedures/publicProcedure";
import { router } from "../../../trpc";
import { ZCreateInputSchema } from "./create.schema";
import { ZDeleteInputSchema } from "./delete.schema";
import { ZUpdateInputSchema } from "./update.schema";

type PasskeyRouterHandlerCache = {
  create?: typeof import("./create.handler").createHandler;
  delete?: typeof import("./delete.handler").deleteHandler;
  update?: typeof import("./update.handler").updateHandler;
  find?: typeof import("./find.handler").findHandler;
  createRegistrationOptions?: typeof import("./createRegistrationOptions.handler").createRegistrationOptionsHandler;
  createSignInOptions?: typeof import("./createSignInOptions.handler").createSignInOptionsHandler;
};

const UNSTABLE_HANDLER_CACHE: PasskeyRouterHandlerCache = {};

export const passkeyRouter = router({
  create: authedProcedure.input(ZCreateInputSchema).mutation(async ({ input, ctx }) => {
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

  delete: authedProcedure.input(ZDeleteInputSchema).mutation(async ({ input, ctx }) => {
    if (!UNSTABLE_HANDLER_CACHE.delete) {
      UNSTABLE_HANDLER_CACHE.delete = await import("./delete.handler").then((mod) => mod.deleteHandler);
    }

    // Unreachable code but required for type safety
    if (!UNSTABLE_HANDLER_CACHE.delete) {
      throw new Error("Failed to load handler");
    }

    return UNSTABLE_HANDLER_CACHE.delete({
      ctx,
      input,
    });
  }),

  update: authedProcedure.input(ZUpdateInputSchema).mutation(async ({ input, ctx }) => {
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

  find: authedProcedure.query(async ({ ctx }) => {
    if (!UNSTABLE_HANDLER_CACHE.find) {
      UNSTABLE_HANDLER_CACHE.find = await import("./find.handler").then((mod) => mod.findHandler);
    }

    // Unreachable code but required for type safety
    if (!UNSTABLE_HANDLER_CACHE.find) {
      throw new Error("Failed to load handler");
    }

    return UNSTABLE_HANDLER_CACHE.find({
      ctx,
    });
  }),

  createRegistrationOptions: authedProcedure.mutation(async ({ ctx }) => {
    if (!UNSTABLE_HANDLER_CACHE.createRegistrationOptions) {
      UNSTABLE_HANDLER_CACHE.createRegistrationOptions = await import(
        "./createRegistrationOptions.handler"
      ).then((mod) => mod.createRegistrationOptionsHandler);
    }

    // Unreachable code but required for type safety
    if (!UNSTABLE_HANDLER_CACHE.createRegistrationOptions) {
      throw new Error("Failed to load handler");
    }

    return UNSTABLE_HANDLER_CACHE.createRegistrationOptions({
      ctx,
    });
  }),

  createSignInOptions: publicProcedure.mutation(async ({ ctx }) => {
    if (!UNSTABLE_HANDLER_CACHE.createSignInOptions) {
      UNSTABLE_HANDLER_CACHE.createSignInOptions = await import("./createSignInOptions.handler").then(
        (mod) => mod.createSignInOptionsHandler
      );
    }

    // Unreachable code but required for type safety
    if (!UNSTABLE_HANDLER_CACHE.createSignInOptions) {
      throw new Error("Failed to load handler");
    }

    return UNSTABLE_HANDLER_CACHE.createSignInOptions({
      ctx,
    });
  }),
});
