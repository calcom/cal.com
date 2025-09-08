"use client";

import { QueryClient } from "@tanstack/react-query";

import { createQueryClientConfig } from "@calcom/trpc/react/config";

export const queryClient = new QueryClient(createQueryClientConfig());
