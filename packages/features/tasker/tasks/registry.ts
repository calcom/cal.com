import fs from "fs";
import path from "path";

import type { TaskTypes, TaskHandler } from "../tasker";

interface TaskPlugin {
  handler: TaskHandler;
  config?: {
    minRetryIntervalMins?: number;
    maxAttempts?: number;
  };
}

interface TaskRegistryEntry {
  handlerPath: string;
  config?: {
    minRetryIntervalMins?: number;
    maxAttempts?: number;
  };
}

const pluginCache = new Map<TaskTypes, TaskPlugin>();
let taskRegistry: Record<TaskTypes, TaskRegistryEntry> | null = null;

function loadTaskRegistry(): Record<TaskTypes, TaskRegistryEntry> {
  if (taskRegistry) return taskRegistry;

  const registryPath = path.join(__dirname, "task-registry.json");
  const registryContent = fs.readFileSync(registryPath, "utf-8");
  taskRegistry = JSON.parse(registryContent);
  return taskRegistry as Record<TaskTypes, TaskRegistryEntry>;
}

export async function loadTaskPlugin(taskType: TaskTypes): Promise<TaskPlugin> {
  const cached = pluginCache.get(taskType);
  if (cached) {
    return cached;
  }

  const registry = loadTaskRegistry();
  const entry = registry[taskType];

  if (!entry) {
    throw new Error(`Task handler not found for type ${taskType}`);
  }

  const handlerPath = path.resolve(__dirname, entry.handlerPath);
  delete require.cache[require.resolve(handlerPath)];
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const handlerModule = require(handlerPath);

  const taskPlugin = {
    handler: handlerModule.handler || handlerModule.default || handlerModule[taskType],
    config: entry.config,
  };

  pluginCache.set(taskType, taskPlugin);
  return taskPlugin;
}
