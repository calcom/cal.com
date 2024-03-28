import prisma from "@calcom/prisma";

import { appKeysSchema as zohoKeysSchema } from "../zohocalendar/zod";

async function updateAppServerLocation(slug: string, serverUrl: string) {
  const app = await prisma.app.findUnique({ where: { slug } });
  const { client_id, client_secret } = zohoKeysSchema.parse(app?.keys) || {};
  const updatedKeys = { client_id, client_secret, server_location: serverUrl };
  await prisma.app.update({
    where: { slug },
    data: { keys: updatedKeys },
  });
}

export default updateAppServerLocation;
