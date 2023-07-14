import type { GetServerSidePropsContext } from "next";
import type { NextRouter } from "next/router";
import { useRouter } from "next/router";

import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import { AddNewOrgAdminsForm } from "@calcom/features/ee/organizations/components";
import { getFeatureFlagMap } from "@calcom/features/flags/server/utils";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { MembershipRole } from "@calcom/prisma/client";
import { WizardLayout, Meta } from "@calcom/ui";

import PageWrapper from "@components/PageWrapper";

const OnboardTeamMembersPage = () => {
  const { t } = useLocale();
  const router = useRouter();
  if (!router.isReady) return null;
  return (
    <>
      <Meta
        title={t("invite_organization_admins")}
        description={t("invite_organization_admins_description")}
      />
      <AddNewOrgAdminsForm />
    </>
  );
};

export const getServerSideProps = async ({ req, res }: GetServerSidePropsContext) => {
  const prisma = await import("@calcom/prisma").then((mod) => mod.default);
  const flags = await getFeatureFlagMap(prisma);
  // Check if organizations are enabled
  if (flags["organizations"] !== true) {
    return {
      notFound: true,
    };
  }

  // Check if logged in user has an organization assigned
  const session = await getServerSession({ req, res });
  if (!session?.user.organizationId) {
    return {
      notFound: true,
    };
  }
  // Check if logged in user has OWNER/ADMIN role in organization
  const membership = await prisma.membership.findFirst({
    where: {
      userId: session?.user.id,
      teamId: session?.user.organizationId,
    },
    select: {
      role: true,
    },
  });
  console.log({ membership });
  if (!membership?.role || membership?.role === MembershipRole.MEMBER) {
    return {
      notFound: true,
    };
  }

  return {
    props: {},
  };
};

OnboardTeamMembersPage.getLayout = (page: React.ReactElement, router: NextRouter) => (
  <WizardLayout
    currentStep={4}
    maxSteps={5}
    isOptionalCallback={() => {
      router.push(`/settings/organizations/${router.query.id}/add-teams`);
    }}>
    {page}
  </WizardLayout>
);

OnboardTeamMembersPage.PageWrapper = PageWrapper;

export default OnboardTeamMembersPage;
