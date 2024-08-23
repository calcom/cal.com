import { getServerSideProps } from "@calcom/features/ee/organizations/pages/organization";

import PageWrapper from "@components/PageWrapper";

import AddNewTeamsPage, { LayoutWrapper } from "~/settings/organizations/[id]/add-teams-view";

AddNewTeamsPage.getLayout = LayoutWrapper;
AddNewTeamsPage.PageWrapper = PageWrapper;

export default AddNewTeamsPage;

export { getServerSideProps };
