"use client";

import { getTrpcUrl, createTrpcLinks, transformer } from "@calcom/trpc/react/config";

import { trpc } from "./trpc";

export const trpcClient = trpc.createClient({
  links: createTrpcLinks(getTrpcUrl()),
  transformer,
});
