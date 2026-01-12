"use client";

import type { AppRouter } from "@calcom/trpc/app-router";

import { createTRPCReact } from "@trpc/react-query";

export const trpc = createTRPCReact<AppRouter>({});
