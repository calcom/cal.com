import { beforeEach, describe, expect, it, vi } from "vitest";
import type { EventTypeRepository } from "../repositories/eventTypeRepository";
import type { EventTypeBrandingData } from "./EventTypeService";
import { EventTypeService } from "./EventTypeService";

function createMockRepository(overrides: Partial<EventTypeRepository> = {}): EventTypeRepository {
  return {
    findByIdIncludeBrandingInfo: vi.fn().mockResolvedValue(null),
    ...overrides,
  } as unknown as EventTypeRepository;
}

describe("EventTypeService", () => {
  let service: EventTypeService;
  let mockRepo: EventTypeRepository;

  beforeEach(() => {
    mockRepo = createMockRepository();
    service = new EventTypeService(mockRepo);
  });

  describe("shouldHideBrandingForEventType", () => {
    describe("hot path (prefetchedData provided)", () => {
      it("returns false when prefetchedData has no team and no owner", async () => {
        const prefetchedData: EventTypeBrandingData = { team: null, owner: null };
        const result = await service.shouldHideBrandingForEventType(1, prefetchedData);
        expect(result).toBe(false);
        expect(mockRepo.findByIdIncludeBrandingInfo).not.toHaveBeenCalled();
      });

      it("returns true when team has hideBranding enabled", async () => {
        const prefetchedData: EventTypeBrandingData = {
          team: { hideBranding: true, parent: null },
          owner: null,
        };
        const result = await service.shouldHideBrandingForEventType(1, prefetchedData);
        expect(result).toBe(true);
        expect(mockRepo.findByIdIncludeBrandingInfo).not.toHaveBeenCalled();
      });

      it("returns true when team parent (organization) has hideBranding enabled", async () => {
        const prefetchedData: EventTypeBrandingData = {
          team: { hideBranding: false, parent: { hideBranding: true } },
          owner: null,
        };
        const result = await service.shouldHideBrandingForEventType(1, prefetchedData);
        expect(result).toBe(true);
      });

      it("returns false when team hideBranding is false and no parent", async () => {
        const prefetchedData: EventTypeBrandingData = {
          team: { hideBranding: false, parent: null },
          owner: null,
        };
        const result = await service.shouldHideBrandingForEventType(1, prefetchedData);
        expect(result).toBe(false);
      });

      it("returns true when owner has hideBranding enabled", async () => {
        const prefetchedData: EventTypeBrandingData = {
          team: null,
          owner: { id: 42, hideBranding: true, profiles: [] },
        };
        const result = await service.shouldHideBrandingForEventType(1, prefetchedData);
        expect(result).toBe(true);
      });

      it("returns true when owner's organization has hideBranding enabled", async () => {
        const prefetchedData: EventTypeBrandingData = {
          team: null,
          owner: {
            id: 42,
            hideBranding: false,
            profiles: [{ organization: { hideBranding: true } }],
          },
        };
        const result = await service.shouldHideBrandingForEventType(1, prefetchedData);
        expect(result).toBe(true);
      });

      it("returns false when owner hideBranding is false and no org branding", async () => {
        const prefetchedData: EventTypeBrandingData = {
          team: null,
          owner: {
            id: 42,
            hideBranding: false,
            profiles: [{ organization: { hideBranding: false } }],
          },
        };
        const result = await service.shouldHideBrandingForEventType(1, prefetchedData);
        expect(result).toBe(false);
      });

      it("handles owner with empty profiles array", async () => {
        const prefetchedData: EventTypeBrandingData = {
          team: null,
          owner: { id: 42, hideBranding: false, profiles: [] },
        };
        const result = await service.shouldHideBrandingForEventType(1, prefetchedData);
        expect(result).toBe(false);
      });

      it("prioritises team over owner when both provided", async () => {
        const prefetchedData: EventTypeBrandingData = {
          team: { hideBranding: true, parent: null },
          owner: { id: 42, hideBranding: false, profiles: [] },
        };
        const result = await service.shouldHideBrandingForEventType(1, prefetchedData);
        expect(result).toBe(true);
      });
    });

    describe("cold path (no prefetchedData)", () => {
      it("fetches from repository when no prefetchedData is provided", async () => {
        const repoData = {
          team: { hideBranding: true, parent: null },
          owner: null,
        };
        mockRepo = createMockRepository({
          findByIdIncludeBrandingInfo: vi.fn().mockResolvedValue(repoData),
        });
        service = new EventTypeService(mockRepo);

        const result = await service.shouldHideBrandingForEventType(99);
        expect(result).toBe(true);
        expect(mockRepo.findByIdIncludeBrandingInfo).toHaveBeenCalledWith({ id: 99 });
      });

      it("returns false when repository returns null", async () => {
        mockRepo = createMockRepository({
          findByIdIncludeBrandingInfo: vi.fn().mockResolvedValue(null),
        });
        service = new EventTypeService(mockRepo);

        const result = await service.shouldHideBrandingForEventType(99);
        expect(result).toBe(false);
        expect(mockRepo.findByIdIncludeBrandingInfo).toHaveBeenCalledWith({ id: 99 });
      });
    });
  });
});
