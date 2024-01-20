import { createHash } from "crypto";

import type { PrismaClient } from "@calcom/prisma";

import type { AppFlags } from "../config";

type Feature = {
  feature_state_value: null;
  feature: {
    name: string;
    id: number;
    type: string;
  };
  enabled: boolean;
};

type Header = {
  "Content-Type": string;
  "x-environment-key"?: string;
};
const FLAGSMITH_ENVIRONMENT_ID = process.env.FLAGSMITH_ENVIRONMENT_ID;
async function getFlagsmithFlags(id?: number) {
  // const baseUrl = `https://edge.api.flagsmith.com/api/v1`;
  const baseUrl = `http://13.233.201.155:8000/api/v1`;
  let uri;
  if (!!id) {
    const hashedUserId = createHash("md5").update(`${id}`).digest("hex");
    uri = `${baseUrl}/identities/?identifier=${hashedUserId}`;
  } else {
    uri = `${baseUrl}/flags/`;
  }
  const headers: Header = {
    "Content-Type": "application/json",
  };
  if (FLAGSMITH_ENVIRONMENT_ID) {
    headers["x-environment-key"] = FLAGSMITH_ENVIRONMENT_ID;
  }
  const response = await fetch(uri, {
    method: "GET",
    headers,
  });
  const res = await response.json();
  return res.flags ? (res.flags as Feature[]) : (res as Feature[]);
}

export async function getFeatureFlagMap(prisma: PrismaClient, userId?: number): Promise<AppFlags> {
  if (!!FLAGSMITH_ENVIRONMENT_ID) {
    const flags = await getFlagsmithFlags(userId);
    const res = flags.reduce<AppFlags>((acc, flag) => {
      acc[flag.feature.name as keyof AppFlags] = flag.enabled;
      return acc;
    }, {} as AppFlags);
    return res;
  } else {
    const flags = await prisma.feature.findMany({
      orderBy: { slug: "asc" },
      cacheStrategy: { swr: 300, ttl: 300 },
    });
    return flags.reduce<AppFlags>((acc, flag) => {
      acc[flag.slug as keyof AppFlags] = flag.enabled;
      return acc;
    }, {} as AppFlags);
  }
}
