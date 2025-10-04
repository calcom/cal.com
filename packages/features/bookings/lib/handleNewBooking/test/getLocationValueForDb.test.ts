import { describe, it, expect, vi } from "vitest";

import type { Prisma } from "@calcom/prisma/client";
import type { CredentialForCalendarService } from "@calcom/types/Credential";

import { _getLocationValuesForDb } from "../getLocationValuesForDb";

vi.mock("@calcom/prisma/zod-utils", () => ({
  userMetadata: { parse: (metadata: any) => metadata },
}));

vi.mock("@calcom/app-store/delegationCredential", () => ({
  getFirstDelegationConferencingCredentialAppLocation: ({
    credentials,
  }: {
    credentials: CredentialForCalendarService[];
  }) => (credentials[0] && (credentials[0] as any).__test__appLink) || null,
}));

type TestUser = {
  username: string | null;
  metadata: Prisma.JsonValue;
  credentials: CredentialForCalendarService[];
};

describe("_getLocationValuesForDb", () => {
  it("returns the provided location for single user bookings", () => {
    const users: TestUser[] = [
      {
        username: "alice",
        metadata: {},
        credentials: [],
      },
    ];
    const result = _getLocationValuesForDb({
      dynamicUserList: ["alice"],
      users,
      location: "https://meet.example.com/alice",
    });
    expect(result.locationBodyString).toBe("https://meet.example.com/alice");
    expect(result.organizerOrFirstDynamicGroupMemberDefaultLocationUrl).toBeUndefined();
  });

  it("uses the first group member's default conferencing appLink if set", () => {
    const users: TestUser[] = [
      {
        username: "bob",
        metadata: {
          defaultConferencingApp: {
            appSlug: "zoom",
            appLink: "https://zoom.us/bob",
          },
        },
        credentials: [],
      },
      {
        username: "carol",
        metadata: {},
        credentials: [],
      },
    ];
    const result = _getLocationValuesForDb({
      dynamicUserList: ["bob", "carol"],
      users,
      location: "https://meet.example.com/group",
    });
    expect(result.locationBodyString).toBe("https://zoom.us/bob");
    expect(result.organizerOrFirstDynamicGroupMemberDefaultLocationUrl).toBe("https://zoom.us/bob");
  });

  it("uses the first group member's first delegation credential's conferencing app if no preference is set", () => {
    const users: TestUser[] = [
      {
        username: "dave",
        metadata: {},
        credentials: [
          {
            __test__appLink: "https://meet.google.com/dave",
          } as unknown as CredentialForCalendarService,
        ],
      },
      {
        username: "eve",
        metadata: {},
        credentials: [],
      },
    ];
    const result = _getLocationValuesForDb({
      dynamicUserList: ["dave", "eve"],
      users,
      location: "https://meet.example.com/group",
    });
    expect(result.locationBodyString).toBe("https://meet.google.com/dave");
    expect(result.organizerOrFirstDynamicGroupMemberDefaultLocationUrl).toBe("https://meet.google.com/dave");
  });

  it("falls back to provided location if no preferences or credentials are set", () => {
    const users: TestUser[] = [
      {
        username: "frank",
        metadata: {},
        credentials: [],
      },
      {
        username: "grace",
        metadata: {},
        credentials: [],
      },
    ];
    const result = _getLocationValuesForDb({
      dynamicUserList: ["frank", "grace"],
      users,
      location: "https://meet.example.com/group",
    });
    expect(result.locationBodyString).toBe("https://meet.example.com/group");
    expect(result.organizerOrFirstDynamicGroupMemberDefaultLocationUrl).toBeNull();
  });

  it("falls back to provided location if preference is set but has no appLink", () => {
    const users: TestUser[] = [
      {
        username: "frank",
        metadata: {
          defaultConferencingApp: {
            appSlug: "daily-video",
          },
        },
        credentials: [],
      },
      {
        username: "grace",
        metadata: {},
        credentials: [],
      },
    ];
    const result = _getLocationValuesForDb({
      dynamicUserList: ["frank", "grace"],
      users,
      location: "https://meet.example.com/group",
    });
    expect(result.locationBodyString).toBe("https://meet.example.com/group");
    expect(result.organizerOrFirstDynamicGroupMemberDefaultLocationUrl).toBeNull();
  });

  it("sorts users according to dynamicUserList before picking the first member", () => {
    const users: TestUser[] = [
      {
        username: "zara",
        metadata: {
          defaultConferencingApp: {
            appSlug: "teams",
            appLink: "https://teams.microsoft.com/zara",
          },
        },
        credentials: [],
      },
      {
        username: "yanni",
        metadata: {},
        credentials: [],
      },
    ];
    // yanni is first in dynamicUserList, but zara is first in users array
    const result = _getLocationValuesForDb({
      dynamicUserList: ["yanni", "zara"],
      users,
      location: "https://meet.example.com/group",
    });
    // After sorting, yanni is first, has no preference, so fallback to location
    expect(result.locationBodyString).toBe("https://meet.example.com/group");
    expect(result.organizerOrFirstDynamicGroupMemberDefaultLocationUrl).toBeNull();
  });
});
