import { describe, expect, it } from "vitest";

import { getBrandingForEventType, getBrandingForUser, getBrandingForTeam } from "./getBranding";

describe("getBranding", () => {
  describe("getBrandingForEventType", () => {
    describe("team events", () => {
      it("should use parent org branding when parent has brandColor", () => {
        const eventType = {
          team: {
            name: "Team A",
            brandColor: "#AAAAAA",
            darkBrandColor: "#BBBBBB",
            theme: "light",
            parent: {
              brandColor: "#111111",
              darkBrandColor: "#222222",
              theme: "dark",
            },
          },
          users: [],
        };

        const result = getBrandingForEventType({ eventType });

        expect(result).toEqual({
          theme: "dark",
          brandColor: "#111111",
          darkBrandColor: "#222222",
        });
      });

      it("should use parent org branding when parent has darkBrandColor", () => {
        const eventType = {
          team: {
            name: "Team A",
            brandColor: "#AAAAAA",
            darkBrandColor: "#BBBBBB",
            theme: "light",
            parent: {
              brandColor: null,
              darkBrandColor: "#222222",
              theme: "dark",
            },
          },
          users: [],
        };

        const result = getBrandingForEventType({ eventType });

        expect(result).toEqual({
          theme: "dark",
          brandColor: null,
          darkBrandColor: "#222222",
        });
      });

      it("should fallback to team branding when parent has no brand colors", () => {
        const eventType = {
          team: {
            name: "Team A",
            brandColor: "#AAAAAA",
            darkBrandColor: "#BBBBBB",
            theme: "light",
            parent: {
              brandColor: null,
              darkBrandColor: null,
              theme: "dark",
            },
          },
          users: [],
        };

        const result = getBrandingForEventType({ eventType });

        expect(result).toEqual({
          theme: "dark",
          brandColor: "#AAAAAA",
          darkBrandColor: "#BBBBBB",
        });
      });

      it("should fallback to team branding when no parent", () => {
        const eventType = {
          team: {
            name: "Team A",
            brandColor: "#AAAAAA",
            darkBrandColor: "#BBBBBB",
            theme: "light",
            parent: null,
          },
          users: [],
        };

        const result = getBrandingForEventType({ eventType });

        expect(result).toEqual({
          theme: "light",
          brandColor: "#AAAAAA",
          darkBrandColor: "#BBBBBB",
        });
      });

      it("should handle null team branding", () => {
        const eventType = {
          team: {
            name: "Team A",
            brandColor: null,
            darkBrandColor: null,
            theme: null,
            parent: null,
          },
          users: [],
        };

        const result = getBrandingForEventType({ eventType });

        expect(result).toEqual({
          theme: null,
          brandColor: null,
          darkBrandColor: null,
        });
      });

      it("should prefer parent theme over team theme", () => {
        const eventType = {
          team: {
            name: "Team A",
            brandColor: "#AAAAAA",
            darkBrandColor: "#BBBBBB",
            theme: "light",
            parent: {
              brandColor: null,
              darkBrandColor: null,
              theme: "dark",
            },
          },
          users: [],
        };

        const result = getBrandingForEventType({ eventType });

        expect(result).toEqual({
          theme: "dark",
          brandColor: "#AAAAAA",
          darkBrandColor: "#BBBBBB",
        });
      });
    });

    describe("personal events", () => {
      it("should use organization branding for personal events in org", () => {
        const eventType = {
          team: null,
          profile: {
            organization: {
              brandColor: "#111111",
              darkBrandColor: "#222222",
              theme: "dark",
            },
          },
          users: [
            {
              theme: "light",
              brandColor: "#AAAAAA",
              darkBrandColor: "#BBBBBB",
            },
          ],
        };

        const result = getBrandingForEventType({ eventType });

        expect(result).toEqual({
          theme: "dark",
          brandColor: "#111111",
          darkBrandColor: "#222222",
        });
      });

      it("should fallback to user branding when no organization", () => {
        const eventType = {
          team: null,
          profile: {
            organization: null,
          },
          users: [
            {
              theme: "light",
              brandColor: "#AAAAAA",
              darkBrandColor: "#BBBBBB",
            },
          ],
        };

        const result = getBrandingForEventType({ eventType });

        expect(result).toEqual({
          theme: "light",
          brandColor: "#AAAAAA",
          darkBrandColor: "#BBBBBB",
        });
      });

      it("should handle null user branding", () => {
        const eventType = {
          team: null,
          profile: {
            organization: null,
          },
          users: [
            {
              theme: null,
              brandColor: null,
              darkBrandColor: null,
            },
          ],
        };

        const result = getBrandingForEventType({ eventType });

        expect(result).toEqual({
          theme: null,
          brandColor: null,
          darkBrandColor: null,
        });
      });

      it("should handle null organization branding", () => {
        const eventType = {
          team: null,
          profile: {
            organization: {
              brandColor: null,
              darkBrandColor: null,
              theme: null,
            },
          },
          users: [
            {
              theme: "light",
              brandColor: "#AAAAAA",
              darkBrandColor: "#BBBBBB",
            },
          ],
        };

        const result = getBrandingForEventType({ eventType });

        expect(result).toEqual({
          theme: null,
          brandColor: null,
          darkBrandColor: null,
        });
      });
    });
  });

  describe("getBrandingForUser", () => {
    it("should use organization branding when available", () => {
      const user = {
        theme: "light",
        brandColor: "#AAAAAA",
        darkBrandColor: "#BBBBBB",
        profile: {
          organization: {
            brandColor: "#111111",
            darkBrandColor: "#222222",
            theme: "dark",
          },
        },
      };

      const result = getBrandingForUser({ user });

      expect(result).toEqual({
        theme: "dark",
        brandColor: "#111111",
        darkBrandColor: "#222222",
      });
    });

    it("should fallback to user branding when no organization", () => {
      const user = {
        theme: "light",
        brandColor: "#AAAAAA",
        darkBrandColor: "#BBBBBB",
        profile: {
          organization: null,
        },
      };

      const result = getBrandingForUser({ user });

      expect(result).toEqual({
        theme: "light",
        brandColor: "#AAAAAA",
        darkBrandColor: "#BBBBBB",
      });
    });

    it("should handle null user branding", () => {
      const user = {
        theme: null,
        brandColor: null,
        darkBrandColor: null,
        profile: {
          organization: null,
        },
      };

      const result = getBrandingForUser({ user });

      expect(result).toEqual({
        theme: null,
        brandColor: null,
        darkBrandColor: null,
      });
    });

    it("should handle null organization branding", () => {
      const user = {
        theme: "light",
        brandColor: "#AAAAAA",
        darkBrandColor: "#BBBBBB",
        profile: {
          organization: {
            brandColor: null,
            darkBrandColor: null,
            theme: null,
          },
        },
      };

      const result = getBrandingForUser({ user });

      expect(result).toEqual({
        theme: null,
        brandColor: null,
        darkBrandColor: null,
      });
    });
  });

  describe("getBrandingForTeam", () => {
    it("should use parent org branding when parent has brandColor", () => {
      const team = {
        brandColor: "#AAAAAA",
        darkBrandColor: "#BBBBBB",
        theme: "light",
        parent: {
          brandColor: "#111111",
          darkBrandColor: "#222222",
          theme: "dark",
        },
      };

      const result = getBrandingForTeam({ team });

      expect(result).toEqual({
        theme: "dark",
        brandColor: "#111111",
        darkBrandColor: "#222222",
      });
    });

    it("should use parent org branding when parent has darkBrandColor", () => {
      const team = {
        brandColor: "#AAAAAA",
        darkBrandColor: "#BBBBBB",
        theme: "light",
        parent: {
          brandColor: null,
          darkBrandColor: "#222222",
          theme: "dark",
        },
      };

      const result = getBrandingForTeam({ team });

      expect(result).toEqual({
        theme: "dark",
        brandColor: null,
        darkBrandColor: "#222222",
      });
    });

    it("should fallback to team branding when parent has no brand colors", () => {
      const team = {
        brandColor: "#AAAAAA",
        darkBrandColor: "#BBBBBB",
        theme: "light",
        parent: {
          brandColor: null,
          darkBrandColor: null,
          theme: "dark",
        },
      };

      const result = getBrandingForTeam({ team });

      expect(result).toEqual({
        theme: "dark",
        brandColor: "#AAAAAA",
        darkBrandColor: "#BBBBBB",
      });
    });

    it("should fallback to team branding when no parent", () => {
      const team = {
        brandColor: "#AAAAAA",
        darkBrandColor: "#BBBBBB",
        theme: "light",
        parent: null,
      };

      const result = getBrandingForTeam({ team });

      expect(result).toEqual({
        theme: "light",
        brandColor: "#AAAAAA",
        darkBrandColor: "#BBBBBB",
      });
    });

    it("should handle null team branding", () => {
      const team = {
        brandColor: null,
        darkBrandColor: null,
        theme: null,
        parent: null,
      };

      const result = getBrandingForTeam({ team });

      expect(result).toEqual({
        theme: null,
        brandColor: null,
        darkBrandColor: null,
      });
    });

    it("should prefer parent theme over team theme", () => {
      const team = {
        brandColor: "#AAAAAA",
        darkBrandColor: "#BBBBBB",
        theme: "light",
        parent: {
          brandColor: null,
          darkBrandColor: null,
          theme: "dark",
        },
      };

      const result = getBrandingForTeam({ team });

      expect(result).toEqual({
        theme: "dark",
        brandColor: "#AAAAAA",
        darkBrandColor: "#BBBBBB",
      });
    });
  });
});
