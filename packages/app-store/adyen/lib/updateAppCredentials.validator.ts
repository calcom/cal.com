import { adyenCredentialKeysSchema } from "adyen/lib/adyenDataSchema";

import type { UpdateAppCredentialsOptions } from "@calcom/trpc/server/routers/viewer/apps/updateAppCredentials.handler";

const handleAdyenValidations = async ({ input }: UpdateAppCredentialsOptions) => {
  const validated = adyenCredentialKeysSchema.safeParse(input);
  if (!validated.success) throw new Error("Invalid input");
  return validated;
};

export default handleAdyenValidations;
