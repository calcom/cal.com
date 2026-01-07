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

  describe("buildBookingUrl", () => {
    it("should return correct URL for user without organization", () => {
      const user = {
        id: 1,
        name: "John Doe",
        username: "john-doe",
        avatarUrl: null,
        brandColor: null,
        darkBrandColor: null,
        weekStart: "Monday",
        metadata: {},
        organization: null,
        profiles: [],
      };
      const slug = "30min";

      const result = service.buildBookingUrl(user, slug);

      expect(result).toBe("https://cal.com/john-doe/30min");
    });

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
      const slug = "30min";

      const result = service.buildBookingUrl(user, slug);

      expect(result).toBe("https://acme.cal.com/owner1/30min");
    });

    it("should fall back to user username when profile has no username", () => {
      const user = {
        id: 1,
        name: "Keith",
        username: "keith",
        avatarUrl: null,
        brandColor: null,
        darkBrandColor: null,
        weekStart: "Monday",
        metadata: {},
        organization: { slug: "i" },
        profiles: [
          {
            username: null,
            organization: { slug: "i" },
          },
        ],
      };
      const slug = "30min";

      const result = service.buildBookingUrl(user, slug);

      expect(result).toBe("https://i.cal.com/keith/30min");
    });

    it("should return empty string when user is undefined", () => {
      const user = undefined;
      const slug = "30min";

      const result = service.buildBookingUrl(user, slug);

      expect(result).toBe("");
    });

    it("should handle organization with null slug", () => {
      const user = {
        id: 1,
        name: "User",
        username: "user",
        avatarUrl: null,
        brandColor: null,
        darkBrandColor: null,
        weekStart: "Monday",
        metadata: {},
        organization: { slug: null },
        profiles: [
          {
            username: "user",
            organization: { slug: null },
          },
        ],
      };
      const slug = "consultation";

      const result = service.buildBookingUrl(user, slug);

      expect(result).toBe("https://cal.com/user/consultation");
    });

    it("should handle base URL with trailing slash", () => {
      const { getBookerBaseUrlSync } = require("@calcom/platform-libraries/organizations");
      getBookerBaseUrlSync.mockReturnValueOnce("https://cal.com/");

      const user = {
        id: 1,
        name: "John",
        username: "john",
        avatarUrl: null,
        brandColor: null,
        darkBrandColor: null,
        weekStart: "Monday",
        metadata: {},
        organization: null,
        profiles: [],
      };
      const slug = "30min";

      const result = service.buildBookingUrl(user, slug);

      // Trailing slash should be stripped to avoid double slashes
      expect(result).toBe("https://cal.com/john/30min");
    });

    it("should return empty string when username is empty", () => {
      const user = {
        id: 1,
        name: "User",
        username: "",
        avatarUrl: null,
        brandColor: null,
        darkBrandColor: null,
        weekStart: "Monday",
        metadata: {},
        organization: null,
        profiles: [],
      };
      const slug = "30min";

      const result = service.buildBookingUrl(user, slug);

      expect(result).toBe("");
    });

    it("should return empty string when username is null", () => {
      const user = {
        id: 1,
        name: "User",
        username: null,
        avatarUrl: null,
        brandColor: null,
        darkBrandColor: null,
        weekStart: "Monday",
        metadata: {},
        organization: null,
        profiles: [],
      };
      const slug = "30min";

      const result = service.buildBookingUrl(user, slug);

      expect(result).toBe("");
    });
  });
});
