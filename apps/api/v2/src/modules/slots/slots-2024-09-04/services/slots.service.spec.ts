import { BadRequestException, NotFoundException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { SlotsService_2024_09_04 } from "./slots.service";
import { EventTypesRepository_2024_06_14 } from "@/ee/event-types/event-types_2024_06_14/event-types.repository";
import { AvailableSlotsService } from "@/lib/services/available-slots.service";
import { MembershipsRepository } from "@/modules/memberships/memberships.repository";
import { MembershipsService } from "@/modules/memberships/services/memberships.service";
import { SlotsInputService_2024_09_04 } from "@/modules/slots/slots-2024-09-04/services/slots-input.service";
import { SlotsOutputService_2024_09_04 } from "@/modules/slots/slots-2024-09-04/services/slots-output.service";
import { SlotsRepository_2024_09_04 } from "@/modules/slots/slots-2024-09-04/slots.repository";
import { TeamsRepository } from "@/modules/teams/teams/teams.repository";

describe("SlotsService_2024_09_04", () => {
  let service: SlotsService_2024_09_04;
  let eventTypesRepository: EventTypesRepository_2024_06_14;
  let availableSlotsService: AvailableSlotsService;
  let slotsInputService: SlotsInputService_2024_09_04;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SlotsService_2024_09_04,
        {
          provide: SlotsInputService_2024_09_04,
          useValue: {
            transformGetSlotsQuery: jest.fn(),
            transformRoutingGetSlotsQuery: jest.fn(),
          },
        },
        {
          provide: EventTypesRepository_2024_06_14,
          useValue: {
            getEventTypeById: jest.fn(),
          },
        },
        {
          provide: SlotsRepository_2024_09_04,
          useValue: {},
        },
        {
          provide: SlotsOutputService_2024_09_04,
          useValue: {
            getAvailableSlots: jest.fn().mockResolvedValue({
              slots: {
                "2024-01-15": [{ time: "2024-01-15T10:00:00.000Z" }, { time: "2024-01-15T11:00:00.000Z" }],
              },
            }),
          },
        },
        {
          provide: AvailableSlotsService,
          useValue: {
            getAvailableSlots: jest.fn(),
          },
        },
        {
          provide: MembershipsService,
          useValue: {},
        },
        {
          provide: MembershipsRepository,
          useValue: {},
        },
        {
          provide: TeamsRepository,
          useValue: {},
        },
      ],
    }).compile();

    service = module.get<SlotsService_2024_09_04>(SlotsService_2024_09_04);
    slotsInputService = module.get<SlotsInputService_2024_09_04>(SlotsInputService_2024_09_04);
    eventTypesRepository = module.get<EventTypesRepository_2024_06_14>(EventTypesRepository_2024_06_14);
    availableSlotsService = module.get<AvailableSlotsService>(AvailableSlotsService);

    jest.clearAllMocks();
  });

  describe("getAvailableSlotsWithRouting", () => {
    const sharedTestData = {
      eventTypeId: 123,
      start: "2024-01-15T00:00:00.000Z",
      end: "2024-01-16T00:00:00.000Z",
      timeZone: "America/New_York",
      mockEventType: {
        id: 123,
        slug: "test-event",
        teamId: null, // Not a team event
        length: 30,
      },
      mockSlotsResponse: {
        slots: {},
      },
      baseInputQuery: {
        type: "byEventTypeId" as const,
        isTeamEvent: false,
        start: "2024-01-15T00:00:00.000Z",
        end: "2024-01-16T00:00:00.000Z",
        duration: undefined,
        eventTypeId: 123,
        eventTypeSlug: "test-event",
        usernameList: [],
        timeZone: "America/New_York",
        orgSlug: null,
        rescheduleUid: null,
      },
      routingParams: {
        routedTeamMemberIds: [456, 789],
        skipContactOwner: true,
        teamMemberEmail: "test@example.com",
        routingFormResponseId: 999,
      },
    };

    beforeEach(() => {
      // Setup shared mocks
      (eventTypesRepository.getEventTypeById as jest.Mock).mockResolvedValue(sharedTestData.mockEventType);
      (availableSlotsService.getAvailableSlots as jest.Mock).mockResolvedValue(
        sharedTestData.mockSlotsResponse
      );
    });

    it("should call getAvailableSlots with correct routing parameters", async () => {
      const inputQuery = {
        ...sharedTestData.baseInputQuery,
        ...sharedTestData.routingParams,
      };

      // Mock the transform method to return the expected transformed query
      const transformedQuery = {
        isTeamEvent: false,
        startTime: "2024-01-15T00:00:00.000Z",
        endTime: "2024-01-16T23:59:59.000Z",
        eventTypeId: 123,
        eventTypeSlug: "test-event",
        usernameList: [],
        timeZone: "America/New_York",
        orgSlug: null,
        rescheduleUid: null,
        ...sharedTestData.routingParams,
      };
      (slotsInputService.transformRoutingGetSlotsQuery as jest.Mock).mockResolvedValue(transformedQuery);

      await service.getAvailableSlotsWithRouting({
        ...inputQuery,
      });

      const { start: _1, end: _2, type: _3, ...queryWithoutStartEndAndType } = sharedTestData.baseInputQuery;

      expect(availableSlotsService.getAvailableSlots).toHaveBeenCalledWith({
        input: {
          ...queryWithoutStartEndAndType,
          startTime: "2024-01-15T00:00:00.000Z",
          endTime: "2024-01-16T23:59:59.000Z",
          ...sharedTestData.routingParams,
        },
        ctx: {},
      });
    });
  });

  describe("getAvailableSlotsWithRouting - Error Scenarios", () => {
    const baseInputQuery = {
      type: "byEventTypeId" as const,
      eventTypeId: 123,
      start: "2024-01-15T00:00:00.000Z",
      end: "2024-01-16T00:00:00.000Z",
      timeZone: "America/New_York",
    };

    it("should handle when event type is not found", async () => {
      const notFoundError = new NotFoundException("Event Type not found");
      (slotsInputService.transformRoutingGetSlotsQuery as jest.Mock).mockRejectedValue(notFoundError);

      await expect(
        service.getAvailableSlotsWithRouting({
          ...baseInputQuery,
          teamMemberEmail: "test@example.com",
        })
      ).rejects.toThrow(NotFoundException);

      expect(slotsInputService.transformRoutingGetSlotsQuery).toHaveBeenCalledWith({
        ...baseInputQuery,
        teamMemberEmail: "test@example.com",
      });
    });

    it("should handle invalid time range error and throw BadRequestException", async () => {
      const transformedQuery = {
        isTeamEvent: false,
        startTime: "2024-01-16T00:00:00.000Z",
        endTime: "2024-01-15T23:59:59.000Z",
        eventTypeId: 123,
        eventTypeSlug: "test-event",
        usernameList: [],
        timeZone: "America/New_York",
        orgSlug: null,
        rescheduleUid: null,
        routedTeamMemberIds: null,
        skipContactOwner: false,
        teamMemberEmail: null,
        routingFormResponseId: undefined,
      };

      (slotsInputService.transformRoutingGetSlotsQuery as jest.Mock).mockResolvedValue(transformedQuery);
      (availableSlotsService.getAvailableSlots as jest.Mock).mockRejectedValue(
        new Error("Invalid time range given - start time must be before end time")
      );

      await expect(service.getAvailableSlotsWithRouting(baseInputQuery)).rejects.toThrow(BadRequestException);

      await expect(service.getAvailableSlotsWithRouting(baseInputQuery)).rejects.toThrow(
        "Invalid time range given - check the 'start' and 'end' query parameters."
      );
    });

    it("should re-throw non-time-range errors without modification", async () => {
      const genericError = new Error("Database connection failed");
      const transformedQuery = {
        isTeamEvent: false,
        startTime: "2024-01-15T00:00:00.000Z",
        endTime: "2024-01-16T23:59:59.000Z",
        eventTypeId: 123,
        eventTypeSlug: "test-event",
        usernameList: [],
        timeZone: "America/New_York",
        orgSlug: null,
        rescheduleUid: null,
        routedTeamMemberIds: null,
        skipContactOwner: false,
        teamMemberEmail: null,
        routingFormResponseId: undefined,
      };

      (slotsInputService.transformRoutingGetSlotsQuery as jest.Mock).mockResolvedValue(transformedQuery);
      (availableSlotsService.getAvailableSlots as jest.Mock).mockRejectedValue(genericError);

      await expect(service.getAvailableSlotsWithRouting(baseInputQuery)).rejects.toThrow(genericError);
    });

    it("should handle non-Error objects thrown by dependencies", async () => {
      const transformedQuery = {
        isTeamEvent: false,
        startTime: "2024-01-15T00:00:00.000Z",
        endTime: "2024-01-16T23:59:59.000Z",
        eventTypeId: 123,
        eventTypeSlug: "test-event",
        usernameList: [],
        timeZone: "America/New_York",
        orgSlug: null,
        rescheduleUid: null,
        routedTeamMemberIds: null,
        skipContactOwner: false,
        teamMemberEmail: null,
        routingFormResponseId: undefined,
      };

      (slotsInputService.transformRoutingGetSlotsQuery as jest.Mock).mockResolvedValue(transformedQuery);
      const nonErrorObject = { message: "Something went wrong", code: "UNKNOWN_ERROR" };
      (availableSlotsService.getAvailableSlots as jest.Mock).mockRejectedValue(nonErrorObject);

      await expect(service.getAvailableSlotsWithRouting(baseInputQuery)).rejects.toEqual(nonErrorObject);
    });
  });

  describe("getAvailableSlotsWithRouting - Edge Cases", () => {
    it("should handle null and undefined routing parameters", async () => {
      const input = {
        type: "byEventTypeId" as const,
        eventTypeId: 123,
        start: "2024-01-15T00:00:00.000Z",
        end: "2024-01-16T00:00:00.000Z",
        timeZone: "America/New_York",
        teamMemberEmail: undefined,
        routedTeamMemberIds: undefined,
        skipContactOwner: undefined,
        routingFormResponseId: undefined,
      };

      const transformedQuery = {
        isTeamEvent: false,
        startTime: "2024-01-15T00:00:00.000Z",
        endTime: "2024-01-16T23:59:59.000Z",
        eventTypeId: 123,
        eventTypeSlug: "test-event",
        usernameList: [],
        timeZone: "America/New_York",
        orgSlug: null,
        rescheduleUid: null,
        teamMemberEmail: null,
        routedTeamMemberIds: null,
        skipContactOwner: false,
        routingFormResponseId: undefined,
      };

      (slotsInputService.transformRoutingGetSlotsQuery as jest.Mock).mockResolvedValue(transformedQuery);
      (availableSlotsService.getAvailableSlots as jest.Mock).mockResolvedValue({ slots: {} });

      await service.getAvailableSlotsWithRouting(input);

      expect(availableSlotsService.getAvailableSlots).toHaveBeenCalledWith({
        input: expect.objectContaining({
          teamMemberEmail: null,
          routedTeamMemberIds: null,
          skipContactOwner: false,
          routingFormResponseId: undefined,
        }),
        ctx: {},
      });
    });

    it("should handle empty routedTeamMemberIds array", async () => {
      const input = {
        type: "byEventTypeId" as const,
        eventTypeId: 123,
        start: "2024-01-15T00:00:00.000Z",
        end: "2024-01-16T00:00:00.000Z",
        timeZone: "America/New_York",
        routedTeamMemberIds: [],
      };

      const transformedQuery = {
        isTeamEvent: false,
        startTime: "2024-01-15T00:00:00.000Z",
        endTime: "2024-01-16T23:59:59.000Z",
        eventTypeId: 123,
        eventTypeSlug: "test-event",
        usernameList: [],
        timeZone: "America/New_York",
        orgSlug: null,
        rescheduleUid: null,
        routedTeamMemberIds: [],
        skipContactOwner: false,
        teamMemberEmail: null,
        routingFormResponseId: undefined,
      };

      (slotsInputService.transformRoutingGetSlotsQuery as jest.Mock).mockResolvedValue(transformedQuery);
      (availableSlotsService.getAvailableSlots as jest.Mock).mockResolvedValue({ slots: {} });

      await service.getAvailableSlotsWithRouting(input);

      expect(availableSlotsService.getAvailableSlots).toHaveBeenCalledWith({
        input: expect.objectContaining({
          routedTeamMemberIds: [],
        }),
        ctx: {},
      });
    });

    it("should handle all routing parameters being provided", async () => {
      const input = {
        type: "byEventTypeId" as const,
        eventTypeId: 123,
        start: "2024-01-15T00:00:00.000Z",
        end: "2024-01-16T00:00:00.000Z",
        timeZone: "America/New_York",
        routedTeamMemberIds: [1, 2, 3],
        skipContactOwner: true,
        teamMemberEmail: "team@example.com",
        routingFormResponseId: 999,
      };

      const transformedQuery = {
        isTeamEvent: false,
        startTime: "2024-01-15T00:00:00.000Z",
        endTime: "2024-01-16T23:59:59.000Z",
        eventTypeId: 123,
        eventTypeSlug: "test-event",
        usernameList: [],
        timeZone: "America/New_York",
        orgSlug: null,
        rescheduleUid: null,
        routedTeamMemberIds: [1, 2, 3],
        skipContactOwner: true,
        teamMemberEmail: "team@example.com",
        routingFormResponseId: 999,
      };

      (slotsInputService.transformRoutingGetSlotsQuery as jest.Mock).mockResolvedValue(transformedQuery);
      (availableSlotsService.getAvailableSlots as jest.Mock).mockResolvedValue({ slots: {} });

      await service.getAvailableSlotsWithRouting(input);

      expect(availableSlotsService.getAvailableSlots).toHaveBeenCalledWith({
        input: expect.objectContaining({
          routedTeamMemberIds: [1, 2, 3],
          skipContactOwner: true,
          teamMemberEmail: "team@example.com",
          routingFormResponseId: 999,
        }),
        ctx: {},
      });
    });
  });
});
