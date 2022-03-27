import { withValidation } from "next-validations";
import { z } from "zod";

const schemaWebhook = z
  .object({})
  .strict();

const withValidWebhook = withValidation({
  schema: schemaWebhook,
  type: "Zod",
  mode: "body",
});

export { schemaWebhook, withValidWebhook };
