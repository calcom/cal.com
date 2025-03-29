import type { EventType } from "@calcom/prisma/client";
import type { NewCalendarEventType, AdditionalInformation } from "@calcom/types/Calendar";

import type { CrmData } from "./CrmService";
import type { VideoCallData } from "./VideoApiAdapter";

export type Event = AdditionalInformation | NewCalendarEventType | VideoCallData | CrmData;

export type PeriodData = Pick<
  EventType,
  "periodType" | "periodStartDate" | "periodEndDate" | "periodDays" | "periodCountCalendarDays"
>;
