import { z } from "zod";

import { markdownToSafeHTML } from "@calcom/lib/markdownToSafeHTML";
import { eventTypeMetaDataSchemaWithTypedApps } from "@calcom/prisma/zod-utils";

/**
 * Zod schema for eventType presenter.
 * - Transforms `description` to `descriptionAsSafeHTML` if present.
 * - Parses `metadata` using eventTypeMetaDataSchemaWithTypedApps, falls back to null if invalid or undefined.
 * - Passes through all other properties.
 */
const eventTypePresenterSchema = z
  .object({
    description: z.string().nullable().optional(),
    metadata: z.unknown().optional(),
  })
  .passthrough()
  .transform((evt) => {
    const { description, metadata, ...rest } = evt;
    const descriptionAsSafeHTML =
      description !== undefined ? markdownToSafeHTML(description ?? null) : undefined;
    let parsedMetadata: z.infer<typeof eventTypeMetaDataSchemaWithTypedApps> | null = null;
    if (metadata !== undefined) {
      const parsed = eventTypeMetaDataSchemaWithTypedApps.safeParse(metadata);
      parsedMetadata = parsed.success ? parsed.data : null;
    }
    return {
      ...rest,
      description,
      metadata: parsedMetadata,
      ...(description !== undefined ? { descriptionAsSafeHTML } : {}),
    };
  });

/**
 * Presents an eventType object by transforming and validating fields.
 * Returns a merged type of the original and transformed fields.
 *
 * Usage:
 *   const presented = presentEventType(rawEventType);
 */
export function presentEventType<T>(data: T) {
  type Output = z.infer<typeof eventTypePresenterSchema>;
  return eventTypePresenterSchema.parse(data) as {
    [K in keyof T | keyof Output]: K extends keyof Output ? Output[K] : K extends keyof T ? T[K] : never;
  };
}
