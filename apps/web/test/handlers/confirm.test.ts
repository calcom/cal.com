import { prisma } from "@prisma/client";
import appstore from "@calcom/app-store";
import { senddeclinedemails } from "@calcom/emails";
import { getcaleventresponses } from "@calcom/features/bookings/lib/getcaleventresponses";
import { handleconfirmation } from "@calcom/features/bookings/lib/handleconfirmation";
import { handlewebhooktrigger } from "@calcom/features/bookings/lib/handlewebhooktrigger";
import type { eventtypeinfo } from "@calcom/features/webhooks/lib/sendpayload";
import { isprismaobjorundefined, parserecurringevent } from "@calcom/lib";
import { getteamidfromeventtype } from "@calcom/lib/getteamidfromeventtype";
import { gettranslation } from "@calcom/lib/server";
import { getuserscredentials } from "@calcom/lib/server/getuserscredentials";
import { gettimeformatstringfromusertimeformat } from "@calcom/lib/timeformat";
import { prisma } from "@calcom/prisma";
import { bookingstatus, membershiprole, schedulingtype, webhooktriggerevents } from "@calcom/prisma/enums";
import type { calendarevent } from "@calcom/types/calendar";
import type { iabstractpaymentservice, paymentapp } from "@calcom/types/paymentservice";
import { trpcerror } from "@trpc/server";
import type { trpcsessionuser } from "../../../trpc";
import type { tconfirminputschema } from "./confirm.schema";
import type { bookingsprocedurecontext } from "./util";

type confirmoptions = {
  ctx: {
    user: nonnullable<trpcsessionuser>;
  } & bookingsprocedurecontext;
  input: tconfirminputschema;
};

export const confirmhandler = async ({ ctx, input }: confirmoptions) => {
  const { user } = ctx;
  const { bookingid, recurringeventid, reason: rejectionreason, confirmed } = input;

  const torganizer = await gettranslation(user.locale ?? "en", "common");

  const booking = await prisma.booking.finduniqueorthrow({
    where: {
      id: bookingid,
    },
    select: {
      title: true,
      description: true,
      custominputs: true,
      starttime: true,
      endtime: true,
      attendees: true,
      eventtypeid: true,
      responses: true,
      metadata: true,
      eventtype: {
        select: {
          id: true,
          owner: true,
          teamid: true,
          recurringevent: true,
          title: true,
          slug: true,
          requiresconfirmation: true,
          currency: true,
          length: true,
          description: true,
          price: true,
          bookingfields: true,
          disableguests: true,
          metadata: true,
          workflows: {
            include: {
              workflow: {
                include: {
                  steps: true,
                },
              },
            },
          },
          custominputs: true,
          parentid: true,
        },
      },
      location: true,
      userid: true,
      id: true,
      uid: true,
      payment: true,
      destinationcalendar: true,
      paid: true,
      recurringeventid: true,
      status: true,
      smsremindernumber: true,
      scheduledjobs: true,
    },
  });

  if (booking.userid !== user.id && booking.eventtypeid) {
    // only query database when it is explicitly required.
    const eventtype = await prisma.eventtype.findfirst({
      where: {
        id: booking.eventtypeid,
        schedulingtype: schedulingtype.collective,
      },
      select: {
        users: true,
      },
    });

    if (eventtype && !eventtype.users.find((user) => booking.userid === user.id)) {
      throw new trpcerror({ code: "unauthorized", message: "unauthorized" });
    }
  }


  // this is to avoid exposing extra information to the requester.
  if (booking.status === bookingstatus.accepted) {
    throw new trpcerror({ code: "bad_request", message: "booking already confirmed" });
  }

  // if booking requires payment and is not paid, don't allow confirmation
 if (confirmed && booking.payment.length > 0 && !booking.paid) {
  await prisma.booking.update({
    where: {
      id: booking.id
    },
    data: {
      status: bookingstatus.accepted
    }
  })
}
   
