import dayjs from "@calcom/dayjs";
import * as CalcomEmails from "@calcom/emails/organization-email-service";
import { getNoSlotsNotificationService } from "@calcom/features/di/containers/NoSlotsNotification";
import { describe, expect, it, vi } from "vitest";

vi.mock("@calcom/features/redis/RedisService", () => {
  const mockedRedis = vi.fn();
  mockedRedis.prototype.lrange = vi.fn();
  mockedRedis.prototype.lpush = vi.fn();
  mockedRedis.prototype.expire = vi.fn();
  return {
    RedisService: mockedRedis,
  };
});

vi.mock("@calcom/features/flags/features.repository", () => ({
  FeaturesRepository: vi.fn(function () {
    return {
      checkIfFeatureIsEnabledGlobally: vi.fn().mockResolvedValue(false),
    };
  }),
}));

vi.mock("@calcom/emails/organization-email-service", () => ({
  OrganizationEmailService: vi.fn().mockImplementation(() => ({
    sendOrganizationCreationEmail: vi.fn(),
  })),
  sendOrganizationAdminNoSlotsNotification: vi.fn(),
}));
vi.spyOn(CalcomEmails, "sendOrganizationAdminNoSlotsNotification");

describe("(Orgs) Send admin notifications when a user has no availability", () => {
  it("should be a no-op and not send any notifications", async () => {
    const eventDetails = {
      username: "user1",
      eventSlug: "event1",
      startTime: dayjs(),
      endTime: dayjs().add(1, "hour"),
    };
    const orgDetails = {
      currentOrgDomain: "org1",
    };

    const service = getNoSlotsNotificationService();
    await service.handleNotificationWhenNoSlots({ eventDetails, orgDetails, teamId: 123 });

    expect(CalcomEmails.sendOrganizationAdminNoSlotsNotification).not.toHaveBeenCalled();
  });

  it("should not send notifications even with valid org and team", async () => {
    const eventDetails = {
      username: "user1",
      eventSlug: "event1",
      startTime: dayjs(),
      endTime: dayjs().add(1, "hour"),
    };
    const orgDetails = {
      currentOrgDomain: "org1",
    };

    const service = getNoSlotsNotificationService();
    await service.handleNotificationWhenNoSlots({ eventDetails, orgDetails, teamId: 123 });

    expect(CalcomEmails.sendOrganizationAdminNoSlotsNotification).not.toHaveBeenCalled();
  });

  it("should not send notifications when no teamId is provided", async () => {
    const eventDetails = {
      username: "user1",
      eventSlug: "event1",
      startTime: dayjs(),
      endTime: dayjs().add(1, "hour"),
    };
    const orgDetails = {
      currentOrgDomain: "org1",
    };

    const service = getNoSlotsNotificationService();
    await service.handleNotificationWhenNoSlots({
      eventDetails,
      orgDetails,
    });

    expect(CalcomEmails.sendOrganizationAdminNoSlotsNotification).not.toHaveBeenCalled();
  });

  it("should not send notifications when no orgDomain is provided", async () => {
    const eventDetails = {
      username: "user1",
      eventSlug: "event1",
      startTime: dayjs(),
      endTime: dayjs().add(1, "hour"),
    };
    const orgDetails = {
      currentOrgDomain: null,
    };

    const service = getNoSlotsNotificationService();
    await service.handleNotificationWhenNoSlots({
      eventDetails,
      orgDetails,
      teamId: 123,
    });

    expect(CalcomEmails.sendOrganizationAdminNoSlotsNotification).not.toHaveBeenCalled();
  });

  it("should not send notifications for multiple event types", async () => {
    const baseEventDetails = {
      username: "user1",
      startTime: dayjs(),
      endTime: dayjs().add(1, "hour"),
    };
    const orgDetails = {
      currentOrgDomain: "org1",
    };

    const service = getNoSlotsNotificationService();
    await service.handleNotificationWhenNoSlots({
      eventDetails: { ...baseEventDetails, eventSlug: "event1" },
      orgDetails,
      teamId: 123,
    });

    await service.handleNotificationWhenNoSlots({
      eventDetails: { ...baseEventDetails, eventSlug: "event2" },
      orgDetails,
      teamId: 123,
    });

    expect(CalcomEmails.sendOrganizationAdminNoSlotsNotification).not.toHaveBeenCalled();
  });
});
