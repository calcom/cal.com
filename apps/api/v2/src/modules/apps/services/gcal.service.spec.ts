import { NotFoundException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { AppsRepository } from "@/modules/apps/apps.repository";
import { GCalService } from "@/modules/apps/services/gcal.service";

jest.mock("googleapis-common", () => ({
  OAuth2Client: jest.fn().mockImplementation((clientId, clientSecret, redirectUri) => ({
    clientId,
    clientSecret,
    redirectUri,
  })),
}));

describe("GCalService", () => {
  let service: GCalService;
  let appsRepository: AppsRepository;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GCalService,
        {
          provide: AppsRepository,
          useValue: {
            getAppBySlug: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<GCalService>(GCalService);
    appsRepository = module.get<AppsRepository>(AppsRepository);

    jest.clearAllMocks();
  });

  describe("getOAuthClient", () => {
    it("should return OAuth2Client with correct credentials", async () => {
      (appsRepository.getAppBySlug as jest.Mock).mockResolvedValue({
        keys: { client_id: "gcal_client_id", client_secret: "gcal_client_secret" },
      });

      const result = await service.getOAuthClient("http://localhost:3000/callback");

      expect(appsRepository.getAppBySlug).toHaveBeenCalledWith("google-calendar");
      expect(result).toEqual({
        clientId: "gcal_client_id",
        clientSecret: "gcal_client_secret",
        redirectUri: "http://localhost:3000/callback",
      });
    });

    it("should throw NotFoundException when app is not found", async () => {
      (appsRepository.getAppBySlug as jest.Mock).mockResolvedValue(null);

      await expect(service.getOAuthClient("http://localhost:3000/callback")).rejects.toThrow(
        NotFoundException
      );
    });

    it("should throw when keys are missing required fields", async () => {
      (appsRepository.getAppBySlug as jest.Mock).mockResolvedValue({
        keys: { client_id: "gcal_client_id" },
      });

      await expect(service.getOAuthClient("http://localhost:3000/callback")).rejects.toThrow();
    });
  });
});
