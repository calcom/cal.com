import z from "zod";

export const ZBalanceInputSchema = z.object({
  address: z.string(),
  tokenAddress: z.string(),
  chainId: z.number(),
});

export const ZBalanceOutputSchema = z.object({
  data: z
    .object({
      hasBalance: z.boolean(),
    })
    .nullish(),
  error: z.string().nullish(),
});

export type TBalanceOutputSchema = z.infer<typeof ZBalanceOutputSchema>;
export type TBalanceInputSchema = z.infer<typeof ZBalanceInputSchema>;
