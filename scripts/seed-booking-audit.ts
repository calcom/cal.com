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
  userId,
  attendeeId,
  attendeeEmail,
  eventTypeId,
  eventTypeLength,
}: {
  bookingUid: string;
  userUuid: string;
  userId: number;
  attendeeId: number | undefined;
  attendeeEmail: string;
  eventTypeId: number;
  eventTypeLength: number;
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

  const userActorV2 = await createGuestActor("host-action-v2@test.internal", "Host (Action v2)");
  const attendeeActorV2 = await createGuestActor("attendee-action-v2@test.internal", "Attendee (Action v2)");

  // Create the "rescheduled-to" booking so rescheduledToUid in audit logs points to a real booking
  const rescheduledToUid = uuidv4();
  const rescheduledStartTime = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000); // 2 days from now (matches RESCHEDULED log's "new" times)
  const rescheduledEndTime = new Date(rescheduledStartTime.getTime() + eventTypeLength * 60 * 1000);

  await prisma.booking.create({
    data: {
      uid: rescheduledToUid,
      title: "Audit Log Test Booking - Rescheduled",
      startTime: rescheduledStartTime,
      endTime: rescheduledEndTime,
      status: BookingStatus.ACCEPTED,
      userId,
      eventTypeId,
      fromReschedule: bookingUid,
      attendees: {
        create: {
          email: attendeeEmail,
          name: "James Wilson",
          timeZone: "UTC",
        },
      },
    },
  });

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

  // v2 schema: removes PII field `rescheduledRequestedBy`, only stores rescheduleReason (actor provides "who requested").
  auditLogs.push({
    bookingUid,
    actorId: userActorV2.id,
    action: "RESCHEDULE_REQUESTED",
    type: "RECORD_UPDATED",
    timestamp: nextTimestamp(),
    source: "WEBAPP",
    operationId: uuidv4(),
    data: {
      version: 2,
      fields: {
        rescheduleReason: "Conflict with another meeting",
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

  // v2 schema: replaces `added` (emails[]) with `addedAttendeeIds` (ids[]). Same data otherwise.
  auditLogs.push({
    bookingUid,
    actorId: userActorV2.id,
    action: "ATTENDEE_ADDED",
    type: "RECORD_UPDATED",
    timestamp: nextTimestamp(),
    source: "MAGIC_LINK",
    operationId: uuidv4(),
    data: {
      version: 2,
      fields: {
        addedAttendeeIds: attendeeId ? [attendeeId] : [],
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

  // v2 schema: replaces `attendeeEmail` with `attendeeId`. Same noShow transition as v1 above.
  if (attendeeId) {
    auditLogs.push({
      bookingUid,
      actorId: userActorV2.id,
      action: "NO_SHOW_UPDATED",
      type: "RECORD_UPDATED",
      timestamp: nextTimestamp(),
      source: "WEBAPP",
      operationId: uuidv4(),
      data: {
        version: 2,
        fields: {
          attendeesNoShow: [
            {
              attendeeId,
              noShow: { old: false, new: true },
            },
          ],
        },
      },
    });
  }

  // v2 schema: same host noShow structure, same transition as v1 above. Same impersonation context.
  auditLogs.push({
    bookingUid,
    actorId: userActorV2.id,
    action: "NO_SHOW_UPDATED",
    type: "RECORD_UPDATED",
    timestamp: nextTimestamp(),
    source: "WEBAPP",
    operationId: uuidv4(),
    data: {
      version: 2,
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
    actorId: userActor.id,
    action: "CANCELLED",
    type: "RECORD_UPDATED",
    timestamp: nextTimestamp(),
    source: "WEBAPP",
    operationId: uuidv4(),
    data: {
      version: 1,
      fields: {
        cancellationReason: "Host cancelled - schedule conflict",
        cancelledBy: attendeeEmail,
        status: { old: BookingStatus.ACCEPTED, new: BookingStatus.CANCELLED },
      },
    },
  });

  // v2 schema: drops `cancelledBy` (email) — actor already identifies the canceller. Same data otherwise.
  auditLogs.push({
    bookingUid,
    actorId: userActorV2.id,
    action: "CANCELLED",
    type: "RECORD_UPDATED",
    timestamp: nextTimestamp(),
    source: "WEBAPP",
    operationId: uuidv4(),
    data: {
      version: 2,
      fields: {
        cancellationReason: "Host cancelled - schedule conflict",
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
  const seatRefUidV2 = uuidv4();

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

  // v2 schema: replaces `attendeeEmail`+`attendeeName` with `attendeeId`. Same times as v1 above.
  if (attendeeId) {
    auditLogs.push({
      bookingUid,
      actorId: attendeeActorV2.id,
      action: "SEAT_BOOKED",
      type: "RECORD_CREATED",
      timestamp: nextTimestamp(),
      source: "WEBAPP",
      operationId: uuidv4(),
      data: {
        version: 2,
        fields: {
          seatReferenceUid: seatRefUidV2,
          attendeeId,
          startTime: hoursFromNow(48),
          endTime: hoursFromNow(48.5),
        },
      },
    });
  }

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

  // All reschedule actions get the latest timestamps — rescheduling is the last action on a booking.
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

  // v2 schema: replaces `attendeeEmail` with `attendeeId`. Same times/rescheduledToBookingUid as v1 above.
  if (attendeeId) {
    auditLogs.push({
      bookingUid,
      actorId: attendeeActorV2.id,
      action: "SEAT_RESCHEDULED",
      type: "RECORD_UPDATED",
      timestamp: nextTimestamp(),
      source: "WEBAPP",
      operationId: uuidv4(),
      data: {
        version: 2,
        fields: {
          seatReferenceUid: seatRefUidV2,
          attendeeId,
          startTime: { old: hoursFromNow(48), new: hoursFromNow(72) },
          endTime: { old: hoursFromNow(48.5), new: hoursFromNow(72.5) },
          rescheduledToBookingUid: { old: null, new: rescheduledToUid },
        },
      },
    });
  }

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

  for (const logData of auditLogs) {
    await prisma.bookingAudit.create({ data: logData });
  }

  return auditLogs.length;
}

async function seedMinimalAuditLogs({
  bookingUid,
  userUuid,
}: {
  bookingUid: string;
  userUuid: string;
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
  const now = Date.now();

  await prisma.bookingAudit.create({
    data: {
      bookingUid,
      actorId: systemActor.id,
      action: "CREATED",
      type: "RECORD_CREATED",
      timestamp: new Date(now - 2 * 60 * 1000),
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
    },
  });

  await prisma.bookingAudit.create({
    data: {
      bookingUid,
      actorId: userActor.id,
      action: "ACCEPTED",
      type: "RECORD_UPDATED",
      timestamp: new Date(now - 1 * 60 * 1000),
      source: "WEBAPP",
      operationId: uuidv4(),
      data: {
        version: 1,
        fields: {
          status: { old: BookingStatus.PENDING, new: BookingStatus.ACCEPTED },
        },
      },
    },
  });

  return 2;
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

  if (organizationId) {
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

    await prisma.teamFeatures.upsert({
      where: { teamId_featureId: { teamId: organizationId, featureId: "bookings-v3" } },
      create: {
        teamId: organizationId,
        featureId: "bookings-v3",
        enabled: true,
        assignedBy: "seed-script",
      },
      update: { enabled: true },
    });
    console.log(`  ✅ Enabled bookings-v3 for organization ${organizationId}`);
  }

  // Create a dedicated event type for audit log testing (never reuse/update event types from other seeds)
  const AUDIT_EVENT_SLUG = "audit-log-test";
  const bookingFields = [
    {
      name: "name",
      type: "name",
      editable: "system",
      defaultLabel: "your_name",
      required: true,
      sources: [{ label: "Default", id: "default", type: "default" }],
    },
    {
      name: "email",
      type: "email",
      editable: "system-but-optional",
      defaultLabel: "email_address",
      required: true,
      sources: [{ label: "Default", id: "default", type: "default" }],
    },
    {
      name: "attendeePhoneNumber",
      type: "phone",
      editable: "system-but-optional",
      defaultLabel: "phone_number",
      required: false,
      hidden: true,
      sources: [{ label: "Default", id: "default", type: "default" }],
    },
    {
      name: "location",
      type: "radioInput",
      editable: "system",
      defaultLabel: "location",
      required: false,
      hideWhenJustOneOption: true,
      getOptionsAt: "locations",
      optionsInputs: {
        attendeeInPerson: { type: "address", required: true, placeholder: "" },
        somewhereElse: { type: "text", required: true, placeholder: "" },
        phone: { type: "phone", required: true, placeholder: "" },
      },
      sources: [{ label: "Default", id: "default", type: "default" }],
    },
    {
      name: "title",
      type: "text",
      editable: "system-but-optional",
      defaultLabel: "what_is_this_meeting_about",
      defaultPlaceholder: "",
      required: true,
      hidden: true,
      sources: [{ label: "Default", id: "default", type: "default" }],
    },
    {
      name: "notes",
      type: "textarea",
      editable: "system-but-optional",
      defaultLabel: "additional_notes",
      defaultPlaceholder: "share_additional_notes",
      required: false,
      sources: [{ label: "Default", id: "default", type: "default" }],
    },
    {
      name: "guests",
      type: "multiemail",
      editable: "system-but-optional",
      defaultLabel: "additional_guests",
      defaultPlaceholder: "email",
      required: false,
      sources: [{ label: "Default", id: "default", type: "default" }],
    },
    {
      name: "rescheduleReason",
      type: "textarea",
      editable: "system-but-optional",
      defaultLabel: "reason_for_reschedule",
      defaultPlaceholder: "reschedule_placeholder",
      required: false,
      views: [{ id: "reschedule", label: "Reschedule View" }],
      sources: [{ label: "Default", id: "default", type: "default" }],
    },
  ];

  let eventType = await prisma.eventType.findFirst({
    where: { userId: user.id, slug: AUDIT_EVENT_SLUG },
    select: { id: true, title: true, length: true },
  });

  if (!eventType) {
    eventType = await prisma.eventType.create({
      data: {
        title: "Audit Log Test Event",
        slug: AUDIT_EVENT_SLUG,
        length: 30,
        userId: user.id,
        bookingFields,
      },
      select: { id: true, title: true, length: true },
    });
    console.log(`  ✅ Created audit event type: ${eventType.title} (id=${eventType.id})`);
  } else {
    console.log(`  ⏭️ Audit event type already exists: ${eventType.title} (id=${eventType.id})`);
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
    userId: user.id,
    attendeeId: booking.attendees[0]?.id,
    attendeeEmail: booking.attendees[0]?.email ?? "james.wilson@techstart.dev",
    eventTypeId: eventType.id,
    eventTypeLength: eventType.length,
  });

  console.log(`  ✅ Created ${count} audit log entries`);
  console.log(`  View logs at: /bookings/upcoming?uid=${booking.uid}&activeSegment=history`);

  // --- Action-ready bookings for Phase 2 testing ---

  const bookingResponses = {
    name: "James Wilson",
    email: "james.wilson@techstart.dev",
    guests: [],
    location: { optionValue: "", value: "integrations:daily" },
    notes: "",
  };

  // Booking 2: Action-ready (cancel, reschedule request, add guests)
  const ACTION_READY_TITLE = `Action-Ready Booking - ${eventType.title}`;
  const existingActionReady = await prisma.booking.findFirst({
    where: { title: ACTION_READY_TITLE, userId: user.id, eventTypeId: eventType.id },
    select: { uid: true },
  });

  let actionReadyBooking: { uid: string };
  if (existingActionReady) {
    actionReadyBooking = existingActionReady;
    console.log(`  ⏭️ Action-ready booking already exists: ${actionReadyBooking.uid}`);
  } else {
    const actionReadyStart = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const actionReadyEnd = new Date(actionReadyStart.getTime() + eventType.length * 60 * 1000);

    actionReadyBooking = await prisma.booking.create({
      data: {
        uid: uuidv4(),
        title: ACTION_READY_TITLE,
        startTime: actionReadyStart,
        endTime: actionReadyEnd,
        status: BookingStatus.ACCEPTED,
        userId: user.id,
        eventTypeId: eventType.id,
        location: "integrations:daily",
        responses: bookingResponses,
        attendees: {
          create: {
            email: "james.wilson@techstart.dev",
            name: "James Wilson",
            timeZone: "UTC",
          },
        },
      },
      select: { uid: true },
    });
    console.log(`  ✅ Action-ready booking: ${actionReadyBooking.uid}`);
  }

  // Booking 3: Past booking (for no-show testing)
  const PAST_BOOKING_TITLE = `Past Booking (No-Show Test) - ${eventType.title}`;
  const existingPast = await prisma.booking.findFirst({
    where: { title: PAST_BOOKING_TITLE, userId: user.id, eventTypeId: eventType.id },
    select: { uid: true },
  });

  let pastBooking: { uid: string };
  if (existingPast) {
    pastBooking = existingPast;
    console.log(`  ⏭️ Past booking already exists: ${pastBooking.uid}`);
  } else {
    const pastStart = new Date(Date.now() - 3 * 60 * 60 * 1000); // 3 hours ago
    const pastEnd = new Date(pastStart.getTime() + eventType.length * 60 * 1000);

    pastBooking = await prisma.booking.create({
      data: {
        uid: uuidv4(),
        title: PAST_BOOKING_TITLE,
        startTime: pastStart,
        endTime: pastEnd,
        status: BookingStatus.ACCEPTED,
        userId: user.id,
        eventTypeId: eventType.id,
        location: "integrations:daily",
        responses: {
          ...bookingResponses,
          name: "Sarah Chen",
          email: "sarah.chen@example.com",
        },
        attendees: {
          create: {
            email: "sarah.chen@example.com",
            name: "Sarah Chen",
            timeZone: "UTC",
          },
        },
      },
      select: { uid: true },
    });
    console.log(`  ✅ Past booking (no-show): ${pastBooking.uid}`);
  }

  // Booking 4: Seats booking (for seat book/reschedule testing)
  const SEATS_EVENT_SLUG = "seats-audit-test";
  let seatsEventType = await prisma.eventType.findFirst({
    where: { userId: user.id, slug: SEATS_EVENT_SLUG },
    select: { id: true, title: true, length: true },
  });

  if (!seatsEventType) {
    seatsEventType = await prisma.eventType.create({
      data: {
        title: "Seats Event (Audit Test)",
        slug: SEATS_EVENT_SLUG,
        length: 30,
        userId: user.id,
        seatsPerTimeSlot: 3,
        seatsShowAttendees: true,
      },
      select: { id: true, title: true, length: true },
    });
    console.log(`  ✅ Created seats event type: ${seatsEventType.title}`);
  }

  const SEATS_BOOKING_TITLE = `Seats Booking (Audit Test) - ${seatsEventType.title}`;
  const existingSeats = await prisma.booking.findFirst({
    where: { title: SEATS_BOOKING_TITLE, userId: user.id, eventTypeId: seatsEventType.id },
    select: { uid: true, attendees: { select: { id: true, email: true } } },
  });

  let seatsBooking: { uid: string; attendees: { id: number; email: string }[] };
  if (existingSeats) {
    seatsBooking = existingSeats;
    console.log(
      `  ⏭️ Seats booking already exists: ${seatsBooking.uid} (${seatsBooking.attendees.length} seats)`
    );
  } else {
    const seatsStart = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000);
    const seatsEnd = new Date(seatsStart.getTime() + seatsEventType.length * 60 * 1000);

    const createdSeatsBooking = await prisma.booking.create({
      data: {
        uid: uuidv4(),
        title: SEATS_BOOKING_TITLE,
        startTime: seatsStart,
        endTime: seatsEnd,
        status: BookingStatus.ACCEPTED,
        userId: user.id,
        eventTypeId: seatsEventType.id,
        location: "integrations:daily",
        responses: {
          ...bookingResponses,
          name: "Alex Rivera",
          email: "alex.rivera@example.com",
        },
        attendees: {
          create: [
            { email: "alex.rivera@example.com", name: "Alex Rivera", timeZone: "UTC" },
            { email: "pat.taylor@example.com", name: "Pat Taylor", timeZone: "UTC" },
          ],
        },
      },
      select: {
        id: true,
        uid: true,
        attendees: { select: { id: true, email: true } },
      },
    });

    for (const attendee of createdSeatsBooking.attendees) {
      await prisma.bookingSeat.create({
        data: {
          referenceUid: uuidv4(),
          bookingId: createdSeatsBooking.id,
          attendeeId: attendee.id,
        },
      });
    }
    seatsBooking = createdSeatsBooking;
    console.log(`  ✅ Seats booking: ${seatsBooking.uid} (${seatsBooking.attendees.length} seats)`);
  }

  // --- Permission error test bookings (Scenarios 5-8) ---
  console.log(`\n📋 Seeding permission error test bookings...`);

  type ErrorBookingInfo = { uid: string; loginAs: string; expectedError: string };
  const errorBookingResults: Record<string, ErrorBookingInfo | null> = {
    "5": null,
    "6": null,
    "7": null,
    "8": null,
  };

  // Scenario 5: Team booking from Dunder Mifflin (TEAM_EVENT_TYPE_NOT_IN_ORGANIZATION)
  {
    const dunderOwner = await prisma.user.findFirst({
      where: { username: "owner1-dunder" },
      select: { id: true, uuid: true },
    });
    const dunderOrg = await prisma.team.findFirst({
      where: { slug: "dunder-mifflin", isOrganization: true },
      select: { id: true },
    });
    const dunderTeam1 = dunderOrg
      ? await prisma.team.findFirst({
          where: { slug: "team1", parentId: dunderOrg.id },
          select: { id: true },
        })
      : null;

    if (dunderOwner && dunderTeam1) {
      let dunderEventType = await prisma.eventType.findFirst({
        where: { teamId: dunderTeam1.id, slug: "audit-error-dunder-team" },
        select: { id: true },
      });
      if (!dunderEventType) {
        dunderEventType = await prisma.eventType.create({
          data: {
            title: "Dunder Team Event (Audit Error Test)",
            slug: "audit-error-dunder-team",
            length: 30,
            teamId: dunderTeam1.id,
          },
          select: { id: true },
        });
      }

      const DUNDER_TITLE = "Error Test: Dunder Mifflin Team Booking";
      let dunderBooking = await prisma.booking.findFirst({
        where: { title: DUNDER_TITLE },
        select: { uid: true },
      });

      if (!dunderBooking) {
        const start = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000);
        dunderBooking = await prisma.booking.create({
          data: {
            uid: uuidv4(),
            title: DUNDER_TITLE,
            startTime: start,
            endTime: new Date(start.getTime() + 30 * 60 * 1000),
            status: BookingStatus.ACCEPTED,
            userId: dunderOwner.id,
            eventTypeId: dunderEventType.id,
            attendees: {
              create: [
                { email: "guest-dunder@example.com", name: "Dunder Guest", timeZone: "UTC" },
                { email: user.email, name: "Owner 1 (Acme)", timeZone: "UTC" },
              ],
            },
          },
          select: { uid: true },
        });
        await seedMinimalAuditLogs({ bookingUid: dunderBooking.uid, userUuid: dunderOwner.uuid });
        console.log(`  ✅ Booking 5 (Dunder team): ${dunderBooking.uid}`);
      } else {
        console.log(`  ⏭️ Booking 5 already exists: ${dunderBooking.uid}`);
      }

      errorBookingResults["5"] = {
        uid: dunderBooking.uid,
        loginAs: "owner1-acme",
        expectedError: "TEAM_EVENT_TYPE_NOT_IN_ORGANIZATION",
      };
    } else {
      console.log("  ⚠️ Skipping Scenario 5: owner1-dunder or Dunder Mifflin team1 not found");
    }
  }

  // Scenario 6: Standalone team booking (TEAM_EVENT_TYPE_NOT_IN_ORGANIZATION)
  {
    const seededTeam = await prisma.team.findFirst({
      where: { slug: "seeded-team", parentId: null, isOrganization: false },
      select: { id: true },
    });
    const teamproUser = await prisma.user.findFirst({
      where: { username: "teampro" },
      select: { id: true, uuid: true },
    });

    if (seededTeam && teamproUser) {
      let standaloneEventType = await prisma.eventType.findFirst({
        where: { teamId: seededTeam.id, slug: "audit-error-standalone-team" },
        select: { id: true },
      });
      if (!standaloneEventType) {
        standaloneEventType = await prisma.eventType.create({
          data: {
            title: "Standalone Team Event (Audit Error Test)",
            slug: "audit-error-standalone-team",
            length: 30,
            teamId: seededTeam.id,
          },
          select: { id: true },
        });
      }

      const STANDALONE_TITLE = "Error Test: Standalone Team Booking";
      let standaloneBooking = await prisma.booking.findFirst({
        where: { title: STANDALONE_TITLE },
        select: { uid: true },
      });

      if (!standaloneBooking) {
        const start = new Date(Date.now() + 11 * 24 * 60 * 60 * 1000);
        standaloneBooking = await prisma.booking.create({
          data: {
            uid: uuidv4(),
            title: STANDALONE_TITLE,
            startTime: start,
            endTime: new Date(start.getTime() + 30 * 60 * 1000),
            status: BookingStatus.ACCEPTED,
            userId: teamproUser.id,
            eventTypeId: standaloneEventType.id,
            attendees: {
              create: [
                { email: "guest-standalone@example.com", name: "Standalone Guest", timeZone: "UTC" },
                { email: user.email, name: "Owner 1 (Acme)", timeZone: "UTC" },
              ],
            },
          },
          select: { uid: true },
        });
        await seedMinimalAuditLogs({ bookingUid: standaloneBooking.uid, userUuid: teamproUser.uuid });
        console.log(`  ✅ Booking 6 (standalone team): ${standaloneBooking.uid}`);
      } else {
        console.log(`  ⏭️ Booking 6 already exists: ${standaloneBooking.uid}`);
      }

      errorBookingResults["6"] = {
        uid: standaloneBooking.uid,
        loginAs: "owner1-acme",
        expectedError: "TEAM_EVENT_TYPE_NOT_IN_ORGANIZATION",
      };
    } else {
      console.log("  ⚠️ Skipping Scenario 6: seeded-team or teampro not found");
    }
  }

  // Scenario 7: Personal booking from non-org user (BOOKING_OWNER_NOT_IN_ORGANIZATION)
  {
    const proUser = await prisma.user.findFirst({
      where: { username: "pro" },
      select: { id: true, uuid: true },
    });

    if (proUser) {
      let proEventType = await prisma.eventType.findFirst({
        where: { userId: proUser.id, slug: "audit-error-personal-pro" },
        select: { id: true },
      });
      if (!proEventType) {
        proEventType = await prisma.eventType.create({
          data: {
            title: "Personal Event (Audit Error Test)",
            slug: "audit-error-personal-pro",
            length: 30,
            userId: proUser.id,
          },
          select: { id: true },
        });
      }

      const PRO_TITLE = "Error Test: Non-Org Personal Booking";
      let proBooking = await prisma.booking.findFirst({
        where: { title: PRO_TITLE },
        select: { uid: true },
      });

      if (!proBooking) {
        const start = new Date(Date.now() + 12 * 24 * 60 * 60 * 1000);
        proBooking = await prisma.booking.create({
          data: {
            uid: uuidv4(),
            title: PRO_TITLE,
            startTime: start,
            endTime: new Date(start.getTime() + 30 * 60 * 1000),
            status: BookingStatus.ACCEPTED,
            userId: proUser.id,
            eventTypeId: proEventType.id,
            attendees: {
              create: [
                { email: "guest-pro@example.com", name: "Pro Guest", timeZone: "UTC" },
                { email: user.email, name: "Owner 1 (Acme)", timeZone: "UTC" },
              ],
            },
          },
          select: { uid: true },
        });
        await seedMinimalAuditLogs({ bookingUid: proBooking.uid, userUuid: proUser.uuid });
        console.log(`  ✅ Booking 7 (non-org personal): ${proBooking.uid}`);
      } else {
        console.log(`  ⏭️ Booking 7 already exists: ${proBooking.uid}`);
      }

      errorBookingResults["7"] = {
        uid: proBooking.uid,
        loginAs: "owner1-acme",
        expectedError: "BOOKING_OWNER_NOT_IN_ORGANIZATION",
      };
    } else {
      console.log("  ⚠️ Skipping Scenario 7: pro user not found");
    }
  }

  // Scenario 8: In-scope booking, viewer lacks PBAC permissions (ORG_MEMBER_PERMISSION_DENIED)
  {
    const acmeOrg = await prisma.team.findFirst({
      where: { slug: "acme", isOrganization: true },
      select: { id: true },
    });
    const acmeTeam1 = acmeOrg
      ? await prisma.team.findFirst({
          where: { slug: "team1", parentId: acmeOrg.id },
          select: { id: true },
        })
      : null;

    if (acmeTeam1) {
      let pbacEventType = await prisma.eventType.findFirst({
        where: { teamId: acmeTeam1.id, slug: "audit-error-pbac" },
        select: { id: true },
      });
      if (!pbacEventType) {
        pbacEventType = await prisma.eventType.create({
          data: {
            title: "PBAC Test Event (Audit Error Test)",
            slug: "audit-error-pbac",
            length: 30,
            teamId: acmeTeam1.id,
          },
          select: { id: true },
        });
      }

      const PBAC_TITLE = "Error Test: PBAC Permission Denied";
      let pbacBooking = await prisma.booking.findFirst({
        where: { title: PBAC_TITLE },
        select: { uid: true },
      });

      if (!pbacBooking) {
        const start = new Date(Date.now() + 13 * 24 * 60 * 60 * 1000);
        pbacBooking = await prisma.booking.create({
          data: {
            uid: uuidv4(),
            title: PBAC_TITLE,
            startTime: start,
            endTime: new Date(start.getTime() + 30 * 60 * 1000),
            status: BookingStatus.ACCEPTED,
            userId: user.id,
            eventTypeId: pbacEventType.id,
            attendees: {
              create: [
                { email: "guest-pbac@example.com", name: "PBAC Guest", timeZone: "UTC" },
                { email: "member0-acme@example.com", name: "Member 0 (Acme)", timeZone: "UTC" },
              ],
            },
          },
          select: { uid: true },
        });
        await seedMinimalAuditLogs({ bookingUid: pbacBooking.uid, userUuid: user.uuid });
        console.log(`  ✅ Booking 8 (PBAC test): ${pbacBooking.uid}`);
      } else {
        console.log(`  ⏭️ Booking 8 already exists: ${pbacBooking.uid}`);
      }

      errorBookingResults["8"] = {
        uid: pbacBooking.uid,
        loginAs: "member0-acme",
        expectedError: "ORG_MEMBER_PERMISSION_DENIED",
      };
    } else {
      console.log("  ⚠️ Skipping Scenario 8: Acme team1 not found");
    }
  }

  // --- Summary ---
  console.log(`\n📊 Summary:`);
  console.log(`  Booking 1 (audit log viewer): ${booking.uid}`);
  console.log(`    ${count} V1+V2 audit entries — view at /booking/${booking.uid}/logs`);
  console.log(`  Booking 2 (action-ready): ${actionReadyBooking.uid}`);
  console.log(`    ACCEPTED, future — test cancel, reschedule request, add guests`);
  console.log(`  Booking 3 (past): ${pastBooking.uid}`);
  console.log(`    ACCEPTED, past — test mark no-show (host + attendee)`);
  console.log(`  Booking 4 (seats): ${seatsBooking.uid}`);
  console.log(`    ACCEPTED, future, ${seatsBooking.attendees.length} seats — test seat actions`);

  console.log(`\n  --- Permission Error Bookings ---`);
  for (const [key, info] of Object.entries(errorBookingResults)) {
    if (info) {
      console.log(`  Booking ${key}: ${info.uid}`);
      console.log(`    Login as ${info.loginAs} → expected: ${info.expectedError}`);
    }
  }

  console.log(`\n⚙️  To test real user actions, set ENABLE_ASYNC_TASKER="false" in .env`);
  console.log(`    then restart the dev server for synchronous audit task execution.`);
}

const SEED_GUEST_ACTOR_EMAILS = [
  "priya.sharma@acmecorp.io",
  "host-action-v2@test.internal",
  "attendee-action-v2@test.internal",
];
const SEED_SYSTEM_ACTOR_EMAIL = "system@system.internal";
const SEED_APP_ACTOR_EMAIL = "stripe@app.internal";
const ERROR_TEST_EVENT_SLUGS = [
  "audit-error-dunder-team",
  "audit-error-standalone-team",
  "audit-error-personal-pro",
  "audit-error-pbac",
];

async function resetBookingAuditSeed() {
  console.log("🧹 Resetting booking audit seed data...");

  const user = await prisma.user.findFirst({
    where: { username: "owner1-acme" },
    select: { id: true, uuid: true },
  });

  if (!user) {
    console.log("❌ User owner1-acme not found. Nothing to reset.");
    return;
  }

  const auditEventType = await prisma.eventType.findFirst({
    where: { userId: user.id, slug: "audit-log-test" },
    select: { id: true },
  });

  const seatsEventType = await prisma.eventType.findFirst({
    where: { userId: user.id, slug: "seats-audit-test" },
    select: { id: true },
  });

  const eventTypeIds = [auditEventType?.id, seatsEventType?.id].filter(
    (id): id is number => id !== undefined
  );

  if (eventTypeIds.length > 0) {
    const bookings = await prisma.booking.findMany({
      where: { userId: user.id, eventTypeId: { in: eventTypeIds } },
      select: { id: true, uid: true },
    });

    const bookingUids = bookings.map((b) => b.uid);
    const bookingIds = bookings.map((b) => b.id);

    if (bookingUids.length > 0) {
      const auditDeleted = await prisma.bookingAudit.deleteMany({
        where: { bookingUid: { in: bookingUids } },
      });
      console.log(`  🗑️  Deleted ${auditDeleted.count} audit log entries`);
    }

    if (bookingIds.length > 0) {
      const attendeeIds = (
        await prisma.attendee.findMany({
          where: { bookingId: { in: bookingIds } },
          select: { id: true },
        })
      ).map((a) => a.id);

      await prisma.bookingSeat.deleteMany({ where: { bookingId: { in: bookingIds } } });
      await prisma.attendee.deleteMany({ where: { bookingId: { in: bookingIds } } });
      const bookingsDeleted = await prisma.booking.deleteMany({
        where: { id: { in: bookingIds } },
      });
      console.log(`  🗑️  Deleted ${bookingsDeleted.count} bookings`);

      if (attendeeIds.length > 0) {
        await prisma.auditActor.deleteMany({
          where: { attendeeId: { in: attendeeIds } },
        });
      }
    }

    await prisma.eventType.deleteMany({ where: { id: { in: eventTypeIds } } });
    console.log(`  🗑️  Deleted ${eventTypeIds.length} event types`);
  } else {
    console.log("  ⏭️ No audit event types found, skipping booking cleanup.");
  }

  // Clean up error test event types and their bookings
  const errorEventTypes = await prisma.eventType.findMany({
    where: { slug: { in: ERROR_TEST_EVENT_SLUGS } },
    select: { id: true },
  });

  if (errorEventTypes.length > 0) {
    const errorEtIds = errorEventTypes.map((et) => et.id);

    const errorBookings = await prisma.booking.findMany({
      where: { eventTypeId: { in: errorEtIds } },
      select: { id: true, uid: true },
    });
    const errorBookingUids = errorBookings.map((b) => b.uid);
    const errorBookingIds = errorBookings.map((b) => b.id);

    if (errorBookingUids.length > 0) {
      const auditDeleted = await prisma.bookingAudit.deleteMany({
        where: { bookingUid: { in: errorBookingUids } },
      });
      console.log(`  🗑️  Deleted ${auditDeleted.count} error-test audit log entries`);
    }

    if (errorBookingIds.length > 0) {
      const attendeeIds = (
        await prisma.attendee.findMany({
          where: { bookingId: { in: errorBookingIds } },
          select: { id: true },
        })
      ).map((a) => a.id);

      await prisma.attendee.deleteMany({ where: { bookingId: { in: errorBookingIds } } });
      const bookingsDeleted = await prisma.booking.deleteMany({
        where: { id: { in: errorBookingIds } },
      });
      console.log(`  🗑️  Deleted ${bookingsDeleted.count} error-test bookings`);

      if (attendeeIds.length > 0) {
        await prisma.auditActor.deleteMany({
          where: { attendeeId: { in: attendeeIds } },
        });
      }
    }

    await prisma.eventType.deleteMany({ where: { id: { in: errorEtIds } } });
    console.log(`  🗑️  Deleted ${errorEventTypes.length} error-test event types`);
  }

  // Look up users whose audit actors need cleanup
  const errorTestUsers = await prisma.user.findMany({
    where: { username: { in: ["owner1-dunder", "teampro", "pro"] } },
    select: { uuid: true },
  });
  const errorUserUuids = errorTestUsers.map((u) => u.uuid);

  const actorEmails = [
    ...SEED_GUEST_ACTOR_EMAILS,
    SEED_SYSTEM_ACTOR_EMAIL,
    SEED_APP_ACTOR_EMAIL,
  ];
  const actorsDeleted = await prisma.auditActor.deleteMany({
    where: {
      OR: [{ email: { in: actorEmails } }, { userUuid: { in: [user.uuid, ...errorUserUuids] } }],
    },
  });
  console.log(`  🗑️  Deleted ${actorsDeleted.count} audit actors`);

  console.log("✅ Reset complete. Run without --reset to re-seed.");
}

const isReset = process.argv.includes("--reset");

(isReset ? resetBookingAuditSeed() : seedBookingAuditLogs())
  .then(() => {
    if (!isReset) console.log("\n🎉 Booking audit seed complete!");
    process.exit(0);
  })
  .catch((err) => {
    console.error(`❌ ${isReset ? "Reset" : "Seed"} failed:`, err);
    process.exit(1);
  });
