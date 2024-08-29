import OrgAttributesCreatePage, {
  getLayout,
} from "@calcom/ee/organizations/pages/settings/attributes/attributes-create-view";
import { Meta } from "@calcom/ui";

import PageWrapper from "@components/PageWrapper";

const Page = () => {
  return (
    <>
      <Meta title="Attribute" description="Create an attribute for your team members" />
      <OrgAttributesCreatePage />
    </>
  );
};

Page.getLayout = getLayout;
Page.PageWrapper = PageWrapper;

export default Page;
