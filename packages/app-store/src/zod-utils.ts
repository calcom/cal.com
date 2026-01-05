import { z } from "zod";

import { eventTypeMetaDataSchemaWithoutApps } from "@calcom/prisma/zod-utils";

import { appDataSchemas } from "../generated/apps.schemas.generated";

export const EventTypeAppMetadataSchema = z.object(appDataSchemas).partial();
export const eventTypeAppMetadataOptionalSchema = EventTypeAppMetadataSchema.optional();

export const eventTypeMetaDataSchemaWithTypedApps = eventTypeMetaDataSchemaWithoutApps
  .unwrap()
  .merge(
    z.object({
      apps: eventTypeAppMetadataOptionalSchema,
    })
  )
  .nullable();
