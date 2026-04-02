import { ConfigService } from "@nestjs/config";
import { OutputEventTypesService_2024_06_14 } from "./output-event-types.service";
import { UsersService } from "@/modules/users/services/users.service";
import { UsersRepository } from "@/modules/users/users.repository";

jest.mock("@calcom/platform-libraries/organizations", () => ({
  getBookerBaseUrlSync: jest.fn((slug: string | null) => {
    if (!slug) return "https://cal.com";
    return `https://${slug}.cal.com`;
  }),
}));

describe("OutputEventTypesService_2024_06_14", () => {
  let service: OutputEventTypesService_2024_06_14;
  let configService: jest.Mocked<ConfigService>;
  let usersService: UsersService;

  beforeEach(() => {
    configService = {
      get: jest.fn((key: string, defaultValue?: string) => {
        if (key === "app.baseUrl") return "https://cal.com";
        return defaultValue;
      }),
    } as any;

    const usersRepository = {} as UsersRepository;
    usersService = new UsersService(usersRepository);

    service = new OutputEventTypesService_2024_06_14(configService, usersService);
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
        organizationId: null,
        organization: null,
        movedToProfile: null,
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
        organizationId: 1,
        organization: { slug: "acme" },
        movedToProfile: null,
        profiles: [
          {
            id: 100,
            username: "owner1",
            organizationId: 1,
            organization: { id: 1, slug: "acme", isPlatform: false },
          },
        ],
      };
      const slug = "30min";

      const result = service.buildBookingUrl(user, slug);

      expect(result).toBe("https://acme.cal.com/owner1/30min");
    });

    it("should use cal.com for non-managed users in platform orgs", () => {
      const user = {
        id: 1,
        name: "Test User",
        username: "platform-user", // Public username
        avatarUrl: null,
        brandColor: null,
        darkBrandColor: null,
        weekStart: "Monday",
        metadata: {},
        organizationId: 1,
        organization: { slug: "platform-org-slug" },
        movedToProfile: null,
        profiles: [
          {
            id: 100,
            username: "platform-user-generated-id", // Platform-generated username
            organizationId: 1,
            organization: { id: 1, slug: "platform-org-slug", isPlatform: true },
          },
        ],
      };
      const slug = "secret";

      const result = service.buildBookingUrl(user, slug);

      // Should use user.username (platform-user), not profile.username (platform-user-generated-id)
      expect(result).toBe("https://cal.com/platform-user/secret");
    });

    it("should return empty string for managed users", () => {
      const user = {
        id: 1,
        name: "Managed User",
        username: "managed-user-abc123",
        isPlatformManaged: true,
        avatarUrl: null,
        brandColor: null,
        darkBrandColor: null,
        weekStart: "Monday",
        metadata: {},
        organizationId: 1,
        organization: { slug: "platform-org" },
        movedToProfile: null,
        profiles: [],
      };
      const slug = "30min";

      const result = service.buildBookingUrl(user, slug);

      expect(result).toBe("");
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
        organizationId: 2,
        organization: { slug: "i" },
        movedToProfile: null,
        profiles: [
          {
            id: 200,
            username: null,
            organizationId: 2,
            organization: { id: 2, slug: "i", isPlatform: false },
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
        organizationId: 3,
        organization: { slug: null },
        movedToProfile: null,
        profiles: [
          {
            id: 300,
            username: "user",
            organizationId: 3,
            organization: { id: 3, slug: null, isPlatform: false },
          },
        ],
      };
      const slug = "consultation";

      const result = service.buildBookingUrl(user, slug);

      expect(result).toBe("https://cal.com/user/consultation");
    });

    it("should handle base URL with trailing slash", () => {
      const { getBookerBaseUrlSync } = require("@calcom/platform-libraries/organizations");
      getBookerBaseUrlSync.mockReturnValueOnce("https://acme.cal.com/");

      const user = {
        id: 1,
        name: "John",
        username: "john-acme",
        avatarUrl: null,
        brandColor: null,
        darkBrandColor: null,
        weekStart: "Monday",
        metadata: {},
        organizationId: 1,
        organization: { slug: "acme" },
        movedToProfile: null,
        profiles: [
          {
            id: 400,
            username: "john",
            organizationId: 1,
            organization: { id: 1, slug: "acme", isPlatform: false },
          },
        ],
      };
      const slug = "30min";

      const result = service.buildBookingUrl(user, slug);

      expect(result).toBe("https://acme.cal.com/john/30min");
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
        organizationId: null,
        organization: null,
        movedToProfile: null,
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
        organizationId: null,
        organization: null,
        movedToProfile: null,
        profiles: [],
      };
      const slug = "30min";

      const result = service.buildBookingUrl(user, slug);

      expect(result).toBe("");
    });
  });
});
