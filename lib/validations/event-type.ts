import { z } from "zod";

import { _EventTypeModel as EventType } from "@calcom/prisma/zod";

export const schemaEventTypeBaseBodyParams = EventType.pick({
  title: true,
  slug: true,
  length: true,
}).partial();

const schemaEventTypeCreateParams = z
  .object({
    title: z.string(),
    slug: z.string(),
    length: z.number(),
  })
  .strict();

export const schemaEventTypeCreateBodyParams =
  schemaEventTypeBaseBodyParams.merge(schemaEventTypeCreateParams);

const schemaEventTypeEditParams = z
  .object({
    title: z.string().optional(),
    slug: z.string().optional(),
    length: z.number().optional(),
  })
  .strict();

export const schemaEventTypeEditBodyParams = schemaEventTypeBaseBodyParams.merge(schemaEventTypeEditParams);
export const schemaEventTypeReadPublic = EventType.pick({
  title: true,
  slug: true,
  length: true,
});

// import { z } from "zod";

// import { _EventTypeModel as EventType } from "@calcom/prisma/zod";

// export const schemaEventTypeBaseBodyParams = EventType.omit({ id: true }).partial();

// const schemaEventTypeRequiredParams = z.object({
//   title: z.string(),
//   slug: z.string(),
//   length: z.number(),
// });

// export const schemaEventTypeBodyParams = schemaEventTypeBaseBodyParams.merge(schemaEventTypeRequiredParams);
// // @NOTE: Removing locations and metadata properties before validation, add them later if required
// export const schemaEventTypePublic = EventType.omit({ locations: true, metadata: true });
