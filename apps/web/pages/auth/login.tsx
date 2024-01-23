import PageWrapper, { type CalPageWrapper } from "@components/PageWrapper";
import LoginPage from "@components/pages/auth/login";

import { getServerSideProps } from "@server/lib/auth/login/getServerSideProps";

export { getServerSideProps };

const Login = LoginPage as unknown as CalPageWrapper;

Login.PageWrapper = PageWrapper;

export default Login;
