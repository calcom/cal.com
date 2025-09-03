import { createNextApiHandler } from "@calcom/trpc/server/createNextApiHandler";
import { deleteRouter } from "@calcom/trpc/server/routers/viewer/eventTypes/delete/_router";

export default createNextApiHandler(deleteRouter);
