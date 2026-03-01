import { Test, TestingModule } from "@nestjs/testing";
import { BookingSeatRepository } from "@/modules/booking-seat/booking-seat.repository";
import { PrismaReadService } from "@/modules/prisma/prisma-read.service";
import { PrismaWriteService } from "@/modules/prisma/prisma-write.service";

describe("BookingSeatRepository", () => {
  let repository: BookingSeatRepository;
  let mockPrismaRead: { prisma: { bookingSeat: Record<string, jest.Mock> } };

  beforeEach(async () => {
    mockPrismaRead = {
      prisma: {
        bookingSeat: {
          findUnique: jest.fn(),
        },
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BookingSeatRepository,
        { provide: PrismaReadService, useValue: mockPrismaRead },
        { provide: PrismaWriteService, useValue: {} },
      ],
    }).compile();

    repository = module.get<BookingSeatRepository>(BookingSeatRepository);
    jest.clearAllMocks();
  });

  describe("getByReferenceUid", () => {
    it("should find booking seat by reference UID", async () => {
      const mockSeat = {
        id: 1,
        referenceUid: "seat-uid-123",
        booking: { uid: "booking-uid-456" },
      };
      mockPrismaRead.prisma.bookingSeat.findUnique.mockResolvedValue(mockSeat);

      const result = await repository.getByReferenceUid("seat-uid-123");

      expect(mockPrismaRead.prisma.bookingSeat.findUnique).toHaveBeenCalledWith({
        where: { referenceUid: "seat-uid-123" },
        include: { booking: { select: { uid: true } } },
      });
      expect(result).toEqual(mockSeat);
    });

    it("should return null when seat not found", async () => {
      mockPrismaRead.prisma.bookingSeat.findUnique.mockResolvedValue(null);

      const result = await repository.getByReferenceUid("nonexistent");
      expect(result).toBeNull();
    });
  });

  describe("getByReferenceUidIncludeBookingWithAttendeesAndUserAndEvent", () => {
    it("should find seat with full booking details", async () => {
      const mockSeat = {
        id: 1,
        referenceUid: "seat-uid-123",
        data: {},
        metadata: null,
        bookingId: 10,
        attendeeId: 20,
        booking: {
          id: 10,
          uid: "booking-uid",
          userId: 1,
          attendees: [{ name: "Test", email: "test@test.com", bookingSeat: { id: 1 } }],
          user: { id: 1, name: "Host", email: "host@test.com", username: "host" },
          eventType: { id: 5, slug: "meeting", seatsShowAttendees: true, teamId: null, userId: 1 },
        },
      };
      mockPrismaRead.prisma.bookingSeat.findUnique.mockResolvedValue(mockSeat);

      const result =
        await repository.getByReferenceUidIncludeBookingWithAttendeesAndUserAndEvent("seat-uid-123");

      expect(mockPrismaRead.prisma.bookingSeat.findUnique).toHaveBeenCalledWith({
        where: { referenceUid: "seat-uid-123" },
        select: expect.objectContaining({
          id: true,
          referenceUid: true,
          booking: expect.objectContaining({
            select: expect.objectContaining({
              attendees: expect.anything(),
              user: expect.anything(),
              eventType: expect.anything(),
            }),
          }),
        }),
      });
      expect(result).toEqual(mockSeat);
    });

    it("should return null when seat not found", async () => {
      mockPrismaRead.prisma.bookingSeat.findUnique.mockResolvedValue(null);

      const result =
        await repository.getByReferenceUidIncludeBookingWithAttendeesAndUserAndEvent("nonexistent");
      expect(result).toBeNull();
    });
  });
});
