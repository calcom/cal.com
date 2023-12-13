import OldPage from "@pages/video/[uid]";
import { ssrInit } from "app/_trpc/ssrInit";
import { type Params } from "app/_types";
import { _generateMetadata } from "app/_utils";
import MarkdownIt from "markdown-it";
import { type GetServerSidePropsContext } from "next";
import { headers, cookies } from "next/headers";
import { redirect } from "next/navigation";

import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import { APP_NAME } from "@calcom/lib/constants";
import prisma, { bookingMinimalSelect } from "@calcom/prisma";

import { buildLegacyCtx } from "@lib/buildLegacyCtx";

import PageWrapper from "@components/PageWrapperAppDir";

export const generateMetadata = async () =>
  await _generateMetadata(
    () => `${APP_NAME} Video`,
    (t) => t("quick_video_meeting")
  );

type PageProps = Readonly<{
  params: Params;
}>;

const md = new MarkdownIt("default", { html: true, breaks: true, linkify: true });

async function getData(context: Omit<GetServerSidePropsContext, "res" | "resolvedUrl">) {
  const ssr = await ssrInit();

  const booking = await prisma.booking.findUnique({
    where: {
      uid: context.query.uid as string,
    },
    select: {
      ...bookingMinimalSelect,
      uid: true,
      description: true,
      isRecorded: true,
      user: {
        select: {
          id: true,
          timeZone: true,
          name: true,
          email: true,
          organization: {
            select: {
              calVideoLogo: true,
            },
          },
        },
      },
      references: {
        select: {
          uid: true,
          type: true,
          meetingUrl: true,
          meetingPassword: true,
        },
        where: {
          type: "daily_video",
        },
      },
    },
  });

  if (!booking || booking.references.length === 0 || !booking.references[0].meetingUrl) {
    return redirect("/video/no-meeting-found");
  }

  //daily.co calls have a 60 minute exit buffer when a user enters a call when it's not available it will trigger the modals
  const now = new Date();
  const exitDate = new Date(now.getTime() - 60 * 60 * 1000);

  //find out if the meeting is in the past
  const isPast = booking?.endTime <= exitDate;
  if (isPast) {
    return redirect(`/video/meeting-ended/${booking?.uid}`);
  }

  const bookingObj = Object.assign({}, booking, {
    startTime: booking.startTime.toString(),
    endTime: booking.endTime.toString(),
  });

  const session = await getServerSession({ req: context.req });

  // set meetingPassword to null for guests
  if (session?.user.id !== bookingObj.user?.id) {
    bookingObj.references.forEach((bookRef: any) => {
      bookRef.meetingPassword = null;
    });
  }

  return {
    meetingUrl: bookingObj.references[0].meetingUrl ?? "",
    ...(typeof bookingObj.references[0].meetingPassword === "string" && {
      meetingPassword: bookingObj.references[0].meetingPassword,
    }),
    booking: {
      ...bookingObj,
      ...(bookingObj.description && { description: md.render(bookingObj.description) }),
    },
    dehydratedState: await ssr.dehydrate(),
  };
}

const Page = async ({ params }: PageProps) => {
  const h = headers();
  const nonce = h.get("x-nonce") ?? undefined;

  const legacyCtx = buildLegacyCtx(headers(), cookies(), params);
  // @ts-expect-error `req` of type '{ headers: ReadonlyHeaders; cookies: ReadonlyRequestCookies; }' is not assignable to `req` in `GetServerSidePropsContext`
  const { dehydratedState, ...restProps } = await getData(legacyCtx);

  return (
    <PageWrapper
      getLayout={null}
      requiresLicense={false}
      nonce={nonce}
      themeBasis={null}
      dehydratedState={dehydratedState}>
      <OldPage {...restProps} />
    </PageWrapper>
  );
};

export default Page;
