import { BookingsController_2024_04_15 } from "@/ee/bookings/2024-04-15/controllers/bookings.controller";
import { PlatformBookingsService } from "@/ee/bookings/shared/platform-bookings.service";
import { PrismaEventTypeRepository } from "@/lib/repositories/prisma-event-type.repository";
import { PrismaTeamRepository } from "@/lib/repositories/prisma-team.repository";
import { InstantBookingCreateService } from "@/lib/services/instant-booking-create.service";
import { RecurringBookingService } from "@/lib/services/recurring-booking.service";
import { RegularBookingService } from "@/lib/services/regular-booking.service";
import { ApiKeysRepository } from "@/modules/api-keys/api-keys-repository";
import { PermissionsGuard } from "@/modules/auth/guards/permissions/permissions.guard";
import { BillingService } from "@/modules/billing/services/billing.service";
import { KyselyReadService } from "@/modules/kysely/kysely-read.service";
import { OAuthClientRepository } from "@/modules/oauth-clients/oauth-client.repository";
import { OAuthFlowService } from "@/modules/oauth-clients/services/oauth-flow.service";
import { PrismaReadService } from "@/modules/prisma/prisma-read.service";
import { UsersService } from "@/modules/users/services/users.service";
import { UsersRepository } from "@/modules/users/users.repository";
import { ConfigService } from "@nestjs/config";
import { Test, TestingModule } from "@nestjs/testing";

