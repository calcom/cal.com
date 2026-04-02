import { prisma } from "@calcom/prisma";
import type { TrpcSessionUser } from "../../../types";
import type { TDeleteInputSchema } from "./delete.schema";

type DeleteOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TDeleteInputSchema;
};

export const deleteHandler = async ({ ctx: _ctx, input }: DeleteOptions) => {
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

  return {
    id,
  };
};
