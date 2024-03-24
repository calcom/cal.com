import schedulePayload from "./sendOrSchedulePayload";
import sendPayload from "./sendPayload";

type SendOrSchedulePayload = (...args: Parameters<typeof sendPayload>) => Promise<{
  message?: string | undefined;
  ok: boolean;
  status: number;
}>;

const sendOrSchedulePayload: SendOrSchedulePayload = async (...args) => {
  // If Tasker is enabled, schedule the payload instead of sending it immediately
  if (process.env.TASKER_ENABLE_WEBHOOKS === "1") return schedulePayload(...args);
  return sendPayload(...args);
};

export default sendOrSchedulePayload;
