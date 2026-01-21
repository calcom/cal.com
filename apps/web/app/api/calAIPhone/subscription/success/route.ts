import { defaultResponderForAppDir } from "app/api/defaultResponderForAppDir";

import handler from "@calcom/features/calAIPhone/phoneNumberSubscriptionWebhook";

export const GET = defaultResponderForAppDir(handler);
