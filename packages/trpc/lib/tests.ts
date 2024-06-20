import prismock from "../../../tests/libs/__mocks__/prisma";

import { z } from "zod";

import { IdentityProvider } from "@calcom/prisma/enums";

import type { CreateInnerContextOptions } from "../server/createContext";

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

export const buildOrgMockData = () => ({ id: null, isOrgAdmin: false, metadata: {}, requestedSlug: null });

export const buildProfileMockData = () => ({
  username: "test",
  upId: "usr-xx",
  id: null,
  organizationId: null,
  organization: null,
  name: "Test User",
  avatarUrl: null,
  startTime: 0,
  endTime: 1440,
  bufferTime: 0,
});

export async function buildMockData(
  identityProvider: IdentityProvider = IdentityProvider.GOOGLE,
  identityProviderId: string | null = null
): Pick<CreateInnerContextOptions, "user"> {
  const promise = await prismock.user.create({
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
