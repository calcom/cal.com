import { getServerSideProps } from "@calcom/app-store/_pages/setup/_getServerSideProps";
import type { inferSSRProps } from "@calcom/types/inferSSRProps";

import PageWrapper from "@components/PageWrapper";

import SetupView from "~/apps/[slug]/setup/setup-view";

const Page = (props: inferSSRProps<typeof getServerSideProps>) => <SetupView {...props} />;

Page.PageWrapper = PageWrapper;

export { getServerSideProps };

export default Page;
