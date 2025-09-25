import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function updateTimezones() {
  console.log("Starting timezone migration from Asia/Calcutta to Asia/Kolkata...");

  try {
    // Start a transaction to ensure all updates succeed or fail together
    await prisma.$transaction(async (tx) => {
      // 1. Update User model - timeZone field
      const userUpdateResult = await tx.user.updateMany({
        where: {
          timeZone: "Asia/Calcutta",
        },
        data: {
          timeZone: "Asia/Kolkata",
        },
      });
      console.log(`Updated ${userUpdateResult.count} User records`);

      // 2. Update TravelSchedule model - timeZone field
      const travelScheduleUpdateResult = await tx.travelSchedule.updateMany({
        where: {
          timeZone: "Asia/Calcutta",
        },
        data: {
          timeZone: "Asia/Kolkata",
        },
      });
      console.log(`Updated ${travelScheduleUpdateResult.count} TravelSchedule records`);

      // 3. Update TravelSchedule model - prevTimeZone field
      const travelSchedulePrevUpdateResult = await tx.travelSchedule.updateMany({
        where: {
          prevTimeZone: "Asia/Calcutta",
        },
        data: {
          prevTimeZone: "Asia/Kolkata",
        },
      });
      console.log(`Updated ${travelSchedulePrevUpdateResult.count} TravelSchedule prevTimeZone records`);

      // 4. Update EventType model - timeZone field
      const eventTypeUpdateResult = await tx.eventType.updateMany({
        where: {
          timeZone: "Asia/Calcutta",
        },
        data: {
          timeZone: "Asia/Kolkata",
        },
      });
      console.log(`Updated ${eventTypeUpdateResult.count} EventType records`);

      // 5. Update EventType model - lockedTimeZone field
      const eventTypeLockedUpdateResult = await tx.eventType.updateMany({
        where: {
          lockedTimeZone: "Asia/Calcutta",
        },
        data: {
          lockedTimeZone: "Asia/Kolkata",
        },
      });
      console.log(`Updated ${eventTypeLockedUpdateResult.count} EventType lockedTimeZone records`);

      // 6. Update Schedule model - timeZone field
      const scheduleUpdateResult = await tx.schedule.updateMany({
        where: {
          timeZone: "Asia/Calcutta",
        },
        data: {
          timeZone: "Asia/Kolkata",
        },
      });
      console.log(`Updated ${scheduleUpdateResult.count} Schedule records`);

      // 7. Update Attendee model - timeZone field
      const attendeeUpdateResult = await tx.attendee.updateMany({
        where: {
          timeZone: "Asia/Calcutta",
        },
        data: {
          timeZone: "Asia/Kolkata",
        },
      });
      console.log(`Updated ${attendeeUpdateResult.count} Attendee records`);

      // 8. Update Team model - timeZone field
      const teamUpdateResult = await tx.team.updateMany({
        where: {
          timeZone: "Asia/Calcutta",
        },
        data: {
          timeZone: "Asia/Kolkata",
        },
      });
      console.log(`Updated ${teamUpdateResult.count} Team records`);

      // 9. Update CalIdTeam model - timeZone field
      const calIdTeamUpdateResult = await tx.calIdTeam.updateMany({
        where: {
          timeZone: "Asia/Calcutta",
        },
        data: {
          timeZone: "Asia/Kolkata",
        },
      });
      console.log(`Updated ${calIdTeamUpdateResult.count} CalIdTeam records`);

      console.log("All timezone updates completed successfully!");
    });
  } catch (error) {
    console.error("Error during timezone migration:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Function to check current timezone values before migration
async function checkCurrentTimezones() {
  console.log("Checking current timezone values...\n");

  try {
    // Check User model
    const usersWithCalcutta = await prisma.user.count({
      where: { timeZone: "Asia/Calcutta" },
    });
    console.log(`Users with Asia/Calcutta timezone: ${usersWithCalcutta}`);

    // Check TravelSchedule model
    const travelSchedulesWithCalcutta = await prisma.travelSchedule.count({
      where: { timeZone: "Asia/Calcutta" },
    });
    const travelSchedulesPrevWithCalcutta = await prisma.travelSchedule.count({
      where: { prevTimeZone: "Asia/Calcutta" },
    });
    console.log(`TravelSchedules with Asia/Calcutta timezone: ${travelSchedulesWithCalcutta}`);
    console.log(`TravelSchedules with Asia/Calcutta prevTimeZone: ${travelSchedulesPrevWithCalcutta}`);

    // Check EventType model
    const eventTypesWithCalcutta = await prisma.eventType.count({
      where: { timeZone: "Asia/Calcutta" },
    });
    const eventTypesLockedWithCalcutta = await prisma.eventType.count({
      where: { lockedTimeZone: "Asia/Calcutta" },
    });
    console.log(`EventTypes with Asia/Calcutta timezone: ${eventTypesWithCalcutta}`);
    console.log(`EventTypes with Asia/Calcutta lockedTimeZone: ${eventTypesLockedWithCalcutta}`);

    // Check Schedule model
    const schedulesWithCalcutta = await prisma.schedule.count({
      where: { timeZone: "Asia/Calcutta" },
    });
    console.log(`Schedules with Asia/Calcutta timezone: ${schedulesWithCalcutta}`);

    // Check Attendee model
    const attendeesWithCalcutta = await prisma.attendee.count({
      where: { timeZone: "Asia/Calcutta" },
    });
    console.log(`Attendees with Asia/Calcutta timezone: ${attendeesWithCalcutta}`);

    // Check Team model
    const teamsWithCalcutta = await prisma.team.count({
      where: { timeZone: "Asia/Calcutta" },
    });
    console.log(`Teams with Asia/Calcutta timezone: ${teamsWithCalcutta}`);

    // Check CalIdTeam model
    const calIdTeamsWithCalcutta = await prisma.calIdTeam.count({
      where: { timeZone: "Asia/Calcutta" },
    });
    console.log(`CalIdTeams with Asia/Calcutta timezone: ${calIdTeamsWithCalcutta}`);

    console.log("\n");
  } catch (error) {
    console.error("Error checking current timezones:", error);
  }
}

// Main execution function
async function main() {
  console.log("=== Timezone Migration Script ===\n");

  // Check current state
  await checkCurrentTimezones();

  // Perform migration
  await updateTimezones();

  // Verify migration
  console.log("\nVerifying migration...");
  await checkCurrentTimezones();

  console.log("Migration completed successfully!");
}

// Execute the script
if (require.main === module) {
  main().catch((error) => {
    console.error("Migration failed:", error);
    process.exit(1);
  });
}

export { updateTimezones, checkCurrentTimezones };
