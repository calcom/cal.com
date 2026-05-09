import process from "node:process";
import { prisma } from "@calcom/prisma";
import { BookingStatus } from "@calcom/prisma/enums";
import { v4 as uuidv4 } from "uuid";

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

async function seedAuditLogsForBooking({
  bookingUid,
  userUuid,
  attendeeId,
  attendeeEmail,
}: {
  bookingUid: string;
  userUuid: string;
  attendeeId: number | undefined;
  attendeeEmail: string;
}): Promise<number> {
  const existingLogs = await prisma.bookingAudit.findFirst({
    where: { bookingUid },
    select: { id: true },
  });

  if (existingLogs) {
    console.log(`  ⏭️ Audit logs already exist for ${bookingUid}, skipping.`);
    return 0;
  }

  const userActor = await createUserActor(userUuid);
  const systemActor = await createSystemActor();
  const guestActor = await createGuestActor("priya.sharma@acmecorp.io", "Priya Sharma");
  const appActor = await createAppActor("stripe", "Stripe");

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
        hostUserUuid: userUuid,
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
        rescheduledRequestedBy: attendeeEmail,
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
        added: ["rachel.nguyen@designhub.co"],
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
          old: [attendeeEmail, "rachel.nguyen@designhub.co"],
          new: [attendeeEmail],
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
        organizerUuid: { old: null, new: userUuid },
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
        organizerUuid: { old: userUuid, new: userUuid },
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
            attendeeEmail,
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
          userUuid,
          noShow: { old: null, new: true },
        },
      },
    },
    context: { impersonatedBy: userUuid },
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
        attendeeEmail: "marcus.johnson@consulting.io",
        attendeeName: "Marcus Johnson",
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
        attendeeEmail: "marcus.johnson@consulting.io",
        startTime: { old: hoursFromNow(48), new: hoursFromNow(72) },
        endTime: { old: hoursFromNow(48.5), new: hoursFromNow(72.5) },
        rescheduledToBookingUid: { old: null, new: rescheduledToUid },
      },
    },
  });

  for (const logData of auditLogs) {
    await prisma.bookingAudit.create({ data: logData });
  }

  return auditLogs.length;
}

export default async function seedBookingAuditLogs() {
  console.log("🔍 Seeding booking audit logs...");

  // Audit logs is an org-only feature, so we only seed for owner1-acme
  const user = await prisma.user.findFirst({
    where: { username: "owner1-acme" },
    select: {
      id: true,
      uuid: true,
      username: true,
      email: true,
      profiles: { select: { organizationId: true } },
    },
  });

  if (!user) {
    console.log("❌ User owner1-acme not found. Run the main seed first.");
    return;
  }

  if (!user.profiles.length) {
    console.log("❌ User owner1-acme has no organization profile. Run the main seed first.");
    return;
  }

  const organizationId = user.profiles[0].organizationId;

  // Enable bookings-v3 globally
  await prisma.feature.upsert({
    where: { slug: "bookings-v3" },
    create: {
      slug: "bookings-v3",
      enabled: true,
      description: "Enable bookings redesign v3 for all users",
      type: "EXPERIMENT",
    },
    update: { enabled: true },
  });
  console.log("  ✅ Enabled bookings-v3 globally");

  // Enable booking-audit at team level for owner1-acme's organization
  if (organizationId) {
    await prisma.feature.upsert({
      where: { slug: "booking-audit" },
      create: {
        slug: "booking-audit",
        enabled: false,
        description: "Enable booking audit trails - Track all booking actions and changes for organizations",
        type: "OPERATIONAL",
      },
      update: {},
    });

    await prisma.teamFeatures.upsert({
      where: { teamId_featureId: { teamId: organizationId, featureId: "booking-audit" } },
      create: {
        teamId: organizationId,
        featureId: "booking-audit",
        enabled: true,
        assignedBy: "seed-script",
      },
      update: { enabled: true },
    });
    console.log(`  ✅ Enabled booking-audit for organization ${organizationId}`);
  }

  // Find an event type for this user to create a booking
  const eventType = await prisma.eventType.findFirst({
    where: { userId: user.id },
    select: { id: true, title: true, length: true },
  });

  if (!eventType) {
    console.log("❌ No event type found for owner1-acme. Run the main seed first.");
    return;
  }

  // Create a new upcoming booking specifically for audit logs
  const bookingUid = uuidv4();
  const startTime = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days from now
  const endTime = new Date(startTime.getTime() + eventType.length * 60 * 1000);

  console.log(`📋 Creating new booking for audit logs...`);

  const booking = await prisma.booking.create({
    data: {
      uid: bookingUid,
      title: `Audit Log Test Booking - ${eventType.title}`,
      startTime,
      endTime,
      status: BookingStatus.ACCEPTED,
      userId: user.id,
      eventTypeId: eventType.id,
      attendees: {
        create: {
          email: "james.wilson@techstart.dev",
          name: "James Wilson",
          timeZone: "UTC",
        },
      },
    },
    select: {
      uid: true,
      attendees: { select: { id: true, email: true }, take: 1 },
    },
  });

  console.log(`  ✅ Created booking: ${booking.uid}`);

  console.log(`📋 Seeding audit logs for ${user.username} — booking ${booking.uid}`);

  const count = await seedAuditLogsForBooking({
    bookingUid: booking.uid,
    userUuid: user.uuid,
    attendeeId: booking.attendees[0]?.id,
    attendeeEmail: booking.attendees[0]?.email ?? "james.wilson@techstart.dev",
  });

  console.log(`  ✅ Created ${count} audit log entries`);
  console.log(`  View logs at: /booking/${booking.uid}/logs`);

  console.log(`\n📊 Summary:`);
  console.log(`  Booking UID: ${booking.uid}`);
  console.log(`  Total audit log entries created: ${count}`);
  console.log("  Actions covered: CREATED, ACCEPTED, RESCHEDULE_REQUESTED, RESCHEDULED,");
  console.log("    LOCATION_CHANGED, ATTENDEE_ADDED, ATTENDEE_REMOVED, REASSIGNMENT (x2),");
  console.log("    NO_SHOW_UPDATED (x2), CANCELLED, REJECTED, SEAT_BOOKED, SEAT_RESCHEDULED");
  console.log("  Actor types: USER, ATTENDEE, GUEST, SYSTEM, APP");
  console.log("  Sources: WEBAPP, API_V1, API_V2, WEBHOOK, MAGIC_LINK, SYSTEM");
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
