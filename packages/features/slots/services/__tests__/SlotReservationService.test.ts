import { describe, expect, it, vi, beforeEach } from "vitest";

import type { ISelectedSlotRepository } from "@calcom/features/selectedSlots/repositories/ISelectedSlotRepository";

import { SlotReservationService } from "../SlotReservationService";

describe("SlotReservationService", () => {
  let mockSelectedSlotRepo: ISelectedSlotRepository;
  let service: SlotReservationService;

  beforeEach(() => {
    mockSelectedSlotRepo = {
      findManyUnexpiredSlots: vi.fn(),
      deleteManyExpiredSlots: vi.fn(),
      upsert: vi.fn(),
      deleteByUid: vi.fn(),
    };
    service = new SlotReservationService(mockSelectedSlotRepo);
  });

  describe("getReservedSlotsAndCleanupExpired", () => {
    const mockUsers = [
      { id: 1, email: "user1@test.com", timeZone: "UTC", credentials: [], selectedCalendars: [] },
      { id: 2, email: "user2@test.com", timeZone: "UTC", credentials: [], selectedCalendars: [] },
    ];

    it("should return slots selected by other users (not the current booker)", async () => {
      const bookerClientUid = "booker-123";
      const unexpiredSlots = [
        { uid: "booker-123", slotUtcStartDate: new Date(), slotUtcEndDate: new Date(), eventTypeId: 1 },
        { uid: "other-user-456", slotUtcStartDate: new Date(), slotUtcEndDate: new Date(), eventTypeId: 1 },
        { uid: "other-user-789", slotUtcStartDate: new Date(), slotUtcEndDate: new Date(), eventTypeId: 1 },
      ];

      vi.mocked(mockSelectedSlotRepo.findManyUnexpiredSlots).mockResolvedValue(unexpiredSlots);
      vi.mocked(mockSelectedSlotRepo.deleteManyExpiredSlots).mockResolvedValue({ count: 0 });

      const result = await service.getReservedSlotsAndCleanupExpired({
        bookerClientUid,
        usersWithCredentials: mockUsers as Parameters<
          typeof service.getReservedSlotsAndCleanupExpired
        >[0]["usersWithCredentials"],
        eventTypeId: 1,
      });

      expect(result).toHaveLength(2);
      expect(result.every((slot) => slot.uid !== bookerClientUid)).toBe(true);
      expect(result.map((s) => s.uid)).toEqual(["other-user-456", "other-user-789"]);
    });

    it("should return all slots when bookerClientUid is undefined", async () => {
      const unexpiredSlots = [
        { uid: "user-123", slotUtcStartDate: new Date(), slotUtcEndDate: new Date(), eventTypeId: 1 },
        { uid: "user-456", slotUtcStartDate: new Date(), slotUtcEndDate: new Date(), eventTypeId: 1 },
      ];

      vi.mocked(mockSelectedSlotRepo.findManyUnexpiredSlots).mockResolvedValue(unexpiredSlots);
      vi.mocked(mockSelectedSlotRepo.deleteManyExpiredSlots).mockResolvedValue({ count: 0 });

      const result = await service.getReservedSlotsAndCleanupExpired({
        bookerClientUid: undefined,
        usersWithCredentials: mockUsers as Parameters<
          typeof service.getReservedSlotsAndCleanupExpired
        >[0]["usersWithCredentials"],
        eventTypeId: 1,
      });

      expect(result).toHaveLength(2);
    });

    it("should return empty array when no unexpired slots exist", async () => {
      vi.mocked(mockSelectedSlotRepo.findManyUnexpiredSlots).mockResolvedValue([]);
      vi.mocked(mockSelectedSlotRepo.deleteManyExpiredSlots).mockResolvedValue({ count: 0 });

      const result = await service.getReservedSlotsAndCleanupExpired({
        bookerClientUid: "booker-123",
        usersWithCredentials: mockUsers as Parameters<
          typeof service.getReservedSlotsAndCleanupExpired
        >[0]["usersWithCredentials"],
        eventTypeId: 1,
      });

      expect(result).toHaveLength(0);
    });

    it("should call findManyUnexpiredSlots with correct user IDs", async () => {
      vi.mocked(mockSelectedSlotRepo.findManyUnexpiredSlots).mockResolvedValue([]);
      vi.mocked(mockSelectedSlotRepo.deleteManyExpiredSlots).mockResolvedValue({ count: 0 });

      await service.getReservedSlotsAndCleanupExpired({
        bookerClientUid: "booker-123",
        usersWithCredentials: mockUsers as Parameters<
          typeof service.getReservedSlotsAndCleanupExpired
        >[0]["usersWithCredentials"],
        eventTypeId: 1,
      });

      expect(mockSelectedSlotRepo.findManyUnexpiredSlots).toHaveBeenCalledWith(
        expect.objectContaining({
          userIds: [1, 2],
        })
      );
    });

    it("should cleanup expired slots after fetching", async () => {
      vi.mocked(mockSelectedSlotRepo.findManyUnexpiredSlots).mockResolvedValue([]);
      vi.mocked(mockSelectedSlotRepo.deleteManyExpiredSlots).mockResolvedValue({ count: 5 });

      await service.getReservedSlotsAndCleanupExpired({
        bookerClientUid: "booker-123",
        usersWithCredentials: mockUsers as Parameters<
          typeof service.getReservedSlotsAndCleanupExpired
        >[0]["usersWithCredentials"],
        eventTypeId: 1,
      });

      expect(mockSelectedSlotRepo.deleteManyExpiredSlots).toHaveBeenCalledWith(
        expect.objectContaining({
          eventTypeId: 1,
        })
      );
    });

    it("should handle null response from findManyUnexpiredSlots", async () => {
      vi.mocked(mockSelectedSlotRepo.findManyUnexpiredSlots).mockResolvedValue(null as unknown as []);
      vi.mocked(mockSelectedSlotRepo.deleteManyExpiredSlots).mockResolvedValue({ count: 0 });

      const result = await service.getReservedSlotsAndCleanupExpired({
        bookerClientUid: "booker-123",
        usersWithCredentials: mockUsers as Parameters<
          typeof service.getReservedSlotsAndCleanupExpired
        >[0]["usersWithCredentials"],
        eventTypeId: 1,
      });

      expect(result).toHaveLength(0);
    });
  });
});
