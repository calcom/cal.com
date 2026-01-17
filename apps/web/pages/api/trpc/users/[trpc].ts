import { createNextApiHandler } from "@calcom/trpc/server/createNextApiHandler";
import { userAdminRouter } from "@calcom/trpc/server/routers/viewer/users/_router";

export default createNextApiHandler(userAdminRouter);
