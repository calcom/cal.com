import { task } from "@trigger.dev/sdk/v3";

import { createTask as bookingListenerCreate } from "./bookingListener/create";

export const bookingListenerCreateTask = task({
  id: "bookingListener-create",
  run: async (payload: any, { ctx }) => {
    bookingListenerCreate(payload);
  },
});
