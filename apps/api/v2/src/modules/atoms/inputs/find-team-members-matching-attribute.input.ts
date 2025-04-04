import { ApiPropertyOptional } from "@nestjs/swagger";

import type { TFindTeamMembersMatchingAttributeLogicInputSchema } from "@calcom/platform-libraries";

export class FindTeamMembersMatchingAttributeQueryDto {
  @ApiPropertyOptional({
    nullable: true,
  })
  attributesQueryValue: TFindTeamMembersMatchingAttributeLogicInputSchema["attributesQueryValue"];

  @ApiPropertyOptional({
    type: Boolean,
  })
  isPreview?: boolean;

  @ApiPropertyOptional({
    type: Boolean,
  })
  enablePerf?: boolean;

  @ApiPropertyOptional({
    type: Number,
  })
  concurrency?: number;
}
