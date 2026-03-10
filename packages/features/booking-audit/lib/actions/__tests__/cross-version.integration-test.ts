import { FeaturesRepository } from "@calcom/features/flags/features.repository";
import { prisma } from "@calcom/prisma";
import { type BookingAuditAction, BookingStatus } from "@calcom/prisma/enums";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { z } from "zod";
import { getBookingAuditProducerService } from "../../../di/BookingAuditProducerService.container";
import { makeUserActor } from "../../makeActor";
import { PrismaAuditActorRepository } from "../../repository/PrismaAuditActorRepository";
import { PrismaBookingAuditRepository } from "../../repository/PrismaBookingAuditRepository";
import {
  cleanupTestData,
  createTestBooking,
  createTestEventType,
  createTestMembership,
  createTestOrganization,
  createTestUser,
  enableFeatureForOrganization,
} from "../../service/__tests__/integration-utils";
import type { IBookingAuditActionServiceRegistry } from "../../service/BookingAuditActionServiceRegistry";
import type { BookingAuditProducerService } from "../../service/BookingAuditProducerService.interface";
import { BookingAuditTaskConsumer } from "../../tasker/BookingAuditTaskConsumer";
import type { DataRequirements } from "../../service/EnrichmentDataStore";
import type { SingleBookingAuditTaskConsumerPayload } from "../../types/bookingAuditTask";
import { AuditActionServiceHelper } from "../AuditActionServiceHelper";
import type { BaseStoredAuditData, IAuditActionService, TranslationWithParams } from "../IAuditActionService";

const fieldsSchemaV1 = z.object({
  cancellationReason: z.string(),
  cancelledBy: z.string(),
  status: z.object({
    old: z.string(),
    new: z.string(),
  }),
});

const fieldsSchemaV2 = z.object({
  cancellationReason: z.string(),
  status: z.object({
    old: z.string(),
    new: z.string(),
  }),
});

const dataSchemaV1 = z.object({
  version: z.literal(1),
  fields: fieldsSchemaV1,
});

const dataSchemaV2 = z.object({
  version: z.literal(2),
  fields: fieldsSchemaV2,
});

class DummyBookingAuditActionServiceRegistry implements IBookingAuditActionServiceRegistry {
  getActionService(action: BookingAuditAction): IAuditActionService {
    if (action === "CANCELLED") {
      return new DummyVersionedCancelledAuditActionService();
    }
    throw new Error(`No action service found for: ${action}`);
  }
}

class DummyVersionedCancelledAuditActionService implements IAuditActionService {
  static readonly VERSION = 2;
  static readonly TYPE = "CANCELLED";

  private static storedDataSchema = z.union([dataSchemaV2, dataSchemaV1]);

  private helper = new AuditActionServiceHelper({
    latestVersion: DummyVersionedCancelledAuditActionService.VERSION,
    latestFieldsSchema: fieldsSchemaV2,
    storedDataSchema: DummyVersionedCancelledAuditActionService.storedDataSchema,
  });

  getVersionedData(fields: unknown): BaseStoredAuditData {
    return this.helper.getVersionedData(fields);
  }

  parse(data: unknown): BaseStoredAuditData {
    return this.helper.parse(data);
  }
  parseStored(data: unknown): BaseStoredAuditData {
    return this.helper.parseStored(data);
  }
  getVersion(data: unknown): number {
    return this.helper.getVersion(data);
  }
  getDataRequirements(): DataRequirements {
    return {};
  }
  getDisplayTitle(): Promise<TranslationWithParams> {
    return Promise.resolve({ key: "dummy.title" });
  }
}