describe("BookingsController_2024_04_15 Unit Test", () => {
  let controller: BookingsController_2024_04_15;

  const managedEmbedClientId = "managed-embed-client-id";
  const customerClientId = "customer-client-id";

  const mockConfigService = {
    get: jest.fn((key) => {
      if (key === "platform.embedOAuthClientId") return managedEmbedClientId;
      return null;
    }),
  };

  const mockOAuthClientRepository = {
    getOAuthClient: jest.fn(),
  };

  beforeEach(async () => {
    // Clear call history for the repository mock between tests
    mockOAuthClientRepository.getOAuthClient.mockClear();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [BookingsController_2024_04_15],
      providers: [
        { provide: ConfigService, useValue: mockConfigService },
        { provide: OAuthClientRepository, useValue: mockOAuthClientRepository },
        // Mock other dependencies with minimal implementations
        { provide: OAuthFlowService, useValue: {} },
        { provide: PrismaReadService, useValue: {} },
        { provide: KyselyReadService, useValue: {} },
        { provide: BillingService, useValue: {} },
        { provide: ApiKeysRepository, useValue: {} },
        { provide: PlatformBookingsService, useValue: {} },
        { provide: UsersRepository, useValue: {} },
        { provide: UsersService, useValue: {} },
        { provide: RegularBookingService, useValue: {} },
        { provide: RecurringBookingService, useValue: {} },
        { provide: InstantBookingCreateService, useValue: {} },
        { provide: PrismaEventTypeRepository, useValue: {} },
        { provide: PrismaTeamRepository, useValue: {} },
      ],
    })
      .overrideGuard(PermissionsGuard)
      .useValue({ canActivate: () => true }) // Bypass PermissionsGuard
      .compile();

    controller = module.get<BookingsController_2024_04_15>(BookingsController_2024_04_15);
  });

  describe("getOAuthClientsParams", () => {
    const clientMetadata = {
      bookingRedirectUri: "https://customer/redirect",
      bookingCancelRedirectUri: "https://customer/cancel",
      bookingRescheduleRedirectUri: "https://customer/reschedule",
      areEmailsEnabled: false,
      areCalendarEventsEnabled: false,
    };

    it("should fetch client metadata when isEmbed is false", async () => {
      mockOAuthClientRepository.getOAuthClient.mockResolvedValue(clientMetadata);

      // Access private method via any cast
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const params = await (controller as any).getOAuthClientsParams(customerClientId, false);

      expect(params.platformClientId).toBe(customerClientId);
      expect(params.arePlatformEmailsEnabled).toBe(false);
      expect(params.platformBookingUrl).toBe(clientMetadata.bookingRedirectUri);
    });

    it("should fetch client metadata when isEmbed is true but clientId does NOT match managed embed id", async () => {
      mockOAuthClientRepository.getOAuthClient.mockResolvedValue(clientMetadata);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const params = await (controller as any).getOAuthClientsParams(customerClientId, true);

      expect(params.platformClientId).toBe(customerClientId);
      // This proves the guard works: even with isEmbed=true, we get the stored metadata (false)
      expect(params.arePlatformEmailsEnabled).toBe(false);
    });

    it("should force embed defaults when isEmbed is true AND clientId matches managed embed id", async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const params = await (controller as any).getOAuthClientsParams(managedEmbedClientId, true);

      // Should NOT call repository because it shortcuts to defaults
      expect(mockOAuthClientRepository.getOAuthClient).not.toHaveBeenCalled();
      expect(params.arePlatformEmailsEnabled).toBe(true);
      expect(params.areCalendarEventsEnabled).toBe(true);
      // Defaults have empty platformClientId usually, or whatever DEFAULT_PLATFORM_PARAMS has
      expect(params.platformClientId).toBe("");
    });

    it("should fallback to defaults (but fetch repo) if clientId matches managed ID but isEmbed is false", async () => {
      // Edge case: someone manually passing the managed ID but forgetting isEmbed=true.
      // The code logic `if (shouldForceEmbedDefaults) ...` requires BOTH.
      // So it falls through to `oAuthClientRepository.getOAuthClient`.
      mockOAuthClientRepository.getOAuthClient.mockResolvedValue(null);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const params = await (controller as any).getOAuthClientsParams(managedEmbedClientId, false);

      // It tried to fetch from DB (mock returns null), so it returns defaults
      expect(mockOAuthClientRepository.getOAuthClient).toHaveBeenCalledWith(managedEmbedClientId);
      expect(params.arePlatformEmailsEnabled).toBe(false);
    });

    it("should NOT force embed defaults when managedEmbedClientId is empty (security: fail closed)", async () => {
      // This tests the critical security scenario where PLATFORM_EMBED_CLIENT_ID is not configured.
      // The implementation should "fail closed" - not allowing any client to bypass OAuth settings.
      const emptyConfigService = {
        get: jest.fn((key: string) => {
          if (key === "platform.embedOAuthClientId") return ""; // Empty/not configured
          return null;
        }),
      };

      // Re-create controller with empty config to test this edge case
      const module: TestingModule = await Test.createTestingModule({
        controllers: [BookingsController_2024_04_15],
        providers: [
          { provide: ConfigService, useValue: emptyConfigService },
          { provide: OAuthClientRepository, useValue: mockOAuthClientRepository },
          { provide: OAuthFlowService, useValue: {} },
          { provide: PrismaReadService, useValue: {} },
          { provide: KyselyReadService, useValue: {} },
          { provide: BillingService, useValue: {} },
          { provide: ApiKeysRepository, useValue: {} },
          { provide: PlatformBookingsService, useValue: {} },
          { provide: UsersRepository, useValue: {} },
          { provide: UsersService, useValue: {} },
          { provide: RegularBookingService, useValue: {} },
          { provide: RecurringBookingService, useValue: {} },
          { provide: InstantBookingCreateService, useValue: {} },
          { provide: PrismaEventTypeRepository, useValue: {} },
          { provide: PrismaTeamRepository, useValue: {} },
        ],
      })
        .overrideGuard(PermissionsGuard)
        .useValue({ canActivate: () => true })
        .compile();

      const controllerWithEmptyConfig = module.get<BookingsController_2024_04_15>(
        BookingsController_2024_04_15
      );

      const clientMetadata = {
        bookingRedirectUri: "https://customer/redirect",
        bookingCancelRedirectUri: "https://customer/cancel",
        bookingRescheduleRedirectUri: "https://customer/reschedule",
        areEmailsEnabled: false,
        areCalendarEventsEnabled: false,
      };
      mockOAuthClientRepository.getOAuthClient.mockResolvedValue(clientMetadata);

      // Even with isEmbed=true, when managedEmbedClientId is not configured,
      // the code should NOT bypass OAuth settings (fail closed for security)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const params = await (controllerWithEmptyConfig as any).getOAuthClientsParams(customerClientId, true);

      // Should fetch from repository (not shortcut to embed defaults)
      expect(mockOAuthClientRepository.getOAuthClient).toHaveBeenCalledWith(customerClientId);
      // Should use the client's actual settings, not forced embed defaults
      expect(params.arePlatformEmailsEnabled).toBe(false);
      expect(params.areCalendarEventsEnabled).toBe(false);
      expect(params.platformClientId).toBe(customerClientId);
    });
  });
});
