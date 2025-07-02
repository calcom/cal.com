import { ConfigService } from "@nestjs/config";
import { Test, TestingModule } from "@nestjs/testing";
import { describe, expect, it, vi, beforeEach } from "vitest";

import { RedisService } from "../../redis/redis.service";
import { DeploymentsRepository } from "../deployments.repository";
import { DeploymentsService } from "../deployments.service";

vi.mock("../deployments.repository");
vi.mock("../../redis/redis.service");

describe("DeploymentsService", () => {
  let service: DeploymentsService;
  let configService: ConfigService;
  let deploymentsRepository: DeploymentsRepository;
  let redisService: RedisService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DeploymentsService,
        {
          provide: ConfigService,
          useValue: {
            get: vi.fn(),
          },
        },
        {
          provide: DeploymentsRepository,
          useValue: {
            getDeployment: vi.fn(),
          },
        },
        {
          provide: RedisService,
          useValue: {
            redis: {
              get: vi.fn(),
              set: vi.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<DeploymentsService>(DeploymentsService);
    configService = module.get<ConfigService>(ConfigService);
    deploymentsRepository = module.get<DeploymentsRepository>(DeploymentsRepository);
    redisService = module.get<RedisService>(RedisService);

    global.fetch = vi.fn();
  });

  it("should return true for e2e environment", async () => {
    (configService.get as any).mockImplementation((key: string) => {
      if (key === "e2e") return true;
      return undefined;
    });

    const result = await service.checkLicense();
    expect(result).toBe(true);
  });

  it("should return false when no license key is found", async () => {
    (configService.get as any).mockImplementation((key: string) => {
      if (key === "e2e") return false;
      if (key === "api.licenseKey") return undefined;
      return undefined;
    });
    (deploymentsRepository.getDeployment as any).mockResolvedValue(null);

    const result = await service.checkLicense();
    expect(result).toBe(false);
  });

  it("should handle database fetch failure gracefully", async () => {
    (configService.get as any).mockImplementation((key: string) => {
      if (key === "e2e") return false;
      if (key === "api.licenseKey") return undefined;
      return undefined;
    });
    (deploymentsRepository.getDeployment as any).mockRejectedValue(new Error("Database error"));

    const result = await service.checkLicense();
    expect(result).toBe(false);
  });

  it("should handle license validation request failure", async () => {
    (configService.get as any).mockImplementation((key: string) => {
      if (key === "e2e") return false;
      if (key === "api.licenseKey") return "test-license-key";
      if (key === "api.licenseKeyUrl") return "https://console.cal.com/api/license";
      return undefined;
    });
    (redisService.redis.get as any).mockResolvedValue(null);
    (global.fetch as any).mockRejectedValue(new Error("Network error"));

    const result = await service.checkLicense();
    expect(result).toBe(false);
  });

  it("should return cached license status", async () => {
    (configService.get as any).mockImplementation((key: string) => {
      if (key === "e2e") return false;
      if (key === "api.licenseKey") return "test-license-key";
      return undefined;
    });
    (redisService.redis.get as any).mockResolvedValue(JSON.stringify({ status: true }));

    const result = await service.checkLicense();
    expect(result).toBe(true);
  });
});
