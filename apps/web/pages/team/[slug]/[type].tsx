import { getServerSideProps, type PageProps } from "@lib/team/[slug]/[type]/getServerSideProps";

import PageWrapper from "@components/PageWrapper";
import Type from "@components/pages/team/[slug]/[type]";

export { getServerSideProps, type PageProps };

Type.PageWrapper = PageWrapper;
Type.isBookingPage = true;

export default Type;
