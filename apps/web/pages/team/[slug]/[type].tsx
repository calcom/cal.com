import { getBookerWrapperClasses } from "@calcom/features/bookings/Booker/utils/getBookerWrapperClasses";
import { BookerSeo } from "@calcom/features/bookings/components/BookerSeo";

import PageWrapper from "@components/PageWrapper";

import type { PageProps } from "~/team/type-view";
import TypePage from "~/team/type-view";

const Page = (props: PageProps) => {
  const {
    eventData,
    slug,
    user,
    booking,
    isBrandingHidden,
    isSEOIndexable,
  } = props;
  const { profile, users, hidden, title } = eventData;

  return (
    <main className={getBookerWrapperClasses({ isEmbed: !!props.isEmbed })}>
      <BookerSeo
        username={user}
        eventSlug={slug}
        rescheduleUid={booking?.uid}
        hideBranding={isBrandingHidden}
        isTeamEvent
        eventData={
          profile && users && title && hidden !== undefined
            ? {
                profile,
                users,
                title,
                hidden,
              }
            : undefined
        }
        entity={eventData.entity}
        bookingData={booking}
        isSEOIndexable={isSEOIndexable}
      />
      <TypePage {...props} />
    </main>
  );
};
Page.isBookingPage = true;
Page.PageWrapper = PageWrapper;

export { getServerSideProps } from "@lib/team/[slug]/[type]/getServerSideProps";
export default Page;
