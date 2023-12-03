* Message Queueing with AWS SQS

This script can be run with: npx ts-node apps/queue-worker/worker.tsx

It will poll the SQS queue and process the messages. Based on the event type (awsSqsClient.ts SqsEventTypes), it will process the received message differently whether it is a
calendar event, email, or webhook message.

This was designed with reliability and scability in mind. SQS is extremely scalable, and the number of workers deployed can be easily scaled up. Likewise we emphasized reliability by implementing skeleton code indicating where functionality for a DLQ would go in order to retry failed requests and ensure high reliability for cal.com.
 
Future Direction
- Implement DLQ for messages that cannot be processed. Try reprocessing them and storing retry attempts before failing after a certain number of attempts. The user should receive an email if this failed
- Store/update/delete to/from the postgres database based oon the output of the event creation/update/delete messages in the postgres database
- Split up the queue into 3 separate queues to handle webhooks, calendar events, and emails. Create a base class for awsSqsClient, and subclass it to separate 
out functionality for each type of message such that each subclass listens to one queue and imports just one part of the library
- Handle safe exists / keyboard interrupts from the worker script. Likewise create an event that can be pushed to the queue that will terminate the worker.
- Dockerize the worker application