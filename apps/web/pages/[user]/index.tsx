import { type AppProps } from "@lib/app-providers";

import PageWrapper, { type CalPageWrapper } from "@components/PageWrapper";

import User from "~/users/views/users-public-view";

export { getServerSideProps, type UserPageProps } from "~/users/views/users-public-view.getServerSideProps";

const UserPage = User as unknown as CalPageWrapper & {
  isBookingPage: AppProps["Component"]["isBookingPage"];
};

UserPage.isBookingPage = true;
UserPage.PageWrapper = PageWrapper;

export default UserPage;
