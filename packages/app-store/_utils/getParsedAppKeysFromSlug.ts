import type Zod from "zod";

import getAppKeysFromSlug from "./getAppKeysFromSlug";

export async function getParsedAppKeysFromSlug(slug: string, schema: Zod.Schema) {
  const appKeys = await getAppKeysFromSlug(slug);
  return schema.parse(appKeys);
}

export default getParsedAppKeysFromSlug;
