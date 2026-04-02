import { createDefaultAIPhoneServiceProvider } from "@calcom/features/calAIPhone";
import type { TrpcSessionUser } from "../../../types";
import type { TDeleteInputSchema } from "./delete.schema";

type DeleteHandlerOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TDeleteInputSchema;
};

export const deleteHandler = async ({ ctx, input }: DeleteHandlerOptions) => {
  const aiService = createDefaultAIPhoneServiceProvider();

  await aiService.deletePhoneNumber({
    phoneNumber: input.phoneNumber,
    userId: ctx.user.id,
    teamId: input.teamId,
    deleteFromDB: true,
  });

  return { message: "Phone number deleted successfully" };
};
