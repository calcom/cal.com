import type { TaskTypes, TaskHandler } from "../tasker";

interface TaskPlugin {
  handler: TaskHandler;
  config?: {
    minRetryIntervalMins?: number;
    maxAttempts?: number;
  };
}

const pluginCache = new Map<TaskTypes, TaskPlugin>();

const taskRegistry: Record<TaskTypes, { handlerPath: string; config?: any }> = {
  sendEmail: { handlerPath: "./sendEmail" },
  sendWebhook: { handlerPath: "./sendWebook" },
  createCRMEvent: {
    handlerPath: "./crm/createCRMEvent",
    config: { minRetryIntervalMins: 10, maxAttempts: 10 },
  },
  executeAIPhoneCall: {
    handlerPath: "./executeAIPhoneCall",
    config: { maxAttempts: 1 },
  },
  triggerHostNoShowWebhook: { handlerPath: "./triggerNoShow/triggerHostNoShow" },
  triggerGuestNoShowWebhook: { handlerPath: "./triggerNoShow/triggerGuestNoShow" },
  triggerFormSubmittedNoEventWebhook: {
    handlerPath: "./triggerFormSubmittedNoEvent/triggerFormSubmittedNoEventWebhook",
  },
  translateEventTypeData: { handlerPath: "./translateEventTypeData" },
  sendWorkflowEmails: { handlerPath: "./sendWorkflowEmails" },
  scanWorkflowBody: { handlerPath: "./scanWorkflowBody" },
  sendAnalyticsEvent: { handlerPath: "./analytics/sendAnalyticsEvent" },
  sendSms: { handlerPath: "./sendSms" },
};

export async function loadTaskPlugin(taskType: TaskTypes): Promise<TaskPlugin> {
  const cached = pluginCache.get(taskType);
  if (cached) {
    return cached;
  }

  const entry = taskRegistry[taskType];
  if (!entry) {
    throw new Error(`Task handler not found for type ${taskType}`);
  }

  try {
    const handlerModule = await import(`${entry.handlerPath}`);

    const taskPlugin = {
      handler: handlerModule[taskType] || handlerModule.default || handlerModule,
      config: entry.config,
    };

    pluginCache.set(taskType, taskPlugin);
    return taskPlugin;
  } catch (error) {
    throw new Error(`Failed to load task handler for type ${taskType}: ${error}`);
  }
}
