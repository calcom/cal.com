import { setupAndTeardown } from "@calcom/web/test/utils/bookingScenario/setupAndTeardown";

import { describe, it, expect, vi, beforeEach } from "vitest";

import { metadata as googleCalendarMetadata } from "@calcom/app-store/googlecalendar/_metadata";
import { metadata as googleMeetMetadata } from "@calcom/app-store/googlevideo/_metadata";
import { DomainWideDelegationRepository } from "@calcom/lib/server/repository/domainWideDelegation";

import { getAllDomainWideDelegationCredentialsForUser } from "./server";

describe("getAllDomainWideDelegationCredentialsForUser", () => {
  setupAndTeardown();

  const mockUser = {
    email: "test@example.com",
    id: 123,
  };

  let mockFindByUser: ReturnType<typeof vi.fn>;
  let mockRepository: { findByUser: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    mockFindByUser = vi.fn();
    mockRepository = {
      findByUser: mockFindByUser,
    };
    vi.spyOn(DomainWideDelegationRepository, "findByUser").mockImplementation(mockFindByUser);
  });

  it("should return empty array when no DWD found", async () => {
    mockFindByUser.mockResolvedValue(null);

    const result = await getAllDomainWideDelegationCredentialsForUser({ user: mockUser });

    expect(result).toEqual([]);
    expect(mockFindByUser).toHaveBeenCalledWith({ user: { email: mockUser.email } });
  });

  it("should return empty array when DWD is disabled", async () => {
    mockFindByUser.mockResolvedValue({
      enabled: false,
      id: "dwd-1",
      workspacePlatform: { slug: "google" },
    });

    const result = await getAllDomainWideDelegationCredentialsForUser({ user: mockUser });

    expect(result).toEqual([]);
    expect(mockFindByUser).toHaveBeenCalledWith({ user: { email: mockUser.email } });
  });

  it("should return credentials for enabled Google DWD", async () => {
    mockFindByUser.mockResolvedValue({
      enabled: true,
      id: "dwd-1",
      workspacePlatform: { slug: "google" },
    });

    const result = await getAllDomainWideDelegationCredentialsForUser({ user: mockUser });

    expect(mockFindByUser).toHaveBeenCalledWith({ user: { email: mockUser.email } });
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
      },
      {
        type: googleMeetMetadata.type,
        appId: googleMeetMetadata.slug,
        id: -1,
        delegatedToId: "dwd-1",
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
    mockFindByUser.mockResolvedValue({
      enabled: true,
      id: "dwd-1",
      workspacePlatform: { slug: "microsoft" },
    });

    const result = await getAllDomainWideDelegationCredentialsForUser({ user: mockUser });

    expect(result).toEqual([]);
    expect(mockFindByUser).toHaveBeenCalledWith({ user: { email: mockUser.email } });
  });
});
