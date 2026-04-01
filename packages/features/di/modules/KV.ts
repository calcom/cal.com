import { createKVAdapter } from "@calcom/kv/create-kv-adapter";
import { createModule } from "../di";
import { DI_TOKENS } from "../tokens";

const kvWebhookModule = createModule();

kvWebhookModule.bind(DI_TOKENS.KV_WEBHOOK_ADAPTER).toFactory(() => {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) {
    return createKVAdapter({ provider: "memory" });
  }
  return createKVAdapter({ provider: "upstash", url, token });
}, "singleton");

export { kvWebhookModule };
