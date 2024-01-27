import { type AppProps } from "@lib/app-providers";
import withEmbedSsr from "@lib/withEmbedSsr";

import PageWrapper, { type CalPageWrapper } from "@components/PageWrapper";

import User from "~/users/views/users-public-view";
import { getServerSideProps as _getServerSideProps } from "~/users/views/users-public-view.getServerSideProps";

const UserPage = User as unknown as CalPageWrapper & {
  isBookingPage: AppProps["Component"]["isBookingPage"];
};

UserPage.isBookingPage = true;
UserPage.PageWrapper = PageWrapper;

export default UserPage;

export const getServerSideProps = withEmbedSsr(_getServerSideProps);
