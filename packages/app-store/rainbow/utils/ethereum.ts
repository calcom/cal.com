import { chain } from "wagmi";

export const SUPPORTED_CHAINS = [chain.mainnet, chain.polygon, chain.optimism, chain.arbitrum];

export const SUPPORTED_CHAINS_FOR_FORM = SUPPORTED_CHAINS.map((chain) => {
  return { value: chain.id, label: chain.name };
});
