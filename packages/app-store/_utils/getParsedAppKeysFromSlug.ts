import type Zod from "zod";
import type z from "zod";

import getAppKeysFromSlug from "./getAppKeysFromSlug";

export async function getParsedAppKeysFromSlug<T extends Zod.Schema>(
  slug: string,
  schema: T
): Promise<z.infer<T>> {
  const appKeys = await getAppKeysFromSlug(slug);
  return schema.parse(appKeys);
}

export default getParsedAppKeysFromSlug;
