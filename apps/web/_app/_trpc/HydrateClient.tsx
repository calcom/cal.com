"use client";

import { createHydrateClient } from "_app/_trpc/createHydrateClient";
import superjson from "superjson";

export const HydrateClient = createHydrateClient({
  transformer: superjson,
});
