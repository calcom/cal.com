import { createNextApiHandler } from "@calcom/trpc/server/createNextApiHandler";
import { verificationRouter } from "@calcom/trpc/server/routers/viewer/verification/_router";

export default createNextApiHandler(verificationRouter);
