import type { GetServerSidePropsContext } from "next";

import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import { getDeploymentKey } from "@calcom/features/ee/deployment/lib/getDeploymentKey";
import prisma from "@calcom/prisma";
import { UserPermissionRole } from "@calcom/prisma/enums";

import { ssrInit } from "@server/lib/ssr";

export async function getServerSideProps(context: GetServerSidePropsContext) {
  const { req } = context;

  const ssr = await ssrInit(context);
  const userCount = await prisma.user.count();

  const session = await getServerSession({ req });

  if (session?.user.role && session?.user.role !== UserPermissionRole.ADMIN) {
    return {
      redirect: {
        destination: `/404`,
        permanent: false,
      },
    };
  }

  const deploymentKey = await prisma.deployment.findUnique({
    where: { id: 1 },
    select: { licenseKey: true },
  });

  // Check existant CALCOM_LICENSE_KEY env var and acccount for it
  if (!!process.env.CALCOM_LICENSE_KEY && !deploymentKey?.licenseKey) {
    await prisma.deployment.upsert({
      where: { id: 1 },
      update: {
        licenseKey: process.env.CALCOM_LICENSE_KEY,
        agreedLicenseAt: new Date(),
      },
      create: {
        licenseKey: process.env.CALCOM_LICENSE_KEY,
        agreedLicenseAt: new Date(),
      },
    });
  }

  const isFreeLicense = (await getDeploymentKey(prisma)) === "";

  return {
    props: {
      trpcState: ssr.dehydrate(),
      isFreeLicense,
      userCount,
    },
  };
}
