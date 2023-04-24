import { checkBalance } from "../utils/ethereum";
import type { TBalanceInputSchema } from "./balance.schema";

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
