import { WebClient } from "@slack/web-api";

const getUserEmail = async (client: WebClient, userId: string) =>
  await (
    await client.users.info({ user: userId })
  ).user?.profile?.email;

export { getUserEmail };
