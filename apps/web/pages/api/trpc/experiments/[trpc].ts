import { experimentsRouter } from "@calcom/trpc/server/routers/viewer/experiments/_router";
import { createNextApiHandler } from "@calcom/trpc/server/createNextApiHandler";

export default createNextApiHandler(experimentsRouter, true, "experiments");
