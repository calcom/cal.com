import { SQSClient, SendMessageCommand } from "@aws-sdk/client-sqs";

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

// Example of a sendMessage function
export const sqsSender = async (event: SqsEventTypes, serializedObj: string) => {
  const messagePayload = { data: serializedObj, event: event, time: Date.now() };
  console.log("JFJF ", process.env.AWS_SQS_URL);
  const command = new SendMessageCommand({
    DelaySeconds: 0,
    MessageBody: JSON.stringify(messagePayload),
    QueueUrl: process.env.AWS_SQS_URL,
    // QueueUrl: "https://sqs.us-east-1.amazonaws.com/986533719980/cal_msg_queue", // Use environment variable for queue URL
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
