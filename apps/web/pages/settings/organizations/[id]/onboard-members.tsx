import { getServerSideProps } from "@calcom/features/ee/organizations/pages/organization";

import PageWrapper from "@components/PageWrapper";

import OnboardTeamMembersPage, { LayoutWrapper } from "~/settings/organizations/[id]/onboard-members-view";

OnboardTeamMembersPage.getLayout = LayoutWrapper;
OnboardTeamMembersPage.PageWrapper = PageWrapper;

export default OnboardTeamMembersPage;
export { getServerSideProps };
