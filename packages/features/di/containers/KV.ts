import type { KVAdapter } from "@calcom/kv/kv-adapter";

import { type Container, createContainer } from "../di";
import { kvWebhookModule } from "../modules/KV";
import { DI_TOKENS } from "../tokens";

const container: Container = createContainer();
container.load(DI_TOKENS.KV_WEBHOOK_ADAPTER, kvWebhookModule);

export function getKV(): KVAdapter {
  return container.get<KVAdapter>(DI_TOKENS.KV_WEBHOOK_ADAPTER);
}
