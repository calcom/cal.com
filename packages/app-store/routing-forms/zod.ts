import { z } from "zod";

// We have to keep appDataSchema as z.any() as otherwise the derived type of eventTypeAppMetadataSchema becomes very strict and throws errors at many places
// We should remove it, identify issues and fix them in a followup. Also, we should generalize the appDataSchema and define it instead of deriving from all apps. That should give us speed boost in TS
export const appDataSchema = z.any();
export const appKeysSchema = z.object({});
