import { fetcher } from "@calcom/lib/dailyApiFetcher";

import { triggerNoShowPayloadSchema } from "./schema";

export const getMeetingSessionsFromRoomName = async (roomName: string) => {
  return fetcher(`/meetings?room=${roomName}`).then(triggerNoShowPayloadSchema.parse);
};
