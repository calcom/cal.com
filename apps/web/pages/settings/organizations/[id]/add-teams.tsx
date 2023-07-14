import type { GetServerSidePropsContext } from "next";
import type { NextRouter } from "next/router";
import { useRouter } from "next/router";

import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import { AddNewTeamsForm } from "@calcom/features/ee/organizations/components";
import { getFeatureFlagMap } from "@calcom/features/flags/server/utils";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { MembershipRole } from "@calcom/prisma/client";
import { WizardLayout, Meta } from "@calcom/ui";

import PageWrapper from "@components/PageWrapper";

const AddNewTeamsPage = () => {
  const { t } = useLocale();
  const router = useRouter();
  if (!router.isReady) return null;
  return (
    <>
      <Meta title={t("create_your_teams")} description={t("create_your_teams_description")} />
      <AddNewTeamsForm />
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

AddNewTeamsPage.getLayout = (page: React.ReactElement, router: NextRouter) => (
  <>
    <WizardLayout
      currentStep={5}
      maxSteps={5}
      isOptionalCallback={() => {
        router.push(`/event-types`);
      }}>
      {page}
    </WizardLayout>
  </>
);

AddNewTeamsPage.PageWrapper = PageWrapper;

export default AddNewTeamsPage;
