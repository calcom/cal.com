import { type AppProps } from "@lib/app-providers";

import PageWrapper, { type CalPageWrapper } from "@components/PageWrapper";

import TypePage from "~/users/views/users-type-public-view";

export { getServerSideProps } from "~/users/views/users-type-public-view.getServerSideProps";

const Type = TypePage as unknown as CalPageWrapper & {
  isBookingPage: AppProps["Component"]["isBookingPage"];
};

Type.isBookingPage = true;
Type.PageWrapper = PageWrapper;

export default Type;
