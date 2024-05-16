# Tasker

Tasker: "One who performs a task, as a day-laborer."

Task: "A function to be performed; an objective."

## What is it?

Introduces a new pattern called Tasker which may be switched out in the future for other third party services.

Also introduces a base `InternalTasker` which doesn't require third party dependencies and should work out of the box (by configuring a proper cron).

## Why is this needed?

The Tasker pattern is needed to streamline the execution of non-critical tasks in an application, providing a structured approach to task scheduling, execution, retrying, and cancellation. Here's why it's necessary:

1. **Offloading non-critical tasks**: There are tasks that don't need to be executed immediately on the main thread, such as sending emails, generating reports, or performing periodic maintenance tasks. Offloading these tasks to a separate queue or thread improves the responsiveness and efficiency of the main application.

2. **Retry mechanism**: Not all tasks succeed on the first attempt due to errors or external dependencies. This pattern incorporates a retry mechanism, which allows failed tasks to be retried automatically for a specified number of attempts. This improves the robustness of the system by handling temporary failures gracefully.

3. **Scheduled task execution**: Some tasks need to be executed at a specific time or after a certain delay. The Tasker pattern facilitates scheduling tasks for future execution, ensuring they are performed at the designated time without manual intervention.

4. **Task cancellation**: Occasionally, it's necessary to cancel a scheduled task due to changing requirements or user actions. The Tasker pattern supports task cancellation, enabling previously scheduled tasks to be revoked or removed from the queue before execution.

5. **Flexible implementation**: The Tasker pattern allows for flexibility in implementation by providing a base structure (`InternalTasker`) that can be extended or replaced with third-party services (`TriggerDevTasker`, `AwsSqsTasker`, etc.). This modularity ensures that the task execution mechanism can be adapted to suit different application requirements or environments.

Overall, the Tasker pattern enhances the reliability, performance, and maintainability by managing non-critical tasks in a systematic and efficient manner. It abstracts away the complexities of task execution, allowing developers to focus on core application logic while ensuring timely and reliable execution of background tasks.

## How does it work?

Since the Tasker is a pattern on itself, it will depend on the actual implementation. For example, a `TriggerDevTasker` will work very differently from an `AwsSqsTasker`.

For simplicity sake will explain how the `InternalTasker` works:

- Instead of running a non-critical task you schedule using the tasker:

  ```diff
  const examplePayload = { example: "payload" };
  - await sendWebhook(examplePayload);
  + await tasker.create("sendWebhook", JSON.stringify(examplePayload));
  ```

- This will create a new task to be run on the next processing of the task queue.
- Then on the next cron run it will be picked up and executed:

  ```ts
  // /app/api/tasks/cron/route.ts
  import tasker from "@calcom/features/tasker";

  export async function GET() {
    // authenticate the call...
    await tasker.processQueue();
    return Response.json({ success: true });
  }
  ```

- By default, the cron will run each minute and will pick the next 100 tasks to be executed.
- If the tasks succeeds, it will be marked as `suceededAt: new Date()`. If if fails, the `attempts` prop will increase by 1 and will be retried on the next cron run.
- If `attempts` reaches `maxAttemps`, it will be considered a failed and won't be retried again.
- By default, tasks will be attempted up to 3 times. This can be overridden when creating a task.
- From here we can either keep a record of executed tasks, or we can setup another cron to cleanup all successful and failed tasks:

  ```ts
  // /app/api/tasks/cleanup/route.ts
  import tasker from "@calcom/features/tasker";

  export async function GET() {
    // authenticate the call...
    await tasker.cleanup();
    return Response.json({ success: true });
  }
  ```

- This will delete all failed and successful tasks.
- A task is just a simple function receives a payload:

  ```ts
  type TaskHandler = (payload: string) => Promise<void>;
  ```

## How to contribute?

You can contribute by either expanding the `InternalTasker` or creating new Taskers. To see how to add new Taskers, see the `tasker-factory.ts` file.

You can also take some inspiration by looking into previous attempts to add various Message Queue pull requests:

- [feat: Messaging Bus Implementation using AWS SQS OSSHack Challenge](https://github.com/calcom/cal.com/pull/12663)
- [feat: add opt-in ready-to-deploy message queue (QStash+Next.js functions)](https://github.com/calcom/cal.com/pull/12658)
- [feat: Implement A Message Queuing System](https://github.com/calcom/cal.com/pull/12655)
- [Message Queuing System](https://github.com/calcom/cal.com/pull/12654)
- [feat: Message Queuing System using Trigger.dev](https://github.com/calcom/cal.com/pull/12641)
