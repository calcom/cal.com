# queue-worker - A Temporal Worker application that processes tasks

This project is a Temporal application (worker) responsible for processing the workflows/tasks in the queue.

At the center of the queue system is Temporal. Temporal is an open-source software that gives you a programming model for building scalable and reliable software systems. Temporal is a mature technology that originated as a fork of Uber's Cadence. It is developed by Temporal Technologies, a startup by the creators of Cadence (and AWS Simple Workflow).

The `src/worker.ts` contains the Worker that process the tasks in the queue. It currently only uses the workflows in `@calcom/emails/email-workflow`. It can be extended to support more workflows and activities. To do that, you can import all the workflows and/or activities in one file/module, and re-export them from there. For example:

```ts
//workflows.ts
export * as email from "@calcom/emails/email-workflow";
export * as webhook from "@calcom/emails/webhook-workflow";
```

```ts
import * as activities from "./activities";

  const worker = await Worker.create({
    connection,
    namespace: NAMESPACE,
    taskQueue: TASK_QUEUE_NAME,
    workflowsPath: require.resolve("./workflows"),
    activities,
  });
```

## Pre-requisite

You need a Temporal server is needed to processes client requests. You can either use a self-hosted version, Temporal Cloud offering, or a local server.

For development, we're going to run a local temporal server using the `temporal` CLI. Use the command `brew install temporal` to install the Temporal CLI. For more installation options, check the temporal [documentation](https://docs.temporal.io/dev-guide/typescript/foundations#run-a-development-server).

> Follow the instructions in the official [docker-compose repository](https://github.com/temporalio/docker-compose) if you choose to self-host or run local server using docker-compose or k8s.

## Running The Code

> Make sure you've installed the dependencies before running any code/script in this repo.

The first step is to start run `temporal server start-dev` to start the Temporal Server. That will start a Temporal Server with an in-memory database.

> If you want to use use a persistent database, you can use the command `temporal server start-dev --db-filename calcom-temp.db` to run with SQLite database

Next, set up the environment variables. Create a `.env` and copy the content of `.env.example` to it. Replace the empty values with the correct values. The `DATABASE_URL` should be the same as what you specified in the root `.env` file.

Now start the worker using the `yarn run dev` command. This starts the worker process in *watch mode*, that means that the server restarts whenever you make changes to the file.

### Production Deployment

This is a Node.js application and can be deployed to any Cloud that supports Node.js runtime. You can also deploy it as a container and run it on any container supported platform (e.g Heroku) or host on a Kubernetes cluster.

<!-- TODO: create an optimised Dockerfile and provide instruction for running a container or running in k8s -->

### Testing

You can test the code using the command `yarn run test`. For the integration tests, ensure you specify the `DATABASE_URL` environment variable.

## Architecture

See the [architecture/proposal document](./Architecture.md)
