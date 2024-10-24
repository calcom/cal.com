import type { UpdateAppCredentialsOptions } from "@calcom/trpc/server/routers/viewer/apps/updateAppCredentials.handler";

import { appKeysSchema } from "../zod";

const handleAdyenValidations = async ({ input }: UpdateAppCredentialsOptions) => {
  const validated = appKeysSchema.safeParse(input);
  if (!validated.success) throw new Error("Invalid input");
  return validated;
};

export default handleAdyenValidations;
