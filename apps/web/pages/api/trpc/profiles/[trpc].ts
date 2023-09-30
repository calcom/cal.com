import { createNextApiHandler } from "@calcom/trpc/server/createNextApiHandler";
import { profilesRouter } from "@calcom/trpc/server/routers/viewer/profiles/_router";

export default createNextApiHandler(profilesRouter);
