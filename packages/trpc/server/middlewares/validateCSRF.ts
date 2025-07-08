import { TRPCError } from "@trpc/server";

import { middleware } from "../trpc";

const validateCSRF = middleware(({ ctx, next }) => {
  const csrfToken = ctx.req?.cookies["csrf-token"];
  const csrfHeader = ctx.req?.headers["x-csrf-token"];
  console.table({
    "CSRF Token (header)": csrfHeader,
    "CSRF Token (cookie)": csrfToken,
  });
  if (ctx.req?.method !== "GET" && (!csrfHeader || csrfToken !== csrfHeader)) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Invalid CSRF token" });
  }
  return next();
});

export default validateCSRF;
