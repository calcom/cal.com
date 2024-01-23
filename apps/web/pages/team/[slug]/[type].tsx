import { type AppProps } from "@lib/app-providers";
import { getServerSideProps, type PageProps } from "@lib/team/[slug]/[type]/getServerSideProps";

import PageWrapper, { type CalPageWrapper } from "@components/PageWrapper";
import TypePage from "@components/pages/team/[slug]/[type]";

export { getServerSideProps, type PageProps };

const Type = TypePage as unknown as CalPageWrapper & {
  isBookingPage: AppProps["Component"]["isBookingPage"];
};

Type.PageWrapper = PageWrapper;
Type.isBookingPage = true;

export default Type;
