import { createNextApiHandler } from "@calcom/trpc/server/createNextApiHandler";
import { slotsRouter } from "@calcom/trpc/server/routers/viewer/slots/mutations/_router";

export default createNextApiHandler(slotsRouter);
