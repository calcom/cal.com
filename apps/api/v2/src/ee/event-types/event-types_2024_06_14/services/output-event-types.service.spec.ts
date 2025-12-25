import { OutputEventTypesService_2024_06_14 } from "./output-event-types.service";

jest.mock("@calcom/features/ee/organizations/lib/orgDomains", () => ({
  getOrgFullOrigin: jest.fn((slug: string | null) => {
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
      const users = [
        {
          username: "john-doe",
          organization: null,
        },
      ] as Parameters<typeof service.buildBookingUrl>[0];
      const slug = "30min";

      const result = service.buildBookingUrl(users, slug);

      expect(result).toBe("https://cal.com/john-doe/30min");
    });

    it("should return correct URL for user with organization", () => {
      const users = [
        {
          username: "keith",
          organization: { slug: "i" },
        },
      ] as Parameters<typeof service.buildBookingUrl>[0];
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
        },
        {
          username: "second-user",
          organization: { slug: "org" },
        },
      ] as Parameters<typeof service.buildBookingUrl>[0];
      const slug = "meeting";

      const result = service.buildBookingUrl(users, slug);

      expect(result).toBe("https://cal.com/first-user/meeting");
    });

    it("should handle organization with null slug", () => {
      const users = [
        {
          username: "user",
          organization: { slug: null },
        },
      ] as Parameters<typeof service.buildBookingUrl>[0];
      const slug = "consultation";

      const result = service.buildBookingUrl(users, slug);

      expect(result).toBe("https://cal.com/user/consultation");
    });
  });
});
