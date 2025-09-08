import authedProcedure from "../../../../procedures/authedProcedure";
import { router } from "../../../../trpc";
import { ZDeleteMeInputSchema } from "./deleteMe.schema";
import { ZUpdateProfileInputSchema } from "./updateProfile.schema";

export const meRouter = router({
  deleteMe: authedProcedure.input(ZDeleteMeInputSchema).mutation(async ({ ctx, input }) => {
    const handler = (await import("./deleteMe.handler")).deleteMeHandler;
    return handler({ ctx, input });
  }),
  deleteMeWithoutPassword: authedProcedure.mutation(async ({ ctx }) => {
    const handler = (await import("./deleteMeWithoutPassword.handler")).deleteMeWithoutPasswordHandler;
    return handler({ ctx });
  }),
  updateProfile: authedProcedure.input(ZUpdateProfileInputSchema).mutation(async ({ ctx, input }) => {
    const handler = (await import("./updateProfile.handler")).updateProfileHandler;
    return handler({ ctx, input });
  }),
});
