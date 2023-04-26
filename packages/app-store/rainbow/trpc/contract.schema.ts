import z from "zod";

export const ZContractInputSchema = z.object({
  address: z.string(),
  chainId: z.number(),
});

export const ZContractOutputSchema = z.object({
  data: z
    .object({
      name: z.string(),
      symbol: z.string(),
    })
    .nullish(),
  error: z.string().nullish(),
});

export type TContractInputSchema = z.infer<typeof ZContractInputSchema>;
export type TContractOutputSchema = z.infer<typeof ZContractOutputSchema>;
