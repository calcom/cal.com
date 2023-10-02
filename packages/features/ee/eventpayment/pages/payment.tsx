import type { Payment } from "@prisma/client";
import type { GetServerSidePropsContext } from "next";
import { z } from "zod";

import prisma from "@calcom/prisma";
import { EventTypeMetaDataSchema } from "@calcom/prisma/zod-utils";
import type { inferSSRProps } from "@calcom/types/inferSSRProps";
import { ssrInit } from "@calcom/web/server/lib/ssr";

export type PaymentPageProps = inferSSRProps<typeof getServerSideProps>;

const querySchema = z.object({
  uid: z.string(),
});

export const getServerSideProps = async (context: GetServerSidePropsContext) => {
  const ssr = await ssrInit(context);
  const { uid } = querySchema.parse(context.query);
  const rawPayment = await prisma.payments.findFirst({
    where: {
      uid,
    },
    select: {
      data: true,
      success: true,
      uid: true,
      refunded: true,
      eventId: true,
      amount: true,
      currency: true,
      paymentOption: true,
      event: {
        select: {
          id: true,
          title: true,
          description: true,
          length: true,
          eventName: true,
          requiresConfirmation: true,
          userId: true,
          metadata: true,
          users: {
            select: {
              name: true,
              username: true,
              hideBranding: true,
              theme: true,
            },
          },
          team: {
            select: {
              name: true,
              hideBranding: true,
            },
          },
          price: true,
          currency: true,
          successRedirectUrl: true,
        },
      },
    },
  });

  if (!rawPayment) return { notFound: true };

  const { data, event: _event, ...restPayment } = rawPayment;

  const payment = {
    ...restPayment,
    data: data as Record<string, unknown>,
  };
  if (!_event) return { notFound: true };

  // const { startTime, endTime, eventType, ...restBooking } = _booking;

  // if (!eventType) return { notFound: true };

  const [user] = _event.users;
  if (!user) return { notFound: true };
  const profile = {
    name: _event.team?.name || user?.name || null,
    theme: (!_event.team?.name && user?.theme) || null,
    hideBranding: _event.team?.hideBranding || user?.hideBranding || null,
  };

  // if (
  //   ([BookingStatus.CANCELLED, BookingStatus.REJECTED] as BookingStatus[]).includes(
  //     booking.status as BookingStatus
  //   )
  // ) {
  //   return {
  //     redirect: {
  //       destination: `/booking/${booking.uid}`,
  //       permanent: false,
  //     },
  //   };
  // }

  return {
    props: {
      user,
      eventType: {
        ..._event,
        metadata: EventTypeMetaDataSchema.parse(_event.metadata),
        uid: uid,
      },
      trpcState: ssr.dehydrate(),
      payment,
      clientSecret: getClientSecretFromPayment(payment),
      profile,
    },
  };
};

function hasStringProp<T extends string>(x: unknown, key: T): x is { [key in T]: string } {
  return !!x && typeof x === "object" && key in x;
}

function getClientSecretFromPayment(
  payment: Omit<Partial<Payment>, "data"> & { data: Record<string, unknown> }
) {
  if (
    payment.paymentOption === "HOLD" &&
    hasStringProp(payment.data, "setupIntent") &&
    hasStringProp(payment.data.setupIntent, "client_secret")
  ) {
    return payment.data.setupIntent.client_secret;
  }
  if (hasStringProp(payment.data, "client_secret")) {
    return payment.data.client_secret;
  }
  return "";
}
