import { SQSClient, ReceiveMessageCommand, DeleteMessageCommand } from "@aws-sdk/client-sqs";

import { sendEmailFromQueue } from "@calcom/emails/email-manager";
// ES Modules import
import { SqsEventTypes } from "@calcom/lib/awsSqsSender";

/**
 * TODO:
 * 1) Worker Thread
 * - Implement worker thread to poll SQS queue
 * - Test Email sending works when received by SQS message queue
 * 2) Calendar Events
 * - Implement calendar (de)serialization
 * - Implement worker thread to process received calendar events from SQS queue
 * - Test Calendar event sending works when received by SQS message queue
 * 3) Webhooks
 * - Implement DLQ for failed processing & retry until fail
 */

// Initialize SQS client with environment variables for credentials
// TODO how to initialize process.env variables in this thread ??
const sqsClient = new SQSClient({
  region: "us-east-1",
  credentials: {
    accessKeyId: "AKIA6LMP556WCG7ZM3NA",
    secretAccessKey: "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",
  },
});

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

const pollSQS = async () => {
  try {
    const receiveMessageCommand = new ReceiveMessageCommand(receiveParams);
    const response = await sqsClient.send(receiveMessageCommand);

    if (response.Messages) {
      if (response.Messages) {
        for (const message of response.Messages) {
          console.log("Received message:", message.Body);

          // TODO process message
          // TODO process event
          // TODO process paylod
          const messagePayload = ""; //message.Body.data;
          const eventType = SqsEventTypes.InvalidEvent; //message.Body.event;
          // let event = SqsEventTypes(eventType);
          const success = await processMessageSQS(eventType, messagePayload);
          let error = false;

          if (success == true) {
            // Delete the message from the queue after processing
            try {
              const deleteParams = {
                QueueUrl: process.env.AWS_SQS_URL,
                ReceiptHandle: message.ReceiptHandle,
              };
              const deleteMessageCommand = new DeleteMessageCommand(deleteParams);
              const response = await sqsClient.send(deleteMessageCommand);

              console.log("Message Deleted", response);
            } catch (err) {
              error = true;
              console.error("Error", err);
            }
          }
          if (success == false || error == true) {
            // TODO add to DLQ
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
  setTimeout(pollSQS, 0);
};

// Start polling
pollSQS();

// TODO how to handle safe exit / keyboard interrupt?
