import { createPagesRoute } from "@trigger.dev/nextjs";

import { client } from "@calcom/queues";
import "@calcom/queues/jobs";

// this route is used to send and receive data with Trigger.dev
let triggerRoute;
if (client) {
  triggerRoute = createPagesRoute(client);
}

export default triggerRoute;
