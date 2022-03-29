/**
 * @file
 * This module is supposed to instantiate the SDK with appropriate namespace
 */
import { SdkActionManager } from "@calcom/embed-core/sdk-action-manager";

export let sdkActionManager: SdkActionManager | null = null;
if (typeof window !== "undefined") {
  sdkActionManager = new SdkActionManager(new URL(document.URL).searchParams.get("embed"));
}
