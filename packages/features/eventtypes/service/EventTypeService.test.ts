import type { PrismaClient } from "@calcom/prisma";
import { Prisma } from "@calcom/prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { DestinationCalendarService } from "../../calendars/services/DestinationCalendarService";
import type { HashedLinkService } from "../../hashedLink/lib/service/HashedLinkService";
import type { PrismaMembershipRepository } from "../../membership/repositories/PrismaMembershipRepository";
import type { ScheduleRepository } from "../../schedules/repositories/ScheduleRepository";
import type { EventTypeRepository } from "../repositories/eventTypeRepository";
import type { EventTypeBrandingData, IEventTypeServiceDeps } from "./EventTypeService";
import { EventTypeService } from "./EventTypeService";

vi.mock("@calcom/features/ee/managed-event-types/lib/handleChildrenEventTypes", () => ({
  default: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@calcom/features/eventtypes/lib/successRedirectUrlAllowed", () => ({
  checkSuccessRedirectUrlAllowed: vi.fn().mockResolvedValue({ allowed: true }),
}));

vi.mock("@calcom/features/ee/workflows/lib/allowDisablingStandardEmails", () => ({
  allowDisablingHostConfirmationEmails: vi.fn().mockReturnValue(true),
  allowDisablingAttendeeConfirmationEmails: vi.fn().mockReturnValue(true),
}));

vi.mock("@calcom/features/ee/workflows/lib/urlScanner", () => ({
  isUrlScanningEnabled: vi.fn().mockReturnValue(false),
}));

