import { NativeConnection, Worker } from "@temporalio/worker";
import "dotenv/config";

import * as activities from "@calcom/emails/email-manager";

import { NAMESPACE, TASK_QUEUE_NAME } from "./shared";

async function run() {
  // Step 1: Establish a connection with Temporal server.
  //
  // Worker code uses `@temporalio/worker.NativeConnection`.
  // (But in your application code it's `@temporalio/client.Connection`.)
  const connection = await NativeConnection.connect({
    address: "localhost:7233",
    // TLS and gRPC metadata configuration goes here.
  });
  // Step 2: Register Workflows and Activities with the Worker.
  const worker = await Worker.create({
    connection,
    namespace: NAMESPACE,
    taskQueue: TASK_QUEUE_NAME,
    // Workflows are registered using a path as they run in a separate JS context.
    workflowsPath: require.resolve("@calcom/emails/email-workflow"),
    activities,
  });

  // Step 3: Start accepting tasks on the queue
  //
  // The worker runs until it encounters an unexepected error or the process receives a shutdown signal registered on
  // the SDK Runtime object.
  //
  // By default, worker logs are written via the Runtime logger to STDERR at INFO level.
  //
  // See https://typescript.temporal.io/api/classes/worker.Runtime#install to customize these defaults.
  await worker.run();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
