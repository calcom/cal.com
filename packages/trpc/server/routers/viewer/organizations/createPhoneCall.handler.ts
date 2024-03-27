import type { z } from "zod";

import { checkRateLimitAndThrowError } from "@calcom/lib/checkRateLimitAndThrowError";
import type { AIPhoneSettingSchema } from "@calcom/prisma/zod-utils";
import type { TrpcSessionUser } from "@calcom/trpc/server/trpc";

type CreatePhoneCallProps = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: z.infer<typeof AIPhoneSettingSchema>;
};

const createPhoneCallHandler = async ({ input, ctx }: CreatePhoneCallProps) => {
  await checkRateLimitAndThrowError({
    rateLimitingType: "core",
    identifier: `createPhoneCall:${ctx.user.id}`,
  });

  const { yourPhoneNumber, numberToCall, guestName } = input;
  const options = {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.RETELL_AI_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      phone_number: { from: yourPhoneNumber, to: numberToCall },
      retell_llm_dynamic_variables: { name: guestName },
    }),
  };

  const res = await fetch("https://api.retellai.com/create-phone-call", options)
    .then((response) => response.json())
    .catch((err) => console.error(err));

  return res;
};

export default createPhoneCallHandler;
