import type { TaskTypes, TaskHandler } from "../tasker";

interface TaskPlugin {
  handler: TaskHandler;
  config?: {
    minRetryIntervalMins?: number;
    maxAttempts?: number;
  };
}

const pluginCache = new Map<TaskTypes, TaskPlugin>();

export async function loadTaskPlugin(taskType: TaskTypes): Promise<TaskPlugin> {
  if (pluginCache.has(taskType)) {
    return pluginCache.get(taskType)!;
  }

  const plugin = await import(`./plugins/${taskType}`);
  const taskPlugin = {
    handler: plugin.handler,
    config: plugin.config,
  };

  pluginCache.set(taskType, taskPlugin);
  return taskPlugin;
}
