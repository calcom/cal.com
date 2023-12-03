import * as Sentry from "@sentry/node";
import { ProfilingIntegration } from "@sentry/profiling-node";
import { NativeConnection, Worker } from "@temporalio/worker";
import "dotenv/config";

import * as activities from "@calcom/emails/email-manager";

import { NAMESPACE, TASK_QUEUE_NAME } from "./shared";

// eslint-disable-next-line turbo/no-undeclared-env-vars
const { SENTRY_DSN } = process.env;
if (SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,
    integrations: [new ProfilingIntegration()],
    tracesSampleRate: 1.0,
    profilesSampleRate: 1.0,
  });
  console.info("Sentry initialized");
}

async function run() {
  const connection = await NativeConnection.connect({
    address: "localhost:7233",
    // TLS and gRPC metadata configuration goes here.
  });

  const worker = await Worker.create({
    connection,
    namespace: NAMESPACE,
    taskQueue: TASK_QUEUE_NAME,
    workflowsPath: require.resolve("@calcom/emails/email-workflow"),
    activities,
  });

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
