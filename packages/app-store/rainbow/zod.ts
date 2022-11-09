import { z } from "zod";

import { eventTypeAppCardZod } from "../eventTypeAppCardZod";

export const appDataSchema = eventTypeAppCardZod.merge(
  z.object({
    smartContractAddress: z.string().optional(),
    blockchainId: z.number().optional(),
  })
);

export const appKeysSchema = z.object({});
