import appRoutingForms from "@calcom/routing-forms/trpc-router";
import { createNextApiHandler } from "@calcom/trpc/server/createNextApiHandler";

export default createNextApiHandler(appRoutingForms);
