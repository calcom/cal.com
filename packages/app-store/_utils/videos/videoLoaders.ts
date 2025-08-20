import { createCachedImport } from "../createCachedImport";

export const videoLoaders = {
  dailyvideo: createCachedImport(() => import("../../dailyvideo")),
  googlevideo: createCachedImport(() => import("../../googlevideo")),
  huddle01video: createCachedImport(() => import("../../huddle01video")),
  jellyconferencing: createCachedImport(() => import("../../jelly")),
  jitsivideo: createCachedImport(() => import("../../jitsivideo")),
  office365video: createCachedImport(() => import("../../office365video")),
  tandemvideo: createCachedImport(() => import("../../tandemvideo")),
  zoomvideo: createCachedImport(() => import("../../zoomvideo")),
  webexvideo: createCachedImport(() => import("../../webex")),
  sylapsvideo: createCachedImport(() => import("../../sylapsvideo")),
  shimmervideo: createCachedImport(() => import("../../shimmervideo")),
};

export type VideoLoaderKey = keyof typeof videoLoaders;
