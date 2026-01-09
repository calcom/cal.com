import { ERROR_STATUS, SUCCESS_STATUS } from "@calcom/platform-constants";
import { ApiProperty } from "@nestjs/swagger";
import { Expose, Type } from "class-transformer";
import { IsEnum, IsString, ValidateNested } from "class-validator";

export class InviteDataDto {
  @IsString()
  @Expose()
  @ApiProperty({
    description:
      "Unique invitation token for this team. Share this token with prospective members to allow them to join the team.",
    example: "f6a5c8b1d2e34c7f90a1b2c3d4e5f6a5b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2",
  })
  token!: string;

  @IsString()
  @Expose()
  @ApiProperty({
    description:
      "Complete invitation URL that can be shared with prospective members. Opens the signup page with the token and redirects to getting started after signup.",
    example:
      "http://app.cal.com/signup?token=f6a5c8b1d2e34c7f90a1b2c3d4e5f6a5b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2&callbackUrl=/getting-started",
  })
  inviteLink!: string;
}

export class CreateInviteOutputDto {
  @Expose()
  @ApiProperty({ example: SUCCESS_STATUS, enum: [SUCCESS_STATUS, ERROR_STATUS] })
  @IsEnum([SUCCESS_STATUS, ERROR_STATUS])
  status!: typeof SUCCESS_STATUS | typeof ERROR_STATUS;

  @Expose()
  @ValidateNested()
  @Type(() => InviteDataDto)
  @ApiProperty({ type: InviteDataDto })
  data!: InviteDataDto;
}
