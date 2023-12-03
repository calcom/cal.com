import type { GetServerSidePropsContext, InferGetServerSidePropsType } from "next";
import { z } from "zod";

import { getLayout } from "@calcom/features/MainLayout";
import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import type { BookingForwardingStatus } from "@calcom/prisma/enums";

import PageWrapper from "@components/PageWrapper";

export default function BookingForwardingAction(
  props: InferGetServerSidePropsType<typeof getServerSideProps>
) {
  const { action } = props;
  return (
    <div className="flex h-screen items-center justify-center">
      <div className="border-subtle mt-6 rounded-lg border p-6">
        <p className="mb-2 font-sans text-lg font-semibold">Booking Forwarding Request</p>
        <p className="font-sans text-sm">
          {action === "reject"
            ? "You have already rejected booking forwarding. ❌"
            : "You have already accepted booking forwarding. ✅"}
        </p>
      </div>
    </div>
  );
}

const zParams = z.object({
  action: z.string().optional(),
  uuid: z.string().optional(),
});

export const getServerSideProps = async (ctx: GetServerSidePropsContext) => {
  const prisma = await import("@calcom/prisma").then((mod) => mod.default);
  const session = await getServerSession(ctx);

  if (!session?.user?.id) {
    return { redirect: { permanent: false, destination: "/auth/login" } };
  }

  // Validate params
  const paramsSchema = zParams.safeParse(ctx?.params);
  if (!paramsSchema.success) {
    return { redirect: { permanent: false, destination: "/404" } };
  }

  // Fetch the bookingForwarding
  const bookingForwarding = await prisma.bookingForwarding.findFirst({
    select: {
      user: {
        select: {
          username: true,
        },
      },
      uuid: true,
      status: true,
    },
    where: { uuid: paramsSchema.data.uuid, toUserId: session?.user?.id },
  });

  if (!bookingForwarding) {
    return { redirect: { permanent: false, destination: "/404" } };
  }

  // update the bookingForwarding
  let activeStatus: BookingForwardingStatus = "PENDING";
  if (paramsSchema.data.action === "accept") {
    activeStatus = "ACCEPTED";
  } else {
    activeStatus = "REJECTED";
  }
  await prisma.bookingForwarding.update({
    where: { uuid: paramsSchema.data.uuid },
    data: { status: activeStatus },
  });

  return {
    props: {
      action: paramsSchema.data.action || null,
      username: bookingForwarding.user.username,
    },
  };
};

BookingForwardingAction.PageWrapper = PageWrapper;
BookingForwardingAction.getLayout = getLayout;
