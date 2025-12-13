import type { Module } from "@evyweb/ioctopus";

import { kyselyRead, kyselyWrite } from "@calcom/kysely";

import { KyselyWebhookRepository } from "../../webhooks/lib/repository/KyselyWebhookRepository";
import { DI_TOKENS } from "../tokens";

export function webhookRepositoryModuleLoader(): Module {
  return (container) => {
    container.bind(DI_TOKENS.WEBHOOK_REPOSITORY).toValue(new KyselyWebhookRepository(kyselyRead, kyselyWrite));
  };
}
