import type { VideoApiAdapterFactory } from "@calcom/types/VideoApiAdapter";

export interface VideoApp {
  lib: {
    VideoApiAdapter: VideoApiAdapterFactory;
  };
}
