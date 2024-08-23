import { getServerSideProps } from "@calcom/features/ee/organizations/pages/organization";

import PageWrapper from "@components/PageWrapper";

import AboutOrganizationPage, { LayoutWrapper } from "~/settings/organizations/[id]/about-view";

AboutOrganizationPage.getLayout = LayoutWrapper;
AboutOrganizationPage.PageWrapper = PageWrapper;

export default AboutOrganizationPage;
export { getServerSideProps };
