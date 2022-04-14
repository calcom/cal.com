import { metadata as metadataAppleCalendar } from "../applecalendar";
import { metadata as metadataCalDavCalendar } from "../caldavcalendar";
import { metadata as metadataDailyVideo } from "../dailyvideo";
import { metadata as metadataGoogleCalendar } from "../googlecalendar";
import { metadata as metadataGoogleVideo } from "../googlevideo";
import { metadata as metadataHuddleVideo } from "../huddle01video";
import { metadata as metadataJitsiVideo } from "../jitsivideo";
import { metadata as metadataOffice365Calendar } from "../office365calendar";
import { metadata as metadataOffice365Video } from "../office365video";
import { metadata as metadataSlackMessaging } from "../slackmessaging";
import { metadata as metadataStripePayment } from "../stripepayment";
import { metadata as metadataTandemVideo } from "../tandemvideo";
import { metadata as metadataWipeMYCalOther } from "../wipemycalother";
import { metadata as metadataZoomVideo } from "../zoomvideo";

const appStoreKeys = {
  applecalendar: {
    metadata: metadataAppleCalendar,
  },
  caldavcalendar: {
    metadata: metadataCalDavCalendar,
  },
  dailyvideo: {
    metadata: metadataDailyVideo,
  },
  googlecalendar: {
    metadata: metadataGoogleCalendar,
  },
  googlevideo: {
    metadata: metadataGoogleVideo,
  },
  huddle01video: {
    metadata: metadataHuddleVideo,
  },
  jitsivideo: {
    metadata: metadataJitsiVideo,
  },
  office365calendar: {
    metadata: metadataOffice365Calendar,
  },
  office365video: {
    metadata: metadataOffice365Video,
  },
  slackmessaging: {
    metadata: metadataSlackMessaging,
  },
  stripepayment: {
    metadata: metadataStripePayment,
  },
  tandemvideo: {
    metadata: metadataTandemVideo,
  },
  zoomvideo: {
    metadata: metadataZoomVideo,
  },
  wipemycalother: {
    metadata: metadataWipeMYCalOther,
  },
};
export { appStoreKeys };
