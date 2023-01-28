import { GetStaticPaths, GetStaticPropsContext } from "next";
import { z } from "zod";

import { useLocale } from "@calcom/lib/hooks/useLocale";

import { QueryCell } from "@lib/QueryCell";
import { useBookingPageQuery } from "@lib/hooks/useBookingPageQuery";
import { inferSSRProps } from "@lib/types/inferSSRProps";
import { EmbedProps } from "@lib/withEmbedSsr";

import AvailabilityPage from "@components/booking/pages/AvailabilityPage";

export type AvailabilityPageProps = inferSSRProps<typeof getStaticProps> & EmbedProps;

const UserAway = () => {
  const { t } = useLocale();
  return (
    <div className="h-screen dark:bg-gray-900">
      <main className="mx-auto max-w-3xl px-4 py-24">
        <div className="space-y-6" data-testid="event-types">
          <div className="overflow-hidden rounded-sm border dark:border-gray-900">
            <div className="p-8 text-center text-gray-400 dark:text-white">
              <h2 className="font-cal mb-2 text-3xl text-gray-600 dark:text-white">
                😴{" " + t("user_away")}
              </h2>
              <p className="mx-auto max-w-md">{t("user_away_description")}</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default function Type() {
  const { t } = useLocale();
  const query = useBookingPageQuery();
  return (
    <QueryCell
      query={query}
      success={({ data }) => {
        if (data.away) return <UserAway />;

        if (data.isDynamicGroupBooking && !data.profile.allowDynamicBooking)
          return (
            <div className="dark:bg-darkgray-50 h-screen">
              <main className="mx-auto max-w-3xl px-4 py-24">
                <div className="space-y-6" data-testid="event-types">
                  <div className="overflow-hidden rounded-sm border dark:border-gray-900">
                    <div className="p-8 text-center text-gray-400 dark:text-white">
                      <h2 className="font-cal mb-2 text-3xl text-gray-600 dark:text-white">
                        {" " + t("unavailable")}
                      </h2>
                      <p className="mx-auto max-w-md">{t("user_dynamic_booking_disabled")}</p>
                    </div>
                  </div>
                </div>
              </main>
            </div>
          );

        return <AvailabilityPage {...data} />;
      }}
    />
  );
}

Type.isThemeSupported = true;

const bookingPageQuerySchema = z.object({
  bookingUid: z.string().optional(),
  count: z.string().optional(),
  embed: z.string().optional(),
  rescheduleUid: z.string().optional(),
  type: z.string(),
  user: z.string(),
});

export const getStaticProps = async (context: GetStaticPropsContext) => {
  const { ssgInit } = await import("@server/lib/ssg");
  const ssg = await ssgInit(context);
  await ssg.viewer.public.bookingPage.fetch(bookingPageQuerySchema.parse(context.params));

  return {
    props: {
      trpcState: ssg.dehydrate(),
    },
    revalidate: 10, // seconds
  };
};

export const getStaticPaths: GetStaticPaths = async () => {
  return { paths: [], fallback: "blocking" };
};
