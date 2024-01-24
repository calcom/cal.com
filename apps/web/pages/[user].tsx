import { getServerSideProps, type UserPageProps } from "@lib/[user]/getServerSideProps";
import { type AppProps } from "@lib/app-providers";

import PageWrapper, { type CalPageWrapper } from "@components/PageWrapper";
import User from "@components/pages/[user]";

export { getServerSideProps, UserPageProps };

const UserPage = User as unknown as CalPageWrapper & {
  isBookingPage: AppProps["Component"]["isBookingPage"];
};

UserPage.isBookingPage = true;
UserPage.PageWrapper = PageWrapper;

export default UserPage;
