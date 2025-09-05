import { ERROR_STATUS, SUCCESS_STATUS } from "@calcom/platform-constants";
import { MembershipRole } from "@calcom/platform-libraries";
import { OrgTeamOutputDto } from "@calcom/platform-types";
import { ApiProperty } from "@nestjs/swagger";
import { Expose, Type } from "class-transformer";
import { IsEnum, IsString, ValidateNested } from "class-validator";

export class OrgMeTeamOutputDto extends OrgTeamOutputDto {
  @IsString()
  @Expose()
  readonly accepted!: boolean;

  @ApiProperty({
    example: MembershipRole.MEMBER,
    enum: [MembershipRole.ADMIN, MembershipRole.OWNER, MembershipRole.MEMBER],
  })
  @IsEnum([MembershipRole.ADMIN, MembershipRole.OWNER, MembershipRole.MEMBER])
  @Expose()
  readonly role!: MembershipRole;
}

export class OrgTeamsOutputResponseDto {
  @ApiProperty({ example: SUCCESS_STATUS, enum: [SUCCESS_STATUS, ERROR_STATUS] })
  @IsEnum([SUCCESS_STATUS, ERROR_STATUS])
  status!: typeof SUCCESS_STATUS | typeof ERROR_STATUS;

  @Expose()
  @ValidateNested()
  @Type(() => OrgTeamOutputDto)
  data!: OrgTeamOutputDto[];
}

export class OrgMeTeamsOutputResponseDto {
  @ApiProperty({ example: SUCCESS_STATUS, enum: [SUCCESS_STATUS, ERROR_STATUS] })
  @IsEnum([SUCCESS_STATUS, ERROR_STATUS])
  status!: typeof SUCCESS_STATUS | typeof ERROR_STATUS;

  @Expose()
  @ValidateNested()
  @Type(() => OrgTeamOutputDto)
  data!: OrgTeamOutputDto[];
}

export class OrgTeamOutputResponseDto {
  @ApiProperty({ example: SUCCESS_STATUS, enum: [SUCCESS_STATUS, ERROR_STATUS] })
  @IsEnum([SUCCESS_STATUS, ERROR_STATUS])
  status!: typeof SUCCESS_STATUS | typeof ERROR_STATUS;

  @Expose()
  @ValidateNested()
  @Type(() => OrgTeamOutputDto)
  data!: OrgTeamOutputDto;
}
