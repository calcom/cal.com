import { z } from "zod";

import NoSSR from "@calcom/core/components/NoSSR";
import LicenseRequired from "@calcom/ee/common/components/LicenseRequired";
import OrgForm from "@calcom/features/ee/organizations/pages/settings/admin/AdminOrgEditPage";
import { useParamsWithFallback } from "@calcom/lib/hooks/useParamsWithFallback";
import { trpc } from "@calcom/trpc/react";
import { Meta } from "@calcom/ui";

import PageWrapper from "@components/PageWrapper";
import { getLayout } from "@components/auth/layouts/AdminLayout";

const paramsSchema = z.object({ id: z.coerce.number() });

const Page = () => {
  const params = useParamsWithFallback();
  const parsedParams = paramsSchema.safeParse(params);

  if (!parsedParams.success) return <div>Invalid id</div>;

  const [org] = trpc.viewer.organizations.adminGet.useSuspenseQuery({ id: parsedParams.data.id });

  return (
    <div>
      <LicenseRequired>
        <Meta
          title={`Editing organization: ${org.name}`}
          description="Here you can edit a current organization."
        />
        <NoSSR>
          <OrgForm org={org} />
        </NoSSR>
      </LicenseRequired>
    </div>
  );
};
Page.PageWrapper = PageWrapper;
Page.getLayout = getLayout;

export default Page;
