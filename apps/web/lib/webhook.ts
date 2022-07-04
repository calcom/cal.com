import { Webhook as PrismaWebhook } from "@prisma/client";

export type Webhook = PrismaWebhook & { prevState: null };
