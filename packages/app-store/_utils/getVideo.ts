import { VideoApiAdapterMap } from "@calcom/app-store/video.apps.generated";
import type { VideoApiAdapter, VideoApiAdapterFactory } from "@calcom/types/VideoApiAdapter";

// factory
export const getVideoAdapters = async (withCredentials: CredentialPayload[]): Promise<VideoApiAdapter[]> => {
  const videoAdapters: VideoApiAdapter[] = [];

  for (const cred of withCredentials) {
    const appName = cred.type.split("_").join(""); // Transform `zoom_video` to `zoomvideo`;
    log.silly("Getting video adapter for", safeStringify({ appName, cred: getPiiFreeCredential(cred) }));

    const appImportFn = VideoApiAdapterMap[appName as keyof typeof VideoApiAdapterMap];

    // Static Link Video Apps don't exist in packages/app-store/index.ts(it's manually maintained at the moment) and they aren't needed there anyway.
    const app = appImportFn ? await appImportFn() : null;

    if (!app) {
      log.error(`Couldn't get adapter for ${appName}`);
      continue;
    }

    if ("lib" in app && "VideoApiAdapter" in app.lib) {
      const makeVideoApiAdapter = app.lib.VideoApiAdapter as VideoApiAdapterFactory;
      const videoAdapter = makeVideoApiAdapter(cred);
      videoAdapters.push(videoAdapter);
    } else {
      log.error(`App ${appName} doesn't have 'lib.VideoApiAdapter' defined`);
    }
  }

  return videoAdapters;
};
