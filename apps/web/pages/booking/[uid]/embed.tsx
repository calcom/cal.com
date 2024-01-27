import withEmbedSsr from "@lib/withEmbedSsr";

import { getServerSideProps as _getServerSideProps } from "~/bookings/views/bookings-single-view.getServerSideProps";

export { default } from "~/bookings/views/bookings-single-view";

export const getServerSideProps = withEmbedSsr(_getServerSideProps);
