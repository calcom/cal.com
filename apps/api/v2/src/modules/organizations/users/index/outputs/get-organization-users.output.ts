import { ERROR_STATUS, SUCCESS_STATUS } from "@calcom/platform-constants";
import { ApiProperty } from "@nestjs/swagger";
import { Expose, Type } from "class-transformer";
import { IsArray, IsEnum, IsInt, IsString, ValidateNested } from "class-validator";
import { GetUserOutput } from "@/modules/users/outputs/get-users.output";

export class ProfileOutput {
  @IsInt()
  @Expose()
  @ApiProperty({ type: Number, required: true, description: "The ID of the profile of user", example: 1 })
  id!: number;

  @IsInt()
  @Expose()
  @ApiProperty({
    type: Number,
    required: true,
    description: "The ID of the organization of user",
    example: 1,
  })
  organizationId!: number;

  @IsInt()
  @Expose()
  @ApiProperty({ type: Number, required: true, description: "The IDof the user", example: 1 })
  userId!: number;

  @IsString()
  @Expose()
  @ApiProperty({
    type: String,
    nullable: true,
    required: false,
    description: "The username of the user within the organization context",
    example: "john_doe",
  })
  username!: string;
}
export class GetOrgUsersWithProfileOutput extends GetUserOutput {
  @ApiProperty({
    description: "organization user profile, contains user data within the organizaton context",
  })
  @Expose()
  @ValidateNested()
  @IsArray()
  @Type(() => ProfileOutput)
  profile!: ProfileOutput;
}

export class GetOrganizationUsersResponseDTO {
  @ApiProperty({ example: SUCCESS_STATUS, enum: [SUCCESS_STATUS, ERROR_STATUS] })
  @IsEnum([SUCCESS_STATUS, ERROR_STATUS])
  status!: typeof SUCCESS_STATUS | typeof ERROR_STATUS;
  data!: GetOrgUsersWithProfileOutput[];
}

export class GetOrganizationUserOutput {
  @ApiProperty({ example: SUCCESS_STATUS, enum: [SUCCESS_STATUS, ERROR_STATUS] })
  @IsEnum([SUCCESS_STATUS, ERROR_STATUS])
  status!: typeof SUCCESS_STATUS | typeof ERROR_STATUS;
  data!: GetOrgUsersWithProfileOutput;
}
