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

// ES Modules import

// Initialize SQS client with environment variables for credentials
const sqsClient = new SQSClient({
  region: "us-east-1", //process.env.AWS_REGION,
  credentials: {
    accessKeyId: "AKIA6LMP556WCUFSCL7N", // process.env.AWS_ACCESS_KEY,
    secretAccessKey: "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", //process.env.AWS_SECRET_KEY,
  },
});

export enum SqsEventTypes {
  EmailEvent = "Email",
  CalendarCreateEvent = "Calendar.Create",
  CalendarUpdateEvent = "Calendar.Update",
  CalendarDeleteEvent = "Calendar.Delete",
  WebhookEvent = "Webhook",
  InvalidEvent = "Invalid",
}

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

// Example of a sendMessage function
export const sqsSender = async (event: SqsEventTypes, obj: any) => {
  const messagePayload = { data: obj, event: event, time: Date.now() };
  const command = new SendMessageCommand({
    DelaySeconds: 0,
    MessageBody: JSON.stringify(messagePayload),
    QueueUrl: "https://sqs.us-east-1.amazonaws.com/986533719980/cal_msg_queue", //process.env.AWS_SQS_URL,
  });

  try {
    const data = await sqsClient.send(command);
    console.log("Success, message sent. Message ID:", data.MessageId);
    return data; // For API responses
  } catch (err) {
    console.error("Error", err);
    throw err; // For API error handling
  }
};

// Example usage
// (async () => {
//   try {
//     console.log("Sending message...");
//     const response = await sqsSender(SqsEventTypes.EmailEvent, "TEST");
//     console.log("Response:", response);
//   } catch (error) {
//     console.error("An error occurred:", error);
//   }
// })();

// -------------------------------------

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
      sendEmailFromQueue(payload);
      break;
    }
    case SqsEventTypes.CalendarCreateEvent: {
      // const data = JSON.parse(payload);
      const result = await createEvent(payload.credential, payload.calEvent, payload.externalId, true);
      // await persistCalendarResult(result); TODO implement
      break;
    }
    case SqsEventTypes.CalendarUpdateEvent: {
      // const data = JSON.parse(payload);
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
      // const data = JSON.parse(payload);
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
      const secretKey = symmetricDecrypt(payload.secretKey, "hTfxy40QpKWH31EohfgowrMHRWs2T2yvspn4854SVa4="); // TODO replace with env variable process.env.AWS_WEBHOOK_SECRET),
      const status = await _sendPayload(secretKey, payload.webhook, payload.body, payload.contentType, true);
      // await checkWebhookResult(status);
      break;
    }
    default: {
      console.error("Received invalid event type (", eventType, ") for payload: ", payload);
      return false;
    }
  }
  return true;
};

export const pollSQS = async (fromWorker = false) => {
  const receiveParams = {
    QueueUrl: "https://sqs.us-east-1.amazonaws.com/986533719980/cal_msg_queue", //process.env.AWS_SQS_URL,
    MaxNumberOfMessages: 10, // Adjust based on your needs
    VisibilityTimeout: 30, // The duration (in seconds) that received messages are hidden from subsequent retrieve requests
    WaitTimeSeconds: 20, // Long polling setting (0-20 seconds)
  };

  try {
    const receiveMessageCommand = new ReceiveMessageCommand(receiveParams);
    const response = await sqsClient.send(receiveMessageCommand);

    if (response.Messages) {
      for (const message of response.Messages) {
        if (message.Body) {
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
          await processMessageSQS(eventType, messagePayload);

          // Delete the message from the queue after processing
          try {
            const deleteParams = {
              QueueUrl: "https://sqs.us-east-1.amazonaws.com/986533719980/cal_msg_queue", //process.env.AWS_SQS_URL,
              ReceiptHandle: message.ReceiptHandle,
            };
            const deleteMessageCommand = new DeleteMessageCommand(deleteParams);
            const response = await sqsClient.send(deleteMessageCommand);

            console.log("Message Deleted ", response);
          } catch (err) {
            // error = true;
            console.error("Error Deleting Message ", err);
          }
        }
      }
    } else {
      console.log("No messages available");
    }
  } catch (error) {
    console.error("Error polling SQS queue:", error);
  }

  // Continue polling
  if (fromWorker) {
    setTimeout(pollSQS, 0);
  }
};
