import { userAdminRouter } from "@calcom/features/commercial/users/server/trpc-router";
import { createNextApiHandler } from "@calcom/trpc/server/createNextApiHandler";

export default createNextApiHandler(userAdminRouter);
