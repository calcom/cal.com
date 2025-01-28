import type { GetServerSidePropsContext } from "next";
import { z } from "zod";

import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import { CALCOM_PRIVATE_API_ROUTE } from "@calcom/lib/constants";
import prisma from "@calcom/prisma";
import { UserPermissionRole } from "@calcom/prisma/enums";

import { ssrInit } from "@server/lib/ssr";

export enum LicenseStatus {
  UNSET = "UNSET",
  VALID = "VALID",
  INVALID = "INVALID",
}

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

  const deployment = await prisma.deployment.findUnique({
    where: {
      id: 1,
    },
  });

  if (deployment?.licenseKey) {
    // Hit goblin to check if the license key is valid
    const response = await fetch(`${CALCOM_PRIVATE_API_ROUTE}/v1/license/${deployment.licenseKey}`);
    const data = await response.json();
    const responseSchema = z.object({
      status: z.boolean(),
    });

    const parsedResponse = responseSchema.safeParse(data);

    return {
      props: {
        trpcState: ssr.dehydrate(),
        userCount,
        licenseStatus: parsedResponse.success ? LicenseStatus.VALID : LicenseStatus.INVALID,
      },
    };
  }

  return {
    props: {
      trpcState: ssr.dehydrate(),
      userCount,
      licenseStatus: LicenseStatus.UNSET,
    },
  };
}
