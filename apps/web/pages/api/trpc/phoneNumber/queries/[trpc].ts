import { createNextApiHandler } from "@calcom/trpc/server/createNextApiHandler";
import { phoneNumberQueriesRouter } from "@calcom/trpc/server/routers/viewer/phoneNumber/queries/_router";

export default createNextApiHandler(phoneNumberQueriesRouter);
