import { chain } from "wagmi";
import { alchemyProvider } from "wagmi/providers/alchemy";
import { infuraProvider } from "wagmi/providers/infura";
import { publicProvider } from "wagmi/providers/public";

export const SUPPORTED_CHAINS = [chain.mainnet, chain.polygon, chain.optimism, chain.arbitrum];

export const SUPPORTED_CHAINS_FOR_FORM = SUPPORTED_CHAINS.map((chain) => {
  return { value: chain.id, label: chain.name };
});

// Optionally grabs Alchemy, Infura, in addition to public providers
export const getProviders = () => {
  let providers = []; // eslint-disable-line prefer-const

  if (process.env.ALCHEMY_API_KEY) {
    providers.push(alchemyProvider({ apiKey: process.env.ALCHEMY_API_KEY }));
  }

  if (process.env.INFURA_API_KEY) {
    providers.push(infuraProvider({ apiKey: process.env.INFURA_API_KEY }));
  }

  // Public provider will always be available as fallback, but having at least
  // on of either Infura or Alchemy providers is highly recommended
  providers.push(publicProvider());

  return providers;
};
