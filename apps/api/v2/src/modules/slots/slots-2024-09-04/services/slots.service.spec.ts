import { EventTypesRepository_2024_06_14 } from "@/ee/event-types/event-types_2024_06_14/event-types.repository";
import { AvailableSlotsService } from "@/lib/services/AvailableSlots";
import { MembershipsRepository } from "@/modules/memberships/memberships.repository";
import { MembershipsService } from "@/modules/memberships/services/memberships.service";
import { OrganizationsRepository } from "@/modules/organizations/index/organizations.repository";
import { OrganizationsTeamsRepository } from "@/modules/organizations/teams/index/organizations-teams.repository";
import { OrganizationsUsersRepository } from "@/modules/organizations/users/index/organizations-users.repository";
import { SlotsInputService_2024_09_04 } from "@/modules/slots/slots-2024-09-04/services/slots-input.service";
import { SlotsOutputService_2024_09_04 } from "@/modules/slots/slots-2024-09-04/services/slots-output.service";
import { SlotsRepository_2024_09_04 } from "@/modules/slots/slots-2024-09-04/slots.repository";
import { TeamsEventTypesRepository } from "@/modules/teams/event-types/teams-event-types.repository";
import { TeamsRepository } from "@/modules/teams/teams/teams.repository";
import { UsersRepository } from "@/modules/users/users.repository";
import { Test, TestingModule } from "@nestjs/testing";

import { SlotsService_2024_09_04 } from "./slots.service";

describe("SlotsService_2024_09_04", () => {
  let service: SlotsService_2024_09_04;
  let eventTypesRepository: EventTypesRepository_2024_06_14;
  let availableSlotsService: AvailableSlotsService;
  let slotsInputService: SlotsInputService_2024_09_04;
  let slotsOutputService: SlotsOutputService_2024_09_04;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SlotsService_2024_09_04,
        SlotsInputService_2024_09_04,
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
        // Add missing dependencies for SlotsInputService_2024_09_04
        {
          provide: UsersRepository,
          useValue: {},
        },
        {
          provide: OrganizationsUsersRepository,
          useValue: {},
        },
        {
          provide: OrganizationsTeamsRepository,
          useValue: {},
        },
        {
          provide: OrganizationsRepository,
          useValue: {},
        },
        {
          provide: TeamsEventTypesRepository,
          useValue: {},
        },
      ],
    }).compile();

    service = module.get<SlotsService_2024_09_04>(SlotsService_2024_09_04);
    slotsInputService = module.get<SlotsInputService_2024_09_04>(SlotsInputService_2024_09_04);
    slotsOutputService = module.get<SlotsOutputService_2024_09_04>(SlotsOutputService_2024_09_04);
    eventTypesRepository = module.get<EventTypesRepository_2024_06_14>(EventTypesRepository_2024_06_14);
    availableSlotsService = module.get<AvailableSlotsService>(AvailableSlotsService);

    jest.clearAllMocks();
  });

  describe("getAvailableSlots", () => {
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

    it("should call getAvailableSlots with correct routing parameters when withRouting is true", async () => {
      const inputQuery = {
        ...sharedTestData.baseInputQuery,
        ...sharedTestData.routingParams,
      };

      await service.getAvailableSlotsWithRouting({
        ...inputQuery,
      });

      const { start: _1, end: _2, type: _3, ...queryWithoutStartEndAndType } = inputQuery;

      expect(availableSlotsService.getAvailableSlots).toHaveBeenCalledWith({
        input: {
          ...queryWithoutStartEndAndType,
          startTime: "2024-01-15T00:00:00.000Z",
          endTime: "2024-01-16T23:59:59.000Z",
        },
        ctx: {},
      });
    });

    it("should call getAvailableSlots without routing parameters when withRouting is false", async () => {
      const inputQuery = sharedTestData.baseInputQuery;

      await service.getAvailableSlotsWithRouting({
        ...inputQuery,
      });
      const { start: _1, end: _2, type: _3, ...queryWithoutStartEndAndType } = inputQuery;

      expect(availableSlotsService.getAvailableSlots).toHaveBeenCalledWith({
        input: {
          ...queryWithoutStartEndAndType,
          routedTeamMemberIds: null,
          skipContactOwner: false,
          teamMemberEmail: null,
          routingFormResponseId: undefined,
          startTime: "2024-01-15T00:00:00.000Z",
          endTime: "2024-01-16T23:59:59.000Z",
        },
        ctx: {},
      });
    });
  });
});
