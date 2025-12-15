import { describe, expect, it } from "vitest";

import { getBrandingForEventType, getBrandingForUser, getBrandingForTeam } from "./getBranding";

describe("getBranding", () => {
  describe("getBrandingForEventType", () => {
    describe("team events", () => {
      it("should use parent org branding when available", () => {
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
    });

    describe("personal events", () => {
      it("should use organization branding when available", () => {
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
  });

  describe("getBrandingForTeam", () => {
    it("should use parent org branding when available", () => {
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
  });
});