describe("Cross-version deployment scenarios", () => {
  let consumer: BookingAuditTaskConsumer;
  let producer: BookingAuditProducerService;

  let testData: {
    owner: { id: number; uuid: string; email: string };
    organization: { id: number };
    eventType: { id: number };
    booking: { uid: string };
  };

  beforeEach(async () => {
    consumer = new BookingAuditTaskConsumer({
      bookingAuditRepository: new PrismaBookingAuditRepository({ prismaClient: prisma }),
      auditActorRepository: new PrismaAuditActorRepository({ prismaClient: prisma }),
      featuresRepository: new FeaturesRepository(prisma),
      actionServiceRegistry: new DummyBookingAuditActionServiceRegistry(),
    });
    producer = getBookingAuditProducerService();

    const owner = await createTestUser({ name: "Cross-Version Test User" });
    const organization = await createTestOrganization();
    await createTestMembership(owner.id, organization.id);
    await enableFeatureForOrganization(organization.id, "booking-audit");
    const eventType = await createTestEventType(owner.id);
    const booking = await createTestBooking(owner.id, eventType.id);

    testData = {
      owner: { id: owner.id, uuid: owner.uuid, email: owner.email },
      organization: { id: organization.id },
      eventType: { id: eventType.id },
      booking: { uid: booking.uid },
    };
  });

  afterEach(async () => {
    if (!testData) return;

    await prisma.task.deleteMany({ where: { type: "bookingAudit" } });

    await cleanupTestData({
      bookingUid: testData.booking?.uid,
      userUuids: testData.owner?.uuid ? [testData.owner.uuid] : [],
      eventTypeId: testData.eventType?.id,
      organizationId: testData.organization?.id,
      userIds: [testData.owner?.id].filter((id): id is number => id !== undefined),
      featureSlug: "booking-audit",
    });
  });

  const buildConsumerPayload = (
    overrides: Pick<SingleBookingAuditTaskConsumerPayload, "action" | "data">
  ): SingleBookingAuditTaskConsumerPayload => ({
    isBulk: false as const,
    bookingUid: testData.booking.uid,
    actor: makeUserActor(testData.owner.uuid),
    organizationId: testData.organization.id,
    timestamp: Date.now(),
    source: "WEBAPP",
    operationId: `op-${Date.now()}`,
    ...overrides,
  });

  async function processTaskQueue({ consumer }: { consumer: BookingAuditTaskConsumer }) {
    const task = await prisma.task.findFirst({
      where: { type: "bookingAudit" },
      orderBy: { createdAt: "desc" },
    });
    expect(task).not.toBeNull();

    const taskPayload = JSON.parse(task!.payload) as SingleBookingAuditTaskConsumerPayload;
    await consumer.processAuditTask(taskPayload);
  }

  describe("DummyVersionedCancelledAuditActionService - with V2 and V1 versions", () => {
    const v1Data = {
      version: 1,
      fields: {
        cancellationReason: "Schedule conflict",
        cancelledBy: "user@example.com",
        status: { old: "ACCEPTED", new: "CANCELLED" },
      },
    };

    it("V2 producer, V2 consumer - should create audit record with V2 version", async () => {
      const fields = {
        cancellationReason: "Schedule conflict",
        status: { old: BookingStatus.ACCEPTED, new: BookingStatus.CANCELLED },
      };
      await producer.queueTask({
        bookingUid: testData.booking.uid,
        actor: makeUserActor(testData.owner.uuid),
        organizationId: testData.organization.id,
        action: DummyVersionedCancelledAuditActionService.TYPE,
        source: "WEBAPP",
        version: 2,
        data: fields,
        isBookingAuditEnabled: true,
      });

      const audit = await prisma.bookingAudit.findFirst({
        where: { bookingUid: testData.booking.uid },
      });
      expect(audit!).toEqual(
        expect.objectContaining({
          data: {
            version: 2,
            fields,
          },
          action: DummyVersionedCancelledAuditActionService.TYPE,
          type: "RECORD_UPDATED",
          source: "WEBAPP",
        })
      );
    });

    it("V1 Payload, V2 Consumer - should create audit record with V1 version", async () => {
      const v1DataPayload = buildConsumerPayload({ action: "CANCELLED", data: v1Data });
      await consumer.processAuditTask(v1DataPayload);
      const audit = await prisma.bookingAudit.findFirst({
        where: { bookingUid: testData.booking.uid },
      });
      expect(audit).not.toBeNull();
      expect(audit!.action).toBe("CANCELLED");
      expect(audit!.data).toEqual(v1Data);
    });

    it("V3(non-existent) payload, V2 Consumer - should reject the task", async () => {
      const payload = buildConsumerPayload({
        action: "CANCELLED",
        data: { version: 3, fields: { cancellationReason: "future field" } },
      });

      await expect(consumer.processAuditTask(payload)).rejects.toThrow();
    });

    it("Invalid V2 Payload, V2 Consumer - should reject the task", async () => {
      const payload = buildConsumerPayload({
        action: "CANCELLED",
        data: {
          version: 2,
          fields: {
            // This is supposed to be a string, but we are sending a number
            cancellationReason: 12121,
          },
        },
      });

      await expect(consumer.processAuditTask(payload)).rejects.toThrow();
    });

    it("Unversioned Payload, V2 Consumer - should create audit record with V1 version", async () => {
      const payload = buildConsumerPayload({
        action: "CANCELLED",
        data: {
          cancellationReason: "Schedule conflict",
          cancelledBy: "user@example.com",
          status: { old: BookingStatus.ACCEPTED, new: BookingStatus.CANCELLED },
        },
      });

      await consumer.processAuditTask(payload);
      const audit = await prisma.bookingAudit.findFirst({
        where: { bookingUid: testData.booking.uid },
      });
      expect(audit).not.toBeNull();
    });
  });
});
