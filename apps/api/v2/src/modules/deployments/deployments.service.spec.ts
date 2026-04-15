import { DeploymentsRepository } from "@/modules/deployments/deployments.repository";
import { DeploymentsService } from "@/modules/deployments/deployments.service";
import { RedisService } from "@/modules/redis/redis.service";
import { createMock } from "@golevelup/ts-jest";
import { ConfigService } from "@nestjs/config";

describe("DeploymentsService", () => {
  let service: DeploymentsService;
  let deploymentsRepository: DeploymentsRepository;
  let configService: ConfigService;
  let redisService: RedisService;

  beforeEach(() => {
    deploymentsRepository = createMock<DeploymentsRepository>();
    configService = createMock<ConfigService>();
    jest.spyOn(configService, "get").mockImplementation((key: string) => {
      if (key === "api.licenseKey") return "cal_live_test_key";
      if (key === "api.licenseKeyUrl") return "https://console.cal.com/api/license";
      if (key === "e2e") return false;
      return undefined;
    });
    redisService = createMock<RedisService>({
      redis: {
        get: jest.fn().mockResolvedValue(null),
        set: jest.fn().mockResolvedValue("OK"),
      },
    });
    service = new DeploymentsService(deploymentsRepository, configService, redisService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("checkLicense", () => {
    it("should return true when license API responds with { valid: true }", async () => {
      global.fetch = jest.fn().mockResolvedValue({
        json: () => Promise.resolve({ valid: true }),
      });

      const result = await service.checkLicense();
      expect(result).toBe(true);
    });

    it("should return false when license API responds with { valid: false }", async () => {
      global.fetch = jest.fn().mockResolvedValue({
        json: () => Promise.resolve({ valid: false }),
      });

      const result = await service.checkLicense();
      expect(result).toBe(false);
    });

    it("should return true from cached data with { valid: true }", async () => {
      const fetchSpy = jest.fn();
      global.fetch = fetchSpy;
      (redisService.redis.get as jest.Mock).mockResolvedValue(JSON.stringify({ valid: true }));

      const result = await service.checkLicense();
      expect(result).toBe(true);
      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it("should return false from cached data with { valid: false }", async () => {
      (redisService.redis.get as jest.Mock).mockResolvedValue(JSON.stringify({ valid: false }));

      const result = await service.checkLicense();
      expect(result).toBe(false);
    });

    it("should return true in e2e mode regardless of license", async () => {
      (configService.get as jest.Mock).mockImplementation((key: string) => {
        if (key === "e2e") return true;
        return undefined;
      });

      const result = await service.checkLicense();
      expect(result).toBe(true);
    });

    it("should return false when no license key is configured", async () => {
      (configService.get as jest.Mock).mockImplementation((key: string) => {
        if (key === "e2e") return false;
        return undefined;
      });
      (deploymentsRepository.getDeployment as jest.Mock).mockResolvedValue(null);

      const result = await service.checkLicense();
      expect(result).toBe(false);
    });

    it("should cache the license API response in Redis", async () => {
      global.fetch = jest.fn().mockResolvedValue({
        json: () => Promise.resolve({ valid: true }),
      });

      await service.checkLicense();

      expect(redisService.redis.set).toHaveBeenCalledWith(
        "api-v2-license-key-goblin-url-cal_live_test_key",
        JSON.stringify({ valid: true }),
        "EX",
        86400000
      );
    });

    it("should fall back to DB deployment record when env var is not set", async () => {
      (configService.get as jest.Mock).mockImplementation((key: string) => {
        if (key === "api.licenseKey") return undefined;
        if (key === "api.licenseKeyUrl") return "https://console.cal.com/api/license";
        if (key === "e2e") return false;
        return undefined;
      });
      (deploymentsRepository.getDeployment as jest.Mock).mockResolvedValue({
        licenseKey: "cal_live_db_key",
      });
      global.fetch = jest.fn().mockResolvedValue({
        json: () => Promise.resolve({ valid: true }),
      });

      const result = await service.checkLicense();
      expect(result).toBe(true);
      expect(deploymentsRepository.getDeployment).toHaveBeenCalled();
    });
  });
});
