import { z } from "zod";

import type { UpdateAppCredentialsOptions } from "@calcom/trpc/server/routers/viewer/apps/updateAppCredentials.handler";

import Paypal from "./Paypal";

const schema = z.object({
  credentialId: z.coerce.number(),
  key: z.object({
    client_id: z.string(),
    secret_key: z.string(),
  }),
});

const handlePaypalValidations = async ({ input }: UpdateAppCredentialsOptions) => {
  const validated = schema.safeParse(input);
  if (!validated.success) throw new Error("Invalid input");
  const { key } = validated.data;

  // Test credentials before saving
  const paypalClient = new Paypal({ clientId: key.client_id, secretKey: key.secret_key });
  const test = await paypalClient.test();
  if (!test) throw new Error("Provided credentials failed to authenticate");

  // Delete all existing webhooks
  const webhooksToDelete = await paypalClient.listWebhooks();
  if (webhooksToDelete) {
    const promises = webhooksToDelete.map((webhook) => paypalClient.deleteWebhook(webhook));
    await Promise.all(promises);
  }

  // Create webhook for this installation
  const webhookId = await paypalClient.createWebhook();
  if (!webhookId) {
    // @TODO: make a button that tries to create the webhook again
    console.error("Failed to create webhook", webhookId);
    throw new Error("Failed to create webhook");
  }

  return {
    client_id: key.client_id,
    secret_key: key.secret_key,
    webhook_id: webhookId,
  };
};

export default handlePaypalValidations;
