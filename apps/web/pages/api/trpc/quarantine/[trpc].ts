import { createNextApiHandler } from "@calcom/trpc/server/createNextApiHandler";
import { quarantineRouter } from "@calcom/trpc/server/routers/viewer/quarantine/_router";

export default createNextApiHandler(quarantineRouter);
