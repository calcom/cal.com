import { TRPCError } from "@trpc/server";
import { MiddlewareFunction } from "@trpc/server/dist/declarations/src/internals/middlewares";

import { Context } from "../createContext";

type NewContext = Omit<Context, "user"> & {
  user: NonNullable<Context["user"]>;
};

type UserRequired = MiddlewareFunction<Context, NewContext>;

function userRequired({ ctx, next }: Parameters<UserRequired>[0]): ReturnType<UserRequired> {
  const { user } = ctx;
  if (!user) throw new TRPCError({ code: "UNAUTHORIZED" });

  return next({
    ctx: {
      ...ctx,
      // session value is known to be non-null now
      user,
    },
  });
}

export default userRequired;
