import { CalendarCheck, CalendarX } from "lucide-react";
import type { GetServerSidePropsContext, InferGetServerSidePropsType } from "next";
import { z } from "zod";

import { getLayout } from "@calcom/features/MainLayout";
import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import { ShellMain } from "@calcom/features/shell/Shell";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import type { BookingForwardingStatus } from "@calcom/prisma/enums";
import { EmptyScreen } from "@calcom/ui";

import PageWrapper from "@components/PageWrapper";

export default function BookingForwardingAction(
  props: InferGetServerSidePropsType<typeof getServerSideProps>
) {
  const { action } = props;
  const { t } = useLocale();
  return (
    <ShellMain
      heading={t("forward_request_feature_title")}
      subtitle={t("forward_request_feature_description")}>
      <EmptyScreen
        headline={t("booking_forwarding_request_title")}
        title={t("booking_forwarding_request_title")}
        description={
          action === "accept"
            ? t("success_accept_booking_forwarding")
            : t("success_reject_booking_forwarding")
        }
        Icon={action === "accept" ? CalendarCheck : CalendarX}
      />
      {action === "accept" ? (
        <input data-testid="success_reject_forwarding" type="hidden" />
      ) : (
        <input data-testid="success_accept_forwarding" type="number" />
      )}
    </ShellMain>
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
