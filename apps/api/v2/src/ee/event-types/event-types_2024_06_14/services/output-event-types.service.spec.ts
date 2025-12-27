import { OutputEventTypesService_2024_06_14 } from "./output-event-types.service";

jest.mock("@calcom/platform-libraries/organizations", () => ({
  getBookerBaseUrlSync: jest.fn((slug: string | null) => {
    if (!slug) return "https://cal.com";
    return `https://${slug}.cal.com`;
  }),
}));

describe("OutputEventTypesService_2024_06_14", () => {
  let service: OutputEventTypesService_2024_06_14;

  beforeEach(() => {
    service = new OutputEventTypesService_2024_06_14();
  });

  describe("enrichUserWithProfile", () => {
    it("should use profile username for org users", () => {
      const user = {
        id: 1,
        name: "Owner",
        username: "owner1-acme",
        avatarUrl: null,
        brandColor: null,
        darkBrandColor: null,
        weekStart: "Monday",
        metadata: {},
        organization: { slug: "acme" },
        profiles: [
          {
            username: "owner1",
            organization: { slug: "acme" },
          },
        ],
      };

      const enriched = service.enrichUserWithProfile(user);

      expect(enriched.username).toBe("owner1");
      expect(enriched.profile?.organization?.slug).toBe("acme");
    });

    it("should keep original username for non-org users", () => {
      const user = {
        id: 1,
        name: "John",
        username: "john-doe",
        avatarUrl: null,
        brandColor: null,
        darkBrandColor: null,
        weekStart: "Monday",
        metadata: {},
        organization: null,
        profiles: [],
      };

      const enriched = service.enrichUserWithProfile(user);

      expect(enriched.username).toBe("john-doe");
      expect(enriched.profile).toBeNull();
    });
  });

  describe("buildBookingUrl", () => {
    it("should return correct URL for user without organization", () => {
      const users = [
        {
          username: "john-doe",
          organization: null,
          profiles: [],
        },
      ] as unknown as Parameters<typeof service.buildBookingUrl>[0];
      const slug = "30min";

      const result = service.buildBookingUrl(users, slug);

      expect(result).toBe("https://cal.com/john-doe/30min");
    });

    it("should use profile username for org users", () => {
      const users = [
        {
          username: "owner1-acme",
          organization: { slug: "acme" },
          profiles: [
            {
              username: "owner1",
              organization: { slug: "acme" },
            },
          ],
        },
      ] as unknown as Parameters<typeof service.buildBookingUrl>[0];
      const slug = "30min";

      const result = service.buildBookingUrl(users, slug);

      expect(result).toBe("https://acme.cal.com/owner1/30min");
    });

    it("should fall back to user data when no profile exists", () => {
      const users = [
        {
          username: "keith",
          organization: { slug: "i" },
          profiles: [],
        },
      ] as unknown as Parameters<typeof service.buildBookingUrl>[0];
      const slug = "30min";

      const result = service.buildBookingUrl(users, slug);

      expect(result).toBe("https://i.cal.com/keith/30min");
    });

    it("should return empty string when users array is empty", () => {
      const users: Parameters<typeof service.buildBookingUrl>[0] = [];
      const slug = "30min";

      const result = service.buildBookingUrl(users, slug);

      expect(result).toBe("");
    });

    it("should use first user when multiple users exist", () => {
      const users = [
        {
          username: "first-user",
          organization: null,
          profiles: [],
        },
        {
          username: "second-user",
          organization: { slug: "org" },
          profiles: [],
        },
      ] as unknown as Parameters<typeof service.buildBookingUrl>[0];
      const slug = "meeting";

      const result = service.buildBookingUrl(users, slug);

      expect(result).toBe("https://cal.com/first-user/meeting");
    });

    it("should handle organization with null slug", () => {
      const users = [
        {
          username: "user",
          organization: { slug: null },
          profiles: [],
        },
      ] as unknown as Parameters<typeof service.buildBookingUrl>[0];
      const slug = "consultation";

      const result = service.buildBookingUrl(users, slug);

      expect(result).toBe("https://cal.com/user/consultation");
    });

    it("should handle base URL with trailing slash", () => {
      const { getBookerBaseUrlSync } = require("@calcom/platform-libraries/organizations");
      getBookerBaseUrlSync.mockReturnValueOnce("https://cal.com/");

      const users = [
        {
          username: "john",
          organization: null,
          profiles: [],
        },
      ] as unknown as Parameters<typeof service.buildBookingUrl>[0];
      const slug = "30min";

      const result = service.buildBookingUrl(users, slug);

      // Trailing slash should be stripped to avoid double slashes
      expect(result).toBe("https://cal.com/john/30min");
    });

    it("should return empty string when username is empty", () => {
      const users = [
        {
          username: "",
          organization: null,
          profiles: [],
        },
      ] as unknown as Parameters<typeof service.buildBookingUrl>[0];
      const slug = "30min";

      const result = service.buildBookingUrl(users, slug);

      expect(result).toBe("");
    });

    it("should return empty string when username is null", () => {
      const users = [
        {
          username: null,
          organization: null,
          profiles: [],
        },
      ] as unknown as Parameters<typeof service.buildBookingUrl>[0];
      const slug = "30min";

      const result = service.buildBookingUrl(users, slug);

      expect(result).toBe("");
    });
  });
});
