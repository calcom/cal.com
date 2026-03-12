import embedInit from "../iframe-entrypoint";
import type { EventChannel } from "./bus/channel";
import { setupFrameBus, getFrameBus } from "./iframe/bridge";

export let sdkActionManager: EventChannel | null = null;

if (typeof window !== "undefined") {
  embedInit();
  const embedNamespace = window.getEmbedNamespace();
  setupFrameBus(embedNamespace);
  sdkActionManager = getFrameBus();
}
