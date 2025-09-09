import prismaMock from "../../../tests/libs/__mocks__/prisma";

import { getGoogleMeetCredential, TestData } from "@calcom/web/test/utils/bookingScenario/bookingScenario";

import { describe, expect, it } from "vitest";

import { getDefaultLocations } from "./getDefaultLocations";

// Commented out restricted import: import { DailyLocationType, MeetLocationType } from "@calcom/app-store/locations";
const DailyLocationType = "integrations:daily";
const MeetLocationType = "integrations:google:meet";

type User = {
  id: number;
  email?: string;
  name?: string;
  metadata: {
    defaultConferencingApp?: {
      appSlug: string;
      appLink: string;
    };
  };
  credentials?: [
    {
      key: {
        expiry_date?: number;
        token_type?: string;
        access_token?: string;
        refresh_token?: string;
        scope: string;
      };
    }
  ];
};
describe("getDefaultLocation ", async () => {
  it("should return location based on user default conferencing app", async () => {
    const user: User = {
      id: 101,
      metadata: {
        defaultConferencingApp: {
          appSlug: "google-meet",
          appLink: "https://example.com",
        },
      },
      credentials: [getGoogleMeetCredential()],
    };
    await mockUser(user);
    await addAppsToDb([TestData.apps["google-meet"]]);
    // @ts-expect-error - Test fixture user.email may be undefined
    const res = await getDefaultLocations(user);
    expect(res[0]).toEqual({
      link: "https://example.com",
      type: MeetLocationType,
    });
  });
  it("should return calvideo when default conferencing app is not set", async () => {
    const user: User = {
      id: 101,
      metadata: {},
    };
    await mockUser(user);
    await addAppsToDb([TestData.apps["daily-video"]]);
    await prismaMock.app.create({
      data: {
        ...TestData.apps["daily-video"],
        enabled: true,
      },
    });
    // @ts-expect-error - Test fixture user.email may be undefined
    const res = await getDefaultLocations(user);
    expect(res[0]).toEqual(
      expect.objectContaining({
        type: DailyLocationType,
      })
    );
  });
});

async function mockUser(user: User) {
  const userToCreate = {
    ...TestData.users.example,
    ...user,
    ...(user.credentials && {
      credentials: {
        createMany: {
          data: user.credentials,
        },
      },
    }),
  };
  return await prismaMock.user.create({
    data: userToCreate as unknown,
  });
}
async function addAppsToDb(apps: unknown[]) {
  await prismaMock.app.createMany({
    data: apps.map((app) => {
      return { ...app, enabled: true };
    }),
  });
}
