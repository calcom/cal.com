import { PrivateLinksService_2024_09_04 } from "./private-links.service";
import { PrivateLinksRepository } from "@/ee/event-types-private-links/shared/private-links.repository";
import { PrivateLinksInputService } from "@/ee/event-types-private-links/shared/private-links-input.service";
import { PrivateLinksOutputService } from "@/ee/event-types-private-links/shared/private-links-output.service";

jest.mock("@calcom/platform-libraries/organizations", () => ({
  getBookerBaseUrlSync: jest.fn((slug: string | null) => {
    if (!slug) return "https://cal.com";
    return `https://${slug}.cal.com`;
  }),
}));

jest.mock("@calcom/platform-libraries/private-links", () => ({
  generateHashedLink: jest.fn(() => "mock-hash-123"),
  isLinkExpired: jest.fn(() => false),
}));

describe("PrivateLinksService_2024_09_04", () => {
  let service: PrivateLinksService_2024_09_04;
  let mockRepo: jest.Mocked<PrivateLinksRepository>;
  let mockInputService: PrivateLinksInputService;
  let mockOutputService: PrivateLinksOutputService;

  beforeEach(() => {
    mockRepo = {
      createIncludeEventTypeSlugAndOrg: jest.fn(),
      listByEventTypeIdIncludeEventTypeSlugAndOrg: jest.fn(),
      findByLinkIncludeEventTypeSlugAndOrg: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    } as unknown as jest.Mocked<PrivateLinksRepository>;

    mockInputService = new PrivateLinksInputService();
    mockOutputService = new PrivateLinksOutputService();

    service = new PrivateLinksService_2024_09_04(mockInputService, mockOutputService, mockRepo);
  });

  describe("buildBookingUrl (via createPrivateLink)", () => {
    it("should build correct URL for non-org user", async () => {
      const created = {
        link: "abc123",
        expiresAt: new Date("2026-12-31"),
        maxUsageCount: 1,
        usageCount: 0,
        eventType: {
          slug: "30min",
          team: null,
          owner: { profiles: [] },
        },
      };
      mockRepo.createIncludeEventTypeSlugAndOrg.mockResolvedValue(created);

      const result = await service.createPrivateLink(1, 100, {
        expiresAt: new Date("2026-12-31T00:00:00Z"),
      });

      expect(result.bookingUrl).toBe("https://cal.com/d/abc123/30min");
    });

    it("should build correct URL for org user via owner profile", async () => {
      const created = {
        link: "def456",
        expiresAt: null,
        maxUsageCount: 5,
        usageCount: 0,
        eventType: {
          slug: "consultation",
          team: null,
          owner: {
            profiles: [{ username: "john", organization: { slug: "acme" } }],
          },
        },
      };
      mockRepo.createIncludeEventTypeSlugAndOrg.mockResolvedValue(created);

      const result = await service.createPrivateLink(2, 200, {
        maxUsageCount: 5,
      });

      expect(result.bookingUrl).toBe("https://acme.cal.com/d/def456/consultation");
    });

    it("should build correct URL for team event type under org parent", async () => {
      const created = {
        link: "ghi789",
        expiresAt: new Date("2026-06-01"),
        maxUsageCount: 1,
        usageCount: 0,
        eventType: {
          slug: "team-meeting",
          team: { slug: "engineering", isOrganization: false, parent: { slug: "acme" } },
          owner: null,
        },
      };
      mockRepo.createIncludeEventTypeSlugAndOrg.mockResolvedValue(created);

      const result = await service.createPrivateLink(3, 300, {
        expiresAt: new Date("2026-06-01T00:00:00Z"),
      });

      expect(result.bookingUrl).toBe("https://acme.cal.com/d/ghi789/team-meeting");
    });

    it("should build correct URL when team IS the org", async () => {
      const created = {
        link: "jkl012",
        expiresAt: new Date("2026-06-01"),
        maxUsageCount: 1,
        usageCount: 0,
        eventType: {
          slug: "org-meeting",
          team: { slug: "bigcorp", isOrganization: true, parent: null },
          owner: null,
        },
      };
      mockRepo.createIncludeEventTypeSlugAndOrg.mockResolvedValue(created);

      const result = await service.createPrivateLink(4, 400, {
        expiresAt: new Date("2026-06-01T00:00:00Z"),
      });

      expect(result.bookingUrl).toBe("https://bigcorp.cal.com/d/jkl012/org-meeting");
    });
  });

  describe("getPrivateLinks", () => {
    it("should return links with correct booking URLs", async () => {
      const links = [
        {
          link: "link1",
          expiresAt: new Date("2026-12-31"),
          maxUsageCount: 1,
          usageCount: 0,
          eventType: { slug: "30min", team: null, owner: { profiles: [] } },
        },
        {
          link: "link2",
          expiresAt: null,
          maxUsageCount: 10,
          usageCount: 3,
          eventType: {
            slug: "60min",
            team: null,
            owner: { profiles: [{ username: "alice", organization: { slug: "corp" } }] },
          },
        },
      ];
      mockRepo.listByEventTypeIdIncludeEventTypeSlugAndOrg.mockResolvedValue(links);

      const results = await service.getPrivateLinks(1);

      expect(results).toHaveLength(2);
      expect(results[0].bookingUrl).toBe("https://cal.com/d/link1/30min");
      expect(results[1].bookingUrl).toBe("https://corp.cal.com/d/link2/60min");
    });
  });

  describe("updatePrivateLink", () => {
    it("should not overwrite expiresAt when omitted from update input", async () => {
      mockRepo.update.mockResolvedValue({ count: 1 });
      mockRepo.findByLinkIncludeEventTypeSlugAndOrg.mockResolvedValue({
        link: "abc123",
        expiresAt: new Date("2026-12-31"),
        maxUsageCount: 1,
        usageCount: 0,
        eventType: { slug: "30min", team: null, owner: { profiles: [] } },
      });

      await service.updatePrivateLink(1, { linkId: "abc123", maxUsageCount: 5 });

      expect(mockRepo.update).toHaveBeenCalledWith(1, {
        link: "abc123",
        expiresAt: undefined,
        maxUsageCount: 5,
      });
    });
  });

  describe("deletePrivateLink", () => {
    it("should throw NotFoundException when link does not exist", async () => {
      mockRepo.delete.mockResolvedValue({ count: 0 });

      await expect(service.deletePrivateLink(1, "nonexistent")).rejects.toThrow("Deleted link not found");
    });

    it("should succeed when link exists", async () => {
      mockRepo.delete.mockResolvedValue({ count: 1 });

      await expect(service.deletePrivateLink(1, "abc123")).resolves.toBeUndefined();
    });
  });
});
