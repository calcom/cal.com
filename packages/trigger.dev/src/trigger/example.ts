import { logger, task, wait } from "@trigger.dev/sdk/v3";

import prisma from "@calcom/prisma";

export const helloWorldTask = task({
  id: "hello-world",
  // Set an optional maxDuration to prevent tasks from running indefinitely
  maxDuration: 300, // Stop executing after 300 secs (5 mins) of compute
  run: async (payload: any, { ctx }) => {
    logger.log("Hello, world!", { payload, ctx });

    const booking = await prisma.booking.findFirst({
      where: {
        id: 1,
      },
    });

    logger.log("booking", booking ?? {});

    await wait.for({ seconds: 5 });

    return {
      message: "Hello, world!",
    };
  },
});
