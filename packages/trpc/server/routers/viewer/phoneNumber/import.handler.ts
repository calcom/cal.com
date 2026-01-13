import { createDefaultAIPhoneServiceProvider } from "@calcom/features/calAIPhone";

import type { TImportInputSchema } from "./import.schema";

type ImportHandlerOptions = {
  ctx: {
    user: {
      id: number;
    };
  };
  input: TImportInputSchema;
};

export const importHandler = async ({ ctx: { user: loggedInUser }, input }: ImportHandlerOptions) => {
  const {
    phoneNumber,
    terminationUri,
    sipTrunkAuthUsername,
    sipTrunkAuthPassword,
    nickname,
    teamId,
    agentId,
  } = input;
  const aiService = createDefaultAIPhoneServiceProvider();

  const importedPhoneNumber = await aiService.importPhoneNumber({
    phone_number: phoneNumber,
    termination_uri: terminationUri,
    sip_trunk_auth_username: sipTrunkAuthUsername,
    sip_trunk_auth_password: sipTrunkAuthPassword,
    nickname,
    userId: loggedInUser.id,
    teamId,
    agentId,
  });

  return importedPhoneNumber;
};
