import { ApiProperty } from "@nestjs/swagger";

class CreditsBalanceDto {
  @ApiProperty({ description: "Remaining monthly credits", example: 450 })
  monthlyRemaining!: number;

  @ApiProperty({ description: "Additional purchased credits", example: 200 })
  additional!: number;
}

export class CreditsAvailableDataDto {
  @ApiProperty({ description: "Whether the user/team has available credits" })
  hasCredits!: boolean;

  @ApiProperty({ description: "Credit balance breakdown", type: CreditsBalanceDto })
  balance!: CreditsBalanceDto;
}
