import tasker from "@calcom/features/tasker";
import prisma from "@calcom/prisma";

const DEBOUNCE_INTERVAL_MS = 2 * 60 * 60 * 1000; // 2 hours in milliseconds

export async function initializeDebouncedBillingScheduler() {
  try {
    const existingTask = await prisma.task.findFirst({
      where: {
        type: "processDebouncedSeatBilling",
        succeededAt: null,
        scheduledAt: {
          gt: new Date(),
        },
      },
    });

    if (!existingTask) {
      console.log("Scheduling initial debounced seat billing task");
      await tasker.create(
        "processDebouncedSeatBilling",
        {},
        {
          scheduledAt: new Date(Date.now() + DEBOUNCE_INTERVAL_MS),
        }
      );
    }
  } catch (error) {
    console.error("Failed to initialize debounced billing scheduler:", error);
  }
}
