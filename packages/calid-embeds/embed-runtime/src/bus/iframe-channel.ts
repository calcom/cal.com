import { EventChannel } from "./channel";

let activeChannel: EventChannel | null = null;

export function createIframeChannel(ns: string | null): void {
  activeChannel = new EventChannel(ns);
}

export function getIframeChannel(): EventChannel | null {
  return activeChannel;
}
