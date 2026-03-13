import type { PrismaClient } from "@calcom/prisma";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { BookingRepository } from "../repositories/BookingRepository";
import { BookingAccessService } from "./BookingAccessService";
import { BookingDetailsService } from "./BookingDetailsService";

vi.mock("../repositories/BookingRepository");
vi.mock("./BookingAccessService");

describe("BookingDetailsService", () => {
  let service: BookingDetailsService;
  let mockBookingRepo: {
    findByUidSelectBasicStatus: ReturnType<typeof vi.fn>;
  };
  let mockAccessService: {
    doesUserIdHaveAccessToBooking: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    vi.clearAllMocks();

    mockBookingRepo = {
      findByUidSelectBasicStatus: vi.fn(),
    };

    mockAccessService = {
      doesUserIdHaveAccessToBooking: vi.fn(),
    };

    vi.mocked(BookingRepository).mockImplementation(function () {
      return mockBookingRepo as unknown as BookingRepository;
    });
    vi.mocked(BookingAccessService).mockImplementation(function () {
      return mockAccessService as unknown as BookingAccessService;
    });

    service = new BookingDetailsService({} as PrismaClient);
  });

  describe("getBookingForTabResolution", () => {
    const userId = 1;
    const bookingUid = "test-uid-123";

    it("returns null when booking is not found", async () => {
      mockBookingRepo.findByUidSelectBasicStatus.mockResolvedValue(null);

      const result = await service.getBookingForTabResolution({ userId, bookingUid });

      expect(result).toBeNull();
      expect(mockBookingRepo.findByUidSelectBasicStatus).toHaveBeenCalledWith({ bookingUid });
      expect(mockAccessService.doesUserIdHaveAccessToBooking).not.toHaveBeenCalled();
    });

    it("returns null when user does not have access", async () => {
      mockBookingRepo.findByUidSelectBasicStatus.mockResolvedValue({
        uid: bookingUid,
        status: "ACCEPTED",
        endTime: new Date(),
        recurringEventId: null,
      });
      mockAccessService.doesUserIdHaveAccessToBooking.mockResolvedValue(false);

      const result = await service.getBookingForTabResolution({ userId, bookingUid });

      expect(result).toBeNull();
      expect(mockAccessService.doesUserIdHaveAccessToBooking).toHaveBeenCalledWith({ userId, bookingUid });
    });

    it("returns booking when found and user has access", async () => {
      const mockBooking = {
        uid: bookingUid,
        status: "ACCEPTED",
        endTime: new Date("2026-03-03T10:00:00Z"),
        recurringEventId: null,
      };
      mockBookingRepo.findByUidSelectBasicStatus.mockResolvedValue(mockBooking);
      mockAccessService.doesUserIdHaveAccessToBooking.mockResolvedValue(true);

      const result = await service.getBookingForTabResolution({ userId, bookingUid });

      expect(result).toEqual(mockBooking);
    });
  });
});
