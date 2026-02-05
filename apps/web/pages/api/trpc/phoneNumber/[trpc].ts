import { createNextApiHandler } from "@calcom/trpc/server/createNextApiHandler";
import { phoneNumberRouter } from "@calcom/trpc/server/routers/viewer/phoneNumber/_router";

export default createNextApiHandler(phoneNumberRouter);
