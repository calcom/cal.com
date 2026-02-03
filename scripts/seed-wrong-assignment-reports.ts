import { prisma } from "@calcom/prisma";
import { WrongAssignmentReportStatus } from "@calcom/prisma/enums";

async function main() {
  // Find bookings that have a team and a user, and don't already have a report
  const bookings = await prisma.booking.findMany({
    where: {
      userId: { not: null },
      wrongAssignmentReports: { none: {} },
    },
    select: {
      uid: true,
      userId: true,
      eventType: {
        select: {
          teamId: true,
          team: {
            select: {
              members: {
                select: { userId: true },
                take: 5,
              },
            },
          },
        },
      },
    },
    take: 12,
    orderBy: { createdAt: "desc" },
  });

  if (bookings.length === 0) {
    console.log("No eligible bookings found. Make sure you have bookings with team event types.");
    return;
  }

  // Find a routing form to associate with some reports
  const routingForm = await prisma.app_RoutingForms_Form.findFirst({
    select: { id: true },
  });

  const notes = [
    "Customer requested a Spanish-speaking agent but was routed to English-only team.",
    "This booking should have gone to the Enterprise sales team based on company size.",
    "Wrong timezone assignment - customer is in APAC but got routed to EMEA team.",
    "Customer's industry vertical doesn't match the assigned specialist.",
    "Lead score was above threshold for senior AE but went to SDR queue.",
    "Existing customer was routed to new business instead of account management.",
    "Technical support request was sent to billing team.",
    "VIP customer was not routed to priority queue.",
    "Demo request from partner should have gone to partnerships team.",
    "Renewal discussion was routed to new sales instead of customer success.",
    "Healthcare prospect was assigned to general sales instead of vertical specialist.",
    "Government lead missed the public sector routing rule.",
  ];

  const correctAssignees = [
    "Maria Garcia",
    "Enterprise Sales Team",
    "APAC Support Team",
    "Industry Specialist Group",
    "Senior AE Pool",
    "Account Management",
    "Technical Support",
    "VIP Support Queue",
    "Partnerships Team",
    "Customer Success",
    "Healthcare Vertical Team",
    "Public Sector Team",
  ];

  const statuses = [
    WrongAssignmentReportStatus.PENDING,
    WrongAssignmentReportStatus.PENDING,
    WrongAssignmentReportStatus.PENDING,
    WrongAssignmentReportStatus.PENDING,
    WrongAssignmentReportStatus.PENDING,
    WrongAssignmentReportStatus.REVIEWED,
    WrongAssignmentReportStatus.REVIEWED,
    WrongAssignmentReportStatus.RESOLVED,
    WrongAssignmentReportStatus.RESOLVED,
    WrongAssignmentReportStatus.DISMISSED,
    WrongAssignmentReportStatus.PENDING,
    WrongAssignmentReportStatus.REVIEWED,
  ];

  let created = 0;

  for (let i = 0; i < bookings.length; i++) {
    const booking = bookings[i];
    const teamId = booking.eventType?.teamId ?? null;
    const reporterId = booking.userId!;

    // For reviewed/resolved reports, pick a different team member as reviewer if possible
    const teamMembers = booking.eventType?.team?.members ?? [];
    const otherMember = teamMembers.find((m) => m.userId !== reporterId);
    const status = statuses[i % statuses.length];
    const isReviewed =
      status === WrongAssignmentReportStatus.REVIEWED ||
      status === WrongAssignmentReportStatus.RESOLVED ||
      status === WrongAssignmentReportStatus.DISMISSED;

    try {
      await prisma.wrongAssignmentReport.create({
        data: {
          bookingUid: booking.uid,
          reportedById: reporterId,
          correctAssignee: correctAssignees[i % correctAssignees.length],
          additionalNotes: notes[i % notes.length],
          teamId,
          routingFormId: routingForm?.id ?? null,
          status,
          reviewedById: isReviewed ? (otherMember?.userId ?? reporterId) : null,
          reviewedAt: isReviewed ? new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000) : null,
          createdAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
        },
      });
      created++;
      console.log(`Created report ${created} for booking ${booking.uid} [${status}]`);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      console.log(`Skipped booking ${booking.uid}: ${msg}`);
    }
  }

  console.log(`\nDone! Created ${created} wrong assignment reports.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => void prisma.$disconnect());
