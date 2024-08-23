import { getServerSideProps } from "@lib/settings/organizations/new/getServerSideProps";

import PageWrapper from "@components/PageWrapper";

import CreateNewOrganizationPage, { LayoutWrapper } from "~/settings/platform/new/create-new-view";

CreateNewOrganizationPage.getLayout = LayoutWrapper;
CreateNewOrganizationPage.PageWrapper = PageWrapper;

export default CreateNewOrganizationPage;

export { getServerSideProps };
