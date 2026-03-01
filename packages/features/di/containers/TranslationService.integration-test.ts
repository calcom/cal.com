import { describe, expect, it } from "vitest";
import { getTranslationService } from "./TranslationService";

describe("TranslationService DI Container Integration Tests", () => {
  describe("getTranslationService", () => {
    it.skipIf(!process.env.LINGO_DOT_DEV_API_KEY)(
      "should return a translation service instance",
      async () => {
        const service = await getTranslationService();

        expect(service).toBeDefined();
        expect(typeof service).toBe("object");
      }
    );
  });
});
