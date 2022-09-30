import { z } from "zod";

export const appDataSchema = z.object({
  smartContractAddress: z.string().optional(),
  blockchainId: z.number().optional(),
});
