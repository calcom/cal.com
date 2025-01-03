import { type Tasker } from "./tasker";
import triggerTasks from "./tasks/trigger/triggerTasks";

export class TriggerTasker implements Tasker {
  async create(type: string, payload: any) {
    console.log("🚀 ~ TriggerTasker ~ create ~ payload:", payload);
    console.log("🚀 ~ TriggerTasker ~ create ~ type:", type);
    console.log("🚀 ~ TriggerTasker ~ create ~ triggerTasks:", triggerTasks);

    const task = triggerTasks[type as keyof typeof triggerTasks];
    console.log("🚀 ~ TriggerTasker ~ create ~ task:", task);
    if (task) {
      const handle = await task.trigger(payload);
      console.log("🚀 ~ TriggerTasker ~ create ~ handle:", handle);
      return Promise.resolve("Task triggered");
    }

    return Promise.resolve("Error creating task");
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
