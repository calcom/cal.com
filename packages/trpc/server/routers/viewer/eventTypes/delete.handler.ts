import { prisma } from "@calcom/prisma";

import type { TrpcSessionUser } from "../../../trpc";
import type { TDeleteInputSchema } from "./delete.schema";
import handler, { CustomRequest } from "../../../../../features/bookings/lib/handleCancelBooking"


type DeleteOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
    req: CustomRequest
  };
  input: TDeleteInputSchema;
};

export const deleteHandler = async ({ ctx: _ctx, input }: DeleteOptions) => {
  const { id } = input;

  const event = await prisma.eventType.findFirst({
    where:{
      id,
    },
    select:{
      bookings:true
    }
  })
  
  
  if(event){

    for(let element of event.bookings){
        _ctx.req.body = { id : element.id , uid: element.uid}
        handler(_ctx.req)
    }

  }

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
