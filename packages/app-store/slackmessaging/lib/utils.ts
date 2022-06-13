import { WebClient } from "@slack/web-api";
import { z } from "zod";

import getAppKeysFromSlug from "../../_utils/getAppKeysFromSlug";

export const getUserEmail = async (client: WebClient, userId: string) =>
  (await client.users.info({ user: userId })).user?.profile?.email;

const slackAppKeysSchema = z.object({
  client_id: z.string(),
  client_secret: z.string(),
  signing_secret: z.string(),
});

export const getSlackAppKeys = async () => {
  const appKeys = await getAppKeysFromSlug("slack");
  return slackAppKeysSchema.parse(appKeys);
};
