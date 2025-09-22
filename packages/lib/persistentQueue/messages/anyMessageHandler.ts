import { tasks as triggerTasks } from "@trigger.dev/sdk";

import type { IMessageHandler, Message } from "../../messageBus/types";

const bookingTasks = {
  "booking.created": [
    {
      task: "send-webhook",
    },
    {
      task: "send-booking-confirmation",
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

export class AnyMessageHandler implements IMessageHandler<"*", Record<string, unknown>> {
  readonly subscribedMessage = "*" as const;
  readonly forPersistentQueue = true;

  async handle(message: Message<Record<string, unknown>>): Promise<void> {
    const tasks = bookingTasks[message.type as keyof typeof bookingTasks];
    await Promise.all(
      tasks.map((task) =>
        triggerTasks.trigger(task.task, {
          messagePayload: message.payload,
        })
      )
    );
  }
}
