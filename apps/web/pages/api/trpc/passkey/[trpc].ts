import { createNextApiHandler } from "@calcom/trpc/server/createNextApiHandler";
import { passkeyRouter } from "@calcom/trpc/server/routers/viewer/passkey/_router";

export default createNextApiHandler(passkeyRouter);
