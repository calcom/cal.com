import { z } from "zod";

import { Component } from "./components";

export const Card = z.object({
  key: z.string(),
  timeToLiveSeconds: z.number().int().min(0).nullish().default(null),
  components: z.array(Component).nullable(),
});
export type Card = z.infer<typeof Card>;

export const ResponseBody = z.object({
  cards: z.array(Card),
});
export type ResponseBody = z.infer<typeof ResponseBody>;
