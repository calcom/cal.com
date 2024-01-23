import PageWrapper from "@components/PageWrapper";
import signin from "@components/pages/auth/signin";

import { getServerSideProps } from "@server/lib/auth/signin/getServerSideProps";

signin.PageWrapper = PageWrapper;

export default signin;

export { getServerSideProps };
