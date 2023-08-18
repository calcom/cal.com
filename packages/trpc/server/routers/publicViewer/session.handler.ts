import type { Session } from "next-auth";

type SessionOptions = {
  ctx: {
    session: Session | null;
  };
};

export const sessionHandler = async ({ ctx }: SessionOptions) => {
  console.log("---------------------SESSION", ctx.session);
  return ctx.session;
};
