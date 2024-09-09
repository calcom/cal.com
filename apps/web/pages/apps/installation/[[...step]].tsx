import PageWrapper from "@components/PageWrapper";

import type { OnboardingPageProps } from "~/apps/installation/[[...step]]/step-view";
import StepView from "~/apps/installation/[[...step]]/step-view";

const Page = (props: OnboardingPageProps) => <StepView {...props} />;

Page.PageWrapper = PageWrapper;

export { getServerSideProps } from "@lib/apps/installation/[[...step]]/getServerSideProps";

export default Page;
