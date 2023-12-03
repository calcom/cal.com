import {
  SQSClient,
  SendMessageCommand,
  ReceiveMessageCommand,
  DeleteMessageCommand,
} from "@aws-sdk/client-sqs";

import { createEvent, updateEvent, deleteEvent } from "@calcom/core/CalendarManager";
import { sendEmailFromQueue } from "@calcom/emails/email-manager";
import { _sendPayload } from "@calcom/features/webhooks/lib/sendPayload";
import { symmetricDecrypt } from "@calcom/lib/crypto";

// TODO create wrapper class around SQS client and subclass for individual handling of emails, calendar events, webhooks

// Initialize SQS client with environment variables for credentials
const sqsClient = new SQSClient({
  region: "us-east-1", //process.env.AWS_REGION,
  credentials: {
    accessKeyId: "AKIA6LMP556WCUFSCL7N", // process.env.AWS_ACCESS_KEY,
    secretAccessKey: "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", //process.env.AWS_SECRET_KEY,
  },
});

// Enum to represent the different event types
export enum SqsEventTypes {
  EmailEvent = "Email",
  CalendarCreateEvent = "Calendar.Create",
  CalendarUpdateEvent = "Calendar.Update",
  CalendarDeleteEvent = "Calendar.Delete",
  WebhookEvent = "Webhook",
  InvalidEvent = "Invalid",
}

// Convert string to SqsEventTypes
export const stringToSqsEventTypes = async (str: string) => {
  switch (str) {
    case "Email":
      return SqsEventTypes.EmailEvent;
    case "Calendar.Create":
      return SqsEventTypes.CalendarCreateEvent;
    case "Calendar.Update":
      return SqsEventTypes.CalendarUpdateEvent;
    case "Calendar.Delete":
      return SqsEventTypes.CalendarDeleteEvent;
    case "Calendar.Webhook":
      return SqsEventTypes.WebhookEvent;
    default:
      return SqsEventTypes.InvalidEvent;
  }
};

/**
 * Sends a message to an SQS queue.
 *
 * @param {SqsEventTypes} event - The type of event.
 * @param {any} obj - The serialized object payload to send in the message.
 */
export const sqsSender = async (event: SqsEventTypes, obj: any) => {
  const messagePayload = { data: obj, event: event, time: Date.now() };
  const command = new SendMessageCommand({
    DelaySeconds: 0,
    MessageBody: JSON.stringify(messagePayload),
    QueueUrl: "https://sqs.us-east-1.amazonaws.com/986533719980/cal_msg_queue", //process.env.AWS_SQS_URL,
  });

  try {
    const data = await sqsClient.send(command);
    console.debug("Success, message sent. Message ID:", data.MessageId);
    return data; // For API responses
  } catch (err) {
    console.error("Error", err);
    throw err; // For API error handling
  }
};

const persistCalendarResult = async (calEvent: Promise<unknown>) => {
  // TODO use result of calendar event create/update/delete and store in database
  console.log("persistCalendarResult ", calEvent);
};

const checkWebhookResult = async (status: any) => {
  // TODO use result of webhook to retry and put in DLQ if it didn't work
  console.log("webhook _sendPayload result ", status);
};

export const processMessageSQS = async (eventType: SqsEventTypes, payload: any) => {
  switch (eventType) {
    case SqsEventTypes.EmailEvent: {
      // If message type was EmailEvent, send email
      sendEmailFromQueue(payload);
      break;
    }
    case SqsEventTypes.CalendarCreateEvent: {
      // If message type was CalendarCreateEvent, call createEvent in CalendarManager
      const result = await createEvent(payload.credential, payload.calEvent, payload.externalId, true);
      // await persistCalendarResult(result); TODO implement
      break;
    }
    case SqsEventTypes.CalendarUpdateEvent: {
      // If message type was CalendarUpdateEvent, call updateEvent in CalendarManager
      const result = await updateEvent(
        payload.credential,
        payload.calEvent,
        payload.bookingRefUid,
        payload.externalCalendarId,
        true
      );
      // await persistCalendarResult(result); TODO implement
      break;
    }
    case SqsEventTypes.CalendarDeleteEvent: {
      // If message type was CalendarDeleteEvent, call deleteEvent in CalendarManager
      const result = await deleteEvent({
        credential: payload.credential,
        bookingRefUid: payload.bookingRefUid,
        event: payload.event,
        externalCalendarId: payload.externalCalendarId,
        fromQueue: true,
      });
      // await persistCalendarResult(result); TODO implement
      break;
    }
    case SqsEventTypes.WebhookEvent: {
      // If message type was WebhookEvent, call _sendPayload in sendPayload webhook lib
      let secretKey: string | null = null;
      if (payload.secretKey != "") {
        secretKey = symmetricDecrypt(payload.secretKey, "hTfxy40QpKWH31EohfgowrMHRWs2T2yvspn4854SVa4="); // TODO replace with env variable process.env.AWS_WEBHOOK_SECRET),
      }
      const status = await _sendPayload(secretKey, payload.webhook, payload.body, payload.contentType, true);
      // await checkWebhookResult(status); TODO implement
      break;
    }
    default: {
      console.error("Received invalid event type (", eventType, ") for payload: ", payload);
      return false;
    }
  }
  return true;
};

export const pollSQS = async () => {
  // function to be called by the separate worker application that continuously polls SQS queue and processes events
  const receiveParams = {
    QueueUrl: "https://sqs.us-east-1.amazonaws.com/986533719980/cal_msg_queue", //process.env.AWS_SQS_URL,
    MaxNumberOfMessages: 10, // Adjust based on your needs
    VisibilityTimeout: 30, // The duration (in seconds) that received messages are hidden from subsequent retrieve requests
    WaitTimeSeconds: 20, // Long polling setting (0-20 seconds)
  };

  while (true) {
    try {
      // receive message from AWS SQS queue
      const receiveMessageCommand = new ReceiveMessageCommand(receiveParams);
      const response = await sqsClient.send(receiveMessageCommand);

      if (response.Messages) {
        for (const message of response.Messages) {
          if (message.Body) {
            // for each message received from SQS, parse it and process it based on the event type and payload
            const payload = JSON.parse(message.Body);
            const messagePayload = payload.data;
            const eventString = payload.event;
            const eventType = await stringToSqsEventTypes(eventString);
            console.debug(
              "Received eventType (",
              eventType,
              ") from (",
              eventString,
              ") and message: ",
              message.Body
            );
            const success = await processMessageSQS(eventType, messagePayload);

            // Delete the message from the queue after processing if successful
            if (success) {
              try {
                const deleteParams = {
                  QueueUrl: "https://sqs.us-east-1.amazonaws.com/986533719980/cal_msg_queue", //process.env.AWS_SQS_URL,
                  ReceiptHandle: message.ReceiptHandle,
                };
                const deleteMessageCommand = new DeleteMessageCommand(deleteParams);
                const response = await sqsClient.send(deleteMessageCommand);

                console.log("Message Deleted ", response);
              } catch (err) {
                console.error("Error Deleting Message ", err);
              }
            } else {
              // TODO add to DLQ and try to reprocesses. Need further logic to determine whether a specific type of request failed
            }
          }
        }
      } else {
        console.log("No messages available");
      }
    } catch (error) {
      console.error("Error polling SQS queue:", error);
    }

    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
};
