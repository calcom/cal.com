import { z } from "zod";

const ExchangeCodeSchema = z.object({
  tokenId: z.string(),
});

export type ExchangeCodeParams = z.infer<typeof ExchangeCodeSchema>;

export type ExchangeCodeResponse = {
  accessToken: string;
  refreshToken: string;
};
