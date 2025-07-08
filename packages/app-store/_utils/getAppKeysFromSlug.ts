import type { Prisma } from "@prisma/client";

import prisma from "@calcom/prisma";

async function getAppKeysFromSlug(slug: string) {
  const app = await prisma.app.findUnique({ where: { slug } });
  console.log("app: ", app);
  return (app?.keys || {}) as Prisma.JsonObject;
}

export default getAppKeysFromSlug;
