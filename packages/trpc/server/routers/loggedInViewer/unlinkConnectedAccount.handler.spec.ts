import prismock from "../../../../../tests/libs/__mocks__/prisma";

import { describe, expect, it } from "vitest";

import { IdentityProvider } from "@calcom/prisma/enums";

import unlinkConnectedAccountHandler from "./unlinkConnectedAccount.handler";

const buildOrgMockData = () => ({ id: null, isOrgAdmin: false, metadata: {}, requestedSlug: null });

const buildProfileMockData = () => ({
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

async function buildMockData(
  identityProvider: IdentityProvider = IdentityProvider.GOOGLE,
  identityProviderId: string | null = null
) {
  const promise = await prismock.user.create({
    data: {
      id: 1,
      username: "test",
      name: "Test User",
      email: "test@example.com",
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

describe("unlinkConnectedAccount.handler", () => {
  it("Should response with a success message when unlinking an Google account", async () => {
    const user = await buildMockData(IdentityProvider.GOOGLE, "123456789012345678901");
    const response = await unlinkConnectedAccountHandler({ ctx: { user } });
    expect(response).toMatchInlineSnapshot(`
      {
        "message": "account_unlinked_success",
      }
    `);
  });
  it("Should respond with an error message if unlink was unsucessful", async () => {
    const user = await buildMockData(IdentityProvider.CAL);
    const response = await unlinkConnectedAccountHandler({ ctx: { user } });
    expect(response).toMatchInlineSnapshot(`
      {
        "message": "account_unlinked_error",
      }
    `);
  });
});
