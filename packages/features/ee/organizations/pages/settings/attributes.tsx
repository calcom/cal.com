import React from "react";

import LicenseRequired from "@calcom/features/ee/common/components/LicenseRequired";
import { getLayout } from "@calcom/features/settings/layouts/SettingsLayout";
import { Meta } from "@calcom/ui";

function OrganizationAttributesPage() {
  return (
    <>
      <Meta title="Attributes" description="Manage attributes for your team members" />

      <LicenseRequired>
        <div>Organization Attributes</div>
      </LicenseRequired>
    </>
  );
}

OrganizationAttributesPage.getLayout = getLayout;

export default OrganizationAttributesPage;
