import type { GetServerSidePropsContext } from "next";
import { useRouter } from "next/router";

import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import { SetPasswordForm } from "@calcom/features/ee/organizations/components";
import { getFeatureFlagMap } from "@calcom/features/flags/server/utils";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { MembershipRole } from "@calcom/prisma/client";
import { WizardLayout, Meta } from "@calcom/ui";

import PageWrapper from "@components/PageWrapper";

const SetPasswordPage = () => {
  const { t } = useLocale();
  const router = useRouter();
  if (!router.isReady) return null;
  return (
    <>
      <Meta title={t("set_a_password")} description={t("set_a_password_description")} />
      <SetPasswordForm />
    </>
  );
};
const LayoutWrapper = (page: React.ReactElement) => {
  return (
    <WizardLayout currentStep={2} maxSteps={5}>
      {page}
    </WizardLayout>
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

SetPasswordPage.getLayout = LayoutWrapper;
SetPasswordPage.PageWrapper = PageWrapper;

export default SetPasswordPage;
