import { createPagesRoute } from "@trigger.dev/nextjs";

import { queue } from "@calcom/queues";
import "@calcom/queues/jobs";

// this route is used to send and receive data with Trigger.dev
let triggerRoute;
if (queue) {
  triggerRoute = createPagesRoute(queue);
}

export default triggerRoute;
