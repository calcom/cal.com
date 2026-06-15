import { z } from "zod";

import { eventTypeMetaDataSchemaWithoutApps } from "@calcom/prisma/zod-utils";

/**
 * Lazy-loads app data schemas from the generated file only when first accessed.
 * This avoids eagerly loading ~50 app zod schemas (~650KB) at module import time.
 */
function loadAppDataSchemas() {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { appDataSchemas } = require("./apps.schemas.generated");
  const EventTypeAppMetadataSchema = z.object(appDataSchemas).partial();
  const eventTypeAppMetadataOptionalSchema = EventTypeAppMetadataSchema.optional();
  const eventTypeMetaDataSchemaWithTypedApps = eventTypeMetaDataSchemaWithoutApps
    .unwrap()
    .merge(
      z.object({
        apps: eventTypeAppMetadataOptionalSchema,
      })
    )
    .nullable();
  return {
    EventTypeAppMetadataSchema,
    eventTypeAppMetadataOptionalSchema,
    eventTypeMetaDataSchemaWithTypedApps,
  };
}

type LazySchemas = ReturnType<typeof loadAppDataSchemas>;

/** Creates a Proxy that lazily initializes an object on first property access. */
function lazyProxy<T extends object>(init: () => T): T {
  let instance: T | null = null;
  return new Proxy({} as T, {
    get(_target, key: string) {
      if (key === "then" || key === "__esModule") return undefined;
      if (!instance) instance = init();
      const value = (instance as Record<string, unknown>)[key];
      return typeof value === "function" ? value.bind(instance) : value;
    },
  });
}

export const EventTypeAppMetadataSchema: LazySchemas["EventTypeAppMetadataSchema"] = lazyProxy(
  () => loadAppDataSchemas().EventTypeAppMetadataSchema
);
export const eventTypeAppMetadataOptionalSchema: LazySchemas["eventTypeAppMetadataOptionalSchema"] = lazyProxy(
  () => loadAppDataSchemas().eventTypeAppMetadataOptionalSchema
);
export const eventTypeMetaDataSchemaWithTypedApps: LazySchemas["eventTypeMetaDataSchemaWithTypedApps"] = lazyProxy(
  () => loadAppDataSchemas().eventTypeMetaDataSchemaWithTypedApps
);
