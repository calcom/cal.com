import { CalendarCheck, CalendarX } from "lucide-react";
import type { GetServerSidePropsContext, InferGetServerSidePropsType } from "next";
import { z } from "zod";

import { getLayout } from "@calcom/features/MainLayout";
import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import { ShellMain } from "@calcom/features/shell/Shell";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import type { BookingRedirectStatus } from "@calcom/prisma/enums";
import { EmptyScreen } from "@calcom/ui";

import PageWrapper from "@components/PageWrapper";

export default function BookingRedirectAction(props: InferGetServerSidePropsType<typeof getServerSideProps>) {
  const { action } = props;
  const { t } = useLocale();
  return (
    <ShellMain>
      <EmptyScreen
        headline={t("booking_redirect_request_title")}
        title={t("booking_redirect_request_title")}
        description={
          action === "accept" ? t("success_accept_booking_redirect") : t("success_reject_booking_redirect")
        }
        Icon={action === "accept" ? CalendarCheck : CalendarX}
      />
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

  // Fetch the bookingRedirect
  const bookingRedirect = await prisma.outOfOfficeEntry.findFirst({
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

  if (!bookingRedirect) {
    return { redirect: { permanent: false, destination: "/404" } };
  }

  // update the bookingRedirect
  let activeStatus: BookingRedirectStatus = "PENDING";
  if (paramsSchema.data.action === "accept") {
    activeStatus = "ACCEPTED";
  } else {
    activeStatus = "REJECTED";
  }
  await prisma.outOfOfficeEntry.update({
    where: { uuid: paramsSchema.data.uuid },
    data: { status: activeStatus },
  });

  return {
    props: {
      action: paramsSchema.data.action || null,
      username: bookingRedirect.user.username,
    },
  };
};

BookingRedirectAction.PageWrapper = PageWrapper;
BookingRedirectAction.getLayout = getLayout;