vi.mock("@calcom/features/calVideoSettings/repositories/CalVideoSettingsRepository", () => ({
  CalVideoSettingsRepository: {
    createOrUpdateCalVideoSettings: vi.fn().mockResolvedValue(undefined),
    deleteCalVideoSettings: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock("@calcom/features/tasker", () => ({
  default: { create: vi.fn().mockResolvedValue(undefined) },
}));

vi.mock("@calcom/features/tasker/tasks/scanWorkflowUrls", () => ({
  submitUrlForUrlScanning: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@calcom/lib/intervalLimits/validateIntervalLimitOrder", () => ({
  validateIntervalLimitOrder: vi.fn().mockReturnValue(true),
}));

vi.mock("@calcom/lib/validateBookerLayouts", () => ({
  validateBookerLayouts: vi.fn().mockReturnValue(null),
}));

vi.mock("@calcom/i18n/server", () => ({
  getTranslation: vi.fn().mockResolvedValue((key: string) => key),
}));

vi.mock("@calcom/app-store/zod-utils", () => ({
  eventTypeAppMetadataOptionalSchema: { parse: vi.fn().mockReturnValue({}) },
}));

vi.mock("@calcom/features/abuse-scoring/lib/hooks", () => ({
  onEventTypeChange: vi.fn().mockResolvedValue(undefined),
}));

const DEFAULT_EVENT_TYPE = {
  title: "Test Event",
  locations: [],
  description: "Test description",
  seatsPerTimeSlot: null,
  recurringEvent: null,
  maxActiveBookingsPerBooker: null,
  fieldTranslations: [],
  isRRWeightsEnabled: false,
  hosts: [],
  aiPhoneCallConfig: null,
  calVideoSettings: null,
  children: [],
  workflows: [],
  hostGroups: [],
  team: null,
  successRedirectUrl: null,
};

const DEFAULT_USER = {
  id: 1,
  username: "testuser",
  profile: { id: 1 },
  userLevelSelectedCalendars: [],
  organizationId: null,
  email: "test@example.com",
  locale: "en",
};

function createMockDeps(overrides: Partial<IEventTypeServiceDeps> = {}): IEventTypeServiceDeps {
  return {
    eventTypeRepository: {
      findByIdIncludeBrandingInfo: vi.fn().mockResolvedValue(null),
      findByIdWithFullDetail: vi.fn().mockResolvedValue(DEFAULT_EVENT_TYPE),
      updateById: vi.fn().mockResolvedValue({ slug: "test-event", schedulingType: null }),
      syncHostGroups: vi.fn().mockResolvedValue(undefined),
      deleteHostLocations: vi.fn().mockResolvedValue(undefined),
      deleteEmptyHostGroups: vi.fn().mockResolvedValue(undefined),
      findWorkflowsByEventTypeIdAndTrigger: vi.fn().mockResolvedValue([]),
      findVerifiedSecondaryEmail: vi.fn().mockResolvedValue(null),
      upsertAIPhoneCallConfig: vi.fn().mockResolvedValue(undefined),
      deleteAIPhoneCallConfig: vi.fn().mockResolvedValue(undefined),
    } as unknown as EventTypeRepository,
    prisma: {} as unknown as PrismaClient,
    membershipRepository: {
      hasMembership: vi.fn().mockResolvedValue(false),
      listAcceptedTeamMemberIds: vi.fn().mockResolvedValue([]),
    } as unknown as PrismaMembershipRepository,
    scheduleRepository: {
      findByUserIdAndScheduleId: vi.fn().mockResolvedValue(null),
      findScheduleByIdForOwnershipCheck: vi.fn().mockResolvedValue(null),
    } as unknown as ScheduleRepository,
    hashedLinkService: {
      listLinksByEventType: vi.fn().mockResolvedValue([]),
      handleMultiplePrivateLinks: vi.fn().mockResolvedValue(undefined),
    } as unknown as HashedLinkService,
    destinationCalendarService: {
      setDestinationCalendar: vi.fn().mockResolvedValue(undefined),
    } as unknown as DestinationCalendarService,
    ...overrides,
  };
}

function createMinimalInput(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    ...overrides,
  };
}

describe("EventTypeService", () => {
  let service: EventTypeService;
  let mockDeps: IEventTypeServiceDeps;

  beforeEach(() => {
    vi.clearAllMocks();
    mockDeps = createMockDeps();
    service = new EventTypeService(mockDeps);
  });

  describe("shouldHideBrandingForEventType", () => {
    describe("hot path (prefetchedData provided)", () => {
      it("returns false when prefetchedData has no team and no owner", async () => {
        const prefetchedData: EventTypeBrandingData = { team: null, owner: null };
        const result = await service.shouldHideBrandingForEventType(1, prefetchedData);
        expect(result).toBe(false);
        expect(mockDeps.eventTypeRepository.findByIdIncludeBrandingInfo).not.toHaveBeenCalled();
      });

      it("returns true when team has hideBranding enabled", async () => {
        const prefetchedData: EventTypeBrandingData = {
          team: { hideBranding: true, parent: null },
          owner: null,
        };
        const result = await service.shouldHideBrandingForEventType(1, prefetchedData);
        expect(result).toBe(true);
        expect(mockDeps.eventTypeRepository.findByIdIncludeBrandingInfo).not.toHaveBeenCalled();
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
        mockDeps = createMockDeps({
          eventTypeRepository: {
            findByIdIncludeBrandingInfo: vi.fn().mockResolvedValue(repoData),
          } as unknown as EventTypeRepository,
        });
        service = new EventTypeService(mockDeps);

        const result = await service.shouldHideBrandingForEventType(99);
        expect(result).toBe(true);
        expect(mockDeps.eventTypeRepository.findByIdIncludeBrandingInfo).toHaveBeenCalledWith({ id: 99 });
      });

      it("returns false when repository returns null", async () => {
        mockDeps = createMockDeps({
          eventTypeRepository: {
            findByIdIncludeBrandingInfo: vi.fn().mockResolvedValue(null),
          } as unknown as EventTypeRepository,
        });
        service = new EventTypeService(mockDeps);

        const result = await service.shouldHideBrandingForEventType(99);
        expect(result).toBe(false);
        expect(mockDeps.eventTypeRepository.findByIdIncludeBrandingInfo).toHaveBeenCalledWith({ id: 99 });
      });
    });
  });

  describe("update", () => {
    it("performs a basic update and returns the event type", async () => {
      const result = await service.update({
        user: DEFAULT_USER,
        input: createMinimalInput({ title: "New Title" }),
      });

      expect(result).toEqual({ eventType: DEFAULT_EVENT_TYPE });
      expect(mockDeps.eventTypeRepository.findByIdWithFullDetail).toHaveBeenCalledWith({ id: 1 });
      expect(mockDeps.eventTypeRepository.updateById).toHaveBeenCalled();
    });

    describe("validation errors", () => {
      it("throws Forbidden when teamId does not match event type team", async () => {
        (mockDeps.eventTypeRepository.findByIdWithFullDetail as ReturnType<typeof vi.fn>).mockResolvedValue({
          ...DEFAULT_EVENT_TYPE,
          team: {
            id: 10,
            name: "Team A",
            slug: "team-a",
            parentId: null,
            rrTimestampBasis: null,
            parent: null,
            members: [],
          },
        });

        await expect(
          service.update({
            user: DEFAULT_USER,
            input: createMinimalInput({ teamId: 99 }),
          })
        ).rejects.toThrow("Unauthorized team access");
      });

      it("throws BadRequest when seats and recurring are both active", async () => {
        await expect(
          service.update({
            user: DEFAULT_USER,
            input: createMinimalInput({
              seatsPerTimeSlot: 5,
              recurringEvent: { interval: 1, count: 10, freq: 2 },
            }),
          })
        ).rejects.toThrow("Recurring Events and Offer Seats cannot be active at the same time.");
      });

      it("throws BadRequest when booking limits are not in ascending order", async () => {
        const mod = await import("@calcom/lib/intervalLimits/validateIntervalLimitOrder");
        vi.mocked(mod.validateIntervalLimitOrder).mockReturnValueOnce(false);

        await expect(
          service.update({
            user: DEFAULT_USER,
            input: createMinimalInput({ bookingLimits: { PER_DAY: 10, PER_WEEK: 5 } }),
          })
        ).rejects.toThrow("Booking limits must be in ascending order.");
      });

      it("throws BadRequest when duration limits are not in ascending order", async () => {
        const mod = await import("@calcom/lib/intervalLimits/validateIntervalLimitOrder");
        vi.mocked(mod.validateIntervalLimitOrder).mockReturnValueOnce(false);

        await expect(
          service.update({
            user: DEFAULT_USER,
            input: createMinimalInput({ durationLimits: { PER_DAY: 100, PER_WEEK: 50 } }),
          })
        ).rejects.toThrow("Duration limits must be in ascending order.");
      });

      it("throws BadRequest when offsetStart is negative", async () => {
        await expect(
          service.update({
            user: DEFAULT_USER,
            input: createMinimalInput({ offsetStart: -5 }),
          })
        ).rejects.toThrow("Offset start time must be zero or greater.");
      });

      it("throws BadRequest when maxActiveBookingsPerBooker is negative", async () => {
        await expect(
          service.update({
            user: DEFAULT_USER,
            input: createMinimalInput({ maxActiveBookingsPerBooker: -1 }),
          })
        ).rejects.toThrow("Booker booking limit must be greater than 0.");
      });

      it("throws BadRequest when maxActiveBookingsPerBooker is set with recurring event", async () => {
        await expect(
          service.update({
            user: DEFAULT_USER,
            input: createMinimalInput({
              maxActiveBookingsPerBooker: 5,
              recurringEvent: { interval: 1, count: 10, freq: 2 },
            }),
          })
        ).rejects.toThrow(
          "Recurring Events and booker active bookings limit cannot be active at the same time."
        );
      });

      it("throws BadRequest on duplicate slug (P2002)", async () => {
        const prismaError = new Prisma.PrismaClientKnownRequestError("Unique constraint failed", {
          code: "P2002",
          clientVersion: "5.0.0",
        });
        (mockDeps.eventTypeRepository.updateById as ReturnType<typeof vi.fn>).mockRejectedValue(prismaError);

        await expect(
          service.update({
            user: DEFAULT_USER,
            input: createMinimalInput({ slug: "duplicate-slug" }),
          })
        ).rejects.toThrow("error_event_type_url_duplicate");
      });
    });

    describe("destination calendar", () => {
      it("delegates to destinationCalendarService when destinationCalendar is provided", async () => {
        const destCal = { integration: "google_calendar", externalId: "cal-123" };

        await service.update({
          user: DEFAULT_USER,
          input: createMinimalInput({ destinationCalendar: destCal }),
        });

        expect(mockDeps.destinationCalendarService.setDestinationCalendar).toHaveBeenCalledWith({
          userId: DEFAULT_USER.id,
          userEmail: DEFAULT_USER.email,
          userLevelSelectedCalendars: DEFAULT_USER.userLevelSelectedCalendars,
          ...destCal,
          eventTypeId: 1,
        });
      });

      it("does not call destinationCalendarService when destinationCalendar is not provided", async () => {
        await service.update({
          user: DEFAULT_USER,
          input: createMinimalInput(),
        });

        expect(mockDeps.destinationCalendarService.setDestinationCalendar).not.toHaveBeenCalled();
      });
    });

    describe("schedule connection", () => {
      it("connects schedule when user owns it", async () => {
        (mockDeps.scheduleRepository.findByUserIdAndScheduleId as ReturnType<typeof vi.fn>).mockResolvedValue(
          { id: 42, userId: 1 }
        );

        await service.update({
          user: DEFAULT_USER,
          input: createMinimalInput({ schedule: 42 }),
        });

        expect(mockDeps.scheduleRepository.findByUserIdAndScheduleId).toHaveBeenCalledWith({
          userId: 1,
          scheduleId: 42,
        });
        const updateCall = (mockDeps.eventTypeRepository.updateById as ReturnType<typeof vi.fn>).mock
          .calls[0][0];
        expect(updateCall.data.schedule).toEqual({ connect: { id: 42 } });
      });

      it("disconnects schedule when null is passed", async () => {
        await service.update({
          user: DEFAULT_USER,
          input: createMinimalInput({ schedule: null }),
        });

        const updateCall = (mockDeps.eventTypeRepository.updateById as ReturnType<typeof vi.fn>).mock
          .calls[0][0];
        expect(updateCall.data.schedule).toEqual({ disconnect: true });
      });
    });

    describe("instant meeting schedule", () => {
      it("connects instantMeetingSchedule when provided", async () => {
        await service.update({
          user: DEFAULT_USER,
          input: createMinimalInput({ instantMeetingSchedule: 77 }),
        });

        const updateCall = (mockDeps.eventTypeRepository.updateById as ReturnType<typeof vi.fn>).mock
          .calls[0][0];
        expect(updateCall.data.instantMeetingSchedule).toEqual({ connect: { id: 77 } });
      });

      it("disconnects instantMeetingSchedule when explicitly set to null", async () => {
        await service.update({
          user: DEFAULT_USER,
          input: createMinimalInput({ instantMeetingSchedule: null }),
        });

        const updateCall = (mockDeps.eventTypeRepository.updateById as ReturnType<typeof vi.fn>).mock
          .calls[0][0];
        expect(updateCall.data.instantMeetingSchedule).toEqual({ disconnect: true });
      });

      it("cascade-disconnects instantMeetingSchedule when schedule is set to null", async () => {
        await service.update({
          user: DEFAULT_USER,
          input: createMinimalInput({ schedule: null }),
        });

        const updateCall = (mockDeps.eventTypeRepository.updateById as ReturnType<typeof vi.fn>).mock
          .calls[0][0];
        expect(updateCall.data.instantMeetingSchedule).toEqual({ disconnect: true });
      });

      it("does not disconnect instantMeetingSchedule when neither schedule nor instantMeetingSchedule is null", async () => {
        await service.update({
          user: DEFAULT_USER,
          input: createMinimalInput({ title: "No schedule change" }),
        });

        const updateCall = (mockDeps.eventTypeRepository.updateById as ReturnType<typeof vi.fn>).mock
          .calls[0][0];
        expect(updateCall.data.instantMeetingSchedule).toBeUndefined();
      });
    });

    describe("host groups", () => {
      it("delegates to syncHostGroups when hostGroups are provided", async () => {
        const hostGroups = [{ id: "g1", name: "Group 1" }];

        await service.update({
          user: DEFAULT_USER,
          input: createMinimalInput({ hostGroups }),
        });

        expect(mockDeps.eventTypeRepository.syncHostGroups).toHaveBeenCalledWith({
          eventTypeId: 1,
          hostGroups,
        });
      });

      it("cleans up empty host groups after update", async () => {
        await service.update({
          user: DEFAULT_USER,
          input: createMinimalInput({ hostGroups: [] }),
        });

        expect(mockDeps.eventTypeRepository.deleteEmptyHostGroups).toHaveBeenCalledWith({
          eventTypeId: 1,
        });
      });
    });

    describe("restriction schedule", () => {
      it("throws Forbidden when restriction schedule is not owned by user or team", async () => {
        (
          mockDeps.scheduleRepository.findScheduleByIdForOwnershipCheck as ReturnType<typeof vi.fn>
        ).mockResolvedValue({ userId: 999 });

        await expect(
          service.update({
            user: DEFAULT_USER,
            input: createMinimalInput({ restrictionScheduleId: 50 }),
          })
        ).rejects.toThrow("The restriction schedule is not owned by you or your team");
      });

      it("connects restriction schedule when user owns it", async () => {
        (
          mockDeps.scheduleRepository.findScheduleByIdForOwnershipCheck as ReturnType<typeof vi.fn>
        ).mockResolvedValue({ userId: DEFAULT_USER.id });

        await service.update({
          user: DEFAULT_USER,
          input: createMinimalInput({ restrictionScheduleId: 50 }),
        });

        const updateCall = (mockDeps.eventTypeRepository.updateById as ReturnType<typeof vi.fn>).mock
          .calls[0][0];
        expect(updateCall.data.restrictionSchedule).toEqual({ connect: { id: 50 } });
      });
    });

    describe("secondary email", () => {
      it("connects verified secondary email", async () => {
        (
          mockDeps.eventTypeRepository.findVerifiedSecondaryEmail as ReturnType<typeof vi.fn>
        ).mockResolvedValue({ id: 10, emailVerified: new Date() });

        await service.update({
          user: DEFAULT_USER,
          input: createMinimalInput({ secondaryEmailId: 10 }),
        });

        const updateCall = (mockDeps.eventTypeRepository.updateById as ReturnType<typeof vi.fn>).mock
          .calls[0][0];
        expect(updateCall.data.secondaryEmail).toEqual({ connect: { id: 10 } });
      });

      it("disconnects secondary email when id is -1", async () => {
        (
          mockDeps.eventTypeRepository.findVerifiedSecondaryEmail as ReturnType<typeof vi.fn>
        ).mockResolvedValue(null);

        await service.update({
          user: DEFAULT_USER,
          input: createMinimalInput({ secondaryEmailId: -1 }),
        });

        const updateCall = (mockDeps.eventTypeRepository.updateById as ReturnType<typeof vi.fn>).mock
          .calls[0][0];
        expect(updateCall.data.secondaryEmail).toEqual({ disconnect: true });
      });
    });

    describe("successRedirectUrl tracking", () => {
      it("sets successRedirectUrlUpdatedAt when successRedirectUrl changes", async () => {
        (mockDeps.eventTypeRepository.findByIdWithFullDetail as ReturnType<typeof vi.fn>).mockResolvedValue({
          ...DEFAULT_EVENT_TYPE,
          successRedirectUrl: "https://old.example.com",
        });

        await service.update({
          user: DEFAULT_USER,
          input: createMinimalInput({ successRedirectUrl: "https://new.example.com" }),
        });

        const updateCall = (mockDeps.eventTypeRepository.updateById as ReturnType<typeof vi.fn>).mock
          .calls[0][0];
        expect(updateCall.data.successRedirectUrlUpdatedAt).toBeInstanceOf(Date);
      });

      it("does not set successRedirectUrlUpdatedAt when successRedirectUrl is unchanged", async () => {
        (mockDeps.eventTypeRepository.findByIdWithFullDetail as ReturnType<typeof vi.fn>).mockResolvedValue({
          ...DEFAULT_EVENT_TYPE,
          successRedirectUrl: "https://same.example.com",
        });

        await service.update({
          user: DEFAULT_USER,
          input: createMinimalInput({ successRedirectUrl: "https://same.example.com" }),
        });

        const updateCall = (mockDeps.eventTypeRepository.updateById as ReturnType<typeof vi.fn>).mock
          .calls[0][0];
        expect(updateCall.data.successRedirectUrlUpdatedAt).toBeUndefined();
      });

      it("does not set successRedirectUrlUpdatedAt when successRedirectUrl is not provided", async () => {
        await service.update({
          user: DEFAULT_USER,
          input: createMinimalInput({ title: "No redirect change" }),
        });

        const updateCall = (mockDeps.eventTypeRepository.updateById as ReturnType<typeof vi.fn>).mock
          .calls[0][0];
        expect(updateCall.data.successRedirectUrlUpdatedAt).toBeUndefined();
      });

      it("sets successRedirectUrlUpdatedAt when successRedirectUrl is set for the first time", async () => {
        await service.update({
          user: DEFAULT_USER,
          input: createMinimalInput({ successRedirectUrl: "https://new.example.com" }),
        });

        const updateCall = (mockDeps.eventTypeRepository.updateById as ReturnType<typeof vi.fn>).mock
          .calls[0][0];
        expect(updateCall.data.successRedirectUrlUpdatedAt).toBeInstanceOf(Date);
      });
    });

    describe("AI phone call config", () => {
      it("upserts AI phone call config when enabled", async () => {
        const config = {
          enabled: true,
          generalPrompt: "Hello",
          beginMessage: null,
          yourPhoneNumber: "+1234567890",
          numberToCall: "+0987654321",
          templateType: "CUSTOM_TEMPLATE" as const,
        };

        await service.update({
          user: DEFAULT_USER,
          input: createMinimalInput({ aiPhoneCallConfig: config }),
        });

        expect(mockDeps.eventTypeRepository.upsertAIPhoneCallConfig).toHaveBeenCalledWith({
          eventTypeId: 1,
          config: {
            ...config,
            guestEmail: null,
            guestCompany: null,
          },
        });
      });

      it("deletes AI phone call config when disabled and config exists", async () => {
        (mockDeps.eventTypeRepository.findByIdWithFullDetail as ReturnType<typeof vi.fn>).mockResolvedValue({
          ...DEFAULT_EVENT_TYPE,
          aiPhoneCallConfig: { enabled: true, generalPrompt: "Hello", beginMessage: null, llmId: "test" },
        });

        await service.update({
          user: DEFAULT_USER,
          input: createMinimalInput({
            aiPhoneCallConfig: {
              enabled: false,
              generalPrompt: "",
              beginMessage: null,
              yourPhoneNumber: "",
              numberToCall: "",
              templateType: "CUSTOM_TEMPLATE",
            },
          }),
        });

        expect(mockDeps.eventTypeRepository.deleteAIPhoneCallConfig).toHaveBeenCalledWith({
          eventTypeId: 1,
        });
      });
    });
  });
});
