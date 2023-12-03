// import { SQSClient, ReceiveMessageCommand, DeleteMessageCommand } from "@aws-sdk/client-sqs";
// import { sendEmailFromQueue } from "@calcom/emails/email-manager";
// import { createEvent, updateEvent, deleteEvent } from "@calcom/core/CalendarManager"
// ES Modules import
import { pollSQS } from "@calcom/lib/awsSqsClient";

/**
 * TODO:
 * 1) Worker Thread
 * - Setup Standalone worker app and move code here
 * 2) Calendar Events
 * - Ensure storing calendar event in database
 * - Test Calendar event creation works
 * 3) Webhooks
 * - Disjoint codebase around webhooks
 * 4) Other
 * - Describe how in future would use DLQ for failed processing with retry
 */

// Initialize SQS client with environment variables for credentials
// TODO how to initialize process.env variables in this thread ??
// const sqsClient = new SQSClient({
//   region: "us-east-1",
//   credentials: {
//     accessKeyId: "AKIA6LMP556WCG7ZM3NA",
//     secretAccessKey: "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",
//   },
// });

// const receiveParams = {
//   QueueUrl: "https://sqs.us-east-1.amazonaws.com/986533719980/cal_msg_queue",
//   MaxNumberOfMessages: 10, // Adjust based on your needs
//   VisibilityTimeout: 30, // The duration (in seconds) that received messages are hidden from subsequent retrieve requests
//   WaitTimeSeconds: 20, // Long polling setting (0-20 seconds)
// };

// const pollSQS = async () => {
//   try {
//     const receiveMessageCommand = new ReceiveMessageCommand(receiveParams);
//     const response = await sqsClient.send(receiveMessageCommand);

//     if (response.Messages) {
//       if (response.Messages) {
//         for (const message of response.Messages) {
//           const payload = JSON.parse(message.Body);

//           const messagePayload = payload.data;
//           const eventString = payload.event;
//           const eventType = await stringToSqsEventTypes(eventString);
//           await processMessageSQS(eventType, messagePayload);

//           let error = false;
//           let success = true;

//           if (success == true) {
//             // Delete the message from the queue after processing
//             try {
//               const deleteParams = {
//                 QueueUrl: process.env.AWS_SQS_URL,
//                 ReceiptHandle: message.ReceiptHandle,
//               };
//               const deleteMessageCommand = new DeleteMessageCommand(deleteParams);
//               const response = await sqsClient.send(deleteMessageCommand);

//               console.log("Message Deleted", response);
//             } catch (err) {
//               error = true;
//               console.error("Error", err);
//             }
//           }
//           // if (success == false || error == true) {
//           //   // TODO add to DLQ
//           // }
//         }
//       }
//     } else {
//       console.log("No messages available");
//     }
//   } catch (error) {
//     console.error("Error polling SQS queue:", error);
//   }

//   // Continue polling
//   setTimeout(pollSQS, 0);
// };

// Start polling
pollSQS(true);

// TODO how to handle safe exit / keyboard interrupt?
