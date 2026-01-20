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
  const mockFeaturesRepo = {
    checkIfTeamHasFeatureNonHierarchical: vi.fn().mockResolvedValue(true),
  };
  const dependencyStub = {
    featuresRepo: mockFeaturesRepo,
  } as unknown as IAvailableSlotsService;
  let consoleSpy: ReturnType<typeof vi.spyOn>;

  const baseInput = {} as TGetScheduleInputSchema;
  const loggerStub = {
    info: vi.fn(),
    debug: vi.fn(),
  };

  const computeExpectedChunkSize = (count: number) => {
    const dynamic = Math.ceil(count * 0.2);
    return Math.min(50, dynamic);
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
    manualChunking = false,
    chunkOffset,
  }: {
    hosts: ReturnType<typeof createHosts>;
    isRRWeightsEnabled: boolean;
    manualChunking?: boolean;
    chunkOffset?: number;
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
        team: { id: 1 },
      },
      input: {
        ...baseInput,
        ...(manualChunking ? { roundRobinManualChunking: true } : {}),
        ...(chunkOffset !== undefined ? { roundRobinChunkOffset: chunkOffset } : {}),
      },
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

    const { result, calculateSpy } = await invokeChunking({ hosts, isRRWeightsEnabled: false });

    expect(calculateSpy).toHaveBeenCalledTimes(2);
    expect(getAggregatedAvailabilityMock).toHaveBeenCalledTimes(2);
    const expectedChunkSize = computeExpectedChunkSize(hosts.length);
    expect(calculateSpy.mock.calls[0][0].hosts).toHaveLength(expectedChunkSize);
    expect(calculateSpy.mock.calls[1][0].hosts).toHaveLength(expectedChunkSize);
    expect(result.aggregatedAvailability).toEqual(secondChunkAvailability);
    expect(result.roundRobinChunkInfo).toEqual({
      totalHosts: hosts.length,
      totalNonFixedHosts: hosts.length,
      chunkSize: expectedChunkSize,
      chunkOffset: 1,
      loadedNonFixedHosts: expectedChunkSize,
      hasMoreNonFixedHosts: true,
      manualChunking: false,
    });
  });

  it("allows fetching a specific chunk when manual chunking is enabled", async () => {
    const hosts = createHosts(105);
    const manualChunkOffset = 3;
    getAggregatedAvailabilityMock.mockReturnValue([]);

    const { result, calculateSpy } = await invokeChunking({
      hosts,
      isRRWeightsEnabled: false,
      manualChunking: true,
      chunkOffset: manualChunkOffset,
    });

    expect(calculateSpy).toHaveBeenCalledTimes(1);
    const expectedChunkSize = computeExpectedChunkSize(hosts.length);
    expect(calculateSpy.mock.calls[0][0].hosts).toHaveLength(expectedChunkSize);
    expect(result.roundRobinChunkInfo).toEqual({
      totalHosts: hosts.length,
      totalNonFixedHosts: hosts.length,
      chunkSize: expectedChunkSize,
      chunkOffset: manualChunkOffset,
      loadedNonFixedHosts: expectedChunkSize,
      hasMoreNonFixedHosts: true,
      manualChunking: true,
    });
  });

  it("increases chunk size proportionally for very large teams", async () => {
    const hosts = createHosts(250);
    getAggregatedAvailabilityMock.mockReturnValue([]);

    const { result, calculateSpy } = await invokeChunking({ hosts, isRRWeightsEnabled: false });

    const expectedChunkSize = computeExpectedChunkSize(hosts.length);
    expect(expectedChunkSize).toBeGreaterThan(20);
    expect(calculateSpy.mock.calls[0][0].hosts).toHaveLength(expectedChunkSize);
    const chunkCount = Math.ceil(hosts.length / expectedChunkSize);
    const lastChunkSize = hosts.length - expectedChunkSize * (chunkCount - 1);
    expect(result.roundRobinChunkInfo).toEqual({
      totalHosts: hosts.length,
      totalNonFixedHosts: hosts.length,
      chunkSize: expectedChunkSize,
      chunkOffset: chunkCount - 1,
      loadedNonFixedHosts: lastChunkSize,
      hasMoreNonFixedHosts: false,
      manualChunking: false,
    });
  });

  it("caps chunk size at the defined maximum", async () => {
    const hosts = createHosts(1000);
    getAggregatedAvailabilityMock.mockReturnValue([]);

    const { calculateSpy } = await invokeChunking({ hosts, isRRWeightsEnabled: false });

    const expectedChunkSize = computeExpectedChunkSize(hosts.length);
    expect(expectedChunkSize).toBe(50);
    expect(calculateSpy.mock.calls[0][0].hosts).toHaveLength(expectedChunkSize);
  });

  it("skips chunking when weights are enabled", async () => {
    const hosts = createHosts(150);
    const finalAvailability = [
      {
        start: dayjs(),
        end: dayjs().add(1, "hour"),
      },
    ];
    getAggregatedAvailabilityMock.mockReturnValue(finalAvailability);

    const { result, calculateSpy } = await invokeChunking({ hosts, isRRWeightsEnabled: true });

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
        isRRWeightsEnabled: false,
        team: { id: 1 },
      },
      input: baseInput,
      loggerWithEventDetails: loggerStub,
      startTime: dayjs(),
      endTime: dayjs().add(1, "day"),
      bypassBusyCalendarTimes: false,
      silentCalendarFailures: false,
      mode: "slots",
    });

    const expectedChunkSize = computeExpectedChunkSize(weights.length);
    const firstChunkWeights = calculateSpy.mock.calls[0][0].hosts.map((host: { weight?: number | null }) => host.weight);
    expect(firstChunkWeights).toEqual(weights.slice(0, expectedChunkSize));
  });

  it("returns empty availability when all chunks have no slots", async () => {
    const hosts = createHosts(120);
    getAggregatedAvailabilityMock.mockReturnValue([]);

    const { result, calculateSpy } = await invokeChunking({ hosts, isRRWeightsEnabled: false });

    const expectedChunkSize = computeExpectedChunkSize(hosts.length);
    const expectedChunkCount = Math.ceil(hosts.length / expectedChunkSize);
    expect(calculateSpy).toHaveBeenCalledTimes(expectedChunkCount);
    expect(result.aggregatedAvailability).toEqual([]);
    expect(result.roundRobinChunkInfo).toEqual({
      totalHosts: hosts.length,
      totalNonFixedHosts: hosts.length,
      chunkSize: expectedChunkSize,
      chunkOffset: expectedChunkCount - 1,
      loadedNonFixedHosts: hosts.length - expectedChunkSize * (expectedChunkCount - 1),
      hasMoreNonFixedHosts: false,
      manualChunking: false,
    });
  });
});
