import tasker from "@calcom/features/tasker";

const DEBOUNCE_INTERVAL_MS = 2 * 60 * 60 * 1000; // 2 hours in milliseconds

export async function initializeDebouncedBillingScheduler() {
  try {
    const tasks = (await tasker.getAll?.()) || [];
    const existingTask = tasks.find(
      (task) =>
        task.type === "processDebouncedSeatBilling" &&
        task.succeededAt === null &&
        new Date(task.scheduledAt) > new Date()
    );

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
