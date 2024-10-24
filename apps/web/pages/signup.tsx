import { getServerSideProps } from "@lib/signup/getServerSideProps";

import PageWrapper from "@components/PageWrapper";

import type { SignupProps } from "~/signup-view";
import Signup from "~/signup-view";

const Page = (props: SignupProps) => <Signup {...props} />;

export { getServerSideProps };
Page.PageWrapper = PageWrapper;
export default Page;
