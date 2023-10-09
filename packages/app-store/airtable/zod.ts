import * as z from "zod";

import { eventTypeAppCardZod } from "@calcom/app-store/eventTypeAppCardZod";

export const appDataSchema = eventTypeAppCardZod.merge(
  z.object({
    baseId: z.string().optional(),
    tableId: z.string().optional(),
  })
);
export const appKeysSchema = z.object({
  personalAccessToken: z.string().min(1),
});

export const ZBases = z.object({
  bases: z.array(z.object({ id: z.string(), name: z.string() })),
});

export const ZEventAppMetadata = z.object({
  apps: z.object({
    airtable: appDataSchema.required(),
  }),
});

export const ZAddRecordResponse = z.object({
  id: z.string(),
  createdTime: z.string(),
  fields: z.record(z.any()),
});

export const ZTables = z.object({
  tables: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      fields: z.array(
        z.object({
          id: z.string(),
          name: z.string(),
        })
      ),
    })
  ),
});

export type TAppKeysSchema = z.infer<typeof appKeysSchema>;
