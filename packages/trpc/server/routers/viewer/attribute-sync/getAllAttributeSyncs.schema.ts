import { z } from "zod";

// No input required - organizationId comes from context
export const getAllAttributeSyncsSchema = z.object({});

export type ZGetAllAttributeSyncsSchema = z.infer<typeof getAllAttributeSyncsSchema>;
