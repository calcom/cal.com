import {
  SQSClient,
  SendMessageCommand,
  ReceiveMessageCommand,
  DeleteMessageCommand,
} from "@aws-sdk/client-sqs";

import { sendEmailFromQueue } from "@calcom/emails/email-manager";

// ES Modules import

// Initialize SQS client with environment variables for credentials
const sqsClient = new SQSClient({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY,
    secretAccessKey: process.env.AWS_SECRET_KEY,
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
export const sqsSender = async (event: SqsEventTypes, serializedObj: any) => {
  const messagePayload = { data: serializedObj, event: event, time: Date.now() };
  const command = new SendMessageCommand({
    DelaySeconds: 0,
    MessageBody: JSON.stringify(messagePayload),
    QueueUrl: process.env.AWS_SQS_URL,
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

const receiveParams = {
  QueueUrl: "https://sqs.us-east-1.amazonaws.com/986533719980/cal_msg_queue",
  MaxNumberOfMessages: 10, // Adjust based on your needs
  VisibilityTimeout: 30, // The duration (in seconds) that received messages are hidden from subsequent retrieve requests
  WaitTimeSeconds: 20, // Long polling setting (0-20 seconds)
};

const processMessageSQS = async (eventType: SqsEventTypes, payload: string) => {
  switch (eventType) {
    case SqsEventTypes.EmailEvent: {
      sendEmailFromQueue(payload);
      break;
    }
    case SqsEventTypes.CalendarCreateEvent: {
      // TODO process calendar delete event;
      break;
    }
    case SqsEventTypes.CalendarUpdateEvent: {
      // TODO process calendar update event;
      break;
    }
    case SqsEventTypes.CalendarDeleteEvent: {
      // TODO process calendar delete event;
      break;
    }
    case SqsEventTypes.WebhookEvent: {
      // TODO process webhook event;
      break;
    }
    default: {
      // TODO throw error for invalid event;
      return false;
    }
  }
  return true;
};

export const pollSQS = async () => {
  try {
    const receiveMessageCommand = new ReceiveMessageCommand(receiveParams);
    const response = await sqsClient.send(receiveMessageCommand);

    if (response.Messages) {
      if (response.Messages) {
        for (const message of response.Messages) {
          const payload = JSON.parse(message.Body);

          const messagePayload = payload.data;
          const eventString = payload.event;
          const eventType = await stringToSqsEventTypes(eventString);
          console.log(
            "JRFJRF Received eventType (",
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
              QueueUrl: process.env.AWS_SQS_URL,
              ReceiptHandle: message.ReceiptHandle,
            };
            const deleteMessageCommand = new DeleteMessageCommand(deleteParams);
            const response = await sqsClient.send(deleteMessageCommand);

            console.log("JRFJRF Message Deleted", response);
          } catch (err) {
            error = true;
            console.error("JRFJRF Error", err);
          }
        }
      }
    } else {
      console.log("JRFJRF No messages available");
    }
  } catch (error) {
    console.error("JRFJRF Error polling SQS queue:", error);
  }
};
