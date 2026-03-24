import { CalIdContactRepository } from "@calcom/lib/server/repository/calIdContact";

import { TRPCError } from "@trpc/server";

import type { TrpcSessionUser } from "../../../types";
import type { TCalIdContactsGetMeetingsByContactIdInputSchema } from "./getMeetingsByContactId.schema";

type GetMeetingsByContactIdOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TCalIdContactsGetMeetingsByContactIdInputSchema;
};

export const getMeetingsByContactIdCalIdContactsHandler = async ({
  ctx,
  input,
}: GetMeetingsByContactIdOptions) => {
  const repository = new CalIdContactRepository();

  const result = await repository.listMeetingsByContactId({
    contactId: input.contactId,
    userId: ctx.user.id,
    limit: input.limit,
  });

  if (!result) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Contact not found",
    });
  }

  return {
    rows: result.rows,
    meta: {
      totalRowCount: result.rows.length,
      limit: input.limit,
    },
  };
};
