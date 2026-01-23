import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { BookingRepository } from "@calcom/features/bookings/repositories/BookingRepository";

import type { IBillingRepository } from "../repository/billing/IBillingRepository";
import { Plan, SubscriptionStatus } from "../repository/billing/IBillingRepository";
import type { ITeamBillingDataRepository, TeamWithBillingRecords } from "../repository/teamBillingData/ITeamBillingDataRepository";
import { BillingMigrationService, type BillingRepositoryFactory } from "./BillingMigrationService";

const createMockBookingRepository = (): Partial<BookingRepository> => ({
  findDistinctTeamIdsByCreatedDateRange: vi.fn(),
});

const createMockTeamBillingDataRepository = (): ITeamBillingDataRepository => ({
  find: vi.fn(),
  findBySubscriptionId: vi.fn(),
  findMany: vi.fn(),
  findByIdIncludeBillingRecords: vi.fn(),
});

const createMockBillingRepository = (): IBillingRepository => ({
  create: vi.fn(),
  findBySubscriptionId: vi.fn(),
  updateById: vi.fn(),
});

const createMockBillingRepositoryFactory = (
  mockBillingRepository: IBillingRepository
): BillingRepositoryFactory => {
  return vi.fn().mockReturnValue(mockBillingRepository);
};

const createTeamWithBillingRecords = (
  overrides: Partial<TeamWithBillingRecords> = {}
): TeamWithBillingRecords => ({
  id: 1,
  isOrganization: false,
  parentId: null,
  metadata: {
    subscriptionId: "sub_123",
    subscriptionItemId: "si_456",
    paymentId: "cus_789",
  },
  teamBilling: null,
  organizationBilling: null,
  ...overrides,
});

