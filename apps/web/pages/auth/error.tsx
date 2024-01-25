import PageWrapper, { type CalPageWrapper } from "@components/PageWrapper";
import ErrorPage from "@components/pages/auth/error";

export { getStaticProps } from "@lib/auth/error/getStaticProps";

const Error = ErrorPage as CalPageWrapper;
Error.PageWrapper = PageWrapper;
export default Error;
