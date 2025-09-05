import handler from "@calcom/features/calAIPhone/phoneNumberSubscriptionWebhook";
import { defaultResponderForAppDir } from "app/api/defaultResponderForAppDir";

export const GET = defaultResponderForAppDir(handler);
