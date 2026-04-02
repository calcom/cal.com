import { eventTypeMetaDataSchemaWithoutApps } from "@calcom/prisma/zod-utils";
import { z } from "zod";
import { appDataSchemas } from "./apps.schemas.generated";

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
