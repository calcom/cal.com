import { pollSQS } from "@calcom/lib/awsSqsClient";

// Poll SQS for received messages and process them
pollSQS()
  .then(() => {
    console.log("Started polling the SQS queue.");
  })
  .catch((error) => {
    console.error("Error in polling the SQS queue:", error);
  });
