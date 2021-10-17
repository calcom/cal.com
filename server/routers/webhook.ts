import { createProtectedRouter } from "@server/createRouter";

export const webhookRouter = createProtectedRouter().mutation("edit", {
  resolve() {},
});
