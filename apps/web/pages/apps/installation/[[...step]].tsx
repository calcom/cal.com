import PageWrapper from "@components/PageWrapper";

import type { OnboardingPageProps } from "~/apps/installation/[[...step]]/step-view";
import StepView from "~/apps/installation/[[...step]]/step-view";
import { getServerSideProps } from "~/apps/installation/[[...step]]/step-view.getServerSideProps";

const Page = (props: OnboardingPageProps) => <StepView {...props} />;

Page.PageWrapper = PageWrapper;

export { getServerSideProps };

export default Page;
