import { z } from "zod";

import { zodAttributesQueryValue } from "@calcom/lib/raqb/zod";

export type TFindTeamMembersMatchingAttributeLogicInputSchema = {
  teamId: number;
  attributesQueryValue: z.infer<typeof zodAttributesQueryValue> | null;
  isPreview?: boolean;
  _enablePerf?: boolean;
  _concurrency?: number;
  cursor?: number;
  limit?: number;
  search?: string;
};

export const ZFindTeamMembersMatchingAttributeLogicInputSchema: z.ZodType<TFindTeamMembersMatchingAttributeLogicInputSchema> =
  z.object({
    teamId: z.number(),
    attributesQueryValue: zodAttributesQueryValue.nullable(),
    isPreview: z.boolean().optional(),
    _enablePerf: z.boolean().optional(),
    _concurrency: z.number().optional(),
    cursor: z.number().optional(),
    limit: z.number().min(1).max(100).optional(),
    search: z.string().optional(),
  });
