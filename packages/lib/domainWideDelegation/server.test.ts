import { setupAndTeardown } from "@calcom/web/test/utils/bookingScenario/setupAndTeardown";

import { describe, it, expect, vi, beforeEach } from "vitest";

import { metadata as googleCalendarMetadata } from "@calcom/app-store/googlecalendar/_metadata";
import { metadata as googleMeetMetadata } from "@calcom/app-store/googlevideo/_metadata";
import { DomainWideDelegationRepository } from "@calcom/lib/server/repository/domainWideDelegation";

import { getAllDwdCredentialsForUser } from "./server";

describe("getAllDwdCredentialsForUser", () => {
  setupAndTeardown();

  const mockUser = {
    email: "test@example.com",
    id: 123,
  };

  let mockFindByUserIncludeSensitiveServiceAccountKey: ReturnType<typeof vi.fn>;
  let mockRepository: { findByUserIncludeSensitiveServiceAccountKey: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    mockFindByUserIncludeSensitiveServiceAccountKey = vi.fn();
    mockRepository = {
      findByUserIncludeSensitiveServiceAccountKey: mockFindByUserIncludeSensitiveServiceAccountKey,
    };
    vi.spyOn(
      DomainWideDelegationRepository,
      "findByUserIncludeSensitiveServiceAccountKey"
    ).mockImplementation(mockFindByUserIncludeSensitiveServiceAccountKey);
  });

  it("should return empty array when no DWD found", async () => {
    mockFindByUserIncludeSensitiveServiceAccountKey.mockResolvedValue(null);

    const result = await getAllDwdCredentialsForUser({ user: mockUser });

    expect(result).toEqual([]);
    expect(mockFindByUserIncludeSensitiveServiceAccountKey).toHaveBeenCalledWith({
      user: { email: mockUser.email },
    });
  });

  it("should return empty array when DWD is disabled", async () => {
    mockFindByUserIncludeSensitiveServiceAccountKey.mockResolvedValue({
      enabled: false,
      id: "dwd-1",
      workspacePlatform: { slug: "google" },
    });

    const result = await getAllDwdCredentialsForUser({ user: mockUser });

    expect(result).toEqual([]);
    expect(mockFindByUserIncludeSensitiveServiceAccountKey).toHaveBeenCalledWith({
      user: { email: mockUser.email },
    });
  });

  it("should return credentials for enabled Google DWD", async () => {
    mockFindByUserIncludeSensitiveServiceAccountKey.mockResolvedValue({
      enabled: true,
      id: "dwd-1",
      workspacePlatform: { slug: "google" },
      serviceAccountKey: {
        access_token: "NOOP_UNUSED_DELEGATION_TOKEN",
      },
    });

    const result = await getAllDwdCredentialsForUser({ user: mockUser });

    expect(mockFindByUserIncludeSensitiveServiceAccountKey).toHaveBeenCalledWith({
      user: { email: mockUser.email },
    });
    expect(result).toHaveLength(2);
    expect(result).toEqual([
      {
        type: googleCalendarMetadata.type,
        appId: googleCalendarMetadata.slug,
        id: -1,
        delegatedToId: "dwd-1",
        userId: mockUser.id,
        user: { email: mockUser.email },
        key: { access_token: "NOOP_UNUSED_DELEGATION_TOKEN" },
        invalid: false,
        teamId: null,
        team: null,
        delegatedTo: {
          serviceAccountKey: {
            access_token: "NOOP_UNUSED_DELEGATION_TOKEN",
          },
        },
      },
      {
        type: googleMeetMetadata.type,
        appId: googleMeetMetadata.slug,
        id: -1,
        delegatedToId: "dwd-1",
        delegatedTo: {
          serviceAccountKey: {
            access_token: "NOOP_UNUSED_DELEGATION_TOKEN",
          },
        },
        userId: mockUser.id,
        user: { email: mockUser.email },
        key: { access_token: "NOOP_UNUSED_DELEGATION_TOKEN" },
        invalid: false,
        teamId: null,
        team: null,
      },
    ]);
  });

  it("should return empty array for non-Google platforms", async () => {
    mockFindByUserIncludeSensitiveServiceAccountKey.mockResolvedValue({
      enabled: true,
      id: "dwd-1",
      workspacePlatform: { slug: "microsoft" },
    });

    const result = await getAllDwdCredentialsForUser({ user: mockUser });

    expect(result).toEqual([]);
    expect(mockFindByUserIncludeSensitiveServiceAccountKey).toHaveBeenCalledWith({
      user: { email: mockUser.email },
    });
  });
});
