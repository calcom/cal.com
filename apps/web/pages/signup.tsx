import type { inferSSRProps } from "@calcom/types/inferSSRProps";

import { getServerSideProps } from "@lib/signup/getServerSideProps";

import PageWrapper from "@components/PageWrapper";
import Signup from "@components/pages/signup";

export type SignupProps = inferSSRProps<typeof getServerSideProps>;

export { getServerSideProps };

export default Signup;

Signup.PageWrapper = PageWrapper;
