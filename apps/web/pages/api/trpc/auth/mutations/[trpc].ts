import { createNextApiHandler } from "@calcom/trpc/server/createNextApiHandler";
import { authRouter } from "@calcom/trpc/server/routers/viewer/auth/mutations/_router";

export default createNextApiHandler(authRouter);
