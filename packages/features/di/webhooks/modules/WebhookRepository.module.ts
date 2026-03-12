import type { ModuleLoader } from "@calcom/features/di/di";
import { moduleLoader as prismaModuleLoader } from "../../modules/Prisma";
import { WEBHOOK_TOKENS } from "../Webhooks.tokens";
import { webhookModule } from "./Webhook.module";

const token = WEBHOOK_TOKENS.WEBHOOK_REPOSITORY;

/**
 * ModuleLoader for the WebhookRepository.
 *
 * Reuses the existing webhookModule which already binds WEBHOOK_REPOSITORY
 * along with its dependencies (Prisma, EventTypeRepository, UsersRepository).
 */
export const moduleLoader = {
  token,
  loadModule(container) {
    // Ensure Prisma is loaded (required by webhookModule bindings)
    prismaModuleLoader.loadModule(container);
    // Load webhook module which binds WEBHOOK_REPOSITORY and its cross-table dependencies
    container.load(WEBHOOK_TOKENS.WEBHOOK_EVENT_TYPE_REPOSITORY, webhookModule);
    container.load(WEBHOOK_TOKENS.WEBHOOK_USER_REPOSITORY, webhookModule);
    container.load(WEBHOOK_TOKENS.WEBHOOK_REPOSITORY, webhookModule);
  },
} satisfies ModuleLoader;
