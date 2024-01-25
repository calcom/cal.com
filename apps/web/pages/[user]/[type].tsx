import { getServerSideProps, type PageProps } from "@lib/[user]/[type]/getServerSideProps";
import { type AppProps } from "@lib/app-providers";

import PageWrapper, { type CalPageWrapper } from "@components/PageWrapper";
import TypePage from "@components/pages/[user]/[type]";

export { getServerSideProps, PageProps };

const Type = TypePage as unknown as CalPageWrapper & {
  isBookingPage: AppProps["Component"]["isBookingPage"];
};

Type.isBookingPage = true;
Type.PageWrapper = PageWrapper;

export default Type;
