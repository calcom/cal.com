import { InternalTasker } from "./internal-tasker";
// import { RedisTasker } from "./redis-tasker";
import { type Tasker, type TaskerTypes } from "./tasker";

/**
 * This is a factory class that creates Taskers.
 * The TaskerFactory is useful when you want to use a different Tasker in different environments.
 * For example, you can use the InternalTasker in development and the AWSSQSTasker in production.
 */
export class TaskerFactory {
  createTasker(type?: TaskerTypes): Tasker {
    // TODO: Add more alternative Taskers in the future:
    // RedisTasker, TriggerDevTasker, TemporalIOTasker, AWSSQSTasker, etc.
    // TODO: Uncomment the following line when RedisTasker is implemented.
    // if (type === "redis") return new RedisTasker();
    // For now, we only have the InternalTasker.
    if (type === "internal") return new InternalTasker();
    // Default to InternalTasker
    return new InternalTasker();
  }
}

/** Shorthand for getting the default Tasker */
export function getTasker() {
  const taskerFactory = new TaskerFactory();
  return taskerFactory.createTasker();
}
