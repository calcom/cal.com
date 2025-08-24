import { createCachedImport } from "../createCachedImport";

const videoLoaders = {
  dailyvideo: createCachedImport(() => import("../../dailyvideo/lib")),
  googlevideo: createCachedImport(() => import("../../googlevideo")),
  huddle01video: createCachedImport(() => import("../../huddle01video/lib")),
  jellyconferencing: createCachedImport(() => import("../../jelly/lib")),
  jitsivideo: createCachedImport(() => import("../../jitsivideo/lib")),
  office365video: createCachedImport(() => import("../../office365video/lib")),
  tandemvideo: createCachedImport(() => import("../../tandemvideo/lib")),
  zoomvideo: createCachedImport(() => import("../../zoomvideo/lib")),
  webexvideo: createCachedImport(() => import("../../webex/lib")),
  sylapsvideo: createCachedImport(() => import("../../sylapsvideo/lib")),
  shimmervideo: createCachedImport(() => import("../../shimmervideo/lib")),
};

export type VideoLoaderKey = keyof typeof videoLoaders;

export default videoLoaders;
