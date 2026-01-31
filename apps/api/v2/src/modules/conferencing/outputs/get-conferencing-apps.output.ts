import { ERROR_STATUS, GOOGLE_MEET_TYPE, SUCCESS_STATUS } from "@calcom/platform-constants";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Expose, Type } from "class-transformer";
import { IsBoolean, IsEnum, IsNumber, IsOptional, IsString, ValidateNested } from "class-validator";

export class ConferencingAppsOutputDto {
  @Expose()
  @IsNumber()
  @ApiProperty({ description: "Id of the conferencing app credentials" })
  id!: number;

  @ApiProperty({ example: GOOGLE_MEET_TYPE, description: "Type of conferencing app" })
  @Expose()
  @IsString()
  type!: string;

  @ApiPropertyOptional({ description: "Id of the user associated to the conferencing app", nullable: true })
  @Expose()
  @IsNumber()
  @IsOptional()
  userId?: number | null;

  @ApiPropertyOptional({ description: "Id of the team associated to the conferencing app", nullable: true })
  @Expose()
  @IsNumber()
  @IsOptional()
  teamId?: number | null;

  @ApiProperty({ example: "zoom", description: "App slug identifier" })
  @Expose()
  @IsString()
  appId!: string;

  @ApiPropertyOptional({ description: "Subscription id for paid apps", nullable: true })
  @Expose()
  @IsString()
  @IsOptional()
  subscriptionId?: string | null;

  @ApiPropertyOptional({ description: "Payment status for paid apps", nullable: true })
  @Expose()
  @IsString()
  @IsOptional()
  paymentStatus?: string | null;

  @ApiPropertyOptional({ description: "Billing cycle start timestamp", nullable: true })
  @Expose()
  @IsNumber()
  @IsOptional()
  billingCycleStart?: number | null;

  @ApiPropertyOptional({
    example: true,
    description: "Whether if the connection is working or not.",
    nullable: true,
  })
  @Expose()
  @IsBoolean()
  @IsOptional()
  invalid?: boolean | null;

  @ApiPropertyOptional({ description: "Id of the delegation credential if applicable", nullable: true })
  @Expose()
  @IsNumber()
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
