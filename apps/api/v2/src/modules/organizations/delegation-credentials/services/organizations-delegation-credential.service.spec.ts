import {
  CALENDARS_QUEUE,
  DEFAULT_CALENDARS_JOB,
} from "@/ee/calendars/processors/calendars.processor";
import { OrganizationsDelegationCredentialRepository } from "@/modules/organizations/delegation-credentials/organizations-delegation-credential.repository";
import { OrganizationsDelegationCredentialService } from "@/modules/organizations/delegation-credentials/services/organizations-delegation-credential.service";
import { Logger } from "@nestjs/common";
import { getQueueToken } from "@nestjs/bull";
import { Test, TestingModule } from "@nestjs/testing";

describe("OrganizationsDelegationCredentialService", () => {
  let service: OrganizationsDelegationCredentialService;
  let mockRepository: OrganizationsDelegationCredentialRepository;
  let mockQueue: { getJob: jest.Mock; add: jest.Mock };

  const orgId = 1;
  const domain = "example.com";

  beforeEach(async () => {
    mockQueue = {
      getJob: jest.fn().mockResolvedValue(null),
      add: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrganizationsDelegationCredentialService,
        {
          provide: OrganizationsDelegationCredentialRepository,
          useValue: {
            findDelegatedUserProfiles: jest.fn().mockResolvedValue([]),
          },
        },
        {
          provide: getQueueToken(CALENDARS_QUEUE),
          useValue: mockQueue,
        },
      ],
    }).compile();

    service = module.get<OrganizationsDelegationCredentialService>(
      OrganizationsDelegationCredentialService
    );
    mockRepository = module.get<OrganizationsDelegationCredentialRepository>(
      OrganizationsDelegationCredentialRepository
    );

    jest.spyOn(Logger.prototype, "log").mockImplementation();
    jest.spyOn(Logger.prototype, "error").mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("ensureDefaultCalendars", () => {
    it("adds calendar jobs for each delegated user profile", async () => {
      (mockRepository.findDelegatedUserProfiles as jest.Mock).mockResolvedValue([
        { userId: 1 },
        { userId: 2 },
      ]);

      await service.ensureDefaultCalendars(orgId, domain);

      expect(mockRepository.findDelegatedUserProfiles).toHaveBeenCalledWith(orgId, domain);
      expect(mockQueue.add).toHaveBeenCalledTimes(2);
      expect(mockQueue.add).toHaveBeenCalledWith(
        DEFAULT_CALENDARS_JOB,
        { userId: 1 },
        { jobId: `${DEFAULT_CALENDARS_JOB}_1`, removeOnComplete: true }
      );
      expect(mockQueue.add).toHaveBeenCalledWith(
        DEFAULT_CALENDARS_JOB,
        { userId: 2 },
        { jobId: `${DEFAULT_CALENDARS_JOB}_2`, removeOnComplete: true }
      );
    });

    it("removes existing job before adding new one", async () => {
      const mockExistingJob = { remove: jest.fn().mockResolvedValue(undefined) };
      (mockRepository.findDelegatedUserProfiles as jest.Mock).mockResolvedValue([{ userId: 1 }]);
      mockQueue.getJob.mockResolvedValue(mockExistingJob);

      await service.ensureDefaultCalendars(orgId, domain);

      expect(mockExistingJob.remove).toHaveBeenCalled();
      expect(mockQueue.add).toHaveBeenCalledTimes(1);
    });

    it("skips profiles without userId", async () => {
      (mockRepository.findDelegatedUserProfiles as jest.Mock).mockResolvedValue([
        { userId: 1 },
        { userId: null },
        { userId: 3 },
      ]);

      await service.ensureDefaultCalendars(orgId, domain);

      expect(mockQueue.add).toHaveBeenCalledTimes(2);
      expect(mockQueue.add).toHaveBeenCalledWith(DEFAULT_CALENDARS_JOB, { userId: 1 }, expect.any(Object));
      expect(mockQueue.add).toHaveBeenCalledWith(DEFAULT_CALENDARS_JOB, { userId: 3 }, expect.any(Object));
    });

    it("does not add jobs when profiles list is empty", async () => {
      (mockRepository.findDelegatedUserProfiles as jest.Mock).mockResolvedValue([]);

      await service.ensureDefaultCalendars(orgId, domain);

      expect(mockQueue.add).not.toHaveBeenCalled();
    });

    it("processes all profiles even when some fail (Promise.allSettled)", async () => {
      (mockRepository.findDelegatedUserProfiles as jest.Mock).mockResolvedValue([
        { userId: 1 },
        { userId: 2 },
        { userId: 3 },
      ]);
      mockQueue.add
        .mockResolvedValueOnce(undefined)
        .mockRejectedValueOnce(new Error("Queue error"))
        .mockResolvedValueOnce(undefined);

      await service.ensureDefaultCalendars(orgId, domain);

      // All 3 jobs were attempted despite the failure
      expect(mockQueue.add).toHaveBeenCalledTimes(3);
    });

    it("does not throw when repository fails", async () => {
      (mockRepository.findDelegatedUserProfiles as jest.Mock).mockRejectedValue(
        new Error("Database error")
      );

      await expect(service.ensureDefaultCalendars(orgId, domain)).resolves.toBeUndefined();
      expect(mockQueue.add).not.toHaveBeenCalled();
    });
  });
});
