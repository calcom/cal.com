import { z } from "zod";

import { eventTypeAppCardZod } from "../eventTypeAppCardZod";

export const appKeysSchema = z.object({});

export const appDataSchema = eventTypeAppCardZod;
