import { getBookerWrapperClasses } from "@calcom/features/bookings/Booker/utils/getBookerWrapperClasses";

import PageWrapper from "@components/PageWrapper";

import type { PageProps } from "~/team/type-view";
import TypePage from "~/team/type-view";

const Page = (props: PageProps) => {
  return (
    <main className={getBookerWrapperClasses({ isEmbed: !!props.isEmbed })}>
      <TypePage {...props} />
    </main>
  );
};
Page.isBookingPage = true;
Page.PageWrapper = PageWrapper;

export { getServerSideProps } from "@lib/team/[slug]/[type]/getServerSideProps";
export default Page;
