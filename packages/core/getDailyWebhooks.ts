import { getDailyAppKeys } from "@calcom/app-store/dailyvideo/lib/getDailyAppKeys";

import { getVideoAdapters } from "./videoClient";

export const getDailyWebhooks = async () => {
  let dailyAppKeys: Awaited<ReturnType<typeof getDailyAppKeys>>;
  try {
    dailyAppKeys = await getDailyAppKeys();
  } catch (e) {
    console.error("Error: Cal video provider is not installed.");
    return;
  }
  const [videoAdapter] = await getVideoAdapters([
    {
      id: 0,
      appId: "daily-video",
      type: "daily_video",
      userId: null,
      user: { email: "" },
      teamId: null,
      key: dailyAppKeys,
      invalid: false,
    },
  ]);

  return videoAdapter?.getWebhooks?.();
};
