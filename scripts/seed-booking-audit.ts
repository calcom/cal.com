import { v4 as uuidv4 } from "uuid";

import { prisma } from "@calcom/prisma";
import { BookingStatus } from "@calcom/prisma/enums";

async function createUserActor(userUuid: string) {
  return prisma.auditActor.upsert({
    where: { userUuid },
    create: { type: "USER", userUuid },
    update: {},
    select: { id: true },
  });
}

async function createAttendeeActor(attendeeId: number) {
  return prisma.auditActor.upsert({
    where: { attendeeId },
    create: { type: "ATTENDEE", attendeeId },
    update: {},
    select: { id: true },
  });
}

async function createSystemActor() {
  const systemEmail = "system@system.internal";
  return prisma.auditActor.upsert({
    where: { email: systemEmail },
    create: { type: "SYSTEM", email: systemEmail, name: "System" },
    update: {},
    select: { id: true },
  });
}

async function createGuestActor(email: string, name: string) {
  const existing = await prisma.auditActor.findUnique({
    where: { email },
    select: { id: true },
  });
  if (existing) return existing;

  return prisma.auditActor.create({
    data: { type: "GUEST", email, name },
    select: { id: true },
  });
}

async function createAppActor(appSlug: string, appName: string) {
  const email = `${appSlug}@app.internal`;
  return prisma.auditActor.upsert({
    where: { email },
    create: { type: "APP", email, name: appName },
    update: {},
    select: { id: true },
  });
}

function hoursFromNow(hours: number): number {
  return Date.now() + hours * 60 * 60 * 1000;
}

