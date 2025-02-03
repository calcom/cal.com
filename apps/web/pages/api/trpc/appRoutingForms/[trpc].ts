import appRoutingForms from "@calcom/features/routing-forms/trpc-router";
import { createNextApiHandler } from "@calcom/trpc/server/createNextApiHandler";

export default createNextApiHandler(appRoutingForms);
