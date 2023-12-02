import { createAppRoute } from "@trigger.dev/nextjs";

import { client } from "@calcom/queues";
import "@calcom/queues/jobs";

let triggerRoute: ReturnType<typeof createAppRoute> | undefined;

if (client) {
  triggerRoute = createAppRoute(client);
}

//this route is used to send and receive data with Trigger.dev
export const { POST, dynamic } = triggerRoute || {};

//uncomment this to set a higher max duration (it must be inside your plan limits). Full docs: https://vercel.com/docs/functions/serverless-functions/runtimes#max-duration
//export const maxDuration = 60;
