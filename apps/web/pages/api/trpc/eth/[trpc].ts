import ethRouter from "@calcom/app-store/rainbow/trpc/router";
import { createNextApiHandler } from "@calcom/trpc/server/createNextApiHandler";

export default createNextApiHandler(ethRouter);
