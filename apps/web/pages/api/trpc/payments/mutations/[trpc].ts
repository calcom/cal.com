import { createNextApiHandler } from "@calcom/trpc/server/createNextApiHandler";
import { paymentsMutationsRouter } from "@calcom/trpc/server/routers/viewer/payments/mutations/_router";

export default createNextApiHandler(paymentsMutationsRouter);
