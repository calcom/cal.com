import handleSMSResponse from "@calcom/features/ee/workflows/api/handleSMSResponse";
import { defaultResponderForAppDir } from "app/api/defaultResponderForAppDir";

export const POST = defaultResponderForAppDir(handleSMSResponse);
