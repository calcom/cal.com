import { createNextApiHandler } from "@calcom/trpc/server/createNextApiHandler";
import { phoneNumberMutationsRouter } from "@calcom/trpc/server/routers/viewer/phoneNumber/mutations/_router";

export default createNextApiHandler(phoneNumberMutationsRouter);
