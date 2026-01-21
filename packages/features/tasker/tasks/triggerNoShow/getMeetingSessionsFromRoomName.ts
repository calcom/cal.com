import { fetcher } from "@calcom/app-store/dailyvideo/lib/dailyApiFetcher";

import { triggerNoShowPayloadSchema } from "./schema";

export const getMeetingSessionsFromRoomName = async (roomName: string) => {
  return fetcher(`/meetings?room=${roomName}`).then(triggerNoShowPayloadSchema.parse);
};
