import { defaultResponderForAppDir } from "app/api/defaultResponderForAppDir";

import handleSMSResponse from "@calcom/features/ee/workflows/api/handleSMSResponse";

export const POST = defaultResponderForAppDir(handleSMSResponse);
