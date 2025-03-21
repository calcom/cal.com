// import { ZodValidationPipe } from "@/lib/zod-validation-pipe";
import { ApiProperty } from "@nestjs/swagger";

import type { TFindTeamMembersMatchingAttributeLogicInputSchema } from "@calcom/platform-libraries";

export class FindTeamMembersMatchingAttributeQueryDto {
  @ApiProperty({
    required: false,
    nullable: true,
  })
  attributesQueryValue: TFindTeamMembersMatchingAttributeLogicInputSchema["attributesQueryValue"];

  @ApiProperty({
    type: Boolean,
    required: false,
  })
  isPreview?: boolean;

  @ApiProperty({
    type: Boolean,
    required: false,
  })
  enablePerf?: boolean;

  @ApiProperty({
    type: Number,
    required: false,
  })
  concurrency?: number;
}
