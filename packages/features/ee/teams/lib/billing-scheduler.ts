import { scheduleDebouncedSeatBilling } from "./payments";

export async function initializeDebouncedBillingScheduler() {
  try {
    await scheduleDebouncedSeatBilling();
  } catch (error) {
    console.error("Failed to initialize debounced billing scheduler:", error);
  }
}
