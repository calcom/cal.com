import type { GetServerSidePropsContext } from "next";
import { cookies, headers } from "next/headers";

export const withAppDirCsrf =
  <A extends GetServerSidePropsContext, R extends Promise<any>>(handler: (args: A) => R) =>
  (context: A): R => {
    const csrfToken = headers().get("x-csrf-token") || "missing";
    cookies().set("x-csrf-token", `${csrfToken}`, {
      httpOnly: true,
      path: "/",
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    });
    return handler(context);
  };
