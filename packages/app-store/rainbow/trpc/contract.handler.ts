import { ethers } from "ethers";
import { configureChains, createClient } from "wagmi";

import abi from "../utils/abi.json";
import { getProviders, SUPPORTED_CHAINS } from "../utils/ethereum";
import type { TContractInputSchema } from "./contract.schema";

interface ContractHandlerOptions {
  input: TContractInputSchema;
}
export const contractHandler = async ({ input }: ContractHandlerOptions) => {
  const { address, chainId } = input;
  const { provider } = configureChains(
    SUPPORTED_CHAINS.filter((chain) => chain.id === chainId),
    getProviders()
  );

  const client = createClient({
    provider,
  });

  const contract = new ethers.Contract(address, abi, client.provider);

  try {
    const name = await contract.name();
    const symbol = await contract.symbol();

    return {
      data: {
        name,
        symbol: `$${symbol}`,
      },
    };
  } catch (e) {
    return {
      data: {
        name: address,
        symbol: "$UNKNOWN",
      },
    };
  }
};
