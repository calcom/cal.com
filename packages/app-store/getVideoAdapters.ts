import { VideoApiAdapterMap } from "@calcom/app-store/video.adapters.generated";
import logger from "@calcom/lib/logger";
import { getPiiFreeCredential } from "@calcom/lib/piiFreeData";
import { safeStringify } from "@calcom/lib/safeStringify";
import type { CredentialPayload } from "@calcom/types/Credential";
import type { VideoApiAdapter, VideoApiAdapterFactory } from "@calcom/types/VideoApiAdapter";

const log = logger.getSubLogger({ prefix: ["[app-store] getVideoAdapters"] });

// factory
export const getVideoAdapters = async (withCredentials: CredentialPayload[]): Promise<VideoApiAdapter[]> => {
  const videoAdapters: VideoApiAdapter[] = [];

  for (const cred of withCredentials) {
    const appName = cred.type.split("_").join(""); // Transform `zoom_video` to `zoomvideo`;
    log.silly("Getting video adapter for", safeStringify({ appName, cred: getPiiFreeCredential(cred) }));

    let videoAdapterImport = VideoApiAdapterMap[appName as keyof typeof VideoApiAdapterMap];

    // fallback: transforms zoom_video to zoom
    if (!videoAdapterImport) {
      const appTypeVariant = cred.type.substring(0, cred.type.lastIndexOf("_"));
      log.silly(`Adapter not found for ${appName}, trying fallback ${appTypeVariant}`);

      videoAdapterImport = VideoApiAdapterMap[appTypeVariant as keyof typeof VideoApiAdapterMap];
    }

    if (!videoAdapterImport) {
      log.error(`Couldn't get adapter for ${appName}`);
      continue;
    }

    const videoAdapterModule = await videoAdapterImport;
    const makeVideoApiAdapter = videoAdapterModule.default as VideoApiAdapterFactory;

    if (makeVideoApiAdapter) {
      const videoAdapter = makeVideoApiAdapter(cred);
      videoAdapters.push(videoAdapter);
    } else {
      log.error(`App ${appName} doesn't have a default VideoApiAdapter export`);
    }
  }

  return videoAdapters;
};
