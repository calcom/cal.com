import { optionToValueSchema } from "@calcom/prisma/zod-utils";
import { z } from "zod";

export const userBodySchema = z
  .object({
    locale: optionToValueSchema(z.string()),
    role: optionToValueSchema(z.enum(["USER", "ADMIN"])),
    weekStart: optionToValueSchema(z.string()),
    timeFormat: optionToValueSchema(z.number()),
    identityProvider: optionToValueSchema(z.enum(["CAL", "GOOGLE", "SAML"])),
  })
  .passthrough();
