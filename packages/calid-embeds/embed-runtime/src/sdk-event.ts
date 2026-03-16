import embedInit from "../iframe-entrypoint";
import type { EventChannel } from "./bus/channel";
import { setupFrameBus, getFrameBus } from "./iframe/bridge";

export let sdkActionManager: EventChannel | null = null;

if (typeof window !== "undefined") {
  embedInit();
  const embedNamespace = window.getEmbedNamespace();
  setupFrameBus(embedNamespace);
  sdkActionManager = getFrameBus();
  if (sdkActionManager) {
    // Compatibility aliases for external callers expecting fire/on.
    const manager = sdkActionManager as EventChannel & {
      fire?: (eventName: any, payload?: any) => void;
      on?: (eventName: any, handler: (e: CustomEvent<any>) => void) => void;
    };
    if (!manager.fire) manager.fire = (eventName, payload) => manager.publish(eventName, payload);
    if (!manager.on) manager.on = (eventName, handler) => manager.listen(eventName, handler);
  }
}
