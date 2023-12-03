import { timeCapsuleRouter } from "@calcom/features/time-capsule/server/trpc-router";
import { createNextApiHandler } from "@calcom/trpc/server/createNextApiHandler";

export default createNextApiHandler(timeCapsuleRouter);
