import { type AppProps } from "@lib/app-providers";
import withEmbedSsr from "@lib/withEmbedSsr";

import PageWrapper, { type CalPageWrapper } from "@components/PageWrapper";

import TypePage from "~/users/views/users-type-public-view";
import { getServerSideProps as _getServerSideProps } from "~/users/views/users-type-public-view.getServerSideProps";

export const getServerSideProps = withEmbedSsr(_getServerSideProps);

const Type = TypePage as unknown as CalPageWrapper & {
  isBookingPage: AppProps["Component"]["isBookingPage"];
};

Type.isBookingPage = true;
Type.PageWrapper = PageWrapper;

export default Type;
