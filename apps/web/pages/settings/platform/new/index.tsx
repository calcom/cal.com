import { useRouter } from "next/navigation";

import LicenseRequired from "@calcom/features/ee/common/components/LicenseRequired";
import SkeletonLoader from "@calcom/features/ee/teams/components/SkeletonLoaderAvailabilityTimes";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Meta } from "@calcom/ui";

import { getServerSideProps } from "@lib/settings/organizations/new/getServerSideProps";

import PageWrapper from "@components/PageWrapper";
import usePlatformMe from "@components/settings/platform/hooks/usePlatformMe";

import CreateNewOrganizationPage, { LayoutWrapper } from "~/settings/platform/new/create-new-view";

const Page = () => {
  const { t } = useLocale();
  const { isFetching, data: platformMe } = usePlatformMe();
  const router = useRouter();

  if (isFetching) {
    return <SkeletonLoader />;
  }

  if (platformMe?.organization?.id) {
    // if user has a platform org redirect to platform dashboard
    if (platformMe?.organization?.isPlatform) {
      router.push("/settings/platform");
      // user has a regular org redirect to organization settings
    } else {
      router.push("/settings/organizations/profile");
    }
    // display loader while redirection is happening
    return <SkeletonLoader />;
  }

  return (
    <LicenseRequired>
      <Meta
        title={t("set_up_your_platform_organization")}
        description={t("platform_organization_description")}
      />
      <CreateNewOrganizationPage />
    </LicenseRequired>
  );
};

Page.getLayout = LayoutWrapper;
Page.PageWrapper = PageWrapper;

export default Page;

export { getServerSideProps };
