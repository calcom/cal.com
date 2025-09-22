import { tasks as triggerTasks } from "@trigger.dev/sdk";

import type { IWildcardMessageHandler, Message } from "@calcom/lib/messageBus/types";

const bookingTasks = {
  "booking.created": [
    {
      task: "send-webhook",
    },
    {
      task: "send-booking-creation-emails",
    },
    {
      task: "create-calendar-event",
    },
  ],
  "booking.rescheduled": [
    {
      task: "send-webhook",
    },
    {
      task: "send-booking-confirmation", // Updated confirmation for reschedule
    },
    {
      task: "create-calendar-event", // Update calendar event
    },
  ],
};

export class AnyMessageHandler implements IWildcardMessageHandler {
  readonly subscribedMessage = "*" as const;
  readonly forPersistentQueue = true;

  async handle(message: Message<unknown>): Promise<void> {
    console.log("AnyMessageHandler called", { message });
    const tasks = bookingTasks[message.type as keyof typeof bookingTasks];
    if (tasks) {
      await Promise.all(
        tasks.map((task) =>
          triggerTasks.trigger(task.task, {
            messagePayload: message.payload,
          })
        )
      );
    }
  }
}
