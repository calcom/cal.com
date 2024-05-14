import type { GetServerSidePropsContext } from "next";
import { z } from "zod";

import { getClientSecretFromPayment } from "@calcom/features/ee/payments/pages/getClientSecretFromPayment";
import prisma from "@calcom/prisma";
import { BookingStatus } from "@calcom/prisma/enums";
import { EventTypeMetaDataSchema } from "@calcom/prisma/zod-utils";
import type { inferSSRProps } from "@calcom/types/inferSSRProps";

import { ssrInit } from "../../../../../apps/web/server/lib/ssr";

export type PaymentPageProps = inferSSRProps<typeof getServerSideProps>;

const querySchema = z.object({
  uid: z.string(),
});

export const getServerSideProps = async (context: GetServerSidePropsContext) => {
  const ssr = await ssrInit(context);

  const { uid } = querySchema.parse(context.query);
  const rawPayment = await prisma.payment.findFirst({
    where: {
      uid,
    },
    select: {
      data: true,
      success: true,
      uid: true,
      refunded: true,
      bookingId: true,
      appId: true,
      amount: true,
      currency: true,
      paymentOption: true,
      booking: {
        select: {
          id: true,
          uid: true,
          description: true,
          title: true,
          startTime: true,
          endTime: true,
          attendees: {
            select: {
              email: true,
              name: true,
            },
          },
          eventTypeId: true,
          location: true,
          status: true,
          rejectionReason: true,
          cancellationReason: true,
          eventType: {
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
              forwardParamsSuccessRedirect: true,
            },
          },
        },
      },
    },
  });

  if (!rawPayment) return { notFound: true } as const;

  const { data, booking: _booking, ...restPayment } = rawPayment;

  const payment = {
    ...restPayment,
    data: data as Record<string, unknown>,
  };

  if (!_booking) return { notFound: true } as const;

  const { startTime, endTime, eventType, ...restBooking } = _booking;
  const booking = {
    ...restBooking,
    startTime: startTime.toString(),
    endTime: endTime.toString(),
  };

  if (!eventType) return { notFound: true } as const;

  if (eventType.users.length === 0 && !!!eventType.team) return { notFound: true } as const;

  const [user] = eventType?.users.length
    ? eventType.users
    : [{ name: null, theme: null, hideBranding: null, username: null }];
  const profile = {
    name: eventType.team?.name || user?.name || null,
    theme: (!eventType.team?.name && user?.theme) || null,
    hideBranding: eventType.team?.hideBranding || user?.hideBranding || null,
  };

  if (
    ([BookingStatus.CANCELLED, BookingStatus.REJECTED] as BookingStatus[]).includes(
      booking.status as BookingStatus
    )
  ) {
    return {
      redirect: {
        destination: `/booking/${booking.uid}`,
        permanent: false,
      },
    };
  }

  return {
    props: {
      user,
      eventType: {
        ...eventType,
        metadata: EventTypeMetaDataSchema.parse(eventType.metadata),
      },
      booking,
      trpcState: ssr.dehydrate(),
      payment,
      clientSecret: getClientSecretFromPayment(payment),
      profile,
    },
  };
};
