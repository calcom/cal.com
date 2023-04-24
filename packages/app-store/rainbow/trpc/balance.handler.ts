import type { TBalanceInputSchema } from "rainbow/trpc/balance.schema";

import { checkBalance } from "../utils/ethereum";

interface BalanceHandlerOptions {
  input: TBalanceInputSchema;
}

export const balanceHandler = async ({ input }: BalanceHandlerOptions) => {
  const { address, tokenAddress, chainId } = input;
  try {
    const hasBalance = await checkBalance(address, tokenAddress, chainId);

    return {
      data: {
        hasBalance,
      },
    };
  } catch (e) {
    return {
      data: {
        hasBalance: false,
      },
    };
  }
};
