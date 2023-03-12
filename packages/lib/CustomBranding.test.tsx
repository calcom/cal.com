import { colorNameToHex, fallBackHex, isValidHexCode } from "./CustomBranding";

describe("Custom Branding tests", () => {
  describe("fn: colorNameToHex", () => {
    it("should return a hex color when a valid color name is provided", () => {
      const cases = [
        {
          input: "red",
          expected: "#ff0000",
        },
        {
          input: "green",
          expected: "#008000",
        },
        {
          input: "salmon",
          expected: "#fa8072",
        },
        {
          input: "rebeccapurple",
          expected: "#663399",
        },
      ];

      for (const { input, expected } of cases) {
        const result = colorNameToHex(input);

        expect(result).toEqual(expected);
      }
    });

    it("should return false when an invalid color name is provided", () => {
      const result = colorNameToHex("invalid");

      expect(result).toEqual(false);
    });
  });

  describe("fn: isValidHexCode", () => {
    it("should return true when a valid hex code is provided", () => {
      const cases = [
        {
          input: "#ff0000",
          expected: true,
        },
        {
          input: "#00Ff00",
          expected: true,
        },
        {
          input: "#fA8072",
          expected: true,
        },
        {
          input: "#663",
          expected: true,
        },
        {
          input: "#fAb",
          expected: true,
        },
        {
          input: "#F00F00",
          expected: true,
        },
      ];

      for (const { input, expected } of cases) {
        const result = isValidHexCode(input);

        if (!result) {
          console.log("input", input);
        }

        expect(result).toEqual(expected);
      }
    });

    it("should return false when an invalid hex code is provided", () => {
      const cases = [
        {
          input: "#ff000",
          expected: false,
        },
        {
          input: "#F000G0",
          expected: false,
        },
        {
          input: "#00ff00a",
          expected: false,
        },
        {
          input: "#fa8072aa",
          expected: false,
        },
        {
          input: "#663399aa",
          expected: false,
        },
      ];

      for (const { input, expected } of cases) {
        const result = isValidHexCode(input);

        expect(result).toEqual(expected);
      }
    });
  });

  describe("fn: fallBackHex", () => {
    it("should return a hex color when a valid color name is provided", () => {
      const cases = [
        {
          input: "red",
          expected: "#ff0000",
        },
        {
          input: "green",
          expected: "#008000",
        },
        {
          input: "salmon",
          expected: "#fa8072",
        },
        {
          input: "rebeccapurple",
          expected: "#663399",
        },
      ];

      for (const { input, expected } of cases) {
        const result = colorNameToHex(input);

        expect(result).toEqual(expected);
      }
    });

    it("should return a brand color when there is no hex fallback", () => {
      // BRAND_COLOR => "#292929"
      // BRAND_TEXT_COLOR => "#ffffff"
      // DARK_BRAND_COLOR => "#fafafa"

      const inputs = ["reddit", null, "darkbruwn"];

      for (const input of inputs) {
        const resultLight = fallBackHex(input, false);
        const resultDark = fallBackHex(input, true);

        expect(resultLight).toEqual("#292929");
        expect(resultDark).toEqual("#fafafa");
      }
    });
  });
});
