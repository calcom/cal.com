import "dotenv/config";

import { prisma } from "@calcom/prisma";

async function main() {
  const insightsTeam = await prisma.team.findFirst({
    where: { slug: "insights-team" },
    select: { id: true, parentId: true },
  });

  if (!insightsTeam) {
    throw new Error("Insights team not found. Please run seed-insights first.");
  }

  console.log(`Found insights team: id=${insightsTeam.id}, parentId=${insightsTeam.parentId}`);

  const existingReports = await prisma.wrongAssignmentReport.count({
    where: { teamId: insightsTeam.id },
  });

  if (existingReports > 0) {
    console.log(`Already have ${existingReports} wrong assignment reports, skipping seed.`);
    return;
  }

  const members = await prisma.membership.findMany({
    where: { teamId: insightsTeam.id },
    select: { userId: true, role: true },
  });

  if (members.length === 0) {
    throw new Error("No team members found for insights team.");
  }

  console.log(`Found ${members.length} team members`);

  const routingForm = await prisma.app_RoutingForms_Form.findFirst({
    where: { teamId: insightsTeam.id },
    select: { id: true, name: true },
  });

  console.log(`Routing form: ${routingForm ? routingForm.name : "none"}`);

  const bookingsWithRoutingForm = await prisma.booking.findMany({
    where: {
      eventType: { teamId: insightsTeam.id },
      routedFromRoutingFormReponse: { isNot: null },
    },
    select: {
      uid: true,
      user: { select: { name: true, email: true } },
    },
    take: 30,
  });

  console.log(`Found ${bookingsWithRoutingForm.length} bookings with routing form responses`);

  if (bookingsWithRoutingForm.length === 0) {
    throw new Error("No bookings with routing form responses found. Please run seed-insights first.");
  }

  const reporterIds = members.map((m) => m.userId);
  const notes = [
    "This booking was routed to the wrong team member. The guest requested a sales consultation but was assigned to engineering.",
    "Customer spoke a different language than the assigned host. Should have been routed to the Spanish-speaking team.",
    "The booking was for an enterprise demo but was assigned to a standard consultation host.",
    "Guest's timezone was not considered during routing. Assigned host was not available during guest's business hours.",
    "The skill match was incorrect - customer needed React expertise but was routed to a Python specialist.",
    "Priority client was not routed to their dedicated account manager.",
    "Routing form response indicated urgent matter but was assigned to a junior team member.",
    "Geographic routing failed - client in EU was assigned to US-based team member.",
  ];

  const correctAssignees = [
    "jane.smith@acme.com",
    "john.doe@acme.com",
    null,
    "maria.garcia@acme.com",
    null,
    "alex.chen@acme.com",
    null,
    "sarah.wilson@acme.com",
  ];

  let pendingCount = 0;
  let reviewedCount = 0;
  let resolvedCount = 0;
  let dismissedCount = 0;

  for (let i = 0; i < bookingsWithRoutingForm.length && i < 25; i++) {
    const booking = bookingsWithRoutingForm[i];
    const reporterId = reporterIds[i % reporterIds.length];
    const noteIndex = i % notes.length;

    let status: "PENDING" | "REVIEWED" | "RESOLVED" | "DISMISSED";
    let reviewedById: number | null = null;
    let reviewedAt: Date | null = null;

    if (i < 10) {
      status = "PENDING";
      pendingCount++;
    } else if (i < 15) {
      status = "REVIEWED";
      reviewedById = reporterIds[(i + 1) % reporterIds.length];
      reviewedAt = new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000);
      reviewedCount++;
    } else if (i < 20) {
      status = "RESOLVED";
      reviewedById = reporterIds[(i + 2) % reporterIds.length];
      reviewedAt = new Date(Date.now() - Math.random() * 14 * 24 * 60 * 60 * 1000);
      resolvedCount++;
    } else {
      status = "DISMISSED";
      reviewedById = reporterIds[(i + 3) % reporterIds.length];
      reviewedAt = new Date(Date.now() - Math.random() * 3 * 24 * 60 * 60 * 1000);
      dismissedCount++;
    }

    await prisma.wrongAssignmentReport.create({
      data: {
        bookingUid: booking.uid,
        reportedById: reporterId,
        correctAssignee: correctAssignees[noteIndex],
        additionalNotes: notes[noteIndex],
        teamId: insightsTeam.id,
        routingFormId: routingForm?.id ?? null,
        status,
        reviewedById,
        reviewedAt,
        createdAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
      },
    });
  }

  console.log(`\nCreated wrong assignment reports:`);
  console.log(`  PENDING: ${pendingCount}`);
  console.log(`  REVIEWED: ${reviewedCount}`);
  console.log(`  RESOLVED: ${resolvedCount}`);
  console.log(`  DISMISSED: ${dismissedCount}`);
  console.log(`  Total: ${pendingCount + reviewedCount + resolvedCount + dismissedCount}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
