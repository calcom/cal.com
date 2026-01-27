import {
  CALENDARS_QUEUE,
  DEFAULT_CALENDARS_JOB,
} from "@/ee/calendars/processors/calendars.processor";
import { CalendarsTasker } from "@/lib/services/tasker/calendars-tasker.service";
import { OrganizationsDelegationCredentialRepository } from "@/modules/organizations/delegation-credentials/organizations-delegation-credential.repository";
import { OrganizationsDelegationCredentialService } from "@/modules/organizations/delegation-credentials/services/organizations-delegation-credential.service";
import { Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { getQueueToken } from "@nestjs/bull";
import { Test, TestingModule } from "@nestjs/testing";

describe("OrganizationsDelegationCredentialService", () => {
  let service: OrganizationsDelegationCredentialService;
  let mockRepository: OrganizationsDelegationCredentialRepository;
  let mockQueue: { getJob: jest.Mock; add: jest.Mock };
  let mockCalendarsTasker: { dispatch: jest.Mock };
  let mockConfigService: { get: jest.Mock };

  const orgId = 1;
  const domain = "example.com";

  beforeEach(async () => {
    mockQueue = {
      getJob: jest.fn().mockResolvedValue(null),
      add: jest.fn().mockResolvedValue(undefined),
    };

    mockCalendarsTasker = {
      dispatch: jest.fn().mockResolvedValue({ runId: "test-run-id" }),
    };

    mockConfigService = {
      get: jest.fn().mockReturnValue(false),
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
        {
          provide: CalendarsTasker,
          useValue: mockCalendarsTasker,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
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

  describe("ensureDefaultCalendarsForUser", () => {
    const userId = 123;
    const userEmail = "user@example.com";

    beforeEach(() => {
      (mockRepository.findEnabledByOrgIdAndDomain as jest.Mock) = jest.fn();
      jest.spyOn(Logger.prototype, "warn").mockImplementation();
    });

    it("adds calendar job when delegation credential exists for user domain", async () => {
      (mockRepository.findEnabledByOrgIdAndDomain as jest.Mock).mockResolvedValue({
        id: "cred-1",
      });

      await service.ensureDefaultCalendarsForUser(orgId, userId, userEmail);

      expect(mockRepository.findEnabledByOrgIdAndDomain).toHaveBeenCalledWith(orgId, "@example.com");
      expect(mockQueue.add).toHaveBeenCalledWith(
        DEFAULT_CALENDARS_JOB,
        { userId },
        { jobId: `${DEFAULT_CALENDARS_JOB}_${userId}`, removeOnComplete: true }
      );
    });

    it("removes existing job before adding new one", async () => {
      const mockExistingJob = { remove: jest.fn().mockResolvedValue(undefined) };
      (mockRepository.findEnabledByOrgIdAndDomain as jest.Mock).mockResolvedValue({
        id: "cred-1",
      });
      mockQueue.getJob.mockResolvedValue(mockExistingJob);

      await service.ensureDefaultCalendarsForUser(orgId, userId, userEmail);

      expect(mockExistingJob.remove).toHaveBeenCalled();
      expect(mockQueue.add).toHaveBeenCalledTimes(1);
    });

    it("does not add job when no delegation credential exists for domain", async () => {
      (mockRepository.findEnabledByOrgIdAndDomain as jest.Mock).mockResolvedValue(null);

      await service.ensureDefaultCalendarsForUser(orgId, userId, userEmail);

      expect(mockRepository.findEnabledByOrgIdAndDomain).toHaveBeenCalledWith(orgId, "@example.com");
      expect(mockQueue.add).not.toHaveBeenCalled();
    });

    it("returns early and logs warning for invalid email without @ symbol", async () => {
      await service.ensureDefaultCalendarsForUser(orgId, userId, "invalidemail");

      expect(Logger.prototype.warn).toHaveBeenCalledWith(`Invalid email format for user ${userId}: missing domain`);
      expect(mockRepository.findEnabledByOrgIdAndDomain).not.toHaveBeenCalled();
      expect(mockQueue.add).not.toHaveBeenCalled();
    });

    it("returns early for email with @ but no domain part", async () => {
      await service.ensureDefaultCalendarsForUser(orgId, userId, "user@");

      expect(Logger.prototype.warn).toHaveBeenCalledWith(`Invalid email format for user ${userId}: missing domain`);
      expect(mockRepository.findEnabledByOrgIdAndDomain).not.toHaveBeenCalled();
      expect(mockQueue.add).not.toHaveBeenCalled();
    });

    it("does not throw when repository fails", async () => {
      (mockRepository.findEnabledByOrgIdAndDomain as jest.Mock).mockRejectedValue(
        new Error("Database error")
      );

      await expect(service.ensureDefaultCalendarsForUser(orgId, userId, userEmail)).resolves.toBeUndefined();
      expect(mockQueue.add).not.toHaveBeenCalled();
    });

    it("does not throw when queue.add fails", async () => {
      (mockRepository.findEnabledByOrgIdAndDomain as jest.Mock).mockResolvedValue({
        id: "cred-1",
      });
      mockQueue.add.mockRejectedValue(new Error("Queue error"));

      await expect(service.ensureDefaultCalendarsForUser(orgId, userId, userEmail)).resolves.toBeUndefined();
    });

    describe("when enableAsyncTasker is true", () => {
      beforeEach(() => {
        mockConfigService.get.mockReturnValue(true);
      });

      it("uses CalendarsTasker.dispatch instead of Bull queue", async () => {
        (mockRepository.findEnabledByOrgIdAndDomain as jest.Mock).mockResolvedValue({
          id: "cred-1",
        });

        await service.ensureDefaultCalendarsForUser(orgId, userId, userEmail);

        expect(mockConfigService.get).toHaveBeenCalledWith("enableAsyncTasker");
        expect(mockCalendarsTasker.dispatch).toHaveBeenCalledWith(
          "ensureDefaultCalendars",
          { userId },
          { idempotencyKey: `${DEFAULT_CALENDARS_JOB}_${userId}`, idempotencyKeyTTL: "1h" }
        );
        expect(mockQueue.add).not.toHaveBeenCalled();
        expect(mockQueue.getJob).not.toHaveBeenCalled();
      });

      it("does not call CalendarsTasker when no delegation credential exists", async () => {
        (mockRepository.findEnabledByOrgIdAndDomain as jest.Mock).mockResolvedValue(null);

        await service.ensureDefaultCalendarsForUser(orgId, userId, userEmail);

        expect(mockCalendarsTasker.dispatch).not.toHaveBeenCalled();
        expect(mockQueue.add).not.toHaveBeenCalled();
      });

      it("does not throw when CalendarsTasker.dispatch fails", async () => {
        (mockRepository.findEnabledByOrgIdAndDomain as jest.Mock).mockResolvedValue({
          id: "cred-1",
        });
        mockCalendarsTasker.dispatch.mockRejectedValue(new Error("Tasker error"));

        await expect(service.ensureDefaultCalendarsForUser(orgId, userId, userEmail)).resolves.toBeUndefined();
      });

      it("returns early for invalid email without calling tasker", async () => {
        await service.ensureDefaultCalendarsForUser(orgId, userId, "invalidemail");

        expect(Logger.prototype.warn).toHaveBeenCalledWith(`Invalid email format for user ${userId}: missing domain`);
        expect(mockCalendarsTasker.dispatch).not.toHaveBeenCalled();
        expect(mockRepository.findEnabledByOrgIdAndDomain).not.toHaveBeenCalled();
      });
    });
  });
});
