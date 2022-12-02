import type { Prisma } from "@prisma/client";
import { utils, Contract } from "ethers";
import { chain, configureChains, createClient } from "wagmi";
import { alchemyProvider } from "wagmi/providers/alchemy";
import { infuraProvider } from "wagmi/providers/infura";
import { publicProvider } from "wagmi/providers/public";

import { HttpError } from "@calcom/lib/http-error";

import abi from "./abi.json";

export const ETH_MESSAGE = "Connect to Cal.com";
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

type VerifyResult = {
  hasBalance: boolean;
  address: string;
};

// Checks balance for any contract that implements the abi (NFT, ERC20, etc)
export const checkBalance = async (
  walletAddress: string,
  tokenAddress: string,
  chainId: number
): Promise<boolean> => {
  const { provider } = configureChains(
    SUPPORTED_CHAINS.filter((chain) => chain.id === chainId),
    getProviders()
  );

  const client = createClient({
    provider,
  });

  const contract = new Contract(tokenAddress, abi, client.provider);
  const userAddress = utils.getAddress(walletAddress);
  const balance = await contract.balanceOf(userAddress);

  return !balance.isZero();
};

// Extracts wallet address from a signed message and checks balance
export const verifyEthSig = async (
  sig: string,
  tokenAddress: string,
  chainId: number
): Promise<VerifyResult> => {
  const address = utils.verifyMessage(ETH_MESSAGE, sig);
  const hasBalance = await checkBalance(address, tokenAddress, chainId);

  return {
    address,
    hasBalance,
  };
};

type HandleEthSignatureInput = {
  smartContractAddress?: string;
  blockchainId?: number;
};

// Handler used in `/book/event` API
export const handleEthSignature = async (
  _metadata: Prisma.JsonValue,
  ethSignature?: string
): Promise<string | undefined> => {
  if (!_metadata) {
    return;
  }
  const metadata = _metadata as HandleEthSignatureInput;

  if (metadata) {
    if (metadata.blockchainId && metadata.smartContractAddress) {
      if (!ethSignature) {
        throw new HttpError({ statusCode: 400, message: "Ethereum signature required." });
      }

      const { address, hasBalance } = await verifyEthSig(
        ethSignature,
        metadata.smartContractAddress as string,
        metadata.blockchainId as number
      );

      if (!hasBalance) {
        throw new HttpError({ statusCode: 400, message: "The wallet doesn't contain enough tokens." });
      } else {
        return address;
      }
    }
  }

  return undefined;
};
