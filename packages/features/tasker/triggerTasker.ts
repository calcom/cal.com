import { type Tasker } from "./tasker";

export class TriggerTasker implements Tasker {
  create(type: string, payload: any) {
    console.log("🚀 ~ TriggerTasker ~ create ~ payload:", payload);
    console.log("🚀 ~ TriggerTasker ~ create ~ type:", type);
    return Promise.resolve("Task triggered");
  }
  processQueue() {
    // Handled by Trigger.dev
    return Promise.resolve();
  }
  cleanup() {
    // Handled by Trigger.dev
    return Promise.resolve();
  }
}
