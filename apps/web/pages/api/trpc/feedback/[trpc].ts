import { createNextApiHandler } from "@calcom/trpc/server/createNextApiHandler";
import { feedbackRouter } from "@calcom/trpc/server/routers/viewer/feedback/_router";

export default createNextApiHandler(feedbackRouter);
