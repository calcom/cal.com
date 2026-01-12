import { createDefaultAIPhoneServiceProvider } from "@calcom/features/calAIPhone";

import type { TDeleteInputSchema } from "./delete.schema";

type DeleteHandlerOptions = {
  ctx: {
    user: { id: number };
  };
  input: TDeleteInputSchema;
};

export const deleteHandler = async ({ ctx: { user: loggedInUser }, input }: DeleteHandlerOptions) => {
  const aiService = createDefaultAIPhoneServiceProvider();

  await aiService.deletePhoneNumber({
    phoneNumber: input.phoneNumber,
    userId: loggedInUser.id,
    teamId: input.teamId,
    deleteFromDB: true,
  });

  return { message: "Phone number deleted successfully" };
};
