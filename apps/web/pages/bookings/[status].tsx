import type { GetStaticPaths } from "next";

import { validStatuses } from "~/bookings/lib/validStatuses";

export { getStaticProps } from "~/bookings/views/bookings-listing-view.getStaticProps";
export { default } from "~/bookings/views/bookings-listing-view";

export const getStaticPaths: GetStaticPaths = () => {
  return {
    paths: validStatuses.map((status) => ({
      params: { status },
      locale: "en",
    })),
    fallback: "blocking",
  };
};