describe("BillingMigrationService", () => {
  let mockBookingRepository: Partial<BookingRepository>;
  let mockTeamBillingDataRepository: ITeamBillingDataRepository;
  let mockBillingRepository: IBillingRepository;
  let mockBillingRepositoryFactory: BillingRepositoryFactory;

  beforeEach(() => {
    vi.resetAllMocks();
    mockBookingRepository = createMockBookingRepository();
    mockTeamBillingDataRepository = createMockTeamBillingDataRepository();
    mockBillingRepository = createMockBillingRepository();
    mockBillingRepositoryFactory = createMockBillingRepositoryFactory(mockBillingRepository);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("migrateTeamBillingFromBookings", () => {
    it("should return empty result when no teams found from bookings", async () => {
      vi.mocked(mockBookingRepository.findDistinctTeamIdsByCreatedDateRange).mockResolvedValue([]);

      const service = new BillingMigrationService({
        bookingRepository: mockBookingRepository as BookingRepository,
        teamBillingDataRepository: mockTeamBillingDataRepository,
        billingRepositoryFactory: mockBillingRepositoryFactory,
      });

      const result = await service.migrateTeamBillingFromBookings({ lookbackHours: 24 });

      expect(result.ok).toBe(true);
      expect(result.teamsFound).toBe(0);
      expect(result.migrated).toBe(0);
      expect(result.skipped).toBe(0);
      expect(result.errors).toBe(0);
      expect(result.lookbackHours).toBe(24);
    });

    it("should migrate a team with valid subscription data", async () => {
      const teamId = 1;
      const team = createTeamWithBillingRecords({ id: teamId });

      vi.mocked(mockBookingRepository.findDistinctTeamIdsByCreatedDateRange).mockResolvedValue([teamId]);
      vi.mocked(mockTeamBillingDataRepository.findByIdIncludeBillingRecords).mockResolvedValue(team);
      vi.mocked(mockBillingRepository.create).mockResolvedValue({
        id: "billing_1",
        teamId,
        subscriptionId: "sub_123",
        subscriptionItemId: "si_456",
        customerId: "cus_789",
        planName: Plan.TEAM,
        status: SubscriptionStatus.ACTIVE,
      });

      const service = new BillingMigrationService({
        bookingRepository: mockBookingRepository as BookingRepository,
        teamBillingDataRepository: mockTeamBillingDataRepository,
        billingRepositoryFactory: mockBillingRepositoryFactory,
      });

      const result = await service.migrateTeamBillingFromBookings({ lookbackHours: 24 });

      expect(result.ok).toBe(true);
      expect(result.teamsFound).toBe(1);
      expect(result.migrated).toBe(1);
      expect(result.skipped).toBe(0);
      expect(result.errors).toBe(0);
      expect(mockBillingRepository.create).toHaveBeenCalledWith({
        teamId,
        subscriptionId: "sub_123",
        subscriptionItemId: "si_456",
        customerId: "cus_789",
        status: SubscriptionStatus.ACTIVE,
        planName: Plan.TEAM,
      });
    });

    it("should use ORGANIZATION plan for organizations", async () => {
      const teamId = 1;
      const team = createTeamWithBillingRecords({
        id: teamId,
        isOrganization: true,
      });

      vi.mocked(mockBookingRepository.findDistinctTeamIdsByCreatedDateRange).mockResolvedValue([teamId]);
      vi.mocked(mockTeamBillingDataRepository.findByIdIncludeBillingRecords).mockResolvedValue(team);
      vi.mocked(mockBillingRepository.create).mockResolvedValue({
        id: "billing_1",
        teamId,
        subscriptionId: "sub_123",
        subscriptionItemId: "si_456",
        customerId: "cus_789",
        planName: Plan.ORGANIZATION,
        status: SubscriptionStatus.ACTIVE,
      });

      const service = new BillingMigrationService({
        bookingRepository: mockBookingRepository as BookingRepository,
        teamBillingDataRepository: mockTeamBillingDataRepository,
        billingRepositoryFactory: mockBillingRepositoryFactory,
      });

      await service.migrateTeamBillingFromBookings({ lookbackHours: 24 });

      expect(mockBillingRepositoryFactory).toHaveBeenCalledWith(true);
      expect(mockBillingRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          planName: Plan.ORGANIZATION,
        })
      );
    });

    it("should skip team that is not found", async () => {
      const teamId = 1;

      vi.mocked(mockBookingRepository.findDistinctTeamIdsByCreatedDateRange).mockResolvedValue([teamId]);
      vi.mocked(mockTeamBillingDataRepository.findByIdIncludeBillingRecords).mockResolvedValue(null);

      const service = new BillingMigrationService({
        bookingRepository: mockBookingRepository as BookingRepository,
        teamBillingDataRepository: mockTeamBillingDataRepository,
        billingRepositoryFactory: mockBillingRepositoryFactory,
      });

      const result = await service.migrateTeamBillingFromBookings({ lookbackHours: 24 });

      expect(result.teamsFound).toBe(1);
      expect(result.migrated).toBe(0);
      expect(result.skipped).toBe(1);
      expect(mockBillingRepository.create).not.toHaveBeenCalled();
    });

    it("should skip sub-team within organization (parentId is set)", async () => {
      const teamId = 1;
      const subTeam = createTeamWithBillingRecords({
        id: teamId,
        parentId: 100,
        isOrganization: false,
      });

      vi.mocked(mockBookingRepository.findDistinctTeamIdsByCreatedDateRange).mockResolvedValue([teamId]);
      vi.mocked(mockTeamBillingDataRepository.findByIdIncludeBillingRecords).mockResolvedValue(subTeam);

      const service = new BillingMigrationService({
        bookingRepository: mockBookingRepository as BookingRepository,
        teamBillingDataRepository: mockTeamBillingDataRepository,
        billingRepositoryFactory: mockBillingRepositoryFactory,
      });

      const result = await service.migrateTeamBillingFromBookings({ lookbackHours: 24 });

      expect(result.teamsFound).toBe(1);
      expect(result.migrated).toBe(0);
      expect(result.skipped).toBe(1);
      expect(mockBillingRepository.create).not.toHaveBeenCalled();
    });

    it("should skip team that is already migrated (team billing exists)", async () => {
      const teamId = 1;
      const team = createTeamWithBillingRecords({
        id: teamId,
        isOrganization: false,
        teamBilling: { id: "existing_billing" },
      });

      vi.mocked(mockBookingRepository.findDistinctTeamIdsByCreatedDateRange).mockResolvedValue([teamId]);
      vi.mocked(mockTeamBillingDataRepository.findByIdIncludeBillingRecords).mockResolvedValue(team);

      const service = new BillingMigrationService({
        bookingRepository: mockBookingRepository as BookingRepository,
        teamBillingDataRepository: mockTeamBillingDataRepository,
        billingRepositoryFactory: mockBillingRepositoryFactory,
      });

      const result = await service.migrateTeamBillingFromBookings({ lookbackHours: 24 });

      expect(result.teamsFound).toBe(1);
      expect(result.migrated).toBe(0);
      expect(result.skipped).toBe(1);
      expect(mockBillingRepository.create).not.toHaveBeenCalled();
    });

    it("should skip organization that is already migrated (organization billing exists)", async () => {
      const teamId = 1;
      const team = createTeamWithBillingRecords({
        id: teamId,
        isOrganization: true,
        organizationBilling: { id: "existing_org_billing" },
      });

      vi.mocked(mockBookingRepository.findDistinctTeamIdsByCreatedDateRange).mockResolvedValue([teamId]);
      vi.mocked(mockTeamBillingDataRepository.findByIdIncludeBillingRecords).mockResolvedValue(team);

      const service = new BillingMigrationService({
        bookingRepository: mockBookingRepository as BookingRepository,
        teamBillingDataRepository: mockTeamBillingDataRepository,
        billingRepositoryFactory: mockBillingRepositoryFactory,
      });

      const result = await service.migrateTeamBillingFromBookings({ lookbackHours: 24 });

      expect(result.teamsFound).toBe(1);
      expect(result.migrated).toBe(0);
      expect(result.skipped).toBe(1);
      expect(mockBillingRepository.create).not.toHaveBeenCalled();
    });

    it("should skip team without subscription data in metadata", async () => {
      const teamId = 1;
      const team = createTeamWithBillingRecords({
        id: teamId,
        metadata: {},
      });

      vi.mocked(mockBookingRepository.findDistinctTeamIdsByCreatedDateRange).mockResolvedValue([teamId]);
      vi.mocked(mockTeamBillingDataRepository.findByIdIncludeBillingRecords).mockResolvedValue(team);

      const service = new BillingMigrationService({
        bookingRepository: mockBookingRepository as BookingRepository,
        teamBillingDataRepository: mockTeamBillingDataRepository,
        billingRepositoryFactory: mockBillingRepositoryFactory,
      });

      const result = await service.migrateTeamBillingFromBookings({ lookbackHours: 24 });

      expect(result.teamsFound).toBe(1);
      expect(result.migrated).toBe(0);
      expect(result.skipped).toBe(1);
      expect(mockBillingRepository.create).not.toHaveBeenCalled();
    });

    it("should skip team with missing subscriptionItemId", async () => {
      const teamId = 1;
      const team = createTeamWithBillingRecords({
        id: teamId,
        metadata: {
          subscriptionId: "sub_123",
        },
      });

      vi.mocked(mockBookingRepository.findDistinctTeamIdsByCreatedDateRange).mockResolvedValue([teamId]);
      vi.mocked(mockTeamBillingDataRepository.findByIdIncludeBillingRecords).mockResolvedValue(team);

      const service = new BillingMigrationService({
        bookingRepository: mockBookingRepository as BookingRepository,
        teamBillingDataRepository: mockTeamBillingDataRepository,
        billingRepositoryFactory: mockBillingRepositoryFactory,
      });

      const result = await service.migrateTeamBillingFromBookings({ lookbackHours: 24 });

      expect(result.teamsFound).toBe(1);
      expect(result.migrated).toBe(0);
      expect(result.skipped).toBe(1);
    });

    it("should handle errors during migration and continue with other teams", async () => {
      const team1 = createTeamWithBillingRecords({ id: 1 });
      const team2 = createTeamWithBillingRecords({ id: 2 });

      vi.mocked(mockBookingRepository.findDistinctTeamIdsByCreatedDateRange).mockResolvedValue([1, 2]);
      vi.mocked(mockTeamBillingDataRepository.findByIdIncludeBillingRecords)
        .mockResolvedValueOnce(team1)
        .mockResolvedValueOnce(team2);
      vi.mocked(mockBillingRepository.create)
        .mockRejectedValueOnce(new Error("Database error"))
        .mockResolvedValueOnce({
          id: "billing_2",
          teamId: 2,
          subscriptionId: "sub_123",
          subscriptionItemId: "si_456",
          customerId: "cus_789",
          planName: Plan.TEAM,
          status: SubscriptionStatus.ACTIVE,
        });

      const service = new BillingMigrationService({
        bookingRepository: mockBookingRepository as BookingRepository,
        teamBillingDataRepository: mockTeamBillingDataRepository,
        billingRepositoryFactory: mockBillingRepositoryFactory,
      });

      const result = await service.migrateTeamBillingFromBookings({ lookbackHours: 24 });

      expect(result.teamsFound).toBe(2);
      expect(result.migrated).toBe(1);
      expect(result.errors).toBe(1);
      expect(result.errorDetails).toHaveLength(1);
      expect(result.errorDetails[0]).toEqual({
        teamId: 1,
        error: "Database error",
      });
    });

    it("should process multiple teams correctly", async () => {
      const team1 = createTeamWithBillingRecords({ id: 1 });
      const team2 = createTeamWithBillingRecords({
        id: 2,
        teamBilling: { id: "existing" },
      });
      const team3 = createTeamWithBillingRecords({ id: 3 });

      vi.mocked(mockBookingRepository.findDistinctTeamIdsByCreatedDateRange).mockResolvedValue([1, 2, 3]);
      vi.mocked(mockTeamBillingDataRepository.findByIdIncludeBillingRecords)
        .mockResolvedValueOnce(team1)
        .mockResolvedValueOnce(team2)
        .mockResolvedValueOnce(team3);
      vi.mocked(mockBillingRepository.create).mockResolvedValue({
        id: "billing_new",
        teamId: 1,
        subscriptionId: "sub_123",
        subscriptionItemId: "si_456",
        customerId: "cus_789",
        planName: Plan.TEAM,
        status: SubscriptionStatus.ACTIVE,
      });

      const service = new BillingMigrationService({
        bookingRepository: mockBookingRepository as BookingRepository,
        teamBillingDataRepository: mockTeamBillingDataRepository,
        billingRepositoryFactory: mockBillingRepositoryFactory,
      });

      const result = await service.migrateTeamBillingFromBookings({ lookbackHours: 24 });

      expect(result.teamsFound).toBe(3);
      expect(result.migrated).toBe(2);
      expect(result.skipped).toBe(1);
      expect(result.errors).toBe(0);
    });

    it("should use empty string for customerId when paymentId is missing", async () => {
      const teamId = 1;
      const team = createTeamWithBillingRecords({
        id: teamId,
        metadata: {
          subscriptionId: "sub_123",
          subscriptionItemId: "si_456",
        },
      });

      vi.mocked(mockBookingRepository.findDistinctTeamIdsByCreatedDateRange).mockResolvedValue([teamId]);
      vi.mocked(mockTeamBillingDataRepository.findByIdIncludeBillingRecords).mockResolvedValue(team);
      vi.mocked(mockBillingRepository.create).mockResolvedValue({
        id: "billing_1",
        teamId,
        subscriptionId: "sub_123",
        subscriptionItemId: "si_456",
        customerId: "",
        planName: Plan.TEAM,
        status: SubscriptionStatus.ACTIVE,
      });

      const service = new BillingMigrationService({
        bookingRepository: mockBookingRepository as BookingRepository,
        teamBillingDataRepository: mockTeamBillingDataRepository,
        billingRepositoryFactory: mockBillingRepositoryFactory,
      });

      await service.migrateTeamBillingFromBookings({ lookbackHours: 24 });

      expect(mockBillingRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          customerId: "",
        })
      );
    });

    it("should calculate lookback date correctly", async () => {
      const now = new Date("2024-01-15T12:00:00Z");
      vi.setSystemTime(now);

      vi.mocked(mockBookingRepository.findDistinctTeamIdsByCreatedDateRange).mockResolvedValue([]);

      const service = new BillingMigrationService({
        bookingRepository: mockBookingRepository as BookingRepository,
        teamBillingDataRepository: mockTeamBillingDataRepository,
        billingRepositoryFactory: mockBillingRepositoryFactory,
      });

      const result = await service.migrateTeamBillingFromBookings({ lookbackHours: 48 });

      expect(result.lookbackHours).toBe(48);
      expect(mockBookingRepository.findDistinctTeamIdsByCreatedDateRange).toHaveBeenCalledWith({
        startDate: new Date("2024-01-13T12:00:00Z"),
      });

      vi.useRealTimers();
    });

    it("should handle unknown error types gracefully", async () => {
      const teamId = 1;
      const team = createTeamWithBillingRecords({ id: teamId });

      vi.mocked(mockBookingRepository.findDistinctTeamIdsByCreatedDateRange).mockResolvedValue([teamId]);
      vi.mocked(mockTeamBillingDataRepository.findByIdIncludeBillingRecords).mockResolvedValue(team);
      vi.mocked(mockBillingRepository.create).mockRejectedValue("string error");

      const service = new BillingMigrationService({
        bookingRepository: mockBookingRepository as BookingRepository,
        teamBillingDataRepository: mockTeamBillingDataRepository,
        billingRepositoryFactory: mockBillingRepositoryFactory,
      });

      const result = await service.migrateTeamBillingFromBookings({ lookbackHours: 24 });

      expect(result.errors).toBe(1);
      expect(result.errorDetails[0].error).toBe("Unknown error");
    });
  });
});
