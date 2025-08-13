import SMSWebhookHandler from "@calid/features/modules/workflows/api/webhook/smsWebhookHandler";
import { defaultResponderForAppDir } from "app/api/defaultResponderForAppDir";

export const POST = defaultResponderForAppDir(SMSWebhookHandler);
