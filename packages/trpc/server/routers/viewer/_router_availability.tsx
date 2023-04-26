import { mergeRouters, router } from "../../trpc";
import { availabilityRouter } from "./availability/_router";

export const viewerRouter = mergeRouters(
  router({
    availability: availabilityRouter,
  })
);
