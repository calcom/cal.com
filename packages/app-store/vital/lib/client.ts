import { VitalClient } from "@tryvital/vital-node";
import type { ClientConfig } from "@tryvital/vital-node/dist/lib/models";

import getAppKeysFromSlug from "../../_utils/getAppKeysFromSlug";

type VitalEnv = ClientConfig & {
  mode: string;
  webhook_secret: string;
};

export let vitalClient: VitalClient | null = null;
export let vitalEnv: VitalEnv | null = null;

export async function initVitalClient() {
  if (vitalClient) return;
  const appKeys = (await getAppKeysFromSlug("vital-automation")) as unknown as VitalEnv;
  if (
    typeof appKeys !== "object" ||
    typeof appKeys.client_id !== "string" ||
    typeof appKeys.client_secret !== "string" ||
    typeof appKeys.webhook_secret !== "string" ||
    typeof appKeys.region !== "string" ||
    typeof appKeys.mode !== "string"
  )
    throw Error("Missing properties in vital-automation DB keys");
  vitalEnv = appKeys;
  vitalClient = new VitalClient({
    region: appKeys.region,
    client_id: appKeys.client_id || "",
    client_secret: appKeys.client_secret || "",
    environment: (appKeys.mode as ClientConfig["environment"]) || "sandbox",
  });
}

export default vitalClient;
