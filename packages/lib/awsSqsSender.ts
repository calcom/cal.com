// import { SQS } from 'aws-sdk';
// const AWS = require('aws-sdk');
import { SQSClient } from "@aws-sdk/client-sqs";

// import { fromEnv } from "@aws-sdk/credential-provider-env";
// import { SQSClient } from "@aws-sdk/client-sqs";
const sqsClient = new SQSClient({
  region: "us-east-1",
  credentials: {
    accessKeyId: "AKIA6LMP556WPUG5NWUA",
    secretAccessKey: "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",
  },
});

// AWS.config.update({
//   accessKeyId: 'AKIA6LMP556WPUG5NWUA',
//   secretAccessKey: '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',
//   region: 'us-east-1'
// });

// const credentials = fromEnv();
// const sqs = new SQSClient({ credentials });

// import logger from "@calcom/lib/logger";

// const log = logger.getSubLogger({ prefix: ["AWS_SQS_Sender"] });

// const sqs = new AWS.SQS();

enum SqsEventTypes {
  EmailEvent = "Email",
  CalendarCreateEvent = "Calendar.Create",
  CalendarUpdateEvent = "Calendar.Update",
  CalendarDeleteEvent = "Calendar.Delete",
  WebhookEvent = "Webhook",
}

// Reach out to Emrysal in discord who can tell use how to structure our code / how to integrate the SQS functionality into the directory structure
// use process.env.AWS_SQS_CONSUMER value to determine whether to use messaging queue

// RETRIEVING MESSAGES
// async function getMessage(queueUrl: string): Promise<string> {
//   const command = new ReceiveMessageCommand({
//     QueueUrl: queueUrl,
//     MaxNumberOfMessages: 1,
//   });

//   const response = await sqsClient.send(command);

//   if (response.Messages?.length) {
//     const message = response.Messages[0];
//     return message.Body!;
//   }

//   throw new Error("No messages found in the queue");
// }
// Export the getMessage function.

export const sqsSender = async (event: SqsEventTypes, serializedObj: string) => {
  const messagePayload = { data: serializedObj, event: event, time: Date.now() };

  const payload = {
    DelaySeconds: 0,
    MessageBody: JSON.stringify({ ...messagePayload }),
    QueueUrl: "https://sqs.us-east-1.amazonaws.com/986533719980/cal_msg_queue",
  };

  // try {
  //   const data = await sqsClient.send(new SendMessageCommand(params));
  //   console.log("Success, message sent. Message ID:", data.MessageId);
  //   return data; // For API responses
  // } catch (err) {
  //   console.error("Error", err.stack);
  //   throw err; // For API error handling
  // }
  // }
  return await new Promise((resolve, reject) => {
    sqsClient.sendMessage(payload, (err: any, data: any) => {
      if (err) {
        console.log(err, err.stack);
        reject(err);
      } else {
        console.log(data);
        resolve(data);
      }
    });
  });
};

export default sqsSender;

console.log("hello");

sqsSender(SqsEventTypes.EmailEvent, "TEST");
