import PageWrapper from "@components/PageWrapper";
import OnboardingPage from "@components/pages/getting-started/[[...step]]";

export { getServerSideProps } from "@lib/getting-started/[[...step]]/getServerSideProps";

OnboardingPage.PageWrapper = PageWrapper;

export default OnboardingPage;
