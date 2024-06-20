import prismock from "../../../tests/libs/__mocks__/prisma";

import type { User } from "@prisma/client";
import { z } from "zod";

import { buildOrgMockData, buildProfileMockData } from "@calcom/lib/test/builder";
import { IdentityProvider } from "@calcom/prisma/enums";

export const ZCredential = z.object({
  id: z.number(),
  type: z.string(),
  userId: z.number().optional().nullable(),
  teamId: z.number().optional().nullable(),
  appId: z.string(),
  subscriptionId: z.string().optional().nullable(),
  paymentStatus: z.string().optional().nullable(),
  billingCycleStart: z.number().optional().nullable(),
});

export const piiFreeAppKeyTransformer = ZCredential.extend({
  key: z.object({
    disabledEvents: z.array(z.string()),
    projectId: z.string().transform((value) => !value),
    endpoint: z.string().transform((value) => !value),
    apiKey: z.string().transform((value) => !value),
  }),
});

export async function buildMockData(
  identityProvider: IdentityProvider = IdentityProvider.GOOGLE,
  identityProviderId: string | null = null
) {
  const promise: User = await prismock.user.create({
    data: {
      id: 1,
      username: "test",
      name: "Test User",
      email: "test@example.com",
      role: "ADMIN",
      identityProvider,
      identityProviderId,
    },
  });

  const user = await promise;
  return {
    ...user,
    organization: buildOrgMockData(),
    defaultBookerLayouts: null,
    selectedCalendars: [],
    destinationCalendar: null,
    profile: buildProfileMockData(),
    avatar: "",
    locale: "en",
  };
}
