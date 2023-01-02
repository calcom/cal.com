import { ethers } from "ethers";
import { configureChains, createClient } from "wagmi";
import { z } from "zod";

import { router, publicProcedure } from "@calcom/trpc/server/trpc";

import abi from "../utils/abi.json";
import { checkBalance, getProviders, SUPPORTED_CHAINS } from "../utils/ethereum";

const ethRouter = router({
  // Fetch contract `name` and `symbol` or error
  contract: publicProcedure
    .input(
      z.object({
        address: z.string(),
        chainId: z.number(),
      })
    )
    .output(
      z.object({
        data: z
          .object({
            name: z.string(),
            symbol: z.string(),
          })
          .nullish(),
        error: z.string().nullish(),
      })
    )
    .query(async ({ input }) => {
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
    }),
  // Fetch user's `balance` of either ERC-20 or ERC-721 compliant token or error
  balance: publicProcedure
    .input(
      z.object({
        address: z.string(),
        tokenAddress: z.string(),
        chainId: z.number(),
      })
    )
    .output(
      z.object({
        data: z
          .object({
            hasBalance: z.boolean(),
          })
          .nullish(),
        error: z.string().nullish(),
      })
    )
    .query(async ({ input }) => {
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
    }),
});

export default ethRouter;
