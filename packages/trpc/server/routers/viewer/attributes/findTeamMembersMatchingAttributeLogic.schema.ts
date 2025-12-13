import { z } from "zod";

import { zodAttributesQueryValue } from "@calcom/lib/raqb/zod";

// Define type first to use with z.ZodType annotation
// This prevents full Zod generic tree from being emitted in .d.ts files
export type TFindTeamMembersMatchingAttributeLogicInputSchema = {
  teamId: number;
  attributesQueryValue: z.infer<typeof zodAttributesQueryValue> | null;
  isPreview?: boolean;
  _enablePerf?: boolean;
  _concurrency?: number;
};

export const ZFindTeamMembersMatchingAttributeLogicInputSchema: z.ZodType<TFindTeamMembersMatchingAttributeLogicInputSchema> =
  z.object({
    teamId: z.number(),
    attributesQueryValue: zodAttributesQueryValue.nullable(),
    isPreview: z.boolean().optional(),
    _enablePerf: z.boolean().optional(),
    _concurrency: z.number().optional(),
  });
