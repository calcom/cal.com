import { Test } from "@nestjs/testing";
import type { TestingModule } from "@nestjs/testing";
import { SlotsInputService_2024_09_04 } from "@/modules/slots/slots-2024-09-04/services/slots-input.service";
import { TeamsEventTypesRepository } from "@/modules/teams/event-types/teams-event-types.repository";
import { TeamsRepository } from "@/modules/teams/teams/teams.repository";
import { UsersRepository } from "@/modules/users/users.repository";
import { EventTypesRepository_2024_06_14 } from "@/platform/event-types/event-types_2024_06_14/event-types.repository";

jest.mock(
  "@calcom/platform-libraries",
  () => ({
    dynamicEvent: {
      id: -1,
      slug: "dynamic",
      length: 30,
      teamId: null,
    },
  }),
  { virtual: true }
);

describe("SlotsInputService_2024_09_04", () => {
  let service: SlotsInputService_2024_09_04;
  let eventTypeRepository: EventTypesRepository_2024_06_14;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SlotsInputService_2024_09_04,
        {
          provide: EventTypesRepository_2024_06_14,
          useValue: {
            getEventTypeById: jest.fn(),
          },
        },
        {
          provide: UsersRepository,
          useValue: {},
        },
        {
          provide: TeamsRepository,
          useValue: {},
        },
        {
          provide: TeamsEventTypesRepository,
          useValue: {},
        },
      ],
    }).compile();

    service = module.get<SlotsInputService_2024_09_04>(SlotsInputService_2024_09_04);
    eventTypeRepository = module.get<EventTypesRepository_2024_06_14>(EventTypesRepository_2024_06_14);

    jest.clearAllMocks();
  });

  it("defaults v2 slot requests to UTC without disabling rolling-window bounds checks", async () => {
    (eventTypeRepository.getEventTypeById as jest.Mock).mockResolvedValue({
      id: 123,
      slug: "discovery-call",
      teamId: null,
    });

    const transformedQuery = await service.transformGetSlotsQuery({
      type: "byEventTypeId",
      eventTypeId: 123,
      start: "2050-12-09",
      end: "2050-12-10",
    });

    expect(transformedQuery).toMatchObject({
      startTime: "2050-12-09T00:00:00.000Z",
      endTime: "2050-12-10T23:59:59.000Z",
      timeZone: "UTC",
    });
    expect(transformedQuery).not.toHaveProperty("disableRollingWindowAdjustment");
  });

  it("preserves an explicitly requested time zone", async () => {
    (eventTypeRepository.getEventTypeById as jest.Mock).mockResolvedValue({
      id: 123,
      slug: "discovery-call",
      teamId: null,
    });

    await expect(
      service.transformGetSlotsQuery({
        type: "byEventTypeId",
        eventTypeId: 123,
        start: "2050-12-09",
        end: "2050-12-10",
        timeZone: "Europe/Rome",
      })
    ).resolves.toMatchObject({
      timeZone: "Europe/Rome",
    });
  });
});
