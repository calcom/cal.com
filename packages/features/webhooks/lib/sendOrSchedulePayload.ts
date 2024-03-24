import schedulePayload from "./schedulePayload";
import sendPayload from "./sendPayload";

const sendOrSchedulePayload = async (...args: Parameters<typeof sendPayload>) => {
  // If Tasker is enabled, schedule the payload instead of sending it immediately
  if (process.env.TASKER_ENABLE_WEBHOOKS === 1) return schedulePayload(...args);
  return sendPayload(...args);
};

export default sendOrSchedulePayload;
