import { createNextApiHandler } from "@calcom/trpc/server/createNextApiHandler";
import { getEventTypesFromGroupRouter } from "@calcom/trpc/server/routers/viewer/eventTypes/getEventTypesFromGroup/_router";

export default createNextApiHandler(getEventTypesFromGroupRouter);
