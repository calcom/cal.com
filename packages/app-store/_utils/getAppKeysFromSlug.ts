import type { Prisma } from "@prisma/client";

import prisma from "@calcom/prisma";

async function getAppKeysFromSlug(slug: string, enabled?: boolean) {
  let where = {
    slug,
  } as Prisma.AppWhereUniqueInput;
  if (enabled) {
    where = { ...where, enabled: true };
  }
  const app = await prisma.app.findUnique({ where: where });
  return (app?.keys || {}) as Prisma.JsonObject;
}

export default getAppKeysFromSlug;
