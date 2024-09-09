import type { AdditionalInformation, AppsStatus } from "@calcom/types/Calendar";
import type { EventResult } from "@calcom/types/EventManager";
import type { ReqAppsStatus, Booking } from "./types";
export declare function handleAppsStatus(results: EventResult<AdditionalInformation>[], booking: (Booking & {
    appsStatus?: AppsStatus[];
}) | null, reqAppsStatus: ReqAppsStatus): AppsStatus[];
//# sourceMappingURL=handleAppsStatus.d.ts.map