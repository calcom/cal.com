import PageWrapper from "@components/PageWrapper";
import Error from "@components/pages/auth/error";

export { getStaticProps } from "@lib/auth/error/getStaticProps";

export default Error;
Error.PageWrapper = PageWrapper;
