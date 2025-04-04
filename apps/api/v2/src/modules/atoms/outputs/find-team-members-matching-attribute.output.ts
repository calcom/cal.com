import { ApiProperty } from "@nestjs/swagger";
import { Expose, Type } from "class-transformer";
import { IsString, ValidateNested } from "class-validator";

import { SUCCESS_STATUS, ERROR_STATUS } from "@calcom/platform-constants";
import { FindTeamMembersMatchingAttributeOutputDto } from "@calcom/platform-types";

export class FindTeamMembersMatchingAttributeResponseDto {
  @ApiProperty({ example: SUCCESS_STATUS, enum: [SUCCESS_STATUS, ERROR_STATUS] })
  @IsString()
  @Expose()
  readonly status!: typeof SUCCESS_STATUS | typeof ERROR_STATUS;

  @ValidateNested()
  @Type(() => FindTeamMembersMatchingAttributeOutputDto)
  @Expose()
  @ApiProperty({ type: FindTeamMembersMatchingAttributeOutputDto })
  readonly data!: FindTeamMembersMatchingAttributeOutputDto;
}
