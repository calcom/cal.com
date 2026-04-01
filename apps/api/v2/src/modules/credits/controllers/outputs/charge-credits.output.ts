import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

class ChargeCreditsBalanceDto {
  @ApiProperty({ description: "Remaining monthly credits", example: 445 })
  monthlyRemaining!: number;

  @ApiProperty({ description: "Additional purchased credits", example: 200 })
  additional!: number;
}

export class ChargeCreditsDataDto {
  @ApiProperty({ description: "Whether the credits were charged successfully" })
  charged!: boolean;

  @ApiPropertyOptional({ description: "Team ID that was charged, if applicable" })
  teamId?: number;

  @ApiProperty({ description: "Remaining balance after charge", type: ChargeCreditsBalanceDto })
  remainingBalance!: ChargeCreditsBalanceDto;
}
