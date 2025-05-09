import type { z } from "zod";

import { prisma } from "@calcom/prisma";

export const verifyEmailHandler = async ({
  input,
}: {
  input: z.infer<typeof import("./verifyEmail.schema").ZVerifyEmailInputSchema>;
}) => {
  const { email } = input;
  const [, domain] = email.split("@");

  const organizationSettings = await prisma.organizationSettings.findFirst({
    where: {
      orgAutoAcceptEmail: domain,
    },
    include: {
      organization: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  if (!organizationSettings) {
    return { belongsToOrg: false };
  }

  if (organizationSettings.enforceSingleSignOn) {
    const hasSAML = await prisma.credential.findFirst({
      where: {
        type: "saml_idp",
        teamId: organizationSettings.organization.id,
      },
    });

    return {
      belongsToOrg: true,
      enforceSingleSignOn: true,
      useSAML: !!hasSAML,
      organizationName: organizationSettings.organization.name,
    };
  }

  return {
    belongsToOrg: true,
    enforceSingleSignOn: false,
  };
};
