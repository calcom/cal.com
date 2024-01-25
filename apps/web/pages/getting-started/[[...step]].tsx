import PageWrapper, { type CalPageWrapper } from "@components/PageWrapper";
import OnboardingPage from "@components/pages/getting-started/[[...step]]";

export { getServerSideProps } from "@lib/getting-started/[[...step]]/getServerSideProps";

const Onboarding = OnboardingPage as CalPageWrapper;
Onboarding.PageWrapper = PageWrapper;

export default Onboarding;
