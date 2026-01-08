import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import dayjs from "@calcom/dayjs";

import { AvailableSlotsService } from "./util";
import type { IAvailableSlotsService } from "./util";
import type { TGetScheduleInputSchema } from "./types";

import { BookingDateInPastError, isTimeOutOfBounds } from "@calcom/lib/isOutOfBounds";
import { SchedulingType } from "@calcom/prisma/enums";
import { getAggregatedAvailability } from "@calcom/features/availability/lib/getAggregatedAvailability/getAggregatedAvailability";

import { TRPCError } from "@trpc/server";

vi.mock("@calcom/features/availability/lib/getAggregatedAvailability/getAggregatedAvailability", () => {
  return {
    getAggregatedAvailability: vi.fn(),
  };
});
const getAggregatedAvailabilityMock = vi.mocked(getAggregatedAvailability);

describe("BookingDateInPastError handling", () => {
  it("should convert BookingDateInPastError to TRPCError with BAD_REQUEST code", () => {
    const testFilteringLogic = () => {
      const mockSlot = {
        time: "2024-05-20T12:30:00.000Z", // Past date
        attendees: 1,
      };

      const mockEventType = {
        minimumBookingNotice: 0,
      };

      const isFutureLimitViolationForTheSlot = false; // Mock this to false

      let isOutOfBounds = false;
      try {
        // This will throw BookingDateInPastError for past dates
        isOutOfBounds = isTimeOutOfBounds({
          time: mockSlot.time,
          minimumBookingNotice: mockEventType.minimumBookingNotice,
        });
      } catch (error) {
        if (error instanceof BookingDateInPastError) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: error.message,
          });
        }
        throw error;
      }

      return !isFutureLimitViolationForTheSlot && !isOutOfBounds;
    };

    // This should throw a TRPCError with BAD_REQUEST code
    expect(() => testFilteringLogic()).toThrow(TRPCError);
    expect(() => testFilteringLogic()).toThrow("Attempting to book a meeting in the past.");
  });
});

describe("round robin chunking", () => {
  const dependencyStub = {} as unknown as IAvailableSlotsService;
  let consoleSpy: ReturnType<typeof vi.spyOn>;

  const baseInput = {} as TGetScheduleInputSchema;
  const loggerStub = {
    info: vi.fn(),
    debug: vi.fn(),
  };

  const createHosts = (count: number, weights?: number[]) =>
    Array.from({ length: count }).map((_, index) => ({
      isFixed: false,
      groupId: null,
      user: {
        id: index + 1,
        credentials: [],
      },
      weight: weights?.[index] ?? 100,
    }));

  beforeEach(() => {
    vi.clearAllMocks();
    consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  const invokeChunking = async ({
    hosts,
    isRRWeightsEnabled,
  }: {
    hosts: ReturnType<typeof createHosts>;
    isRRWeightsEnabled: boolean;
  }) => {
    const service = new AvailableSlotsService(dependencyStub);
    const calculateSpy = vi
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .spyOn(service as any, "calculateHostsAndAvailabilities")
      .mockResolvedValue({
        allUsersAvailability: [],
        usersWithCredentials: [],
        currentSeats: undefined,
      });

    const startTime = dayjs();
    const endTime = dayjs().add(1, "day");

    const result = await (
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      service as any
    ).calculateAvailabilityWithRoundRobinChunks({
      hosts,
      eventType: {
        id: 123,
        schedulingType: SchedulingType.ROUND_ROBIN,
        isRRWeightsEnabled,
        team: null,
      },
      chunkSize: 20,
      input: baseInput,
      loggerWithEventDetails: loggerStub,
      startTime,
      endTime,
      bypassBusyCalendarTimes: false,
      silentCalendarFailures: false,
      mode: "slots",
    });

    return { result, calculateSpy };
  };

  it("processes host chunks sequentially until availability is found", async () => {
    const hosts = createHosts(105);
    const firstChunkAvailability: [] = [];
    const secondChunkAvailability = [
      {
        start: dayjs(),
        end: dayjs().add(30, "minutes"),
      },
    ];

    getAggregatedAvailabilityMock.mockReturnValueOnce(firstChunkAvailability).mockReturnValueOnce(secondChunkAvailability);

    const { result, calculateSpy } = await invokeChunking({ hosts, isRRWeightsEnabled: true });

    expect(calculateSpy).toHaveBeenCalledTimes(2);
    expect(getAggregatedAvailabilityMock).toHaveBeenCalledTimes(2);
    expect(calculateSpy.mock.calls[0][0].hosts).toHaveLength(20);
    expect(calculateSpy.mock.calls[1][0].hosts).toHaveLength(20);
    expect(result.aggregatedAvailability).toEqual(secondChunkAvailability);
  });

  it("skips chunking when weights are disabled", async () => {
    const hosts = createHosts(150);
    const finalAvailability = [
      {
        start: dayjs(),
        end: dayjs().add(1, "hour"),
      },
    ];
    getAggregatedAvailabilityMock.mockReturnValue(finalAvailability);

    const { result, calculateSpy } = await invokeChunking({ hosts, isRRWeightsEnabled: false });

    expect(calculateSpy).toHaveBeenCalledTimes(1);
    expect(getAggregatedAvailabilityMock).toHaveBeenCalledTimes(1);
    expect(result.aggregatedAvailability).toEqual(finalAvailability);
  });

  it("preserves host ordering (weight-based) when chunking", async () => {
    const weights = Array.from({ length: 120 }).map((_, idx) => 2000 - idx * 10);
    const hosts = createHosts(weights.length, weights);

    getAggregatedAvailabilityMock.mockReturnValue([]);

    const service = new AvailableSlotsService(dependencyStub);
    const calculateSpy = vi
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .spyOn(service as any, "calculateHostsAndAvailabilities")
      .mockResolvedValue({
        allUsersAvailability: [],
        usersWithCredentials: [],
        currentSeats: undefined,
      });

    await (
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      service as any
    ).calculateAvailabilityWithRoundRobinChunks({
      hosts,
      eventType: {
        id: 456,
        schedulingType: SchedulingType.ROUND_ROBIN,
        isRRWeightsEnabled: true,
        team: null,
      },
      chunkSize: 20,
      input: baseInput,
      loggerWithEventDetails: loggerStub,
      startTime: dayjs(),
      endTime: dayjs().add(1, "day"),
      bypassBusyCalendarTimes: false,
      silentCalendarFailures: false,
      mode: "slots",
    });

    const firstChunkWeights = calculateSpy.mock.calls[0][0].hosts.map((host: { weight?: number | null }) => host.weight);
    expect(firstChunkWeights).toEqual(weights.slice(0, 20));
  });

  it("returns empty availability when all chunks have no slots", async () => {
    const hosts = createHosts(120);
    getAggregatedAvailabilityMock.mockReturnValue([]);

    const { result, calculateSpy } = await invokeChunking({ hosts, isRRWeightsEnabled: true });

    expect(calculateSpy).toHaveBeenCalledTimes(6); // 120 hosts / 20 per chunk
    expect(result.aggregatedAvailability).toEqual([]);
  });
});
