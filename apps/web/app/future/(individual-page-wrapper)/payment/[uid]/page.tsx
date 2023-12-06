import { ssrInit } from "app/_trpc/ssrInit";
import type { Params } from "app/_types";
import { _generateMetadata } from "app/_utils";
import { cookies, headers } from "next/headers";
import { redirect, notFound } from "next/navigation";
import { z } from "zod";

import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import PaymentPage from "@calcom/features/ee/payments/components/PaymentPage";
import { getClientSecretFromPayment } from "@calcom/features/ee/payments/pages/getClientSecretFromPayment";
import { APP_NAME } from "@calcom/lib/constants";
import prisma from "@calcom/prisma";
import { BookingStatus } from "@calcom/prisma/enums";
import { EventTypeMetaDataSchema } from "@calcom/prisma/zod-utils";

import PageWrapper from "@components/PageWrapperAppDir";

export const generateMetadata = async () =>
  await _generateMetadata(
    // the title does not contain the eventName as in the legacy page
    (t) => `${t("payment")} | ${APP_NAME}`,
    () => ""
  );

const querySchema = z.object({
  uid: z.string(),
});

async function getData(params: Params) {
  const req = { headers: headers(), cookies: cookies() };

  const session = await getServerSession({ req });

  if (!session?.user?.id) {
    return redirect("/auth/login");
  }

  const ssr = await ssrInit();
  await ssr.viewer.me.prefetch();

  const { uid } = querySchema.parse(params);
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
            },
          },
        },
      },
    },
  });

  if (!rawPayment) {
    return notFound();
  }

  const { data, booking: _booking, ...restPayment } = rawPayment;

  const payment = {
    ...restPayment,
    data: data as Record<string, unknown>,
  };

  if (!_booking) {
    return notFound();
  }

  const { startTime, endTime, eventType, ...restBooking } = _booking;
  const booking = {
    ...restBooking,
    startTime: startTime.toString(),
    endTime: endTime.toString(),
  };

  if (!eventType) {
    return notFound();
  }

  if (eventType.users.length === 0 && !!!eventType.team) {
    return notFound();
  }

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
    return redirect(`/booking/${booking.uid}`);
  }

  return {
    user,
    eventType: {
      ...eventType,
      metadata: EventTypeMetaDataSchema.parse(eventType.metadata),
    },
    booking,
    trpcState: await ssr.dehydrate(),
    payment,
    clientSecret: getClientSecretFromPayment(payment),
    profile,
  };
}

type PageProps = Readonly<{
  params: Params;
}>;

export default async function Page({ params }: PageProps) {
  const props = await getData(params);

  const h = headers();
  const nonce = h.get("x-nonce") ?? undefined;

  return (
    <PageWrapper getLayout={null} requiresLicense={false} nonce={nonce} themeBasis={null} {...props}>
      <PaymentPage {...props} />
    </PageWrapper>
  );
}
