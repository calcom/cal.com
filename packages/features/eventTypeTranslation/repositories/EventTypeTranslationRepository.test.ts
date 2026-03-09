import prismaMock from "@calcom/testing/lib/__mocks__/prismaMock";
import { EventTypeAutoTranslatedField } from "@calcom/prisma/enums";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { EventTypeTranslationRepository } from "./EventTypeTranslationRepository";

describe("EventTypeTranslationRepository", () => {
  const repository = new EventTypeTranslationRepository(prismaMock);

  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe("upsertManyTitleTranslations", () => {
    it("should upsert title translations with correct field", async () => {
      prismaMock.eventTypeTranslation.upsert.mockResolvedValue({} as never);

      const translations = [
        { eventTypeId: 1, sourceLocale: "en", targetLocale: "es", translatedText: "Reunión", userId: 1 },
        { eventTypeId: 1, sourceLocale: "en", targetLocale: "fr", translatedText: "Réunion", userId: 1 },
      ];

      await repository.upsertManyTitleTranslations(translations);

      expect(prismaMock.eventTypeTranslation.upsert).toHaveBeenCalledTimes(2);
      expect(prismaMock.eventTypeTranslation.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            eventTypeId_field_targetLocale: {
              eventTypeId: 1,
              field: EventTypeAutoTranslatedField.TITLE,
              targetLocale: "es",
            },
          },
          create: expect.objectContaining({
            field: EventTypeAutoTranslatedField.TITLE,
            createdBy: 1,
          }),
          update: expect.objectContaining({
            updatedBy: 1,
          }),
        })
      );
    });
  });

  describe("upsertManyDescriptionTranslations", () => {
    it("should upsert description translations with correct field", async () => {
      prismaMock.eventTypeTranslation.upsert.mockResolvedValue({} as never);

      const translations = [
        { eventTypeId: 1, sourceLocale: "en", targetLocale: "de", translatedText: "Beschreibung", userId: 1 },
      ];

      await repository.upsertManyDescriptionTranslations(translations);

      expect(prismaMock.eventTypeTranslation.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            eventTypeId_field_targetLocale: {
              eventTypeId: 1,
              field: EventTypeAutoTranslatedField.DESCRIPTION,
              targetLocale: "de",
            },
          },
          create: expect.objectContaining({
            field: EventTypeAutoTranslatedField.DESCRIPTION,
          }),
        })
      );
    });
  });

  describe("findByLocale", () => {
    it("should find translation by locale for title field", async () => {
      const mockTranslation = {
        uid: "123",
        eventTypeId: 1,
        field: EventTypeAutoTranslatedField.TITLE,
        sourceLocale: "en",
        targetLocale: "es",
        translatedText: "Reunión",
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 1,
        updatedBy: null,
      };
      prismaMock.eventTypeTranslation.findUnique.mockResolvedValue(mockTranslation);

      const result = await repository.findByLocale(1, EventTypeAutoTranslatedField.TITLE, "es");

      expect(result).toEqual(mockTranslation);
      expect(prismaMock.eventTypeTranslation.findUnique).toHaveBeenCalledWith({
        where: {
          eventTypeId_field_targetLocale: {
            eventTypeId: 1,
            field: EventTypeAutoTranslatedField.TITLE,
            targetLocale: "es",
          },
        },
      });
    });

    it("should find translation by locale for description field", async () => {
      const mockTranslation = {
        uid: "456",
        eventTypeId: 1,
        field: EventTypeAutoTranslatedField.DESCRIPTION,
        sourceLocale: "en",
        targetLocale: "fr",
        translatedText: "Description traduite",
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 1,
        updatedBy: null,
      };
      prismaMock.eventTypeTranslation.findUnique.mockResolvedValue(mockTranslation);

      const result = await repository.findByLocale(1, EventTypeAutoTranslatedField.DESCRIPTION, "fr");

      expect(result).toEqual(mockTranslation);
      expect(prismaMock.eventTypeTranslation.findUnique).toHaveBeenCalledWith({
        where: {
          eventTypeId_field_targetLocale: {
            eventTypeId: 1,
            field: EventTypeAutoTranslatedField.DESCRIPTION,
            targetLocale: "fr",
          },
        },
      });
    });

    it("should return null when translation not found", async () => {
      prismaMock.eventTypeTranslation.findUnique.mockResolvedValue(null);

      const result = await repository.findByLocale(1, EventTypeAutoTranslatedField.TITLE, "xx");

      expect(result).toBeNull();
    });
  });
});