import type { NewCalendarEventType } from "@calcom/types/Calendar";

import type { VideoCallData } from "./VideoApiAdapter";

export type Event = NewCalendarEventType | VideoCallData;
