import { IS_DEV, ONEHASH_API_KEY, ONEHASH_CHAT_SYNC_BASE_URL } from "@calcom/lib/constants";
import { isPrismaObjOrUndefined } from "@calcom/lib/isPrismaObj";
import { prisma } from "@calcom/prisma";

import type { TrpcSessionUser } from "../../../types";
import type { TDeleteInputSchema } from "./delete.schema";

type DeleteOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TDeleteInputSchema;
};

export const deleteHandler = async ({ ctx, input }: DeleteOptions) => {
  const { id } = input;

  await prisma.eventTypeCustomInput.deleteMany({
    where: {
      eventTypeId: id,
    },
  });

  await prisma.eventType.delete({
    where: {
      id,
    },
  });
  if (isPrismaObjOrUndefined(ctx.user.metadata)?.connectedChatAccounts) {
    await handleOHChatSync(id, ctx.user.id);
  }
  return {
    id,
  };
};

const handleOHChatSync = async (eventUid: number, userId: number) => {
  if (IS_DEV) return Promise.resolve();

  const credentials = await prisma.credential.findMany({
    where: {
      appId: "onehash-chat",
      userId,
    },
  });

  if (credentials.length == 0) return Promise.resolve();

  const account_user_ids: string[] = credentials.reduce<string[]>((acc, cred) => {
    const accountUserId = isPrismaObjOrUndefined(cred.key)?.account_user_id as number | undefined;
    if (accountUserId !== undefined) {
      acc.push(String(accountUserId));
    }
    return acc;
  }, []);

  if (account_user_ids.length === 0) return Promise.resolve();
  const queryParams = new URLSearchParams({
    account_user_ids: account_user_ids.join(","),
    uids: String(eventUid),
  });

  await fetch(`${ONEHASH_CHAT_SYNC_BASE_URL}/cal_event?${queryParams}`, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${ONEHASH_API_KEY}`,
    },
  });
};
