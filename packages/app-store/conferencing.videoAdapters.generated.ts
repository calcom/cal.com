import * as DailyVideoAdapter from "./dailyvideo/lib/VideoApiAdapter";
import * as Huddle01VideoAdapter from "./huddle01video/lib/VideoApiAdapter";
import * as JellyVideoAdapter from "./jelly/lib/VideoApiAdapter";
import * as JitsiVideoAdapter from "./jitsivideo/lib/VideoApiAdapter";
import * as NextcloudTalkAdapter from "./nextcloudtalk/lib/VideoApiAdapter";
import * as Office365VideoAdapter from "./office365video/lib/VideoApiAdapter";
import * as ShimmerVideoAdapter from "./shimmervideo/lib/VideoApiAdapter";
import * as SylapsVideoAdapter from "./sylapsvideo/lib/VideoApiAdapter";
import * as TandemVideoAdapter from "./tandemvideo/lib/VideoApiAdapter";
import * as WebexVideoAdapter from "./webex/lib/VideoApiAdapter";
import * as ZoomVideoAdapter from "./zoomvideo/lib/VideoApiAdapter";

// Static imports for dynamic imports
export const ConferencingVideoAdapterMap = {
  dailyvideo: DailyVideoAdapter,
  huddle01video: Huddle01VideoAdapter,
  jelly: JellyVideoAdapter,
  jitsivideo: JitsiVideoAdapter,
  nextcloudtalk: NextcloudTalkAdapter,
  office365video: Office365VideoAdapter,
  shimmervideo: ShimmerVideoAdapter,
  sylapsvideo: SylapsVideoAdapter,
  tandemvideo: TandemVideoAdapter,
  webex: WebexVideoAdapter,
  zoomvideo: ZoomVideoAdapter,
};
