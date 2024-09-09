import type { CalendarEvent } from "@calcom/types/Calendar";
import type { VideoApiAdapter } from "@calcom/types/VideoApiAdapter";
export interface DailyEventResult {
    id: string;
    name: string;
    api_created: boolean;
    privacy: string;
    url: string;
    created_at: string;
    config: Record<string, unknown>;
}
export interface DailyVideoCallData {
    type: string;
    id: string;
    password: string;
    url: string;
}
export declare const fetcher: (endpoint: string, init?: RequestInit | undefined) => Promise<unknown>;
export declare const fetcherShimmer: (endpoint: string, init?: RequestInit | undefined) => Promise<never[] | Response>;
export declare const postToShimmerAPI: (event: CalendarEvent, endpoint: string, body: Record<string, unknown>) => Promise<never[] | Response>;
declare const ShimmerDailyVideoApiAdapter: () => VideoApiAdapter;
export default ShimmerDailyVideoApiAdapter;
//# sourceMappingURL=VideoApiAdapter.d.ts.map