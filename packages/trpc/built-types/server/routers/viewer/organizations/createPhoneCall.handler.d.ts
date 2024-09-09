import type { z } from "zod";
import type { createPhoneCallSchema } from "@calcom/features/ee/cal-ai-phone/zod-utils";
import type { PrismaClient } from "@calcom/prisma";
import type { TrpcSessionUser } from "@calcom/trpc/server/trpc";
type CreatePhoneCallProps = {
    ctx: {
        user: NonNullable<TrpcSessionUser>;
        prisma: PrismaClient;
    };
    input: z.infer<typeof createPhoneCallSchema>;
};
declare const createPhoneCallHandler: ({ input, ctx }: CreatePhoneCallProps) => Promise<z.objectOutputType<{
    call_id: z.ZodString;
    agent_id: z.ZodString;
}, z.ZodTypeAny, "passthrough">>;
export default createPhoneCallHandler;
