import { createNextApiHandler } from "@calcom/trpc/server/createNextApiHandler";
import { kycVerificationRouter } from "@calcom/trpc/server/routers/viewer/kycVerification/_router";

export default createNextApiHandler(kycVerificationRouter);
