import { sendEmailFromQueue } from "@calcom/emails/email-manager"
import { SQSClient, ReceiveMessageCommand, DeleteMessageCommand } from "@aws-sdk/client-sqs"; // ES Modules import
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
    region: process.env.AWS_REGION,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY,
      secretAccessKey: process.env.AWS_SECRET_KEY,
    },
});
  

const receiveParams = {
    QueueUrl: process.env.AWS_SQS_URL,
    MaxNumberOfMessages: 10, // Adjust based on your needs
    VisibilityTimeout: 30, // The duration (in seconds) that received messages are hidden from subsequent retrieve requests
    WaitTimeSeconds: 20 // Long polling setting (0-20 seconds)
};

// const processMessageSQS = async (eventType: SqsEventTypes, payload: string) => {
//     switch(eventType) { 
//         case SqsEventTypes.EmailEvent: { 
//             sendEmailFromQueue(payload);
//         break; 
//         } 
//         case SqsEventTypes.CalendarCreateEvent: { 
//             // TODO process calendar delete event; 
//             break; 
//         }
//         case SqsEventTypes.CalendarUpdateEvent: { 
//             // TODO process calendar update event; 
//             break; 
//         } 
//         case SqsEventTypes.CalendarDeleteEvent: { 
//             // TODO process calendar delete event; 
//             break; 
//         }
//         case SqsEventTypes.WebhookEvent: { 
//             // TODO process webhook event; 
//             break; 
//         }
//         default: { 
//             // TODO throw error for invalid event; 
//             return false;
//         } 
//     }
//     return true;
// }

const pollSQS = async () => {
    console.log("JFJF ", process.env.AWS_SQS_URL)
    // try {
    //     const receiveMessageCommand = new ReceiveMessageCommand(receiveParams);
    //     const response = await sqsClient.send(receiveMessageCommand);

//         if (response.Messages) {
//             if (response.Messages) {
//                 for (const message of response.Messages) {
//                     console.log('Received message:', message.Body);
                    
//                     // TODO process message
//                     // TODO process event
//                     // TODO process paylod
//                     let event = SqsEventTypes.InvalidEvent;
//                     let payload = "";
//                     let success = processMessageSQS(event, payload);
    
//                     if (success) {
//                         // Delete the message from the queue after processing
//                         try {
//                             const deleteParams = {
//                                 QueueUrl: process.env.AWS_SQS_URL,
//                                 ReceiptHandle: message.ReceiptHandle,
//                             };
//                             const deleteMessageCommand = new DeleteMessageCommand(deleteParams);
//                             const response = await sqsClient.send(deleteMessageCommand);
                    
//                             console.log('Message Deleted', response);
//                         } catch (error) {
//                             success = false;
//                             console.error('Error', error);
//                         }
//                     }
//                     if (!success) {
//                         // TODO add to DLQ
//                     }
//                 }
//             }
//         } else {
//             console.log('No messages available');
//         }
//     } catch (error) {
//         console.error('Error polling SQS queue:', error);
//     }

//     // Continue polling
//     setTimeout(pollSQS, 0);
  };
  
//   // Start polling
//   pollSQS();

  // TODO how to handle safe exit / keyboard interrupt?