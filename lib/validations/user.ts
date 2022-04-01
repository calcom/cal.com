import { withValidation } from "next-validations";
import { z } from "zod";

import { _UserModel as User } from "@calcom/prisma/zod";

export const schemaUserBaseBodyParams = User.omit({
  id: true,
  createdAt: true,
  password: true,
  twoFactorEnabled: true,
  twoFactorSecret: true,
}).partial();

const schemaUserRequiredParams = z.object({
  email: z.string().email(),
});

export const schemaUserBodyParams = schemaUserBaseBodyParams.merge(schemaUserRequiredParams);

export const schemaUserPublic = User.omit({
  identityProvider: true,
  identityProviderId: true,
  plan: true,
  metadata: true,
  password: true,
  twoFactorEnabled: true,
  twoFactorSecret: true,
  trialEndsAt: true,
  completedOnboarding: true,
});

export const withValidUser = withValidation({
  schema: schemaUserBodyParams,
  type: "Zod",
  mode: "body",
});
