import { userAdminRouter } from "@calcom/features/ee/users/server/trpc-router";
import { createNextApiHandler } from "@calcom/trpc/server/createNextApiHandler";

export default createNextApiHandler(userAdminRouter);
