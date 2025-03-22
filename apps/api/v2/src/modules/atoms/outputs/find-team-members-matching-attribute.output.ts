import { ApiProperty } from "@nestjs/swagger";
import { Expose, Type } from "class-transformer";
import { IsArray, IsInt, IsOptional, IsString, ValidateNested } from "class-validator";

import { SUCCESS_STATUS, ERROR_STATUS } from "@calcom/platform-constants";

export class TeamMemberDto {
  @IsInt()
  @Expose()
  readonly id!: number;

  @IsOptional()
  @IsString()
  @Expose()
  readonly name!: string | null;

  @IsString()
  @Expose()
  readonly email!: string;
}

export class FindTeamMembersMatchingAttributeOutputDto {
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TeamMemberDto)
  @Expose()
  readonly result!: TeamMemberDto[] | null;
}

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
