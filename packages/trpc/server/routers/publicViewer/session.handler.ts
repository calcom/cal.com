import type { Session } from "next-auth";

type SessionOptions = {
  ctx: {
    session: Session | null;
  };
};

export const sessionHandler = async ({ ctx }: SessionOptions) => {
  return ctx.session;
};

export default sessionHandler;
