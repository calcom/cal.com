/**
 * @file
 * This module is supposed to instantiate the SDK with appropriate namespace
 */
import embedInit from "@calcom/embed-core/embed-iframe-init";
import { SdkActionManager } from "./sdk-action-manager";

export let sdkActionManager: SdkActionManager | null = null;
if (typeof window !== "undefined") {
  embedInit();
  sdkActionManager = new SdkActionManager(window.getEmbedNamespace());
}
