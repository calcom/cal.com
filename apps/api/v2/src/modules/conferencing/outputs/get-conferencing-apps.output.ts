import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Expose, Type } from "class-transformer";
import { IsString, ValidateNested, IsEnum, IsNumber, IsOptional, IsBoolean } from "class-validator";

import { ERROR_STATUS, GOOGLE_MEET_TYPE, SUCCESS_STATUS } from "@calcom/platform-constants";

export class ConferencingAppsOutputDto {
  @Expose()
  @IsNumber()
  @ApiProperty({ description: "Id of the conferencing app credentials" })
  id!: number;

  @ApiProperty({ example: "zoom", description: "App identifier" })
  @Expose()
  @IsString()
  @IsOptional()
  appId?: string;

  @ApiProperty({ example: GOOGLE_MEET_TYPE, description: "Type of conferencing app" })
  @Expose()
  @IsString()
  type!: string;

  @ApiProperty({ description: "Id of the user associated to the conferencing app" })
  @Expose()
  @IsNumber()
  @IsOptional()
  userId!: number | null;

  @ApiPropertyOptional({
    description: "Team ID if the credential belongs to a team",
    nullable: true,
  })
  @Expose()
  @IsNumber()
  @IsOptional()
  teamId?: number | null;

  @ApiPropertyOptional({
    example: true,
    description: "Whether if the connection is working or not.",
    nullable: true,
  })
  @Expose()
  @IsBoolean()
  @IsOptional()
  invalid?: boolean | null;

  @ApiPropertyOptional({
    description: "Delegation credential ID",
    nullable: true,
  })
  @IsNumber()
  @Expose()
  @IsOptional()
  delegationCredentialId?: number | null;
}

export class ConferencingAppsOutputResponseDto {
  @ApiProperty({ type: String, enum: [SUCCESS_STATUS, ERROR_STATUS] })
  @IsEnum([SUCCESS_STATUS, ERROR_STATUS])
  status!: typeof SUCCESS_STATUS | typeof ERROR_STATUS;

  @Expose()
  @ValidateNested({ each: true })
  @Type(() => ConferencingAppsOutputDto)
  @ApiProperty({ type: [ConferencingAppsOutputDto] })
  data!: ConferencingAppsOutputDto[];
}

export class ConferencingAppOutputResponseDto {
  @ApiProperty({ type: String, enum: [SUCCESS_STATUS, ERROR_STATUS] })
  @IsEnum([SUCCESS_STATUS, ERROR_STATUS])
  status!: typeof SUCCESS_STATUS | typeof ERROR_STATUS;

  @Expose()
  @ValidateNested()
  @Type(() => ConferencingAppsOutputDto)
  @ApiProperty({ type: ConferencingAppsOutputDto })
  data!: ConferencingAppsOutputDto;
}

export class DisconnectConferencingAppOutputResponseDto {
  @ApiProperty({ example: SUCCESS_STATUS, enum: [SUCCESS_STATUS, ERROR_STATUS] })
  @IsEnum([SUCCESS_STATUS, ERROR_STATUS])
  status!: typeof SUCCESS_STATUS | typeof ERROR_STATUS;
}