export default async function seedBookingAuditLogs() {
  console.log("🔍 Seeding booking audit logs...");

  const proUser = await prisma.user.findFirst({
    where: { username: "pro" },
    select: { id: true, uuid: true, email: true },
  });

  if (!proUser) {
    console.log("❌ Pro user not found. Run the main seed first.");
    return;
  }

  const booking = await prisma.booking.findFirst({
    where: { userId: proUser.id },
    select: {
      uid: true,
      attendees: { select: { id: true, email: true }, take: 1 },
    },
    orderBy: { createdAt: "desc" },
  });

  if (!booking) {
    console.log("❌ No booking found for pro user. Run the main seed first.");
    return;
  }

  const bookingUid = booking.uid;
  console.log(`📋 Using booking UID: ${bookingUid}`);

  const existingLogs = await prisma.bookingAudit.findFirst({
    where: { bookingUid },
    select: { id: true },
  });

  if (existingLogs) {
    console.log("⏭️ Audit logs already seeded for this booking, skipping.");
    return;
  }

  const userActor = await createUserActor(proUser.uuid);
  const systemActor = await createSystemActor();
  const guestActor = await createGuestActor("guest-attendee@example.com", "Guest Attendee");
  const appActor = await createAppActor("stripe", "Stripe");

  const attendeeId = booking.attendees[0]?.id;
  let attendeeActor: { id: string } | null = null;
  if (attendeeId) {
    attendeeActor = await createAttendeeActor(attendeeId);
  }

  const rescheduledToUid = uuidv4();

  const now = Date.now();
  let timestampOffset = 0;
  function nextTimestamp(): Date {
    timestampOffset += 1;
    return new Date(now - (20 - timestampOffset) * 60 * 1000);
  }

  const auditLogs: Parameters<typeof prisma.bookingAudit.create>[0]["data"][] = [];

  auditLogs.push({
    bookingUid,
    actorId: userActor.id,
    action: "CREATED",
    type: "RECORD_CREATED",
    timestamp: nextTimestamp(),
    source: "WEBAPP",
    operationId: uuidv4(),
    data: {
      version: 1,
      fields: {
        startTime: hoursFromNow(24),
        endTime: hoursFromNow(24.5),
        status: BookingStatus.PENDING,
        hostUserUuid: proUser.uuid,
        seatReferenceUid: null,
      },
    },
  });

  auditLogs.push({
    bookingUid,
    actorId: userActor.id,
    action: "ACCEPTED",
    type: "RECORD_UPDATED",
    timestamp: nextTimestamp(),
    source: "WEBAPP",
    operationId: uuidv4(),
    data: {
      version: 1,
      fields: {
        status: { old: BookingStatus.PENDING, new: BookingStatus.ACCEPTED },
      },
    },
  });

  auditLogs.push({
    bookingUid,
    actorId: (attendeeActor ?? guestActor).id,
    action: "RESCHEDULE_REQUESTED",
    type: "RECORD_UPDATED",
    timestamp: nextTimestamp(),
    source: "WEBAPP",
    operationId: uuidv4(),
    data: {
      version: 1,
      fields: {
        rescheduleReason: "Conflict with another meeting",
        rescheduledRequestedBy: booking.attendees[0]?.email ?? "guest@example.com",
      },
    },
  });

  auditLogs.push({
    bookingUid,
    actorId: userActor.id,
    action: "RESCHEDULED",
    type: "RECORD_UPDATED",
    timestamp: nextTimestamp(),
    source: "WEBAPP",
    operationId: uuidv4(),
    data: {
      version: 1,
      fields: {
        startTime: { old: hoursFromNow(24), new: hoursFromNow(48) },
        endTime: { old: hoursFromNow(24.5), new: hoursFromNow(48.5) },
        rescheduledToUid: { old: null, new: rescheduledToUid },
      },
    },
  });

  auditLogs.push({
    bookingUid,
    actorId: userActor.id,
    action: "LOCATION_CHANGED",
    type: "RECORD_UPDATED",
    timestamp: nextTimestamp(),
    source: "WEBAPP",
    operationId: uuidv4(),
    data: {
      version: 1,
      fields: {
        location: { old: "integrations:google:meet", new: "integrations:zoom" },
      },
    },
  });

  auditLogs.push({
    bookingUid,
    actorId: guestActor.id,
    action: "ATTENDEE_ADDED",
    type: "RECORD_UPDATED",
    timestamp: nextTimestamp(),
    source: "MAGIC_LINK",
    operationId: uuidv4(),
    data: {
      version: 1,
      fields: {
        added: ["new-attendee@example.com"],
      },
    },
  });

  auditLogs.push({
    bookingUid,
    actorId: userActor.id,
    action: "ATTENDEE_REMOVED",
    type: "RECORD_UPDATED",
    timestamp: nextTimestamp(),
    source: "WEBAPP",
    operationId: uuidv4(),
    data: {
      version: 1,
      fields: {
        attendees: {
          old: [booking.attendees[0]?.email ?? "attendee@example.com", "new-attendee@example.com"],
          new: [booking.attendees[0]?.email ?? "attendee@example.com"],
        },
      },
    },
  });

  auditLogs.push({
    bookingUid,
    actorId: systemActor.id,
    action: "REASSIGNMENT",
    type: "RECORD_UPDATED",
    timestamp: nextTimestamp(),
    source: "SYSTEM",
    operationId: uuidv4(),
    data: {
      version: 1,
      fields: {
        organizerUuid: { old: null, new: proUser.uuid },
        reassignmentReason: "Round-robin auto-reassignment",
        reassignmentType: "roundRobin",
      },
    },
  });

  auditLogs.push({
    bookingUid,
    actorId: userActor.id,
    action: "REASSIGNMENT",
    type: "RECORD_UPDATED",
    timestamp: nextTimestamp(),
    source: "WEBAPP",
    operationId: uuidv4(),
    data: {
      version: 1,
      fields: {
        organizerUuid: { old: proUser.uuid, new: proUser.uuid },
        reassignmentReason: "Manual reassignment by admin",
        reassignmentType: "manual",
      },
    },
  });

  auditLogs.push({
    bookingUid,
    actorId: userActor.id,
    action: "NO_SHOW_UPDATED",
    type: "RECORD_UPDATED",
    timestamp: nextTimestamp(),
    source: "WEBAPP",
    operationId: uuidv4(),
    data: {
      version: 1,
      fields: {
        attendeesNoShow: [
          {
            attendeeEmail: booking.attendees[0]?.email ?? "attendee@example.com",
            noShow: { old: false, new: true },
          },
        ],
      },
    },
  });

  auditLogs.push({
    bookingUid,
    actorId: userActor.id,
    action: "NO_SHOW_UPDATED",
    type: "RECORD_UPDATED",
    timestamp: nextTimestamp(),
    source: "WEBAPP",
    operationId: uuidv4(),
    data: {
      version: 1,
      fields: {
        host: {
          userUuid: proUser.uuid,
          noShow: { old: null, new: true },
        },
      },
    },
    context: { impersonatedBy: proUser.uuid },
  });

  auditLogs.push({
    bookingUid,
    actorId: appActor.id,
    action: "CANCELLED",
    type: "RECORD_UPDATED",
    timestamp: nextTimestamp(),
    source: "WEBHOOK",
    operationId: uuidv4(),
    data: {
      version: 1,
      fields: {
        cancellationReason: "Payment failed - automatic cancellation",
        cancelledBy: "stripe@app.internal",
        status: { old: BookingStatus.ACCEPTED, new: BookingStatus.CANCELLED },
      },
    },
  });

  auditLogs.push({
    bookingUid,
    actorId: userActor.id,
    action: "REJECTED",
    type: "RECORD_UPDATED",
    timestamp: nextTimestamp(),
    source: "API_V2",
    operationId: uuidv4(),
    data: {
      version: 1,
      fields: {
        rejectionReason: "Time slot no longer available",
        status: { old: BookingStatus.PENDING, new: BookingStatus.REJECTED },
      },
    },
  });

  const seatRefUid = uuidv4();

  auditLogs.push({
    bookingUid,
    actorId: guestActor.id,
    action: "SEAT_BOOKED",
    type: "RECORD_CREATED",
    timestamp: nextTimestamp(),
    source: "WEBAPP",
    operationId: uuidv4(),
    data: {
      version: 1,
      fields: {
        seatReferenceUid: seatRefUid,
        attendeeEmail: "seat-guest@example.com",
        attendeeName: "Seat Guest",
        startTime: hoursFromNow(48),
        endTime: hoursFromNow(48.5),
      },
    },
  });

  auditLogs.push({
    bookingUid,
    actorId: (attendeeActor ?? guestActor).id,
    action: "SEAT_RESCHEDULED",
    type: "RECORD_UPDATED",
    timestamp: nextTimestamp(),
    source: "API_V1",
    operationId: uuidv4(),
    data: {
      version: 1,
      fields: {
        seatReferenceUid: seatRefUid,
        attendeeEmail: "seat-guest@example.com",
        startTime: { old: hoursFromNow(48), new: hoursFromNow(72) },
        endTime: { old: hoursFromNow(48.5), new: hoursFromNow(72.5) },
        rescheduledToBookingUid: { old: null, new: rescheduledToUid },
      },
    },
  });

  for (const logData of auditLogs) {
    await prisma.bookingAudit.create({ data: logData });
  }

  console.log(`✅ Created ${auditLogs.length} audit log entries for booking ${bookingUid}`);
  console.log("\n📊 Summary of seeded audit actions:");
  console.log("  Actions covered:");

  const actionSummary = [
    "CREATED          - User actor, WEBAPP source",
    "ACCEPTED         - User actor, WEBAPP source",
    "RESCHEDULE_REQUESTED - Attendee actor, WEBAPP source",
    "RESCHEDULED      - User actor, WEBAPP source",
    "LOCATION_CHANGED - User actor, WEBAPP source",
    "ATTENDEE_ADDED   - Guest actor, MAGIC_LINK source",
    "ATTENDEE_REMOVED - User actor, WEBAPP source",
    "REASSIGNMENT (roundRobin) - System actor, SYSTEM source",
    "REASSIGNMENT (manual) - User actor, WEBAPP source",
    "NO_SHOW_UPDATED (attendees) - User actor, WEBAPP source",
    "NO_SHOW_UPDATED (host, impersonated) - User actor, WEBAPP source",
    "CANCELLED        - App actor, WEBHOOK source",
    "REJECTED         - User actor, API_V2 source",
    "SEAT_BOOKED      - Guest actor, WEBAPP source",
    "SEAT_RESCHEDULED - Attendee actor, API_V1 source",
  ];

  for (const line of actionSummary) {
    console.log(`    - ${line}`);
  }

  console.log("\n  Actor types covered: USER, ATTENDEE, GUEST, SYSTEM, APP");
  console.log("  Sources covered: WEBAPP, API_V1, API_V2, WEBHOOK, MAGIC_LINK, SYSTEM");
  console.log(`\n  View logs at: /booking/${bookingUid}/logs`);
}

seedBookingAuditLogs()
  .then(() => {
    console.log("\n🎉 Booking audit seed complete!");
    process.exit(0);
  })
  .catch((err) => {
    console.error("❌ Seed failed:", err);
    process.exit(1);
  });
