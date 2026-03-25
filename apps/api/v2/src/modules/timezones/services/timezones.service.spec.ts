import { createMock } from "@golevelup/ts-jest";
import { RedisService } from "@/modules/redis/redis.service";
import { TimezonesService } from "@/modules/timezones/services/timezones.service";
import * as platformLibraries from "@calcom/platform-libraries";

jest.mock("@calcom/platform-libraries", () => ({
  cityTimezonesHandler: jest.fn(),
}));

describe("TimezonesService", () => {
  let service: TimezonesService;
  let redisService: RedisService;

  const mockTimezones = [
    { city: "New York", timezone: "America/New_York", pop: 8336817 },
    { city: "London", timezone: "Europe/London", pop: 8982000 },
  ];

  beforeEach(() => {
    redisService = createMock<RedisService>({
      get: jest.fn().mockResolvedValue(null),
      set: jest.fn().mockResolvedValue("OK"),
    });
    service = new TimezonesService(redisService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  it("should fetch timezones and cache them when cache is empty", async () => {
    jest.spyOn(redisService, "get").mockResolvedValue(null);
    (platformLibraries.cityTimezonesHandler as jest.Mock).mockResolvedValue(mockTimezones);

    const result = await service.getCityTimeZones();

    expect(result).toEqual(mockTimezones);
    expect(redisService.get).toHaveBeenCalledWith("cityTimezones");
    expect(platformLibraries.cityTimezonesHandler).toHaveBeenCalled();
    expect(redisService.set).toHaveBeenCalledWith("cityTimezones", mockTimezones, {
      ttl: 60 * 60 * 24 * 1000,
    });
  });

  it("should return cached timezones when cache is populated", async () => {
    jest.spyOn(redisService, "get").mockResolvedValue(mockTimezones);

    const result = await service.getCityTimeZones();

    expect(result).toEqual(mockTimezones);
    expect(redisService.get).toHaveBeenCalledWith("cityTimezones");
    expect(platformLibraries.cityTimezonesHandler).not.toHaveBeenCalled();
    expect(redisService.set).not.toHaveBeenCalled();
  });

  it("should set TTL of 24 hours in milliseconds when caching", async () => {
    jest.spyOn(redisService, "get").mockResolvedValue(null);
    (platformLibraries.cityTimezonesHandler as jest.Mock).mockResolvedValue(mockTimezones);

    await service.getCityTimeZones();

    const expectedTtlMs = 86400000; // 24 hours in milliseconds
    expect(redisService.set).toHaveBeenCalledWith("cityTimezones", mockTimezones, {
      ttl: expectedTtlMs,
    });
  });
});
