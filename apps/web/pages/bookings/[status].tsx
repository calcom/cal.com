import type { GetStaticPaths } from "next";

import PageWrapper from "@components/PageWrapper";

import { validStatuses } from "~/bookings/lib/validStatuses";
import BookingsListingView from "~/bookings/views/bookings-listing-view";

export { getStaticProps } from "~/bookings/views/bookings-listing-view.getStaticProps";

const BookingsListingPage = new Proxy<{
  (): JSX.Element;
  PageWrapper?: typeof PageWrapper;
}>(BookingsListingView, {});

BookingsListingPage.PageWrapper = PageWrapper;

export const getStaticPaths: GetStaticPaths = () => {
  return {
    paths: validStatuses.map((status) => ({
      params: { status },
      locale: "en",
    })),
    fallback: "blocking",
  };
};

export default BookingsListingPage;
