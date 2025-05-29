import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

import type { TFindTeamMembersMatchingAttributeLogicInputSchema } from "@calcom/platform-libraries";

export class FindTeamMembersMatchingAttributeQueryDto {
  @ApiProperty({
    nullable: true,
  })
  attributesQueryValue!: TFindTeamMembersMatchingAttributeLogicInputSchema["attributesQueryValue"] | null;

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
