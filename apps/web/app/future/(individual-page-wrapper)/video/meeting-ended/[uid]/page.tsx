import OldPage from "@pages/video/meeting-ended/[uid]";
import { type Params } from "app/_types";
import { _generateMetadata } from "app/_utils";
import { type GetServerSidePropsContext } from "next";
import { headers, cookies } from "next/headers";
import { redirect } from "next/navigation";

import prisma, { bookingMinimalSelect } from "@calcom/prisma";

import { buildLegacyCtx } from "@lib/buildLegacyCtx";

import PageWrapper from "@components/PageWrapperAppDir";

export const generateMetadata = async () =>
  await _generateMetadata(
    () => "Meeting Unavailable",
    () => "Meeting Unavailable"
  );

type PageProps = Readonly<{
  params: Params;
}>;

async function getData(context: Omit<GetServerSidePropsContext, "res" | "resolvedUrl">) {
  const booking = await prisma.booking.findUnique({
    where: {
      uid: typeof context?.params?.uid === "string" ? context.params.uid : "",
    },
    select: {
      ...bookingMinimalSelect,
      uid: true,
      user: {
        select: {
          credentials: true,
        },
      },
      references: {
        select: {
          uid: true,
          type: true,
          meetingUrl: true,
        },
      },
    },
  });

  if (!booking) {
    return redirect("/video/no-meeting-found");
  }

  const bookingObj = Object.assign({}, booking, {
    startTime: booking.startTime.toString(),
    endTime: booking.endTime.toString(),
  });

  return {
    booking: bookingObj,
  };
}

const Page = async ({ params }: PageProps) => {
  const h = headers();
  const nonce = h.get("x-nonce") ?? undefined;

  const legacyCtx = buildLegacyCtx(headers(), cookies(), params);
  // @ts-expect-error `req` of type '{ headers: ReadonlyHeaders; cookies: ReadonlyRequestCookies; }' is not assignable to `req` in `GetServerSidePropsContext`
  const props = await getData(legacyCtx);

  return (
    <PageWrapper getLayout={null} requiresLicense={false} nonce={nonce} themeBasis={null}>
      <OldPage {...props} />
    </PageWrapper>
  );
};

export default Page;
