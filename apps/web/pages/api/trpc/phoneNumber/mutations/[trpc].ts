import { createNextApiHandler } from "@calcom/trpc/server/createNextApiHandler";
import { phoneNumberRouter } from "@calcom/trpc/server/routers/viewer/phoneNumber/mutations/_router";

export default createNextApiHandler(phoneNumberRouter);
