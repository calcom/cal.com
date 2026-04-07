import type { Prisma } from "@calcom/prisma/client";
import type { CredentialForCalendarService } from "@calcom/types/Credential";
import { describe, expect, it, vi } from "vitest";
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

vi.mock("@calcom/app-store/utils", () => ({
  getAppFromSlug: (slug: string) => {
    const apps: Record<string, { appData?: { location?: { type: string } } }> = {
      "google-meet": { appData: { location: { type: "integrations:google:meet" } } },
      "msteams": { appData: { location: { type: "integrations:office365_video" } } },
      "daily-video": { appData: { location: { type: "integrations:daily" } } },
    };
    return apps[slug] || undefined;
  },
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

  it("resolves location type from app metadata when appSlug is set but appLink is missing", () => {
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
    expect(result.locationBodyString).toBe("integrations:daily");
    expect(result.organizerOrFirstDynamicGroupMemberDefaultLocationUrl).toBeUndefined();
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
    const result = _getLocationValuesForDb({
      dynamicUserList: ["yanni", "zara"],
      users,
      location: "https://meet.example.com/group",
    });
    expect(result.locationBodyString).toBe("https://meet.example.com/group");
    expect(result.organizerOrFirstDynamicGroupMemberDefaultLocationUrl).toBeNull();
  });

  it("returns undefined for organizerOrFirstDynamicGroupMemberDefaultLocationUrl with single user", () => {
    const users: TestUser[] = [
      {
        username: "solo",
        metadata: {
          defaultConferencingApp: {
            appSlug: "zoom",
            appLink: "https://zoom.us/solo",
          },
        },
        credentials: [],
      },
    ];
    const result = _getLocationValuesForDb({
      dynamicUserList: ["solo"],
      users,
      location: "https://meet.example.com/solo",
    });
    expect(result.organizerOrFirstDynamicGroupMemberDefaultLocationUrl).toBeUndefined();
  });

  it("prefers appLink from metadata over delegation credential", () => {
    const users: TestUser[] = [
      {
        username: "alice",
        metadata: {
          defaultConferencingApp: {
            appSlug: "zoom",
            appLink: "https://zoom.us/alice",
          },
        },
        credentials: [
          {
            __test__appLink: "https://meet.google.com/delegation",
          } as unknown as CredentialForCalendarService,
        ],
      },
      {
        username: "bob",
        metadata: {},
        credentials: [],
      },
    ];
    const result = _getLocationValuesForDb({
      dynamicUserList: ["alice", "bob"],
      users,
      location: "https://fallback.example.com",
    });
    expect(result.locationBodyString).toBe("https://zoom.us/alice");
    expect(result.organizerOrFirstDynamicGroupMemberDefaultLocationUrl).toBe("https://zoom.us/alice");
  });

  it("handles null metadata gracefully for dynamic group", () => {
    const users: TestUser[] = [
      {
        username: "nullmeta",
        metadata: null,
        credentials: [],
      },
      {
        username: "other",
        metadata: {},
        credentials: [],
      },
    ];
    const result = _getLocationValuesForDb({
      dynamicUserList: ["nullmeta", "other"],
      users,
      location: "https://meet.example.com/group",
    });
    expect(result.locationBodyString).toBe("https://meet.example.com/group");
    expect(result.organizerOrFirstDynamicGroupMemberDefaultLocationUrl).toBeNull();
  });

  it("resolves location type from app metadata even when delegation credentials exist", () => {
    const users: TestUser[] = [
      {
        username: "slugonly",
        metadata: {
          defaultConferencingApp: {
            appSlug: "daily-video",
          },
        },
        credentials: [
          {
            __test__appLink: "https://daily.co/delegation",
          } as unknown as CredentialForCalendarService,
        ],
      },
      {
        username: "member2",
        metadata: {},
        credentials: [],
      },
    ];
    const result = _getLocationValuesForDb({
      dynamicUserList: ["slugonly", "member2"],
      users,
      location: "https://fallback.example.com",
    });
    // appSlug is set so the app metadata lookup is used, not the delegation credential
    expect(result.locationBodyString).toBe("integrations:daily");
    expect(result.organizerOrFirstDynamicGroupMemberDefaultLocationUrl).toBeUndefined();
  });

  it("uses delegation credential when user has no conferencing preference at all", () => {
    const users: TestUser[] = [
      {
        username: "nodefs",
        metadata: {},
        credentials: [
          {
            __test__appLink: "https://teams.microsoft.com/delegation",
          } as unknown as CredentialForCalendarService,
        ],
      },
      {
        username: "partner",
        metadata: {},
        credentials: [],
      },
    ];
    const result = _getLocationValuesForDb({
      dynamicUserList: ["nodefs", "partner"],
      users,
      location: "https://fallback.example.com",
    });
    expect(result.locationBodyString).toBe("https://teams.microsoft.com/delegation");
    expect(result.organizerOrFirstDynamicGroupMemberDefaultLocationUrl).toBe(
      "https://teams.microsoft.com/delegation"
    );
  });

  it("resolves Google Meet location type for dynamic group when first member has google-meet as default", () => {
    const users: TestUser[] = [
      {
        username: "alice",
        metadata: {
          defaultConferencingApp: {
            appSlug: "google-meet",
          },
        },
        credentials: [],
      },
      {
        username: "bob",
        metadata: {},
        credentials: [],
      },
    ];
    const result = _getLocationValuesForDb({
      dynamicUserList: ["alice", "bob"],
      users,
      location: "",
    });
    expect(result.locationBodyString).toBe("integrations:google:meet");
    expect(result.organizerOrFirstDynamicGroupMemberDefaultLocationUrl).toBeUndefined();
  });

  it("resolves MS Teams location type for dynamic group when first member has msteams as default", () => {
    const users: TestUser[] = [
      {
        username: "carol",
        metadata: {
          defaultConferencingApp: {
            appSlug: "msteams",
          },
        },
        credentials: [],
      },
      {
        username: "dave",
        metadata: {},
        credentials: [],
      },
    ];
    const result = _getLocationValuesForDb({
      dynamicUserList: ["carol", "dave"],
      users,
      location: "",
    });
    expect(result.locationBodyString).toBe("integrations:office365_video");
    expect(result.organizerOrFirstDynamicGroupMemberDefaultLocationUrl).toBeUndefined();
  });

  it("falls back to provided location when appSlug is unknown and has no appLink", () => {
    const users: TestUser[] = [
      {
        username: "eve",
        metadata: {
          defaultConferencingApp: {
            appSlug: "unknown-app",
          },
        },
        credentials: [],
      },
      {
        username: "frank",
        metadata: {},
        credentials: [],
      },
    ];
    const result = _getLocationValuesForDb({
      dynamicUserList: ["eve", "frank"],
      users,
      location: "https://fallback.example.com",
    });
    expect(result.locationBodyString).toBe("https://fallback.example.com");
    expect(result.organizerOrFirstDynamicGroupMemberDefaultLocationUrl).toBeUndefined();
  });
});
