import { IsEnum, IsInt, IsOptional, IsString, Min } from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

import { CreditUsageType } from "@calcom/platform-libraries";

export class ChargeCreditsInput {
  @ApiProperty({ description: "Number of credits to charge", example: 5 })
  @IsInt()
  @Min(1)
  credits!: number;

  @ApiProperty({
    description: "What the credits are being charged for",
    enum: CreditUsageType,
    example: CreditUsageType.AI_AGENT,
  })
  @IsEnum(CreditUsageType)
  creditFor!: CreditUsageType;

  @ApiPropertyOptional({
    description: "Unique external reference for idempotency",
    example: "agent-thread-123-1711432800000",
  })
  @IsOptional()
  @IsString()
  externalRef?: string;
}
