import process from "node:process";
import schedulePayload from "./schedulePayload";
import sendPayload from "./sendPayload";

type SendOrSchedulePayload = typeof sendPayload;

const sendOrSchedulePayload: SendOrSchedulePayload = async (...args) => {
  // If Tasker is enabled, schedule the payload instead of sending it immediately
  if (process.env.TASKER_ENABLE_WEBHOOKS === "1") return schedulePayload(...args);
  return sendPayload(...args);
};

export default sendOrSchedulePayload;
