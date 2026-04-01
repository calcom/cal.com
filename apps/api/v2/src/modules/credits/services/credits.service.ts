import { Injectable } from "@nestjs/common";

import { CreditService, CreditUsageType } from "@calcom/platform-libraries";

interface AvailableCreditsResult {
  hasCredits: boolean;
  balance: {
    monthlyRemaining: number;
    additional: number;
  };
}

interface ChargeCreditsResult {
  charged: boolean;
  teamId?: number;
  remainingBalance: {
    monthlyRemaining: number;
    additional: number;
  };
}

@Injectable()
export class CreditsService {
  async getAvailableCredits({
    userId,
    teamId,
  }: {
    userId: number;
    teamId?: number | null;
  }): Promise<AvailableCreditsResult> {
    const creditService = new CreditService();

    const hasCredits = await creditService.hasAvailableCredits({
      userId,
      teamId,
    });

    const credits = await creditService.getAllCredits({ userId, teamId });

    return {
      hasCredits,
      balance: {
        monthlyRemaining: credits.totalRemainingMonthlyCredits,
        additional: credits.additionalCredits,
      },
    };
  }

  async chargeCredits({
    userId,
    credits,
    creditFor,
    externalRef,
  }: {
    userId: number;
    credits: number;
    creditFor: CreditUsageType;
    externalRef?: string;
  }): Promise<ChargeCreditsResult> {
    const creditService = new CreditService();

    const result = await creditService.chargeCredits({
      userId,
      credits,
      creditFor,
      externalRef,
    });

    const updatedCredits = await creditService.getAllCredits({
      userId,
      teamId: result?.teamId,
    });

    return {
      charged: true,
      teamId: result?.teamId,
      remainingBalance: {
        monthlyRemaining: updatedCredits.totalRemainingMonthlyCredits,
        additional: updatedCredits.additionalCredits,
      },
    };
  }
}
