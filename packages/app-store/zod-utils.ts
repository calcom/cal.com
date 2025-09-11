import { z } from "zod";

import { appDataSchemas } from "./apps.schemas.generated";

export const EventTypeAppMetadataSchema = z.object(appDataSchemas).partial();
export const eventTypeAppMetadataOptionalSchema = EventTypeAppMetadataSchema.optional();
