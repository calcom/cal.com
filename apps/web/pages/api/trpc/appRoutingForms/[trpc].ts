import { createNextApiHandler } from "@calcom/trpc/server/createNextApiHandler";
import appRoutingForms from "@calcom/trpc/server/routers/apps/routing-forms/_router";

export default createNextApiHandler(appRoutingForms);
