import { serialize } from "cookie";
import type { GetServerSidePropsContext } from "next";

export const withPagesCsrf =
  <A extends GetServerSidePropsContext, R extends Promise<any>>(handler: (args: A) => R) =>
  (context: A): R => {
    // Due to our implementation of buildLegacyCtx, we cannot use these methods on app dir
    // Hence the need of having a separate HOC for pages dir
    const csrfToken = context.res.getHeader("x-csrf-token") || "missing";
    context.res.setHeader("Set-Cookie", [
      serialize("x-csrf-token", `${csrfToken}`, {
        httpOnly: true,
        path: "/",
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
      }),
    ]);
    return handler(context);
  };
