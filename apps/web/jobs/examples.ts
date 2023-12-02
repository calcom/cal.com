import { eventTrigger } from "@trigger.dev/sdk";

import { client } from "../trigger";

// Your first job
// This Job will be triggered by an event, log a joke to the console, and then wait 5 seconds before logging the punchline.
client.defineJob({
  // This is the unique identifier for your Job, it must be unique across all Jobs in your project.
  id: "example-job",
  name: "Example Job: a joke with a delay",
  version: "0.0.1",
  // This is triggered by an event using eventTrigger. You can also trigger Jobs with webhooks, on schedules, and more: https://trigger.dev/docs/documentation/concepts/triggers/introduction
  trigger: eventTrigger({
    name: "example.event",
  }),
  run: async (payload, io, ctx) => {
    // Use a Task to generate a random number. Using a Tasks means it only runs once.
    const result = await io.runTask("generate-random-number", async () => {
      return {
        num: Math.floor(Math.random() * 10000),
      };
    });

    // Use the random number in a joke and log it to the console.
    await io.logger.info(`Why was the number ${result.num} afraid of the number 7?`);

    // Wait for 5 seconds, the second parameter is the number of seconds to wait, you can add delays of up to a year.
    await io.wait("Wait 5 seconds for the punchline...", 5);

    // Use a Task to display the answer. Tasks are important to use in all Jobs as they allow your Runs to resume again after e.g. a serverless function timeout. Learn more about Tasks in the docs: https://trigger.dev/docs/documentation/concepts/tasks
    await io.runTask(
      "task-example",
      async () => {
        return {
          foo: "bar",
        };
      },
      { name: `Answer: Because 7,8,9! And ${result.num} was next 🤦` }
    );
    await io.logger.info("✨ Congratulations, You just ran your first successful Trigger.dev Job! ✨");
    // To learn how to write much more complex (and probably funnier) Jobs, check out our docs: https://trigger.dev/docs/documentation/guides/create-a-job
  },
});
